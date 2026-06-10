import {
  collection,
  getDocs,
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
