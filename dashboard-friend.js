import {
  mountDashboard, track, renderTiles, renderList, listRow, setText,
  formatDate, formatMoney, formatMinutes, formatSeconds, relativeTime,
  updateProfile, displayNameOf, showLoadError,
} from './dashboard-shell.js';
import {
  fetchMySessions, computeStats, watchQueue, claimQueueEntry, PAYOUT_SHARE,
} from './sessions-store.js';

const { user, profile } = await mountDashboard({
  role: 'friend',
  greet: (name) => `Good to see you, ${name}`,
});

setText('profile-email', profile.email);
setText('profile-since', formatDate(profile.createdAt));
setText('share-line', `${Math.round(PAYOUT_SHARE * 100)}%`);

/* ---------------- availability ---------------- */

let available = profile.available !== false;

function renderAvailability() {
  document.getElementById('availability-dot').style.background =
    available ? 'var(--accent)' : 'var(--text-faint)';
  setText('availability-label', available ? 'Available' : 'Away');
}
renderAvailability();

document.getElementById('availability-toggle').addEventListener('click', async () => {
  available = !available;
  renderAvailability();
  await updateProfile(user.uid, { available });
});

/* ---------------- stats + history ---------------- */

async function refresh() {
  let sessions;
  try {
    sessions = await fetchMySessions(user.uid, 'friend');
  } catch (err) {
    showLoadError(document.getElementById('history'), err);
    return;
  }
  const stats = computeStats(sessions, 'friend');

  renderTiles(document.getElementById('kpis'), [
    { label: 'This week', value: String(stats.thisWeek), sub: 'sessions taken' },
    { label: 'Day streak', value: String(stats.streak), sub: 'days in a row' },
    { label: 'Avg wait', value: stats.ended ? formatSeconds(stats.avgWaitSeconds) : '—', sub: 'before you picked up' },
    { label: 'Earned', value: formatMoney(stats.money), sub: `${stats.ended} completed` },
  ]);

  setText('total-earnings', formatMoney(stats.money));
  setText('total-sessions', String(stats.ended));
  setText('total-minutes', stats.minutes ? formatMinutes(stats.minutes) : '—');
  setText('history-count', sessions.length ? `${sessions.length} total` : '');
  document.getElementById('history-note').style.display = sessions.length >= 200 ? 'block' : 'none';

  renderList(
    document.getElementById('history'),
    sessions,
    (session) => listRow({
      main: session.topic || 'Conversation',
      sub: `${session.consumerName} · ${formatDate(session.startedAt)}`,
      meta: session.status === 'ended'
        ? `${session.minutes || 0} min · ${formatMoney(session.earnings)}`
        : 'In progress',
    }),
    'No sessions yet. Take someone from the queue above to get started.',
  );
}

await refresh();
window.addEventListener('focus', () => { refresh().catch(() => {}); });

/* ---------------- live queue ---------------- */

const queueError = document.getElementById('queue-error');

function takeButton(entry) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.style.cursor = 'pointer';
  btn.textContent = 'Take this chat';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    queueError.style.display = 'none';
    try {
      await claimQueueEntry(entry.id, user.uid, displayNameOf(profile));
      window.open(`chat.html?queue=${encodeURIComponent(entry.id)}`, 'cadence-chat', 'width=480,height=720');
    } catch (err) {
      btn.disabled = false;
      // The rules require status still be 'waiting', so a lost race lands here
      // as permission-denied rather than stealing a claimed chat.
      queueError.textContent = err.code === 'permission-denied'
        ? 'Someone else took this one.'
        : (err.message || 'Could not claim this chat.');
      queueError.style.display = 'block';
    }
  });
  return btn;
}

track(watchQueue(
  (entries) => {
    setText('queue-count', entries.length ? `${entries.length} waiting` : '');
    renderList(
      document.getElementById('queue'),
      entries,
      (entry) => listRow({
        main: entry.topic || 'Wants to talk',
        sub: `${entry.displayName} · waiting ${relativeTime(entry.createdAt)}`,
        action: takeButton(entry),
      }),
      "No one is waiting right now. This updates live — you don't need to refresh.",
    );
  },
  (err) => showLoadError(document.getElementById('queue'), err),
));

/* ---------------- profile ---------------- */

const nameInput = document.getElementById('display-name');
const languagesInput = document.getElementById('languages-input');
const topicsInput = document.getElementById('topics-input');
const profileStatus = document.getElementById('profile-status');
const chipsEl = document.getElementById('chips');

function parseList(value) {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function renderChips() {
  chipsEl.innerHTML = '';
  [...(profile.languages || []), ...(profile.topics || [])].forEach((label) => {
    const chip = document.createElement('span');
    chip.className = 'tag-outline';
    chip.textContent = label;
    chipsEl.appendChild(chip);
  });
}

nameInput.value = profile.displayName || '';
languagesInput.value = (profile.languages || []).join(', ');
topicsInput.value = (profile.topics || []).join(', ');
renderChips();

document.getElementById('save-profile').addEventListener('click', async () => {
  const displayName = nameInput.value.trim();
  if (!displayName) { showProfileStatus('Enter a display name.'); return; }
  const languages = parseList(languagesInput.value);
  const topics = parseList(topicsInput.value);
  try {
    await updateProfile(user.uid, { displayName, languages, topics });
    Object.assign(profile, { displayName, languages, topics });
    setText('greeting', `Good to see you, ${displayNameOf(profile)}`);
    renderChips();
    showProfileStatus('Saved.');
  } catch (err) {
    showProfileStatus(err.message || 'Could not save.');
  }
});

function showProfileStatus(message) {
  profileStatus.textContent = message;
  profileStatus.style.display = 'block';
}
