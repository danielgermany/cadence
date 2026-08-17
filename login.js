import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';
import { watchAuth, dashboardFor } from './auth.js';

const params = new URLSearchParams(window.location.search);
const initialRole = params.get('role') === 'friend' ? 'friend' : 'consumer';

const roleConsumer = document.getElementById('role-consumer');
const roleFriend = document.getElementById('role-friend');
const modeSignin = document.getElementById('mode-signin');
const modeSignup = document.getElementById('mode-signup');
const nameField = document.getElementById('name-field');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');
const title = document.getElementById('title');
const subtitle = document.getElementById('subtitle');

(roleConsumer && initialRole === 'consumer' ? roleConsumer : roleFriend).checked = true;

function currentRole() {
  return roleFriend.checked ? 'friend' : 'consumer';
}
function currentMode() {
  return modeSignup.checked ? 'signup' : 'signin';
}

function updateCopy() {
  const role = currentRole();
  const mode = currentMode();
  nameField.style.display = mode === 'signup' ? 'flex' : 'none';
  title.textContent = mode === 'signup' ? 'Create your account' : 'Log in';
  subtitle.textContent = role === 'friend'
    ? 'For Friends & Coaches — manage availability and see your dashboard.'
    : 'For Cadence customers — chat with a Friend and track your account.';
  submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
  formError.style.display = 'none';
}
[roleConsumer, roleFriend, modeSignin, modeSignup].forEach((el) => el.addEventListener('change', updateCopy));
updateCopy();

// Already signed in — skip straight to the dashboard.
watchAuth((user, profile) => {
  if (user && profile) window.location.href = dashboardFor(profile.role);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.style.display = 'none';
  submitBtn.disabled = true;
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const role = currentRole();

  try {
    if (currentMode() === 'signup') {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        role,
        displayName: nameInput.value.trim() || email.split('@')[0],
        createdAt: new Date().toISOString(),
        // Seeded so the dashboard profile panel always has keys to edit.
        available: role === 'friend',
        languages: [],
        topics: [],
      });
      window.location.href = dashboardFor(role);
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (!snap.exists()) throw new Error('No profile found for this account.');
      window.location.href = dashboardFor(snap.data().role);
    }
  } catch (err) {
    formError.textContent = friendlyError(err);
    formError.style.display = 'block';
    submitBtn.disabled = false;
  }
});

function friendlyError(err) {
  const code = err && err.code;
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists — try signing in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Incorrect email or password.';
  if (code === 'auth/user-not-found') return 'No account found with this email.';
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  return err.message || 'Something went wrong. Please try again.';
}
