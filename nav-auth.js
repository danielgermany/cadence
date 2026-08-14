import { watchAuth, logOut } from './auth.js';

const toggle = document.getElementById('login-toggle');
const menu = document.getElementById('login-menu');

toggle.addEventListener('click', () => {
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#nav-auth')) menu.style.display = 'none';
});

watchAuth((user, profile) => {
  if (!user || !profile) return;
  const dashboardHref = profile.role === 'friend' ? 'dashboard-friend.html' : 'dashboard-consumer.html';
  toggle.textContent = 'Account ▾';
  menu.innerHTML = `
    <a href="${dashboardHref}" style="display:block;padding:12px 16px;font-size:14px;border-bottom:1px solid var(--border)">Dashboard</a>
    <a href="#" id="nav-logout" style="display:block;padding:12px 16px;font-size:14px">Log out</a>
  `;
  document.getElementById('nav-logout').addEventListener('click', (e) => {
    e.preventDefault();
    logOut();
  });
});
