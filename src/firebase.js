import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCvN8e41HALTiRwwq-nOsAvUf6AwH-ZBCM",
  authDomain: "movieee12-8049c.firebaseapp.com",
  projectId: "movieee12-8049c",
  storageBucket: "movieee12-8049c.firebasestorage.app",
  messagingSenderId: "44360336230",
  appId: "1:44360336230:web:5755e1c646ad1898ba3ea7",
  measurementId: "G-J3NQFSN9HW"
};

const app = initializeApp(firebaseConfig);
try {
  getAnalytics(app);
} catch (err) {
  console.warn("Analytics not supported in this environment", err);
}

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  console.error("Firebase persistence error:", err.message);
});

export default app;
