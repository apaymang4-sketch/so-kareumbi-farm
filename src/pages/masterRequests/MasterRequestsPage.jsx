import { useEffect, useMemo, useState } from "react";

import {
  approveMasterChangeRequest,
  getMasterChangeRequests,
  rejectMasterChangeRequest,
} from "../../services/masterChangeRequestService";

function MasterRequestsPage() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("menunggu_approval");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    try {
      setLoading(true);
      setRows(await getMasterChangeRequests());
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil approval master lapangan.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (statusFilter === "semua") return rows;
    return rows.filter((item) => (item.status || "menunggu_approval") === statusFilter);
  }, [rows, statusFilter]);

  async function approve(item) {
    const ok = confirm(`Approve ${labelRequestType(item.requestType)}?\n\n${describeRequest(item)}`);
    if (!ok) return;

    try {
      await approveMasterChangeRequest(item);
      await loadRows();
      alert("Request master berhasil disetujui.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Gagal approve request master.");
    }
  }

  async function reject(item) {
    const reason = prompt("Alasan penolakan:", "");
    if (reason === null) return;

    try {
      await rejectMasterChangeRequest(item.id, reason.trim());
      await loadRows();
      alert("Request master ditolak.");
    } catch (error) {
      console.error(error);
      alert("Gagal menolak request master.");
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Approval Master Lapangan</h1>
          <p>Review usulan tambah/kurang sekat dan item dari Android sebelum masuk master data.</p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={loadRows}>
            Refresh
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="filter-row">
          <div className="form-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="menunggu_approval">Menunggu Approval</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
              <option value="semua">Semua</option>
            </select>
          </div>
        </div>

        <table className="data-table compact-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Tipe</th>
              <th>Lokasi/Kandang</th>
              <th>Detail</th>
              <th>Petugas</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Mengambil data...</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="7">Belum ada request master.</td>
              </tr>
            ) : (
              filteredRows.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>{labelRequestType(item.requestType)}</td>
                  <td>{item.targetName || item.locationName || "-"}</td>
                  <td>{describeRequest(item)}</td>
                  <td>{item.officerName || "-"}</td>
                  <td>
                    <span className={`badge ${statusBadge(item.status)}`}>
                      {labelStatus(item.status)}
                    </span>
                  </td>
                  <td>
                    {(item.status || "menunggu_approval") === "menunggu_approval" ? (
                      <div className="row-actions">
                        <button className="table-button success" onClick={() => approve(item)}>
                          Approve
                        </button>
                        <button className="table-button danger" onClick={() => reject(item)}>
                          Tolak
                        </button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function describeRequest(item) {
  const payload = item.payload || {};

  if (item.requestType === "cage_slot_add") {
    return `Tambah sekat L${payload.lorong}-B${payload.baris}-S${payload.sekat}`;
  }
  if (item.requestType === "cage_slot_remove") {
    return `Kurangi sekat L${payload.lorong}-B${payload.baris}-S${payload.sekat}`;
  }
  if (item.requestType === "item_add") {
    return `Tambah item ${payload.name || item.targetName || "-"} (${payload.unit || "-"})`;
  }
  if (item.requestType === "item_remove") {
    return `Kurangi item ${item.targetName || payload.name || "-"}`;
  }

  return "-";
}

function labelRequestType(type) {
  const labels = {
    cage_slot_add: "Tambah Sekat",
    cage_slot_remove: "Kurangi Sekat",
    item_add: "Tambah Item",
    item_remove: "Kurangi Item",
  };

  return labels[type] || type || "-";
}

function labelStatus(status) {
  const labels = {
    menunggu_approval: "Menunggu Approval",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
  };

  return labels[status] || status || "Menunggu Approval";
}

function statusBadge(status) {
  const badges = {
    menunggu_approval: "gray",
    disetujui: "green",
    ditolak: "red",
  };

  return badges[status] || "gray";
}

function formatDateTime(value) {
  if (!value) return "-";

  let date;
  if (value && typeof value.toDate === "function") {
    date = value.toDate();
  } else if (value && typeof value === "object" && value.seconds) {
    date = new Date(value.seconds * 1000);
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) return "-";

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("id-ID", { month: "short" });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

export default MasterRequestsPage;
