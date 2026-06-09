import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  getCages,
  createCage,
  updateCage,
  deleteCage,
} from "../../services/cageService";

const MAX_IMPORT_ROWS = 500;

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
  const fileInputRef = useRef(null);

  const [cages, setCages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedCage, setSelectedCage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [importResult, setImportResult] = useState(null);
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

  function downloadTemplate() {
    const rows = [
      {
        Kode: "KD001",
        Nama: "Kandang A",
        UsiaMinggu: 48,
        TotalPopulasi: 12000,
        JumlahLorong: 4,
        JumlahBaris: 6,
        JumlahSekat: 12,
      },
      {
        Kode: "KD002",
        Nama: "Kandang B",
        UsiaMinggu: 36,
        TotalPopulasi: 10000,
        JumlahLorong: 3,
        JumlahBaris: 6,
        JumlahSekat: 10,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Kandang");
    XLSX.writeFile(workbook, "template_import_kandang.xlsx");
  }

  async function handleImportExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      if (!workbook.SheetNames.length) {
        alert("Import gagal. File Excel tidak memiliki sheet.");
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        alert("Import gagal. File Excel kosong.");
        return;
      }

      if (rows.length > MAX_IMPORT_ROWS) {
        alert(
          `Import gagal. Maksimal ${MAX_IMPORT_ROWS} baris sekali import. File ini berisi ${rows.length} baris.`
        );
        return;
      }

      const requiredHeaders = [
        "Kode",
        "Nama",
        "UsiaMinggu",
        "TotalPopulasi",
        "JumlahLorong",
        "JumlahBaris",
        "JumlahSekat",
      ];
      const firstRow = rows[0] || {};
      const missingHeaders = requiredHeaders.filter((header) => !(header in firstRow));

      if (missingHeaders.length > 0) {
        alert(
          `Import gagal. Header Excel tidak sesuai.\n\nHeader wajib:\n${requiredHeaders.join(
            " | "
          )}\n\nHeader yang hilang:\n${missingHeaders.join(", ")}`
        );
        return;
      }

      const existingCodes = new Set(cages.map((item) => String(item.code || "").toLowerCase()));
      const importedCodes = new Set();

      const validRows = [];
      const failedRows = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const code = String(row.Kode || "").trim().toUpperCase();
        const name = String(row.Nama || "").trim();
        const ageWeeks = Number(row.UsiaMinggu || 0);
        const totalPopulation = Number(row.TotalPopulasi || 0);
        const lorongCount = Number(row.JumlahLorong || 0);
        const barisCount = Number(row.JumlahBaris || 0);
        const sekatCount = Number(row.JumlahSekat || 0);

        let reason = "";

        if (!code) reason = "Kode kosong";
        else if (!name) reason = "Nama kosong";
        else if (existingCodes.has(code.toLowerCase())) reason = "Kode sudah ada di sistem";
        else if (importedCodes.has(code.toLowerCase())) reason = "Kode duplikat di file Excel";
        else if (Number.isNaN(ageWeeks) || ageWeeks < 0) reason = "Usia minggu tidak valid";
        else if (Number.isNaN(totalPopulation) || totalPopulation <= 0) {
          reason = "Total populasi wajib angka lebih dari 0";
        } else if (Number.isNaN(lorongCount) || lorongCount <= 0) {
          reason = "Jumlah lorong wajib angka lebih dari 0";
        } else if (Number.isNaN(barisCount) || barisCount <= 0) {
          reason = "Jumlah baris wajib angka lebih dari 0";
        } else if (Number.isNaN(sekatCount) || sekatCount <= 0) {
          reason = "Jumlah sekat wajib angka lebih dari 0";
        }

        if (reason) {
          failedRows.push({
            row: rowNumber,
            code: code || "-",
            name: name || "-",
            reason,
          });
          return;
        }

        importedCodes.add(code.toLowerCase());

        validRows.push({
          row: rowNumber,
          code,
          name,
          ageWeeks,
          totalPopulation,
          lorongCount,
          barisCount,
          sekatCount,
        });
      });

      const savedRows = [];

      for (const row of validRows) {
        const cageId = `TEMP-${Date.now()}-${row.row}`;
        const payload = {
          code: row.code,
          name: row.name,
          ageWeeks: row.ageWeeks,
          totalPopulation: row.totalPopulation,
          lorongCount: row.lorongCount,
          barisCount: row.barisCount,
          sekatCount: row.sekatCount,
          isActive: true,
          isUsed: false,
          structure: generateStructure(
            cageId,
            row.code,
            row.name,
            row.lorongCount,
            row.barisCount,
            row.sekatCount
          ),
        };

        try {
          await createCage(payload);
          savedRows.push(row);
        } catch (error) {
          console.error(`Gagal import kandang baris ${row.row}:`, error);
          failedRows.push({
            row: row.row,
            code: row.code || "-",
            name: row.name || "-",
            reason: getFirebaseErrorMessage(error),
          });
        }
      }

      await loadCages();

      const result = {
        totalRows: rows.length,
        successCount: savedRows.length,
        failedCount: failedRows.length,
        failedRows,
      };

      setImportResult(result);

      alert(
        `Import selesai.\n\n` +
          `Total baris dibaca: ${result.totalRows}\n` +
          `Berhasil masuk: ${result.successCount}\n` +
          `Gagal masuk: ${result.failedCount}\n\n` +
          (result.failedCount > 0
            ? `Contoh gagal:\nBaris ${result.failedRows[0].row}: ${result.failedRows[0].reason}`
            : "Semua data berhasil masuk.")
      );
    } catch (error) {
      console.error(error);
      alert("Import gagal. Pastikan file Excel sesuai template.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          <button className="secondary-button" onClick={downloadTemplate}>
            Download Template
          </button>

          <button
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Excel
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleImportExcel}
          />

          <button className="primary-button" onClick={openAddForm}>
            + Tambah Kandang
          </button>
        </div>
      </div>

      {importResult && (
        <div className="import-result-card">
          <strong>Hasil Import:</strong>
          <span>Total: {importResult.totalRows}</span>
          <span>Berhasil: {importResult.successCount}</span>
          <span>Gagal: {importResult.failedCount}</span>
          <span>Maksimal import: {MAX_IMPORT_ROWS} baris</span>
        </div>
      )}

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

      {importResult?.failedRows?.length > 0 && (
        <div className="table-card">
          <h3>Data Gagal Import</h3>

          <table className="data-table">
            <thead>
              <tr>
                <th>Baris Excel</th>
                <th>Kode</th>
                <th>Nama</th>
                <th>Alasan</th>
              </tr>
            </thead>
            <tbody>
              {importResult.failedRows.slice(0, 50).map((item, index) => (
                <tr key={index}>
                  <td>{item.row}</td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

function getFirebaseErrorMessage(error) {
  const code = error?.code || "";

  const messages = {
    "permission-denied": "Ditolak Firebase: akun tidak punya izin menambah kandang",
    unavailable: "Firebase tidak tersedia atau koneksi internet bermasalah",
    "deadline-exceeded": "Koneksi ke Firebase terlalu lama, silakan coba lagi",
    "resource-exhausted": "Kuota Firebase habis atau terlalu banyak request",
    unauthenticated: "Sesi login tidak valid, silakan login ulang",
    "invalid-argument": "Data ditolak Firebase karena format tidak valid",
  };

  if (messages[code]) return messages[code];

  if (error?.message) {
    return `Gagal disimpan ke Firebase: ${error.message}`;
  }

  return "Gagal disimpan ke Firebase, detail error tidak tersedia";
}

export default CagesPage;
