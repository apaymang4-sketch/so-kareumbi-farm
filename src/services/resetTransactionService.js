import {
  collection,
  getDocs,
  limit,
  query,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const transactionCollections = [
  "stock_counts",
  "assignments",
  "sessions",
  "master_change_requests",
  "notifications_read",
];

async function deleteCollectionDocs(collectionName) {
  let deletedCount = 0;

  while (true) {
    const snapshot = await getDocs(query(collection(db, collectionName), limit(450)));

    if (snapshot.empty) {
      break;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();

    deletedCount += snapshot.size;

    if (snapshot.size < 450) {
      break;
    }
  }

  return deletedCount;
}

export async function resetTransactionData() {
  const result = {};

  for (const collectionName of transactionCollections) {
    result[collectionName] = await deleteCollectionDocs(collectionName);
  }

  return result;
}

export { transactionCollections };
