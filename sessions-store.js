// All Firestore reads/writes for the queue + sessions collections, plus the
// client-side stat reductions the dashboards render.
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { db } from './firebase-config.js';

export const SMS_RATE = 1;        // charged to the Consumer per message they send
export const PAYOUT_SHARE = 0.7;  // the Friend's modeled cut; there is no payments system
export const SESSION_MINUTES = 60;

// A queued entry older than this is treated as abandoned (the consumer closed
// their tab before a Friend picked it up) and hidden from the queue list.
const STALE_QUEUE_MS = 30 * 60 * 1000;

/* ---------------- consumer side ---------------- */

export function joinQueue(user, profile, topic) {
  return setDoc(doc(db, 'queue', user.uid), {
    consumerId: user.uid,
    displayName: (profile.displayName || profile.email || '').slice(0, 60),
    topic: topic.slice(0, 140),
    status: 'waiting',
    claimedBy: null,
    claimedByName: null,
    claimedAt: null,
    // Must be serverTimestamp(): the rules require createdAt == request.time.
    createdAt: serverTimestamp(),
  });
}

export function leaveQueue(uid) {
  return deleteDoc(doc(db, 'queue', uid));
}

export function watchMyQueueEntry(uid, cb) {
  return onSnapshot(doc(db, 'queue', uid), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// Only the consumer can create a session (the rules pin consumerId to the
// caller), and only after a Friend has claimed — that is where friendId and
// friendName come from.
export async function createSession(entry, profile) {
  const waitSeconds = entry.claimedAt && entry.createdAt
    ? Math.max(0, Math.round((entry.claimedAt.toMillis() - entry.createdAt.toMillis()) / 1000))
    : 0;

  const ref = await addDoc(collection(db, 'sessions'), {
    consumerId: entry.consumerId,
    friendId: entry.claimedBy,
    consumerName: (profile.displayName || profile.email || '').slice(0, 60),
    friendName: entry.claimedByName || 'Your Friend',
    topic: (entry.topic || '').slice(0, 140),
    startedAt: serverTimestamp(),
    waitSeconds,
    status: 'active',
    endedAt: null,
    minutes: 0,
    messageCount: 0,
    cost: 0,
    earnings: 0,
  });
  return ref.id;
}

/* ---------------- friend side ---------------- */

export function watchQueue(cb, onError) {
  const q = query(
    collection(db, 'queue'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const cutoff = Date.now() - STALE_QUEUE_MS;
    const entries = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => !e.createdAt || e.createdAt.toMillis() > cutoff);
    cb(entries);
  }, onError);
}

// The rules require the entry to still be status:'waiting', so a losing racer
// gets permission-denied rather than stealing a claimed chat. No transaction.
export function claimQueueEntry(entryId, friendUid, friendName) {
  return updateDoc(doc(db, 'queue', entryId), {
    status: 'claimed',
    claimedBy: friendUid,
    claimedByName: (friendName || '').slice(0, 60),
    claimedAt: serverTimestamp(),
  });
}

// The consumer writes the session doc, so the Friend polls for it to appear.
export function watchMyLatestSession(friendUid, cb) {
  const q = query(
    collection(db, 'sessions'),
    where('friendId', '==', friendUid),
    orderBy('startedAt', 'desc'),
    limit(1),
  );
  return onSnapshot(q, (snap) => {
    const d = snap.docs[0];
    cb(d ? { id: d.id, ...d.data() } : null);
  });
}

/* ---------------- both ---------------- */

export function watchSession(sessionId, cb) {
  return onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function getSession(sessionId) {
  return getDoc(doc(db, 'sessions', sessionId)).then((snap) => (
    snap.exists() ? { id: snap.id, ...snap.data() } : null
  ));
}

function derive(messageCount) {
  const cost = Math.round(messageCount * SMS_RATE * 100) / 100;
  return { cost, earnings: Math.round(cost * PAYOUT_SHARE * 100) / 100 };
}

/* ---------------- messages ---------------- */

export function sendMessage(sessionId, user, fromName, text) {
  return addDoc(collection(db, 'sessions', sessionId, 'messages'), {
    from: user.uid,
    fromName: (fromName || '').slice(0, 60),
    text: text.slice(0, 1000),
    createdAt: serverTimestamp(),
  });
}

export function watchMessages(sessionId, cb, onError) {
  const q = query(
    collection(db, 'sessions', sessionId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

// The Consumer is charged per message THEY send. Both participants see the
// whole thread, so either one can compute this and end the session correctly.
export function billableCount(messages, consumerId) {
  return messages.filter((m) => m.from === consumerId).length;
}

// Cost and earnings are derived here, in one write, so the stored numbers can
// never disagree with each other or trip the rules' >= 0 checks.
export function endSession(sessionId, { minutes, messageCount }) {
  const count = Math.max(0, messageCount);
  return updateDoc(doc(db, 'sessions', sessionId), {
    status: 'ended',
    endedAt: serverTimestamp(),
    minutes: Math.max(0, Math.round(minutes)),
    messageCount: count,
    ...derive(count),
  });
}

// Every sessions query MUST carry one of these where() clauses — the read rule
// is an OR of two field equalities, so an unfiltered list is denied.
export async function fetchMySessions(uid, role, max = 200) {
  const field = role === 'friend' ? 'friendId' : 'consumerId';
  const q = query(
    collection(db, 'sessions'),
    where(field, '==', uid),
    orderBy('startedAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function startOfWeek(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d;
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Consecutive calendar days with at least one ended session, anchored at today
// or yesterday (so an active streak survives until the day is actually missed).
function computeStreak(dates) {
  if (!dates.length) return 0;
  const days = new Set(dates.map(dayKey));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Aggregates are computed client-side rather than denormalized onto the user
// doc: totals belong to BOTH parties, and incrementing a counter on the other
// party's user doc would require cross-user write access, which the rules
// (deliberately) forbid. This is fine up to a few hundred sessions per user;
// past that the honest fix is a Cloud Function writing counters, not a
// client-side workaround.
export function computeStats(sessions, role) {
  const ended = sessions.filter((s) => s.status === 'ended');
  const moneyField = role === 'friend' ? 'earnings' : 'cost';
  const weekStart = startOfWeek(Date.now()).getTime();

  const startDates = sessions
    .map((s) => (s.startedAt && s.startedAt.toDate ? s.startedAt.toDate() : null))
    .filter(Boolean);

  const minutes = ended.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const money = ended.reduce((sum, s) => sum + (s[moneyField] || 0), 0);
  const waitSeconds = ended.reduce((sum, s) => sum + (s.waitSeconds || 0), 0);

  return {
    total: sessions.length,
    ended: ended.length,
    minutes,
    money: Math.round(money * 100) / 100,
    thisWeek: startDates.filter((d) => d.getTime() >= weekStart).length,
    streak: computeStreak(
      ended.map((s) => (s.startedAt && s.startedAt.toDate ? s.startedAt.toDate() : null)).filter(Boolean),
    ),
    avgMinutes: ended.length ? minutes / ended.length : 0,
    avgWaitSeconds: ended.length ? waitSeconds / ended.length : 0,
  };
}
