// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAoqy2Tnwmp_sfU903bvG_EcyJ9QXXu9a4",
    authDomain: "sample-firebase-ai-app-198c0.firebaseapp.com",
    projectId: "sample-firebase-ai-app-198c0",
    storageBucket: "sample-firebase-ai-app-198c0.firebasestorage.app",
    messagingSenderId: "838973313914",
    appId: "1:838973313914:web:c4a1c229ebaefdeb023cc3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
console.log('Firebase Service: Objeto auth foi criado?', auth);
export const db = getFirestore(app);
export const appId = 'default-fut-app';