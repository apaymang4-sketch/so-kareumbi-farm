import { useEffect, useMemo, useState } from "react";

import {
  getAssignments,
  createAssignment,
  deleteAssignment,
} from "../../services/assignmentService";

import { getSessions } from "../../services/sessionService";
import { getUsers } from "../../services/userService";
import { getLocations } from "../../services/locationService";
import { getCages } from "../../services/cageService";

const emptyForm = {
  sessionId: "",
  userId: "",
  taskType: "gudang",
  targetId: "",
  note: "",
};

function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [cages, setCages] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);

      const [assignmentData, sessionData, userData, locationData, cageData] =
        await Promise.all([
          getAssignments(),
          getSessions(),
          getUsers(),
          getLocations(),
          getCages(),
        ]);

      setAssignments(assignmentData);
      setSessions(sessionData);
      setUsers(userData);
      setLocations(locationData);
      setCages(cageData);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data assignment dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const activeSessions = useMemo(() => {
    return sessions.filter(
      (item) => item.status === "draft" || item.status === "berjalan"
    );
  }, [sessions]);

  const activePetugas = useMemo(() => {
    return users.filter(
      (item) => item.role === "petugas" && item.isActive !== false
    );
  }, [users]);

  const targetOptions = useMemo(() => {
    const activeLocations = locations
      .filter((item) => item.isActive !== false)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: "lokasi",
        label: `${item.name} - ${labelLocationType(item.type)}`,
      }));

    const activeCages = cages
      .filter((item) => item.isActive !== false)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: "kandang",
        totalPopulation: Number(item.totalPopulation || 0),
        label: `${item.name} - Kandang${
          item.ageWeeks ? ` - ${item.ageWeeks} minggu` : ""
        }${item.totalPopulation ? ` - ${formatNumber(item.totalPopulation)} ekor` : ""}`,
      }));

    if (form.taskType === "gudang") return [...activeLocations, ...activeCages];

    if (form.taskType === "telur") {
      return [...activeLocations, ...activeCages];
    }

    if (
      form.taskType === "ayam_hidup" ||
      form.taskType === "ayam_mati" ||
      form.taskType === "ayam_upkir"
    ) {
      return activeCages;
    }

    return [];
  }, [form.taskType, locations, cages]);

  const filteredAssignments = useMemo(() => {
    const keyword = search.toLowerCase();

    return assignments.filter((item) => {
      return (
        String(item.sessionName || "").toLowerCase().includes(keyword) ||
        String(item.userName || "").toLowerCase().includes(keyword) ||
        String(item.targetName || "").toLowerCase().includes(keyword) ||
        String(item.targetType || "").toLowerCase().includes(keyword) ||
        labelTaskType(item.taskType).toLowerCase().includes(keyword)
      );
    });
  }, [assignments, search]);

  function openForm() {
    setForm(emptyForm);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "taskType") {
      setForm((prev) => ({
        ...prev,
        taskType: value,
        targetId: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.sessionId) return alert("Sesi opname wajib dipilih.");
    if (!form.userId) return alert("Petugas wajib dipilih.");
    if (!form.taskType) return alert("Tipe tugas wajib dipilih.");
    if (!form.targetId) return alert("Lokasi/kandang wajib dipilih.");
    if (form.taskType === "ayam_hidup" && !form.note.trim()) {
      return alert("Untuk Hitung Ayam Hidup, catatan wajib diisi. Contoh: Lorong 1, Lorong 2, atau Area kanan.");
    }

    const selectedSession = sessions.find((item) => item.id === form.sessionId);
    const selectedUser = users.find((item) => item.id === form.userId);
    const selectedTarget = targetOptions.find(
      (item) => item.id === form.targetId
    );

    if (!selectedSession) return alert("Sesi opname tidak ditemukan.");

    if (
      selectedSession.status === "selesai" ||
      selectedSession.status === "dikunci"
    ) {
      return alert("Sesi selesai/dikunci tidak bisa dibuat assignment.");
    }

    if (
      !selectedUser ||
      selectedUser.role !== "petugas" ||
      selectedUser.isActive === false
    ) {
      return alert("Petugas tidak valid atau tidak aktif.");
    }

    if (!selectedTarget) return alert("Lokasi/kandang tidak valid.");

    const duplicate = assignments.some(
      (item) =>
        item.sessionId === form.sessionId &&
        item.userId === form.userId &&
        item.taskType === form.taskType &&
        item.targetId === form.targetId
    );

    if (duplicate) {
      return alert("Assignment yang sama sudah ada.");
      
    }
    const sameCageOtherPetugas = assignments.some(
      (item) =>
        item.sessionId === form.sessionId &&
        item.taskType === form.taskType &&
        item.targetId === form.targetId &&
        item.userId !== form.userId
    );
    
    if (sameCageOtherPetugas && form.taskType === "ayam_hidup") {
      const ok = confirm(
        "Kandang ini sudah ditugaskan ke petugas lain.\n\nLanjut buat assignment tambahan untuk pembagian area/l湧orong?"
      );
    
      if (!ok) return;
    }

    const ok = confirm(
      `Simpan assignment ${selectedUser.name} untuk ${selectedTarget.name}?`
    );
    if (!ok) return;

    try {
      await createAssignment({
        sessionId: selectedSession.id,
        sessionCode: selectedSession.code || "",
        sessionName: selectedSession.name,
        sessionDate: selectedSession.date,
        sessionStatus: selectedSession.status,

        userId: selectedUser.id,
        userName: selectedUser.name,
        userEmail: selectedUser.email || "",

        taskType: form.taskType,
        taskTypeLabel: labelTaskType(form.taskType),

        targetId: selectedTarget.id,
        targetName: selectedTarget.name,
        targetType: selectedTarget.type,
        targetPopulation: selectedTarget.totalPopulation || 0,

        status: "belum_dihitung",
        progress: 0,
        note: form.note.trim(),
        isUsed: false,
      });

      await loadAllData();
      closeForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan assignment ke Firebase.");
    }
  }

  async function handleDelete(item) {
    if (item.status !== "belum_dihitung") {
      alert("Assignment sudah diproses. Tidak bisa dihapus.");
      return;
    }

    const ok = confirm(`Hapus assignment ${item.userName} - ${item.targetName}?`);
    if (!ok) return;

    try {
      await deleteAssignment(item.id);
      await loadAllData();
      alert("Assignment berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus assignment dari Firebase.");
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Assignment Petugas</h1>
          <p>
            Admin menentukan petugas hanya boleh menghitung lokasi/kandang yang
            ditugaskan.
          </p>
        </div>

        <div className="page-actions">
          <button className="primary-button" onClick={openForm}>
            + Tambah Assignment
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <label>Cari Assignment</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sesi, petugas, lokasi, tipe tugas..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Assignment</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Sesi</th>
              <th>Tanggal</th>
              <th>Petugas</th>
              <th>Tipe Tugas</th>
              <th>Lokasi/Kandang</th>
              <th>Jenis Target</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10">Mengambil data...</td>
              </tr>
            ) : filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan="10">Belum ada assignment.</td>
              </tr>
            ) : (
              filteredAssignments.map((item) => (
                <tr key={item.id}>
                  <td>{item.sessionName}</td>
                  <td>{formatDate(item.sessionDate)}</td>
                  <td>{item.userName}</td>
                  <td>{item.taskTypeLabel || labelTaskType(item.taskType)}</td>
                  <td>{item.targetName}</td>
                  <td>{labelTargetType(item.targetType)}</td>
                  <td>
                    <span className={`badge ${statusBadge(item.status)}`}>
                      {labelStatus(item.status)}
                    </span>
                  </td>
                  <td>{item.progress || 0}%</td>
                  <td>{item.note || "-"}</td>
                  <td>
                    <button
                      className="table-button danger"
                      onClick={() => handleDelete(item)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Tambah Assignment</h3>
              <button type="button" onClick={closeForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Sesi Opname</label>
                <select
                  name="sessionId"
                  value={form.sessionId}
                  onChange={handleChange}
                >
                  <option value="">Pilih Sesi</option>
                  {activeSessions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {formatDate(item.date)} -{" "}
                      {labelSessionStatus(item.status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Petugas</label>
                <select name="userId" value={form.userId} onChange={handleChange}>
                  <option value="">Pilih Petugas</option>
                  {activePetugas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tipe Tugas</label>
                <select
                  name="taskType"
                  value={form.taskType}
                  onChange={handleChange}
                >
                  <option value="gudang">Hitung Barang</option>
                  <option value="telur">Hitung Telur</option>
                  <option value="ayam_hidup">Hitung Ayam Hidup</option>
                  <option value="ayam_mati">Hitung Ayam Mati</option>
                  <option value="ayam_upkir">Hitung Ayam Upkir</option>
                </select>
              </div>

              <div className="form-group">
                <label>Lokasi / Kandang</label>
                <select
                  name="targetId"
                  value={form.targetId}
                  onChange={handleChange}
                >
                  <option value="">Pilih Lokasi/Kandang</option>
                  {targetOptions.map((item) => (
                    <option key={`${item.type}-${item.id}`} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full">
              <label>
  Catatan {form.taskType === "ayam_hidup" ? "(Wajib untuk pembagian area)" : ""}
</label>
                <input
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder={
                    form.taskType === "ayam_hidup"
                      ? "Wajib. Contoh: Lorong 1 / Lorong 2 / Area kanan"
                      : "Opsional"
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                >
                  Batal
                </button>
                <button type="submit" className="primary-button">
                  Simpan Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function labelTaskType(type) {
  const labels = {
    gudang: "Hitung Barang",
    telur: "Hitung Telur",
    ayam_hidup: "Hitung Ayam Hidup",
    ayam_mati: "Hitung Ayam Mati",
    ayam_upkir: "Hitung Ayam Upkir",

    // legacy lama supaya data lama tetap kebaca
    ayam_mati_upkir: "Hitung Mati/Upkir",
  };

  return labels[type] || type;
}

function labelStatus(status) {
  const labels = {
    belum_dihitung: "Belum Dihitung",
    proses: "Proses",
    selesai: "Selesai",
    perlu_cek: "Perlu Cek",
  };

  return labels[status] || status;
}

function statusBadge(status) {
  const badges = {
    belum_dihitung: "gray",
    proses: "blue",
    selesai: "green",
    perlu_cek: "red",
  };

  return badges[status] || "gray";
}

function labelSessionStatus(status) {
  const labels = {
    draft: "Draft",
    berjalan: "Berjalan",
    selesai: "Selesai",
    dikunci: "Dikunci",
  };

  return labels[status] || status;
}

function labelTargetType(type) {
  const labels = {
    lokasi: "Lokasi",
    kandang: "Kandang",
  };

  return labels[type] || type || "-";
}

function labelLocationType(type) {
  const labels = {
    gudang_utama: "Gudang Utama",
    gudang_pakan: "Gudang Pakan",
    gudang_obat: "Gudang Obat",
    gudang_telur: "Gudang Telur",
    area_sortir: "Area Sortir",
    area_transit: "Area Transit",
    lainnya: "Lainnya",
  };

  return labels[type] || type;
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

export default AssignmentsPage;
