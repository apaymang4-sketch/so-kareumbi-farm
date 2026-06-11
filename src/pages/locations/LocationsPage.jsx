import { useEffect, useMemo, useState } from "react";

import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../../services/locationService";

const emptyForm = {
  code: "",
  name: "",
  type: "gudang_utama",
  note: "",
  isActive: true,
};

function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      const data = await getLocations();
      setLocations(data);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data lokasi dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const filteredLocations = useMemo(() => {
    const keyword = search.toLowerCase();

    return locations.filter((item) => {
      const code = String(item.code || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();
      const type = labelType(item.type).toLowerCase();
      const note = String(item.note || "").toLowerCase();

      return (
        code.includes(keyword) ||
        name.includes(keyword) ||
        type.includes(keyword) ||
        note.includes(keyword)
      );
    });
  }, [locations, search]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.code.trim()) {
      alert("Kode lokasi wajib diisi.");
      return;
    }

    if (!form.name.trim()) {
      alert("Nama lokasi wajib diisi.");
      return;
    }

    const codeExists = locations.some(
      (item) =>
        String(item.code || "").toLowerCase() ===
          form.code.trim().toLowerCase() && item.id !== editingId
    );

    if (codeExists) {
      alert("Kode lokasi sudah digunakan.");
      return;
    }

    const ok = confirm(`${editingId ? "Update" : "Simpan"} lokasi ${form.name.trim()}?`);
    if (!ok) return;

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        note: form.note || "",
        isActive: form.isActive,
        isUsed: false,
      };

      if (editingId) {
        await updateLocation(editingId, payload);
      } else {
        await createLocation(payload);
      }

      await loadLocations();
      closeForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan lokasi ke Firebase.");
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      code: item.code || "",
      name: item.name || "",
      type: item.type || "gudang_utama",
      note: item.note || "",
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  }

  async function handleDelete(item) {
    if (item.isUsed) {
      alert("Lokasi sudah digunakan. Tidak bisa dihapus, silakan nonaktifkan saja.");
      return;
    }

    const ok = confirm(`Hapus lokasi ${item.name}?`);
    if (!ok) return;

    try {
      await deleteLocation(item.id);
      await loadLocations();
      alert("Lokasi berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus lokasi dari Firebase.");
    }
  }

  async function handleToggleActive(item) {
    const action = item.isActive ? "nonaktifkan" : "aktifkan";
    const ok = confirm(`Yakin ingin ${action} ${item.name}?`);
    if (!ok) return;

    try {
      await updateLocation(item.id, {
        ...item,
        isActive: !item.isActive,
      });

      await loadLocations();
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status lokasi.");
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Lokasi</h1>
          <p>Kelola lokasi gudang, area sortir, area transit, dan lokasi audit lainnya.</p>
        </div>

        <div className="page-actions">
          <button className="primary-button" onClick={openAddForm}>
            + Tambah Lokasi
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <label>Cari Lokasi</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, tipe lokasi..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Lokasi</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Kode Lokasi</th>
              <th>Nama Lokasi</th>
              <th>Tipe Lokasi</th>
              <th>Catatan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Mengambil data...</td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan="6">Tidak ada data lokasi.</td>
              </tr>
            ) : (
              filteredLocations.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{labelType(item.type)}</td>
                  <td>{item.note || "-"}</td>
                  <td>
                    <span className={item.isActive ? "badge green" : "badge gray"}>
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <button className="table-button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>

                    <button
                      className="table-button warning"
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? "Nonaktif" : "Aktifkan"}
                    </button>

                    {!item.isUsed && (
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
              <h3>{editingId ? "Edit Lokasi" : "Tambah Lokasi"}</h3>
              <button type="button" onClick={closeForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Kode Lokasi</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Contoh: GD001"
                />
              </div>

              <div className="form-group">
                <label>Nama Lokasi</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Gudang Telur"
                />
              </div>

              <div className="form-group">
                <label>Tipe Lokasi</label>
                <select name="type" value={form.type} onChange={handleChange}>
                  <option value="gudang_utama">Gudang Utama</option>
                  <option value="gudang_pakan">Gudang Pakan</option>
                  <option value="gudang_obat">Gudang Obat</option>
                  <option value="gudang_telur">Gudang Telur</option>
                  <option value="area_sortir">Area Sortir</option>
                  <option value="area_transit">Area Transit</option>
                  <option value="kandang">Kandang</option>
                  <option value="lainnya">Lainnya</option>
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

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                Aktif
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeForm}>
                  Batal
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? "Update Lokasi" : "Simpan Lokasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function labelType(type) {
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

export default LocationsPage;
