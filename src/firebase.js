import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDUfiByr3_sKWYtHfrPfuG83T-R0BmXvXw",
  authDomain: "life-dashboard-e8a35.firebaseapp.com",
  projectId: "life-dashboard-e8a35",
  storageBucket: "life-dashboard-e8a35.firebasestorage.app",
  messagingSenderId: "36128445674",
  appId: "1:36128445674:web:a8dac0aa49b424ca8cf393"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });