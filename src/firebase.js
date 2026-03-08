// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDUfiByr3_sKWYtHfrPfuG83T-R0BmXvXw",
  authDomain: "life-dashboard-e8a35.firebaseapp.com",
  projectId: "life-dashboard-e8a35",
  storageBucket: "life-dashboard-e8a35.firebasestorage.app",
  messagingSenderId: "36128445674",
  appId: "1:36128445674:web:a8dac0aa49b424ca8cf393",
  measurementId: "G-K3DRCXXYXW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();



