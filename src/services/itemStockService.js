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

const collectionName = "item_stocks";

export async function getItemStocks() {
  const q = query(collection(db, collectionName), orderBy("itemCode", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function createItemStock(data) {
  return await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateItemStock(id, data) {
  return await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteItemStock(id) {
  return await deleteDoc(doc(db, collectionName, id));
}
