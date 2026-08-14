import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { requireRole, logOut } from './auth.js';

const { user, profile } = await requireRole('friend');

document.getElementById('loading').style.display = 'none';
document.getElementById('dashboard-main').style.display = 'block';
document.getElementById('greeting').textContent = `Good to see you, ${profile.displayName || profile.email}`;
document.getElementById('profile-name').textContent = profile.displayName || '—';
document.getElementById('profile-email').textContent = profile.email;
document.getElementById('profile-since').textContent = profile.createdAt
  ? new Date(profile.createdAt).toLocaleDateString()
  : '—';

let available = profile.available !== false;

function renderAvailability() {
  const dot = document.getElementById('availability-dot');
  const label = document.getElementById('availability-label');
  dot.style.background = available ? 'var(--accent)' : 'var(--text-faint)';
  label.textContent = available ? 'Available for new chats' : 'Away from new chats';
}
renderAvailability();

document.getElementById('availability-toggle').addEventListener('click', async () => {
  available = !available;
  renderAvailability();
  await updateDoc(doc(db, 'users', user.uid), { available });
});

document.getElementById('logout-btn').addEventListener('click', logOut);
