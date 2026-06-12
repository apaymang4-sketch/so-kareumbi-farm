import {
  collection,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const collectionName = "stock_count_reports";

export async function getStockCountReports() {
  const q = query(collection(db, collectionName), orderBy("submittedAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateStockCountReport(id, data) {
  return await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}
