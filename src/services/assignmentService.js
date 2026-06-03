import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    query,
  } from "firebase/firestore";
  
  import { db } from "../firebase/firebaseConfig";
  
  const collectionName = "assignments";
  
  export async function getAssignments() {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
  
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  }
  
  export async function createAssignment(data) {
    return await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  export async function updateAssignment(id, data) {
    return await updateDoc(doc(db, collectionName, id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }
  
  export async function deleteAssignment(id) {
    return await deleteDoc(doc(db, collectionName, id));
  }