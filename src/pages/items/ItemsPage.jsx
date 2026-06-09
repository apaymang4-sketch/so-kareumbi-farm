import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
} from "../../services/itemService";

import { getLocations } from "../../services/locationService";

const MAX_IMPORT_ROWS = 500;

const emptyForm = {
  code: "",
  name: "",
  category: "bahan_baku",
  unit: "Kg",
  systemStock: "",
  locationId: "",
  locationName: "",
  isActive: true,
};

function ItemsPage() {
  const fileInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItems();
    loadLocations();
  }, []);

  async function loadItems() {
    try {
      setLoading(true);
      const data = await getItems();
      setItems(data);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data barang dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  async function loadLocations() {
    try {
      const data = await getLocations();
      setLocations(data.filter((item) => item.isActive !== false));
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data lokasi dari Firebase.");
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = search.toLowerCase();

    return items.filter((item) => {
      return (
        String(item.code || "").toLowerCase().includes(keyword) ||
        String(item.name || "").toLowerCase().includes(keyword) ||
        labelCategory(item.category).toLowerCase().includes(keyword) ||
        String(item.unit || "").toLowerCase().includes(keyword) ||
        String(item.locationName || "").toLowerCase().includes(keyword)
      );
    });
  }, [items, search]);

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

    if (name === "locationId") {
      const selectedLocation = locations.find((item) => item.id === value);

      setForm((prev) => ({
        ...prev,
        locationId: value,
        locationName: selectedLocation?.name || "",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.code.trim()) {
      alert("Kode barang wajib diisi.");
      return;
    }

    if (!form.name.trim()) {
      alert("Nama barang wajib diisi.");
      return;
    }

    

    const codeExists = items.some(
      (item) =>
        String(item.code || "").toLowerCase() === form.code.trim().toLowerCase() &&
        item.id !== editingId
    );

    if (codeExists) {
      alert("Kode barang sudah digunakan.");
      return;
    }

    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        systemStock: Number(form.systemStock || 0),
        locationId: form.locationId || "",
        locationName: form.locationName || "",
        isActive: form.isActive,
        isUsed: false,
      };

      if (editingId) {
        await updateItem(editingId, payload);
        alert("Barang berhasil diupdate.");
      } else {
        await createItem(payload);
        alert("Barang berhasil ditambahkan.");
      }

      await loadItems();
      closeForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan barang ke Firebase.");
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      code: item.code || "",
      name: item.name || "",
      category: item.category || "bahan_baku",
      unit: item.unit || "Kg",
      systemStock: item.systemStock || "",
      locationId: item.locationId || "",
      locationName: item.locationName || "",
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  }

  async function handleDelete(item) {
    if (item.isUsed) {
      alert("Barang sudah digunakan. Tidak bisa dihapus, silakan nonaktifkan saja.");
      return;
    }

    const ok = confirm(`Hapus barang ${item.name}?`);
    if (!ok) return;

    try {
      await deleteItem(item.id);
      await loadItems();
      alert("Barang berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus barang dari Firebase.");
    }
  }

  async function handleToggleActive(item) {
    const ok = confirm(
      `Yakin ingin ${item.isActive ? "nonaktifkan" : "aktifkan"} ${item.name}?`
    );
    if (!ok) return;

    try {
      await updateItem(item.id, {
        ...item,
        isActive: !item.isActive,
      });

      await loadItems();
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status barang.");
    }
  }

  function downloadTemplate() {
    const rows = [
      {
        Kode: "BB001",
        Nama: "Jagung",
        Kategori: "bahan_baku",
        Satuan: "Kg",
        StokSistem: 0,
        Lokasi: "Gudang Utama",
      },
      {
        Kode: "PF001",
        Nama: "Pakan Jadi Layer",
        Kategori: "pakan_jadi",
        Satuan: "Kg",
        StokSistem: 0,
        Lokasi: "Gudang Pakan",
      },
      {
        Kode: "OB001",
        Nama: "Vitamin A",
        Kategori: "obat",
        Satuan: "Botol",
        StokSistem: 0,
        Lokasi: "Gudang Obat",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Barang");
    XLSX.writeFile(workbook, "template_import_barang.xlsx");
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

      const requiredHeaders = ["Kode", "Nama", "Kategori", "Satuan", "StokSistem"];
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

      const existingCodes = new Set(items.map((item) => String(item.code || "").toLowerCase()));
      const importedCodes = new Set();

      const successRows = [];
      const failedRows = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;

        const code = String(row.Kode || "").trim().toUpperCase();
        const name = String(row.Nama || "").trim();
        const category = normalizeCategory(row.Kategori);
        const unit = String(row.Satuan || "Kg").trim();
        const systemStock = Number(row.StokSistem || 0);
        const locationName = String(row.Lokasi || "").trim();

        const selectedLocation = locationName
  ? locations.find(
      (item) => String(item.name || "").toLowerCase() === locationName.toLowerCase()
    )
  : null;

        let reason = "";

        if (!code) reason = "Kode kosong";
        else if (!name) reason = "Nama kosong";
        else if (existingCodes.has(code.toLowerCase())) reason = "Kode sudah ada di sistem";
        else if (importedCodes.has(code.toLowerCase())) reason = "Kode duplikat di file Excel";
        else if (!["bahan_baku", "pakan_jadi", "obat", "telur", "ayam", "lainnya"].includes(category)) {
          reason = "Kategori tidak valid";
        } else if (Number.isNaN(systemStock)) {
          reason = "Stok sistem bukan angka";
        } else if (locationName && !selectedLocation) {
          reason = "Lokasi tidak ditemukan di master lokasi";
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

        successRows.push({
          row: rowNumber,
          code,
          name,
          category,
          unit,
          systemStock,
          locationId: selectedLocation?.id || "",
locationName: selectedLocation?.name || "",
          isActive: true,
          isUsed: false,
        });
      });

      const savedRows = [];

      for (const row of successRows) {
        const { row: rowNumber, ...payload } = row;

        try {
          await createItem(payload);
          savedRows.push(row);
        } catch (error) {
          console.error(`Gagal import barang baris ${rowNumber}:`, error);
          failedRows.push({
            row: rowNumber,
            code: row.code || "-",
            name: row.name || "-",
            reason: getFirebaseErrorMessage(error),
          });
        }
      }

      await loadItems();

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
          <h1>Barang</h1>
          <p>Kelola bahan baku pakan, pakan jadi, obat, dan stok sistem.</p>
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
            + Tambah Barang
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
          <label>Cari Barang</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, kategori, satuan, lokasi..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Barang</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Nama Barang</th>
              <th>Kategori</th>
              <th>Satuan</th>
              <th>Stok Sistem</th>
              <th>Lokasi</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">Mengambil data...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan="9">Tidak ada data barang.</td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{labelCategory(item.category)}</td>
                  <td>{item.unit}</td>
                  <td>{Number(item.systemStock || 0).toLocaleString("id-ID")}</td>
                  <td>{item.locationName || "-"}</td>
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

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? "Edit Barang" : "Tambah Barang"}</h3>
              <button type="button" onClick={closeForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Kode Barang</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Contoh: BB001"
                />
              </div>

              <div className="form-group">
                <label>Nama Barang</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Jagung"
                />
              </div>

              <div className="form-group">
                <label>Kategori</label>
                <select name="category" value={form.category} onChange={handleChange}>
  <option value="bahan_baku">Bahan Baku Pakan</option>
  <option value="pakan_jadi">Pakan Jadi</option>
  <option value="obat">Obat-obatan</option>
  <option value="telur">Telur</option>
  <option value="ayam">Ayam</option>
  <option value="lainnya">Lainnya</option>
</select>
              </div>

              <div className="form-group">
                <label>Satuan</label>
                <select name="unit" value={form.unit} onChange={handleChange}>
  <option value="Kg">Kg</option>
  <option value="Gram">Gram</option>
  <option value="Karung">Karung</option>
  <option value="Sak">Sak</option>
  <option value="Botol">Botol</option>
  <option value="Sachet">Sachet</option>
  <option value="Pcs">Pcs</option>

  <option value="Butir">Butir</option>
  <option value="Ikat">Ikat</option>
  <option value="Tray">Tray</option>
  <option value="Peti">Peti</option>

  <option value="Ekor">Ekor</option>
</select>
              </div>

              <div className="form-group">
                <label>Stok Sistem</label>
                <input
                  type="number"
                  name="systemStock"
                  value={form.systemStock}
                  onChange={handleChange}
                  placeholder="Contoh: 1000"
                />
              </div>

              <div className="form-group">
              <label>Lokasi Default (Opsional)</label>
                <select
                  name="locationId"
                  value={form.locationId}
                  onChange={handleChange}
                >
                  <option value="">Tanpa Lokasi Default</option>
                  {locations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {labelLocationType(item.type)}
                    </option>
                  ))}
                </select>
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
                  {editingId ? "Update Barang" : "Simpan Barang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeCategory(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "bahan_baku" || raw === "bahan baku" || raw === "bahan baku pakan") {
    return "bahan_baku";
  }

  if (raw === "pakan_jadi" || raw === "pakan jadi") {
    return "pakan_jadi";
  }

  if (raw === "obat" || raw === "obat-obatan" || raw === "obat obatan") {
    return "obat";
  }

  if (raw === "telur" || raw === "egg") {
    return "telur";
  }

  if (raw === "ayam" || raw === "chicken") {
    return "ayam";
  }

  if (raw === "lainnya" || raw === "lain-lain" || raw === "lain lain") {
    return "lainnya";
  }

  return raw;
}

function labelCategory(category) {
  const labels = {
    bahan_baku: "Bahan Baku Pakan",
    pakan_jadi: "Pakan Jadi",
    obat: "Obat-obatan",
    telur: "Telur",
    ayam: "Ayam",
    lainnya: "Lainnya",
  };

  return labels[category] || category;
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

function getFirebaseErrorMessage(error) {
  const code = error?.code || "";

  const messages = {
    "permission-denied": "Ditolak Firebase: akun tidak punya izin menambah barang",
    "unavailable": "Firebase tidak tersedia atau koneksi internet bermasalah",
    "deadline-exceeded": "Koneksi ke Firebase terlalu lama, silakan coba lagi",
    "resource-exhausted": "Kuota Firebase habis atau terlalu banyak request",
    "unauthenticated": "Sesi login tidak valid, silakan login ulang",
    "invalid-argument": "Data ditolak Firebase karena format tidak valid",
  };

  if (messages[code]) return messages[code];

  if (error?.message) {
    return `Gagal disimpan ke Firebase: ${error.message}`;
  }

  return "Gagal disimpan ke Firebase, detail error tidak tersedia";
}

export default ItemsPage;
