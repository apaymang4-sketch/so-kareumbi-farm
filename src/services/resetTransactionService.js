import {
  collection,
  getDocs,
  limit,
  query,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const resetCollections = [
  { name: "locations", label: "Master Lokasi Gudang", group: "Master Data" },
  { name: "cages", label: "Master Kandang", group: "Master Data" },
  { name: "items", label: "Master Barang", group: "Master Data" },
  { name: "item_stocks", label: "Stok Barang per Lokasi", group: "Master Data" },
  { name: "sessions", label: "Sesi Opname", group: "Stock Opname" },
  { name: "assignments", label: "Assignment Petugas", group: "Stock Opname" },
  { name: "stock_counts", label: "Hasil Input Stock Opname", group: "Review/Laporan" },
  { name: "stock_count_reports", label: "Berita Acara APK", group: "Review/Laporan" },
  { name: "master_change_requests", label: "Approval Master Lapangan", group: "Review/Laporan" },
  { name: "notifications_read", label: "Status Baca Notifikasi", group: "Sistem" },
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

export async function resetSelectedData(collectionNames = []) {
  const result = {};

  for (const collectionName of collectionNames) {
    result[collectionName] = await deleteCollectionDocs(collectionName);
  }

  return result;
}

export async function resetTransactionData() {
  const transactionCollections = [
    "stock_counts",
    "stock_count_reports",
    "assignments",
    "sessions",
    "master_change_requests",
    "notifications_read",
  ];

  return await resetSelectedData(transactionCollections);
}

export { resetCollections };
