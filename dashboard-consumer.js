import { requireRole, logOut } from './auth.js';

const { profile } = await requireRole('consumer');

document.getElementById('loading').style.display = 'none';
document.getElementById('dashboard-main').style.display = 'block';
document.getElementById('greeting').textContent = `Hi, ${profile.displayName || profile.email}`;
document.getElementById('account-email').textContent = profile.email;
document.getElementById('account-since').textContent = profile.createdAt
  ? new Date(profile.createdAt).toLocaleDateString()
  : '—';

document.getElementById('logout-btn').addEventListener('click', logOut);
