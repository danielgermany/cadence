import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

export function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) { callback(null, null); return; }
    const snap = await getDoc(doc(db, 'users', user.uid));
    const profile = snap.exists() ? snap.data() : null;
    callback(user, profile);
  });
}

export function dashboardFor(role) {
  return role === 'friend' ? 'dashboard-friend.html' : 'dashboard-consumer.html';
}

export async function logOut() {
  await signOut(auth);
  window.location.href = 'index.html';
}

// Redirects to login.html if signed out, or to the other role's dashboard if
// signed in as the wrong role. Resolves with { user, profile } once allowed.
export function requireRole(role) {
  return new Promise((resolve) => {
    const unsubscribe = watchAuth((user, profile) => {
      unsubscribe();
      if (!user || !profile) {
        window.location.href = 'login.html';
        return;
      }
      if (profile.role !== role) {
        window.location.href = dashboardFor(profile.role);
        return;
      }
      resolve({ user, profile });
    });
  });
}

// Like requireRole, but accepts either role. Used by the chat window, which
// serves both a Consumer and a Friend and branches on profile.role itself.
export function requireAuth() {
  return new Promise((resolve) => {
    const unsubscribe = watchAuth((user, profile) => {
      unsubscribe();
      if (!user || !profile) {
        window.location.href = 'login.html';
        return;
      }
      resolve({ user, profile });
    });
  });
}
