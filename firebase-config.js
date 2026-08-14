import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Filled in once the Firebase project is created (see plan step: Firebase setup).
const firebaseConfig = {
  apiKey: 'AIzaSyCn8ybaUydVhv48Exl_NKro0f-0rtUpzNU',
  authDomain: 'cadence-app-dg-919fa.firebaseapp.com',
  projectId: 'cadence-app-dg-919fa',
  storageBucket: 'cadence-app-dg-919fa.firebasestorage.app',
  messagingSenderId: '821018270970',
  appId: '1:821018270970:web:2c93008c68ad5d33f2fd43',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
