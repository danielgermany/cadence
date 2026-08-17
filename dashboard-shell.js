// Shared shell for the two dashboards: boot sequence, formatters, small
// renderers, and listener bookkeeping. Both dashboard-*.js files build on this
// so the page chrome only exists in one place.
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { requireRole, watchAuth, logOut } from './auth.js';

const unsubscribes = [];

// Register an onSnapshot unsubscribe so teardown() can detach it before sign-out.
export function track(unsubscribe) {
  if (typeof unsubscribe === 'function') unsubscribes.push(unsubscribe);
  return unsubscribe;
}

// Detach every tracked listener. Must run BEFORE signOut(), otherwise live
// snapshots start firing permission-denied while the redirect is in flight.
export function teardown() {
  while (unsubscribes.length) {
    const unsubscribe = unsubscribes.pop();
    try { unsubscribe(); } catch { /* already detached */ }
  }
}

export async function mountDashboard({ role, greet }) {
  const { user, profile } = await requireRole(role);

  const loading = document.getElementById('loading');
  const main = document.getElementById('dashboard-main');
  if (loading) loading.style.display = 'none';
  if (main) main.style.display = 'block';
  setText('greeting', greet(displayNameOf(profile)));

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      teardown();
      logOut();
    });
  }

  // requireRole unsubscribes after its first callback, so the page would
  // otherwise have no live auth listener. Attach a persistent one — it catches
  // sign-out in another tab and stops this page showing stale data.
  watchAuth((currentUser) => {
    if (!currentUser) {
      teardown();
      window.location.href = 'login.html';
    }
  });

  window.addEventListener('beforeunload', teardown);

  return { user, profile };
}

export function displayNameOf(profile) {
  if (!profile) return '';
  return profile.displayName || profile.email;
}

// Accepts an ISO string (users.createdAt), a Firestore Timestamp, or a Date.
export function formatDate(value) {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMoney(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

export function formatMinutes(n) {
  const total = Math.max(0, Math.round(Number(n) || 0));
  if (total < 60) return `${total}m`;
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

export function formatSeconds(n) {
  const total = Math.max(0, Math.round(Number(n) || 0));
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}m ${total % 60}s`;
}

export function relativeTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(date);
}

export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// tiles: [{ label, value, sub? }]
export function renderTiles(el, tiles) {
  if (!el) return;
  el.innerHTML = '';
  tiles.forEach((tile) => {
    const box = document.createElement('div');
    box.className = 'kpi';
    const label = document.createElement('span');
    label.className = 'kpi-label';
    label.textContent = tile.label;
    const value = document.createElement('div');
    value.className = 'kpi-value';
    value.textContent = tile.value;
    box.append(label, value);
    if (tile.sub) {
      const sub = document.createElement('p');
      sub.className = 'kpi-sub';
      sub.textContent = tile.sub;
      box.appendChild(sub);
    }
    el.appendChild(box);
  });
}

// renderItem(item) -> HTMLLIElement (or anything appendable).
export function renderList(el, items, renderItem, emptyText) {
  if (!el) return;
  el.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'd-empty';
    empty.textContent = emptyText;
    el.appendChild(empty);
    return;
  }
  const list = document.createElement('ul');
  list.className = 'd-list';
  items.forEach((item) => list.appendChild(renderItem(item)));
  el.appendChild(list);
}

// Builds the standard two-column history/queue row.
export function listRow({ main, sub, meta, action }) {
  const li = document.createElement('li');
  li.className = 'd-list-item';

  const left = document.createElement('div');
  left.style.minWidth = '0';
  const mainEl = document.createElement('div');
  mainEl.className = 'd-list-main';
  mainEl.textContent = main;
  left.appendChild(mainEl);
  if (sub) {
    const subEl = document.createElement('div');
    subEl.className = 'd-list-sub';
    subEl.textContent = sub;
    left.appendChild(subEl);
  }

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;align-items:center;gap:12px';
  if (meta) {
    const metaEl = document.createElement('span');
    metaEl.className = 'd-list-meta';
    metaEl.textContent = meta;
    right.appendChild(metaEl);
  }
  if (action) right.appendChild(action);

  li.append(left, right);
  return li;
}

// Shown when a Firestore read fails — usually because rules/indexes haven't
// been deployed yet, which would otherwise leave the page silently half-drawn.
export function showLoadError(el, err) {
  if (!el) return;
  const p = document.createElement('p');
  p.className = 'd-empty';
  p.textContent = err && err.code === 'failed-precondition'
    ? "Couldn't load — a Firestore index is still building. Try again in a minute."
    : "Couldn't load this right now. Check your connection and reload.";
  el.innerHTML = '';
  el.appendChild(p);
}

const PROFILE_FIELDS = ['displayName', 'available', 'languages', 'topics'];

// Mirrors the users/{uid} update rule — anything outside this allowlist would
// be rejected by Firestore anyway, so fail loudly here instead.
export function updateProfile(uid, patch) {
  const clean = {};
  Object.keys(patch).forEach((key) => {
    if (!PROFILE_FIELDS.includes(key)) throw new Error(`updateProfile: "${key}" is not an editable field`);
    clean[key] = patch[key];
  });
  return updateDoc(doc(db, 'users', uid), clean);
}
