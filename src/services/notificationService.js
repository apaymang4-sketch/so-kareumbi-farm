import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export async function getAdminNotifications() {
  const stockQuery = query(
    collection(db, "stock_counts"),
    where("status", "==", "menunggu_review")
  );

  const assignmentQuery = query(
    collection(db, "assignments"),
    where("status", "==", "selesai")
  );

  const [stockSnap, assignmentSnap] = await Promise.all([
    getDocs(stockQuery),
    getDocs(assignmentQuery),
  ]);

  const stockNotifications = stockSnap.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      type: "stock_count",
      title: "SO Masuk",
      message: `${data.countedBy || "Petugas"} input ${data.itemName || "-"} di ${
        data.locationName || "-"
      }.`,
    };
  });

  const assignmentNotifications = assignmentSnap.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      type: "assignment",
      title: "Assignment Selesai",
      message: `${data.userName || "Petugas"} menyelesaikan ${
        data.taskTypeLabel || "tugas"
      } di ${data.targetName || "-"}.`,
    };
  });

  const notifications = [
    ...stockNotifications,
    ...assignmentNotifications,
  ];

  return {
    count: notifications.length,
    notifications,
  };
}