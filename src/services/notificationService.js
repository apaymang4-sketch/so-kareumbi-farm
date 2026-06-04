import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const readCollectionName = "notifications_read";

function makeNotificationKey(type, id) {
  return `${type}_${id}`;
}

export async function getAdminNotifications(userEmail = "") {
  const stockQuery = query(
    collection(db, "stock_counts"),
    where("status", "==", "menunggu_review")
  );

  const assignmentQuery = query(
    collection(db, "assignments"),
    where("status", "==", "selesai")
  );

  const readQuery = userEmail
    ? query(
        collection(db, readCollectionName),
        where("userEmail", "==", userEmail)
      )
    : null;

  const [stockSnap, assignmentSnap, readSnap] = await Promise.all([
    getDocs(stockQuery),
    getDocs(assignmentQuery),
    readQuery ? getDocs(readQuery) : Promise.resolve({ docs: [] }),
  ]);

  const readKeys = new Set(
    readSnap.docs.map((doc) => doc.data().notificationKey)
  );

  const stockNotifications = stockSnap.docs.map((docItem) => {
    const data = docItem.data();
    const key = makeNotificationKey("stock_count", docItem.id);

    return {
      id: docItem.id,
      key,
      type: "stock_count",
      title: "SO Masuk",
      message: `${data.countedBy || "Petugas"} input ${
        data.itemName || "-"
      } di ${data.locationName || "-"}.`,
      createdAt: data.createdAt || data.countedAt || "",
    };
  });

  const assignmentNotifications = assignmentSnap.docs.map((docItem) => {
    const data = docItem.data();
    const key = makeNotificationKey("assignment", docItem.id);

    return {
      id: docItem.id,
      key,
      type: "assignment",
      title: "Assignment Selesai",
      message: `${data.userName || "Petugas"} menyelesaikan ${
        data.taskTypeLabel || "tugas"
      } di ${data.targetName || "-"}.`,
      createdAt: data.updatedAt || data.createdAt || "",
    };
  });

  const notifications = [...stockNotifications, ...assignmentNotifications]
    .filter((item) => !readKeys.has(item.key))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return {
    count: notifications.length,
    notifications,
  };
}

export async function markNotificationAsRead(userEmail, notification) {
  if (!userEmail || !notification?.key) return;

  const q = query(
    collection(db, readCollectionName),
    where("userEmail", "==", userEmail),
    where("notificationKey", "==", notification.key)
  );

  const existingSnap = await getDocs(q);

  if (!existingSnap.empty) return;

  await addDoc(collection(db, readCollectionName), {
    userEmail,
    notificationKey: notification.key,
    notificationType: notification.type || "",
    sourceId: notification.id || "",
    title: notification.title || "",
    message: notification.message || "",
    readAt: new Date().toISOString(),
  });
}