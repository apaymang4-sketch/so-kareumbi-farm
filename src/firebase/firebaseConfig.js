import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCy6eO-etYcYMrwErMXFx0AnMu_v2RDYpw",
  authDomain: "so-kareumbi-farm-2.firebaseapp.com",
  projectId: "so-kareumbi-farm-2",
  storageBucket: "so-kareumbi-farm-2.firebasestorage.app",
  messagingSenderId: "733134992699",
  appId: "1:733134992699:web:e659658d18ef89d156731e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
