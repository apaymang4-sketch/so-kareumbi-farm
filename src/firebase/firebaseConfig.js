import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGKb0XMW13_O2Y7fEv-wIy7WdtGpaeviI",
  authDomain: "so-kareumbi-farm.firebaseapp.com",
  projectId: "so-kareumbi-farm",
  storageBucket: "so-kareumbi-farm.firebasestorage.app",
  messagingSenderId: "499615400360",
  appId: "1:499615400360:web:d710fa77dd63453ada1d9d",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;