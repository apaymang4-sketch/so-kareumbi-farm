import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    sendPasswordResetEmail,
  } from "firebase/auth";
  
  import {
    collection,
    getDocs,
    query,
    where,
  } from "firebase/firestore";
  
  import { auth, db } from "../firebase/firebaseConfig";
  
  export async function loginUser(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  }
  
  export async function logoutUser() {
    return await signOut(auth);
  }
  
  export async function createAuthUser(email, password) {
    return await createUserWithEmailAndPassword(auth, email, password);
  }
  
  export async function changeCurrentUserPassword(newPassword) {
    if (!auth.currentUser) {
      throw new Error("User belum login.");
    }
  
    return await updatePassword(auth.currentUser, newPassword);
  }
  
  export async function sendResetPassword(email) {
    return await sendPasswordResetEmail(auth, email);
  }
  
  export async function getUserProfileByEmail(email) {
    const q = query(
      collection(db, "users"),
      where("email", "==", email.toLowerCase())
    );
  
    const snapshot = await getDocs(q);
  
    if (snapshot.empty) return null;
  
    const userDoc = snapshot.docs[0];
  
    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  }