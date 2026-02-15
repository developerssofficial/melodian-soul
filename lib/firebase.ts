import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCIFum0PPHPcgK5ns55D-BfGvYgT0uQLJE",
  authDomain: "melodian-soul.firebaseapp.com",
  projectId: "melodian-soul",
  storageBucket: "melodian-soul.firebasestorage.app",
  messagingSenderId: "65925900526",
  appId: "1:65925900526:web:249f55b83a3f896dd8abff",
  measurementId: "G-NHD93HKRD5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();