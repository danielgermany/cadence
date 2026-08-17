// The chat window. Opened by both dashboards; branches on profile.role.
//
// Session handshake: neither party can create a session alone. The Consumer
// joins the queue, a Friend claims it (stamping their own uid + name), and the
// Consumer's snapshot of its own queue entry fires and writes the session doc.
// See firestore.rules — the `status == 'waiting'` precondition on the claim is
// the compare-and-swap.
import { requireAuth, dashboardFor } from './auth.js';
import { formatMoney } from './dashboard-shell.js';
import {
  SMS_RATE, SESSION_MINUTES,
  joinQueue, leaveQueue, watchMyQueueEntry, createSession,
  watchMyLatestSession, watchSession, getSession, recordMessage, endSession,
} from './sessions-store.js';

const REPLIES = [
  "Got it. Tell me more?",
  "I hear you — that sounds like a lot.",
  "Take your time, I'm listening.",
  "That makes sense. What's on your mind next?",
];

const params = new URLSearchParams(window.location.search);
const queueParam = params.get('queue');
const sessionParam = params.get('session');

const { user, profile } = await requireAuth();
const isFriend = profile.role === 'friend';

document.getElementById('loading').style.display = 'none';
document.getElementById('chat-root').style.display = 'block';
document.getElementById('ended-link').href = dashboardFor(profile.role);

const panes = {
  topic: document.getElementById('pane-topic'),
  waiting: document.getElementById('pane-waiting'),
  live: document.getElementById('pane-live'),
  ended: document.getElementById('pane-ended'),
};
const statusEl = document.getElementById('chat-status');
const errorEl = document.getElementById('chat-error');
const logEl = document.getElementById('chat-log');
const draftEl = document.getElementById('draft');
const sendBtn = document.getElementById('send-btn');

const unsubscribes = [];
function track(unsub) { unsubscribes.push(unsub); return unsub; }
function detachAll() {
  while (unsubscribes.length) {
    try { unsubscribes.pop()(); } catch { /* already detached */ }
  }
}

let sessionId = null;
let sessionData = null;
let sentCount = 0;
let startedAtMs = null;
let timer = null;
let ending = false;

function showPane(name) {
  Object.entries(panes).forEach(([key, el]) => {
    el.style.display = key === name ? 'block' : 'none';
  });
}

function setStatus(text) { statusEl.textContent = text; }

function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

/* ---------------- live conversation ---------------- */

function appendMessage(from, text) {
  const div = document.createElement('div');
  div.className = from === 'you' ? 'chat-msg-you' : 'chat-msg-them';
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function minutesElapsed() {
  if (!startedAtMs) return 0;
  return Math.floor((Date.now() - startedAtMs) / 60000);
}

function renderTimer() {
  const left = Math.max(0, SESSION_MINUTES - minutesElapsed());
  document.getElementById('live-timer').textContent = `${left} min left`;
  if (left === 0 && !ending) finishSession();
}

function renderCost() {
  document.getElementById('live-cost').textContent =
    `${sentCount} message(s) · ${formatMoney(sentCount * SMS_RATE)}`;
}

function goLive(session) {
  sessionId = session.id;
  sessionData = session;
  sentCount = session.messageCount || 0;
  startedAtMs = session.startedAt && session.startedAt.toDate
    ? session.startedAt.toDate().getTime()
    : Date.now();

  setStatus('Connected');
  document.getElementById('live-with').textContent = isFriend
    ? `With ${session.consumerName}`
    : `With ${session.friendName}`;
  document.getElementById('live-topic').textContent = session.topic
    ? `Topic: ${session.topic}`
    : 'No topic given.';

  if (isFriend) {
    // Honest limitation: there is no messages collection yet, so the Consumer's
    // replies are canned locally and nothing the Friend types is delivered.
    // Live relay is a separate piece of work.
    document.getElementById('composer').style.display = 'none';
    appendMessage('them', 'Live message relay is not built yet — this window tracks the session so it lands on both dashboards.');
  } else {
    appendMessage('them', "Hi, I'm here — no judgment, just listening. What's on your mind?");
  }

  renderCost();
  renderTimer();
  timer = setInterval(renderTimer, 5000);

  // If the other participant ends first, follow them out.
  track(watchSession(sessionId, (s) => {
    if (!s) return;
    sessionData = s;
    if (!isFriend) sentCount = Math.max(sentCount, s.messageCount || 0);
    if (s.status === 'ended' && !ending) showEnded(s);
  }));

  showPane('live');
}

async function sendMessage() {
  const text = draftEl.value.trim();
  if (!text || !sessionId || ending) return;
  draftEl.value = '';
  appendMessage('you', text);
  sentCount += 1;
  renderCost();

  try {
    await recordMessage(sessionId, sentCount);
  } catch (err) {
    showError(errorText(err));
  }

  const reply = REPLIES[(sentCount - 1) % REPLIES.length];
  setTimeout(() => { if (!ending) appendMessage('them', reply); }, 900);
}

async function finishSession() {
  if (!sessionId || ending) return;
  ending = true;
  if (timer) clearInterval(timer);

  const count = isFriend ? (sessionData?.messageCount || 0) : sentCount;
  try {
    await endSession(sessionId, { minutes: Math.max(1, minutesElapsed()), messageCount: count });
    const fresh = await getSession(sessionId);
    showEnded(fresh || { messageCount: count, cost: count * SMS_RATE, minutes: minutesElapsed() });
  } catch (err) {
    ending = false;
    showError(errorText(err));
  }
}

function showEnded(session) {
  ending = true;
  if (timer) clearInterval(timer);
  detachAll();
  const money = isFriend ? session.earnings : session.cost;
  const label = isFriend ? 'earned' : 'total';
  document.getElementById('ended-summary').textContent =
    `${session.messageCount || 0} message(s) over ${session.minutes || 0} min — ${formatMoney(money)} ${label}. It's on your dashboard now.`;
  setStatus('Ended');
  showPane('ended');
}

/* ---------------- consumer flow ---------------- */

function startConsumer() {
  // Resuming an existing session (e.g. the window was reopened).
  if (sessionParam) {
    getSession(sessionParam).then((session) => {
      if (session && session.status === 'active') goLive(session);
      else if (session) showEnded(session);
      else showTopicPane();
    });
    return;
  }
  showTopicPane();
}

function showTopicPane() {
  setStatus('Not connected');
  showPane('topic');
  document.getElementById('topic-input').focus();
}

async function join() {
  const topic = document.getElementById('topic-input').value.trim();
  if (!topic) { showError('Add a short topic so a Friend knows what you need.'); return; }

  errorEl.style.display = 'none';
  document.getElementById('join-btn').disabled = true;

  try {
    await joinQueue(user, profile, topic);
  } catch (err) {
    document.getElementById('join-btn').disabled = false;
    showError(errorText(err));
    return;
  }

  setStatus('Waiting');
  document.getElementById('waiting-title').textContent = 'Finding a Friend…';
  document.getElementById('waiting-note').textContent =
    'You are in the queue. This connects as soon as an available Friend picks it up — keep this window open.';
  showPane('waiting');

  track(watchMyQueueEntry(user.uid, async (entry) => {
    if (!entry || entry.status !== 'claimed' || sessionId) return;
    try {
      const id = await createSession(entry, profile);
      await leaveQueue(user.uid);
      const session = await getSession(id);
      if (session) goLive(session);
    } catch (err) {
      showError(errorText(err));
    }
  }));
}

/* ---------------- friend flow ---------------- */

function startFriend() {
  if (sessionParam) {
    getSession(sessionParam).then((session) => {
      if (session && session.status === 'active') goLive(session);
      else if (session) showEnded(session);
      else showFriendIdle();
    });
    return;
  }
  if (!queueParam) { showFriendIdle(); return; }

  setStatus('Waiting');
  document.getElementById('waiting-title').textContent = 'Connecting…';
  document.getElementById('waiting-note').textContent =
    'You claimed this chat. Waiting for the other side to open the room.';
  showPane('waiting');

  // The Consumer writes the session doc, so watch for it to appear.
  track(watchMyLatestSession(user.uid, (session) => {
    if (!session || sessionId) return;
    if (session.consumerId !== queueParam || session.status !== 'active') return;
    goLive(session);
  }));
}

function showFriendIdle() {
  setStatus('Not connected');
  document.getElementById('ended-summary').textContent =
    'No active chat. Pick someone from the queue on your dashboard to start one.';
  showPane('ended');
}

/* ---------------- wiring ---------------- */

function errorText(err) {
  if (err && err.code === 'permission-denied') return 'That action was refused — the chat may have already been taken or ended.';
  return (err && err.message) || 'Something went wrong. Please try again.';
}

document.getElementById('join-btn').addEventListener('click', join);
document.getElementById('topic-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); join(); }
});
sendBtn.addEventListener('click', sendMessage);
draftEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
});
document.getElementById('end-btn').addEventListener('click', finishSession);
document.getElementById('cancel-btn').addEventListener('click', async () => {
  detachAll();
  if (!isFriend) { try { await leaveQueue(user.uid); } catch { /* nothing queued */ } }
  window.location.href = dashboardFor(profile.role);
});

// Don't leave an orphan queue entry if the window is closed while waiting.
window.addEventListener('beforeunload', () => {
  detachAll();
  if (!isFriend && !sessionId) leaveQueue(user.uid).catch(() => {});
});

if (isFriend) startFriend(); else startConsumer();
