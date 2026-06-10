import { useEffect, useMemo, useState } from "react";

import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
} from "../../services/sessionService";

const emptyForm = {
  code: "",
  name: "",
  date: "",
  status: "draft",
  note: "",
};

function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setLoading(true);
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data sesi opname dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = useMemo(() => {
    const keyword = search.toLowerCase();

    return sessions.filter((item) => {
      return (
        String(item.code || "").toLowerCase().includes(keyword) ||
        String(item.name || "").toLowerCase().includes(keyword) ||
        labelStatus(item.status).toLowerCase().includes(keyword)
      );
    });
  }, [sessions, search]);

  function openAddForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      code: generateSessionCode(),
      date: new Date().toISOString().slice(0, 10),
    });
    setShowForm(true);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.code.trim()) {
      alert("Kode sesi wajib diisi.");
      return;
    }

    if (!form.name.trim()) {
      alert("Nama sesi wajib diisi.");
      return;
    }

    if (!form.date) {
      alert("Tanggal sesi wajib diisi.");
      return;
    }

    const codeExists = sessions.some(
      (item) =>
        String(item.code || "").toLowerCase() === form.code.trim().toLowerCase() &&
        item.id !== editingId
    );

    if (codeExists) {
      alert("Kode sesi sudah digunakan.");
      return;
    }

    const ok = confirm(`${editingId ? "Update" : "Simpan"} sesi opname ${form.name.trim()}?`);
    if (!ok) return;

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        date: form.date,
        status: form.status,
        note: form.note || "",
        isUsed: false,
      };

      if (editingId) {
        await updateSession(editingId, payload);
      } else {
        await createSession(payload);
      }

      await loadSessions();
      closeForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan sesi opname ke Firebase.");
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      code: item.code || "",
      name: item.name || "",
      date: item.date || "",
      status: item.status || "draft",
      note: item.note || "",
    });
    setShowForm(true);
  }

  async function handleDelete(item) {
    if (item.isUsed || item.status !== "draft") {
      alert("Sesi tidak bisa dihapus. Hanya sesi Draft yang belum digunakan yang boleh dihapus.");
      return;
    }

    const ok = confirm(`Hapus sesi ${item.name}?`);
    if (!ok) return;

    try {
      await deleteSession(item.id);
      await loadSessions();
      alert("Sesi opname berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus sesi opname dari Firebase.");
    }
  }

  async function handleChangeStatus(item, nextStatus) {
    const ok = confirm(`Ubah status ${item.name} menjadi ${labelStatus(nextStatus)}?`);
    if (!ok) return;

    try {
      await updateSession(item.id, {
        ...item,
        status: nextStatus,
        isUsed: nextStatus !== "draft" ? true : item.isUsed,
      });

      await loadSessions();
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status sesi.");
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Sesi Opname</h1>
          <p>Buat dan kelola periode stock opname.</p>
        </div>

        <div className="page-actions">
          <button className="primary-button" onClick={openAddForm}>
            + Buat Sesi
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <label>Cari Sesi</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, status..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Sesi Opname</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Sesi</th>
              <th>Tanggal</th>
              <th>Status</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Mengambil data...</td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td colSpan="6">Tidak ada data sesi.</td>
              </tr>
            ) : (
              filteredSessions.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>
                    <span className={`badge ${statusBadge(item.status)}`}>
                      {labelStatus(item.status)}
                    </span>
                  </td>
                  <td>{item.note || "-"}</td>
                  <td>
                    <button className="table-button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>

                    {item.status === "draft" && (
                      <button
                        className="table-button success"
                        onClick={() => handleChangeStatus(item, "berjalan")}
                      >
                        Mulai
                      </button>
                    )}

                    {item.status === "berjalan" && (
                      <button
                        className="table-button warning"
                        onClick={() => handleChangeStatus(item, "selesai")}
                      >
                        Selesai
                      </button>
                    )}

                    {item.status === "selesai" && (
                      <button
                        className="table-button danger"
                        onClick={() => handleChangeStatus(item, "dikunci")}
                      >
                        Kunci
                      </button>
                    )}

                    {item.status === "draft" && !item.isUsed && (
                      <button
                        className="table-button danger"
                        onClick={() => handleDelete(item)}
                      >
                        Hapus
                      </button>
                    )}
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
              <h3>{editingId ? "Edit Sesi Opname" : "Buat Sesi Opname"}</h3>
              <button type="button" onClick={closeForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Kode Sesi</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Contoh: SO-2026-001"
                />
              </div>

              <div className="form-group">
                <label>Nama Sesi</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Opname Juni 2026"
                />
              </div>

              <div className="form-group">
                <label>Tanggal</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="draft">Draft</option>
                  <option value="berjalan">Berjalan</option>
                  <option value="selesai">Selesai</option>
                  <option value="dikunci">Dikunci</option>
                </select>
              </div>

              <div className="form-group full">
                <label>Catatan</label>
                <input
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="Opsional"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeForm}>
                  Batal
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? "Update Sesi" : "Simpan Sesi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function generateSessionCode() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900 + 100);
  return `SO-${year}-${random}`;
}

function labelStatus(status) {
  const labels = {
    draft: "Draft",
    berjalan: "Berjalan",
    selesai: "Selesai",
    dikunci: "Dikunci",
  };

  return labels[status] || status;
}

function statusBadge(status) {
  const badges = {
    draft: "gray",
    berjalan: "green",
    selesai: "blue",
    dikunci: "red",
  };

  return badges[status] || "gray";
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default SessionsPage;
