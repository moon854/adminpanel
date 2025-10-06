import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase configuration - Same as mobile app
const firebaseConfig = {
  apiKey: "AIzaSyAlGwcCqEWD74fzM2e5rz0LfO4u3aPoqyU",
  authDomain: "heavyrent-f6435.firebaseapp.com",
  projectId: "heavyrent-f6435",
  storageBucket: "heavyrent-f6435.firebasestorage.app",
  messagingSenderId: "371723438381",
  appId: "1:371723438381:web:d8a40803d5e62ac6452ba4",
  measurementId: "G-JPJRGFK53B",
  databaseURL: "https://heavyrent-f6435-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const realtimeDb = getDatabase(app);

export default app;
