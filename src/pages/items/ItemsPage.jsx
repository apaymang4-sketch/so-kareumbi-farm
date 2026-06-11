import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  getItems,
  createItem,
  updateItem,
} from "../../services/itemService";
import { getLocations } from "../../services/locationService";
import { getCages } from "../../services/cageService";
import {
  getItemStocks,
  createItemStock,
  updateItemStock,
  deleteItemStock,
} from "../../services/itemStockService";

const MAX_IMPORT_ROWS = 500;

const emptyForm = {
  code: "",
  name: "",
  category: "",
  unit: "Kg",
  locationType: "gudang",
  locationId: "",
  systemStock: "",
  isActive: true,
};

function ItemsPage() {
  const fileInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [itemStocks, setItemStocks] = useState([]);
  const [locations, setLocations] = useState([]);
  const [cages, setCages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    try {
      setLoading(true);
      const [itemData, stockData, locationData, cageData] = await Promise.all([
        getItems(),
        getItemStocks(),
        getLocations(),
        getCages(),
      ]);

      setItems(itemData);
      setItemStocks(stockData);
      setLocations(locationData.filter((item) => item.isActive !== false));
      setCages(cageData.filter((item) => item.isActive !== false));
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data barang dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const locationOptions = useMemo(() => {
    const warehouseOptions = locations.map((item) => ({
      id: item.id,
      code: item.code || "",
      name: item.name || "",
      locationType: "gudang",
      label: `${item.code || "-"} - ${item.name} - ${labelWarehouseType(item.type)}`,
    }));

    const cageOptions = cages.map((item) => ({
      id: item.id,
      code: item.code || "",
      name: item.name || "",
      locationType: "kandang",
      label: `${item.code || "-"} - ${item.name} - Kandang`,
    }));

    return [...warehouseOptions, ...cageOptions];
  }, [locations, cages]);

  const filteredLocationOptions = useMemo(() => {
    return locationOptions.filter((item) => item.locationType === form.locationType);
  }, [locationOptions, form.locationType]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return itemStocks.filter((item) => {
      return (
        String(item.itemCode || "").toLowerCase().includes(keyword) ||
        String(item.itemName || "").toLowerCase().includes(keyword) ||
        String(item.category || "").toLowerCase().includes(keyword) ||
        String(item.unit || "").toLowerCase().includes(keyword) ||
        String(item.locationCode || "").toLowerCase().includes(keyword) ||
        String(item.locationName || "").toLowerCase().includes(keyword) ||
        labelLocationType(item.locationType).toLowerCase().includes(keyword)
      );
    });
  }, [itemStocks, search]);

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
      ...(name === "locationType" ? { locationId: "" } : {}),
    }));
  }

  async function ensureItem(payload, currentItems = items) {
    const existing = currentItems.find(
      (item) => String(item.code || "").toLowerCase() === payload.code.toLowerCase()
    );

    const itemPayload = {
      code: payload.code,
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      isActive: true,
      isUsed: true,
    };

    if (existing) {
      await updateItem(existing.id, {
        ...existing,
        ...itemPayload,
      });

      return { id: existing.id, ...existing, ...itemPayload };
    }

    const ref = await createItem(itemPayload);
    return { id: ref.id, ...itemPayload };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const category = form.category.trim();
    const selectedLocation = locationOptions.find(
      (item) => item.id === form.locationId && item.locationType === form.locationType
    );
    const systemStock = Number(form.systemStock || 0);

    if (!code) return alert("Kode item wajib diisi.");
    if (!name) return alert("Nama item wajib diisi.");
    if (!category) return alert("Kategori wajib diisi.");
    if (!form.unit.trim()) return alert("Satuan wajib diisi.");
    if (!selectedLocation) return alert("Lokasi wajib dipilih.");
    if (Number.isNaN(systemStock)) return alert("Stok sistem wajib angka.");

    const duplicate = itemStocks.find(
      (item) =>
        item.id !== editingId &&
        String(item.itemCode || "").toLowerCase() === code.toLowerCase() &&
        item.locationType === form.locationType &&
        item.locationId === selectedLocation.id
    );

    if (duplicate) {
      alert("Stok item untuk lokasi tersebut sudah ada. Gunakan Edit untuk mengubahnya.");
      return;
    }

    const ok = confirm(`${editingId ? "Update" : "Simpan"} stok ${name} di ${selectedLocation.name}?`);
    if (!ok) return;

    try {
      const item = await ensureItem({
        code,
        name,
        category,
        unit: form.unit.trim(),
      });

      const payload = {
        itemId: item.id,
        itemCode: code,
        itemName: name,
        category,
        unit: form.unit.trim(),
        locationType: form.locationType,
        locationId: selectedLocation.id,
        locationCode: selectedLocation.code || "",
        locationName: selectedLocation.name || "",
        systemStock,
        systemQty: systemStock,
        isActive: form.isActive,
        isUsed: true,
      };

      if (editingId) {
        await updateItemStock(editingId, payload);
      } else {
        await createItemStock(payload);
      }

      await loadPageData();
      closeForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan stok barang ke Firebase.");
    }
  }

  function handleEdit(row) {
    setEditingId(row.id);
    setForm({
      code: row.itemCode || "",
      name: row.itemName || "",
      category: row.category || "",
      unit: row.unit || "Kg",
      locationType: row.locationType || "gudang",
      locationId: row.locationId || "",
      systemStock: row.systemStock ?? row.systemQty ?? "",
      isActive: row.isActive ?? true,
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    const ok = confirm(`Hapus stok ${row.itemName} di ${row.locationName}?`);
    if (!ok) return;

    try {
      await deleteItemStock(row.id);
      await loadPageData();
      alert("Stok barang berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus stok barang dari Firebase.");
    }
  }

  async function handleToggleActive(row) {
    const ok = confirm(
      `Yakin ingin ${row.isActive ? "nonaktifkan" : "aktifkan"} stok ${row.itemName} di ${row.locationName}?`
    );
    if (!ok) return;

    try {
      await updateItemStock(row.id, {
        ...row,
        isActive: !row.isActive,
      });

      await loadPageData();
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status stok barang.");
    }
  }

  function downloadTemplate() {
    const rows = [
      {
        KodeItem: "BK001",
        NamaItem: "Bekatul",
        Kategori: "pakan",
        Satuan: "Kg",
        LokasiTipe: "gudang",
        KodeLokasi: "GP001",
        NamaLokasi: "Gudang Pakan",
        StokSistem: 1000,
      },
      {
        KodeItem: "BK001",
        NamaItem: "Bekatul",
        Kategori: "pakan",
        Satuan: "Kg",
        LokasiTipe: "kandang",
        KodeLokasi: "KD001",
        NamaLokasi: "Kandang A",
        StokSistem: 120,
      },
      {
        KodeItem: "OB001",
        NamaItem: "Vitamin A",
        Kategori: "obat",
        Satuan: "Botol",
        LokasiTipe: "gudang",
        KodeLokasi: "GO001",
        NamaLokasi: "Gudang Obat",
        StokSistem: 25,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Stok Barang");
    XLSX.writeFile(workbook, "template_import_stok_barang.xlsx");
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

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        alert("Import gagal. File Excel kosong.");
        return;
      }

      if (rows.length > MAX_IMPORT_ROWS) {
        alert(`Import gagal. Maksimal ${MAX_IMPORT_ROWS} baris sekali import.`);
        return;
      }

      const requiredHeaders = [
        "KodeItem",
        "NamaItem",
        "Kategori",
        "Satuan",
        "LokasiTipe",
        "NamaLokasi",
        "StokSistem",
      ];
      const firstRow = rows[0] || {};
      const missingHeaders = requiredHeaders.filter((header) => !(header in firstRow));

      if (missingHeaders.length > 0) {
        alert(
          `Import gagal. Header Excel tidak sesuai.\n\nHeader wajib:\n${requiredHeaders.join(
            " | "
          )}\n\nOpsional: KodeLokasi\n\nHeader yang hilang:\n${missingHeaders.join(", ")}`
        );
        return;
      }

      const itemMap = new Map(
        items.map((item) => [String(item.code || "").toLowerCase(), item])
      );
      const stockMap = new Map(
        itemStocks.map((stock) => [
          makeStockKey(stock.itemCode, stock.locationType, stock.locationId),
          stock,
        ])
      );
      const importedStockKeys = new Set();
      const validRows = [];
      const failedRows = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const code = String(row.KodeItem || "").trim().toUpperCase();
        const name = String(row.NamaItem || "").trim();
        const category = String(row.Kategori || "").trim();
        const unit = String(row.Satuan || "Kg").trim();
        const locationType = normalizeLocationType(row.LokasiTipe);
        const locationCode = String(row.KodeLokasi || "").trim();
        const locationName = String(row.NamaLokasi || "").trim();
        const systemStock = Number(row.StokSistem || 0);
        const selectedLocation = findImportLocation({
          locationType,
          locationCode,
          locationName,
          locations,
          cages,
        });

        let reason = "";

        if (!code) reason = "KodeItem kosong";
        else if (!name) reason = "NamaItem kosong";
        else if (!category) reason = "Kategori kosong";
        else if (!unit) reason = "Satuan kosong";
        else if (!["gudang", "kandang"].includes(locationType)) {
          reason = "LokasiTipe wajib gudang atau kandang";
        } else if (!locationName && !locationCode) {
          reason = "NamaLokasi atau KodeLokasi wajib diisi";
        } else if (!selectedLocation) {
          reason =
            locationType === "kandang"
              ? "Kandang tidak ditemukan di master kandang"
              : "Lokasi tidak ditemukan di master lokasi";
        } else if (Number.isNaN(systemStock)) {
          reason = "StokSistem bukan angka";
        } else {
          const stockKey = makeStockKey(code, locationType, selectedLocation.id);
          if (importedStockKeys.has(stockKey)) {
            reason = "Duplikat item dan lokasi di file Excel";
          }
        }

        if (reason) {
          failedRows.push({
            row: rowNumber,
            code: code || "-",
            name: name || "-",
            location: locationName || locationCode || "-",
            reason,
          });
          return;
        }

        const stockKey = makeStockKey(code, locationType, selectedLocation.id);
        importedStockKeys.add(stockKey);

        validRows.push({
          row: rowNumber,
          code,
          name,
          category,
          unit,
          locationType,
          location: selectedLocation,
          systemStock,
          stockKey,
        });
      });

      const savedRows = [];

      for (const row of validRows) {
        try {
          const item = await ensureItem(
            {
              code: row.code,
              name: row.name,
              category: row.category,
              unit: row.unit,
            },
            Array.from(itemMap.values())
          );
          itemMap.set(row.code.toLowerCase(), item);

          const payload = {
            itemId: item.id,
            itemCode: row.code,
            itemName: row.name,
            category: row.category,
            unit: row.unit,
            locationType: row.locationType,
            locationId: row.location.id,
            locationCode: row.location.code || "",
            locationName: row.location.name || "",
            systemStock: row.systemStock,
            systemQty: row.systemStock,
            isActive: true,
            isUsed: true,
          };

          const existingStock = stockMap.get(row.stockKey);
          if (existingStock) {
            await updateItemStock(existingStock.id, payload);
            stockMap.set(row.stockKey, { ...existingStock, ...payload });
          } else {
            const ref = await createItemStock(payload);
            stockMap.set(row.stockKey, { id: ref.id, ...payload });
          }

          savedRows.push(row);
        } catch (error) {
          console.error(`Gagal import stok barang baris ${row.row}:`, error);
          failedRows.push({
            row: row.row,
            code: row.code || "-",
            name: row.name || "-",
            location: row.location?.name || "-",
            reason: getFirebaseErrorMessage(error),
          });
        }
      }

      await loadPageData();

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
          `Berhasil dibuat/update: ${result.successCount}\n` +
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
          <p>Kelola master item dan stok sistem per gudang atau kandang.</p>
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
            + Tambah Stok Barang
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
        <h3>Daftar Stok Barang per Lokasi</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Item</th>
              <th>Nama Item</th>
              <th>Kategori</th>
              <th>Satuan</th>
              <th>Tipe Lokasi</th>
              <th>Kode Lokasi</th>
              <th>Nama Lokasi</th>
              <th>Stok Sistem</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11">Mengambil data...</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="11">Tidak ada data stok barang.</td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>{row.itemCode}</td>
                  <td>{row.itemName}</td>
                  <td>{row.category || "-"}</td>
                  <td>{row.unit}</td>
                  <td>{labelLocationType(row.locationType)}</td>
                  <td>{row.locationCode || "-"}</td>
                  <td>{row.locationName || "-"}</td>
                  <td>{formatNumber(row.systemStock ?? row.systemQty)}</td>
                  <td>
                    <span className={row.isActive ? "badge green" : "badge gray"}>
                      {row.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <button className="table-button" onClick={() => handleEdit(row)}>
                      Edit
                    </button>
                    <button
                      className="table-button warning"
                      onClick={() => handleToggleActive(row)}
                    >
                      {row.isActive ? "Nonaktif" : "Aktifkan"}
                    </button>
                    <button className="table-button danger" onClick={() => handleDelete(row)}>
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
                <th>Lokasi</th>
                <th>Alasan</th>
              </tr>
            </thead>
            <tbody>
              {importResult.failedRows.slice(0, 50).map((item, index) => (
                <tr key={index}>
                  <td>{item.row}</td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.location}</td>
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
              <h3>{editingId ? "Edit Stok Barang" : "Tambah Stok Barang"}</h3>
              <button type="button" onClick={closeForm}>x</button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Kode Item</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Contoh: BK001"
                />
              </div>

              <div className="form-group">
                <label>Nama Item</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Bekatul"
                />
              </div>

              <div className="form-group">
                <label>Kategori</label>
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Contoh: pakan"
                />
              </div>

              <div className="form-group">
                <label>Satuan</label>
                <input
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  placeholder="Contoh: Kg"
                />
              </div>

              <div className="form-group">
                <label>Tipe Lokasi</label>
                <select name="locationType" value={form.locationType} onChange={handleChange}>
                  <option value="gudang">Gudang</option>
                  <option value="kandang">Kandang</option>
                </select>
              </div>

              <div className="form-group">
                <label>Lokasi</label>
                <select name="locationId" value={form.locationId} onChange={handleChange}>
                  <option value="">Pilih Lokasi</option>
                  {filteredLocationOptions.map((item) => (
                    <option key={`${item.locationType}-${item.id}`} value={item.id}>
                      {item.label}
                    </option>
                  ))}
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
                  {editingId ? "Update Stok" : "Simpan Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeLocationType(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (["gudang", "warehouse", "lokasi"].includes(raw)) return "gudang";
  if (["kandang", "cage"].includes(raw)) return "kandang";

  return raw;
}

function findImportLocation({ locationType, locationCode, locationName, locations, cages }) {
  const source = locationType === "kandang" ? cages : locations;
  const code = locationCode.toLowerCase();
  const name = locationName.toLowerCase();

  return source.find((item) => {
    const sameCode = code && String(item.code || "").toLowerCase() === code;
    const sameName = name && String(item.name || "").toLowerCase() === name;
    return sameCode || sameName;
  });
}

function makeStockKey(itemCode, locationType, locationId) {
  return [
    String(itemCode || "").toLowerCase(),
    String(locationType || "").toLowerCase(),
    String(locationId || ""),
  ].join("__");
}

function labelLocationType(type) {
  const labels = {
    gudang: "Gudang",
    kandang: "Kandang",
  };

  return labels[type] || type || "-";
}

function labelWarehouseType(type) {
  const labels = {
    gudang_utama: "Gudang Utama",
    gudang_pakan: "Gudang Pakan",
    gudang_obat: "Gudang Obat",
    gudang_telur: "Gudang Telur",
    area_sortir: "Area Sortir",
    area_transit: "Area Transit",
    lainnya: "Lainnya",
  };

  return labels[type] || type || "-";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function getFirebaseErrorMessage(error) {
  const code = error?.code || "";

  const messages = {
    "permission-denied": "Ditolak Firebase: akun tidak punya izin menyimpan stok barang",
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

export default ItemsPage;
