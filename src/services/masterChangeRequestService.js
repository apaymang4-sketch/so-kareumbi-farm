import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

const collectionName = "master_change_requests";

export async function getMasterChangeRequests() {
  const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function approveMasterChangeRequest(request) {
  const now = new Date().toISOString();

  if (request.requestType === "cage_slot_add") {
    const cageRef = doc(db, "cages", request.targetId);
    const cageSnap = await getDoc(cageRef);
    if (!cageSnap.exists()) throw new Error("Master kandang tidak ditemukan.");

    const cage = { id: cageSnap.id, ...cageSnap.data() };
    const payload = request.payload || {};
    const lorong = Number(payload.lorong || 0);
    const baris = Number(payload.baris || 0);
    const sekat = Number(payload.sekat || 0);
    const structure = Array.isArray(cage.structure) ? cage.structure : [];
    const exists = structure.some(
      (item) =>
        Number(item.lorong || 0) === lorong &&
        Number(item.baris || 0) === baris &&
        Number(item.sekat || 0) === sekat
    );

    if (!exists) {
      const cageCode = cage.code || request.targetName || request.targetId;
      await updateDoc(cageRef, {
        structure: [
          ...structure,
          {
            id: `${cage.id}-L${lorong}-B${baris}-S${sekat}`,
            cageId: cage.id,
            cageCode,
            cageName: cage.name || request.targetName || "",
            lorong,
            baris,
            sekat,
            code: `${cageCode}-L${lorong}-B${baris}-S${sekat}`,
            source: "android_field",
            approvedAt: now,
          },
        ].sort(sortSlot),
        lorongCount: Math.max(Number(cage.lorongCount || 0), lorong),
        barisCount: Math.max(Number(cage.barisCount || 0), baris),
        sekatCount: Math.max(Number(cage.sekatCount || 0), sekat),
        updatedAt: now,
      });
    }
  }

  if (request.requestType === "cage_slot_remove") {
    const cageRef = doc(db, "cages", request.targetId);
    const cageSnap = await getDoc(cageRef);
    if (!cageSnap.exists()) throw new Error("Master kandang tidak ditemukan.");

    const cage = cageSnap.data();
    const payload = request.payload || {};
    const lorong = Number(payload.lorong || 0);
    const baris = Number(payload.baris || 0);
    const sekat = Number(payload.sekat || 0);
    const structure = Array.isArray(cage.structure) ? cage.structure : [];

    await updateDoc(cageRef, {
      structure: structure.filter(
        (item) =>
          !(
            Number(item.lorong || 0) === lorong &&
            Number(item.baris || 0) === baris &&
            Number(item.sekat || 0) === sekat
          )
      ),
      updatedAt: now,
    });
  }

  if (request.requestType === "item_add") {
    const payload = request.payload || {};
    const itemRef = await addDoc(collection(db, "items"), {
      code: makeItemCode(payload.name),
      name: String(payload.name || "").trim(),
      category: payload.category || "lainnya",
      unit: payload.unit || "",
      systemStock: 0,
      locationId: payload.locationId || request.locationId || "",
      locationName: payload.locationName || request.locationName || "",
      isActive: true,
      isUsed: false,
      source: "android_field",
      createdAt: now,
      updatedAt: now,
    });

    await updateStockCountRequestStatus(request.stockCountId, {
      itemId: itemRef.id,
      masterItemId: itemRef.id,
    });
  }

  if (request.requestType === "item_remove") {
    if (!request.targetId) throw new Error("ID item master tidak ditemukan.");

    await updateDoc(doc(db, "items", request.targetId), {
      isActive: false,
      updatedAt: now,
    });
  }

  await updateStockCountRequestStatus(request.stockCountId);

  await updateDoc(doc(db, collectionName, request.id), {
    status: "disetujui",
    reviewedAt: now,
    updatedAt: now,
  });
}

export async function rejectMasterChangeRequest(id, reason = "") {
  const now = new Date().toISOString();
  const requestSnap = await getDoc(doc(db, collectionName, id));
  const request = requestSnap.exists() ? requestSnap.data() : null;

  if (request?.stockCountId) {
    await updateDoc(doc(db, "stock_counts", request.stockCountId), {
      masterRequestStatus: "ditolak",
      updatedAt: now,
    });
  }

  await updateDoc(doc(db, collectionName, id), {
    status: "ditolak",
    rejectionReason: reason,
    reviewedAt: now,
    updatedAt: now,
  });
}

async function updateStockCountRequestStatus(stockCountId, extraData = {}) {
  if (!stockCountId) return;

  await updateDoc(doc(db, "stock_counts", stockCountId), {
    masterRequestStatus: "disetujui",
    ...extraData,
    updatedAt: new Date().toISOString(),
  });
}

function sortSlot(a, b) {
  return (
    Number(a.lorong || 0) - Number(b.lorong || 0) ||
    Number(a.baris || 0) - Number(b.baris || 0) ||
    Number(a.sekat || 0) - Number(b.sekat || 0)
  );
}

function makeItemCode(name) {
  const base = String(name || "ITEM")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18);

  return `${base || "ITEM"}_${Date.now().toString().slice(-6)}`;
}
