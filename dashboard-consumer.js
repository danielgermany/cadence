import {
  mountDashboard, renderTiles, renderList, listRow, setText,
  formatDate, formatMoney, formatMinutes, updateProfile, displayNameOf, showLoadError,
} from './dashboard-shell.js';
import { fetchMySessions, computeStats, SMS_RATE } from './sessions-store.js';

const { user, profile } = await mountDashboard({
  role: 'consumer',
  greet: (name) => `Hi, ${name}`,
});

setText('account-email', profile.email);
setText('account-since', formatDate(profile.createdAt));
setText('rate-line', `${formatMoney(SMS_RATE)} per message sent`);
document.getElementById('display-name').value = profile.displayName || '';

async function refresh() {
  let sessions;
  try {
    sessions = await fetchMySessions(user.uid, 'consumer');
  } catch (err) {
    showLoadError(document.getElementById('history'), err);
    return;
  }
  const stats = computeStats(sessions, 'consumer');

  renderTiles(document.getElementById('kpis'), [
    { label: 'This week', value: String(stats.thisWeek), sub: 'conversations started' },
    { label: 'Day streak', value: String(stats.streak), sub: 'days in a row' },
    { label: 'Avg length', value: stats.ended ? formatMinutes(stats.avgMinutes) : '—', sub: 'per conversation' },
    { label: 'Total spent', value: formatMoney(stats.money), sub: `${stats.ended} completed` },
  ]);

  setText('total-spend', formatMoney(stats.money));
  setText('total-minutes', stats.minutes ? formatMinutes(stats.minutes) : '—');
  setText('history-count', sessions.length ? `${sessions.length} total` : '');
  document.getElementById('history-note').style.display = sessions.length >= 200 ? 'block' : 'none';

  renderList(
    document.getElementById('history'),
    sessions,
    (session) => listRow({
      main: session.topic || 'Conversation',
      sub: `${session.friendName} · ${formatDate(session.startedAt)}`,
      meta: session.status === 'ended'
        ? `${session.messageCount || 0} msg · ${formatMoney(session.cost)}`
        : 'In progress',
    }),
    "No conversations yet. Start one and it'll show up here.",
  );
}

await refresh();

// The chat runs in its own window, so refetch when focus comes back to see the
// session it just recorded.
window.addEventListener('focus', () => { refresh().catch(() => {}); });

document.getElementById('start-chat-btn').addEventListener('click', () => {
  // Named window so repeat clicks reuse the same one; falls back to a normal
  // tab if the popup is blocked.
  window.open('chat.html', 'cadence-chat', 'width=480,height=720');
});

const nameInput = document.getElementById('display-name');
const profileStatus = document.getElementById('profile-status');

document.getElementById('save-profile').addEventListener('click', async () => {
  const displayName = nameInput.value.trim();
  if (!displayName) { showProfileStatus('Enter a display name.'); return; }
  try {
    await updateProfile(user.uid, { displayName });
    profile.displayName = displayName;
    setText('greeting', `Hi, ${displayNameOf(profile)}`);
    showProfileStatus('Saved.');
  } catch (err) {
    showProfileStatus(err.message || 'Could not save.');
  }
});

function showProfileStatus(message) {
  profileStatus.textContent = message;
  profileStatus.style.display = 'block';
}
