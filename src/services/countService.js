import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    orderBy,
    query,
  } from "firebase/firestore";
  
  import { db } from "../firebase/firebaseConfig";
  
  const collectionName = "stock_counts";
  
  export async function getStockCounts() {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
  
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  }
  
  export async function createStockCount(data) {
    return await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  export async function updateStockCount(id, data) {
    return await updateDoc(doc(db, collectionName, id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }