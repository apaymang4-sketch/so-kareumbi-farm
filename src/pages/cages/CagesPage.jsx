import { useEffect, useMemo, useState } from "react";

import {
  getCages,
  createCage,
  updateCage,
  deleteCage,
} from "../../services/cageService";

const emptyForm = {
  code: "",
  name: "",
  ageWeeks: "",
  totalPopulation: "",
  lorongCount: "",
  barisCount: "",
  sekatCount: "",
  isActive: true,
};

function CagesPage() {
  const [cages, setCages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedCage, setSelectedCage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCages();
  }, []);

  async function loadCages() {
    try {
      setLoading(true);
      const data = await getCages();
      setCages(data);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data kandang dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const filteredCages = useMemo(() => {
    const keyword = search.toLowerCase();

    return cages.filter((item) => {
      return (
        String(item.code || "").toLowerCase().includes(keyword) ||
        String(item.name || "").toLowerCase().includes(keyword)
      );
    });
  }, [cages, search]);

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

  function generateStructure(cageId, cageCode, cageName, lorongCount, barisCount, sekatCount) {
    const result = [];

    for (let l = 1; l <= Number(lorongCount); l++) {
      for (let b = 1; b <= Number(barisCount); b++) {
        for (let s = 1; s <= Number(sekatCount); s++) {
          result.push({
            id: `${cageId}-L${l}-B${b}-S${s}`,
            cageId,
            cageCode,
            cageName,
            lorong: l,
            baris: b,
            sekat: s,
            code: `${cageCode}-L${l}-B${b}-S${s}`,
          });
        }
      }
    }

    return result;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.code.trim()) {
      alert("Kode kandang wajib diisi.");
      return;
    }

    if (!form.name.trim()) {
      alert("Nama kandang wajib diisi.");
      return;
    }

    if (!form.totalPopulation || Number(form.totalPopulation) <= 0) {
      alert("Total populasi wajib diisi dan harus lebih dari 0.");
      return;
    }

    if (!form.lorongCount || !form.barisCount || !form.sekatCount) {
      alert("Jumlah lorong, baris, dan sekat wajib diisi.");
      return;
    }

    const codeExists = cages.some(
      (item) =>
        String(item.code || "").toLowerCase() === form.code.trim().toLowerCase() &&
        item.id !== editingId
    );

    if (codeExists) {
      alert("Kode kandang sudah digunakan.");
      return;
    }

    try {
      const cageCode = form.code.trim().toUpperCase();
      const cageName = form.name.trim();
      const cageId = editingId || `TEMP-${Date.now()}`;

      const payload = {
        code: cageCode,
        name: cageName,
        ageWeeks: Number(form.ageWeeks || 0),
        totalPopulation: Number(form.totalPopulation || 0),
        lorongCount: Number(form.lorongCount || 0),
        barisCount: Number(form.barisCount || 0),
        sekatCount: Number(form.sekatCount || 0),
        isActive: form.isActive,
        isUsed: false,
        structure: generateStructure(
          cageId,
          cageCode,
          cageName,
          form.lorongCount,
          form.barisCount,
          form.sekatCount
        ),
      };

      if (editingId) {
        await updateCage(editingId, payload);
        alert("Kandang berhasil diupdate.");
      } else {
        await createCage(payload);
        alert("Kandang berhasil ditambahkan.");
      }

      await loadCages();
      closeForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan kandang ke Firebase.");
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      code: item.code || "",
      name: item.name || "",
      ageWeeks: item.ageWeeks || "",
      totalPopulation: item.totalPopulation || "",
      lorongCount: item.lorongCount || "",
      barisCount: item.barisCount || "",
      sekatCount: item.sekatCount || "",
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  }

  async function handleDelete(item) {
    if (item.isUsed) {
      alert("Kandang sudah digunakan dalam opname. Tidak bisa dihapus.");
      return;
    }

    const ok = confirm(`Hapus ${item.name}?`);
    if (!ok) return;

    try {
      await deleteCage(item.id);
      await loadCages();

      if (selectedCage?.id === item.id) {
        setSelectedCage(null);
      }

      alert("Kandang berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus kandang dari Firebase.");
    }
  }

  async function handleToggleActive(item) {
    const action = item.isActive ? "nonaktifkan" : "aktifkan";
    const ok = confirm(`Yakin ingin ${action} ${item.name}?`);
    if (!ok) return;

    try {
      await updateCage(item.id, {
        ...item,
        isActive: !item.isActive,
      });

      await loadCages();
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status kandang.");
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Kandang</h1>
          <p>Kelola kandang dan struktur lorong, baris, sekat.</p>
        </div>

        <div className="page-actions">
          <button className="primary-button" onClick={openAddForm}>
            + Tambah Kandang
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <label>Cari Kandang</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama kandang..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Kandang</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Kandang</th>
              <th>Usia</th>
              <th>Total Populasi</th>
              <th>Struktur</th>
              <th>Total Sekat</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Mengambil data...</td>
              </tr>
            ) : filteredCages.length === 0 ? (
              <tr>
                <td colSpan="8">Belum ada data kandang.</td>
              </tr>
            ) : (
              filteredCages.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.ageWeeks || 0} minggu</td>
                  <td>{formatNumber(item.totalPopulation)} ekor</td>
                  <td>
                    {item.lorongCount} lorong x {item.barisCount} baris x{" "}
                    {item.sekatCount} sekat
                  </td>
                  <td>{item.structure?.length || 0}</td>
                  <td>
                    <span className={item.isActive ? "badge green" : "badge gray"}>
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <button className="table-button" onClick={() => setSelectedCage(item)}>
                      Detail
                    </button>
                    <button className="table-button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>
                    <button
                      className="table-button warning"
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? "Nonaktif" : "Aktifkan"}
                    </button>
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

      {selectedCage && (
        <div className="table-card">
          <h3>Detail Struktur: {selectedCage.name}</h3>

          <table className="data-table">
            <thead>
              <tr>
                <th>Lorong</th>
                <th>Baris</th>
                <th>Sekat</th>
                <th>Kode Titik Hitung</th>
              </tr>
            </thead>
            <tbody>
              {(selectedCage.structure || []).map((item) => (
                <tr key={item.id}>
                  <td>Lorong {item.lorong}</td>
                  <td>Baris {item.baris}</td>
                  <td>Sekat {item.sekat}</td>
                  <td>
                    {selectedCage.code}-L{item.lorong}-B{item.baris}-S{item.sekat}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? "Edit Kandang" : "Tambah Kandang"}</h3>
              <button type="button" onClick={closeForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Kode Kandang</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Contoh: KD001"
                />
              </div>

              <div className="form-group">
                <label>Nama Kandang</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Kandang A"
                />
              </div>

              <div className="form-group">
                <label>Usia Ayam Minggu</label>
                <input
                  type="number"
                  name="ageWeeks"
                  value={form.ageWeeks}
                  onChange={handleChange}
                  placeholder="Contoh: 48"
                />
              </div>

              <div className="form-group">
                <label>Total Populasi Ayam</label>
                <input
                  type="number"
                  name="totalPopulation"
                  value={form.totalPopulation}
                  onChange={handleChange}
                  placeholder="Contoh: 12000"
                />
              </div>

              <div className="form-group">
                <label>Jumlah Lorong</label>
                <input
                  type="number"
                  name="lorongCount"
                  value={form.lorongCount}
                  onChange={handleChange}
                  placeholder="Contoh: 4"
                />
              </div>

              <div className="form-group">
                <label>Jumlah Baris per Lorong</label>
                <input
                  type="number"
                  name="barisCount"
                  value={form.barisCount}
                  onChange={handleChange}
                  placeholder="Contoh: 6"
                />
              </div>

              <div className="form-group">
                <label>Jumlah Sekat per Baris</label>
                <input
                  type="number"
                  name="sekatCount"
                  value={form.sekatCount}
                  onChange={handleChange}
                  placeholder="Contoh: 12"
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
                  {editingId ? "Update Kandang" : "Simpan Kandang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

export default CagesPage;
