import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDW-ZaMiuYfqY8lSP3ej0U8YY6DEB0m0QE",
  authDomain: "yurt-30b31.firebaseapp.com",
  projectId: "yurt-30b31",
  storageBucket: "yurt-30b31.firebasestorage.app",
  messagingSenderId: "471693640678",
  appId: "1:471693640678:web:a05c0dac110ec631a60c27",
  measurementId: "G-6SQGM4GCRP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "kargo-takip-v1";
