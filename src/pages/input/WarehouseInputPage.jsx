import { useEffect, useMemo, useState } from "react";

import { getAssignments, updateAssignment } from "../../services/assignmentService";
import { createStockCount } from "../../services/countService";
import { getItemStocks } from "../../services/itemStockService";

function WarehouseInputPage() {
  const [assignments, setAssignments] = useState([]);
  const [itemStocks, setItemStocks] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [counts, setCounts] = useState({});
  const [savedRows, setSavedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [assignmentData, stockData] = await Promise.all([
        getAssignments(),
        getItemStocks(),
      ]);

      setAssignments(
        assignmentData.filter(
          (item) =>
            item.taskType === "gudang" &&
            item.status !== "selesai" &&
            item.status !== "perlu_cek"
        )
      );
      setItemStocks(stockData.filter((item) => item.isActive !== false));
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data input gudang dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const selectedAssignment = assignments.find(
    (item) => item.id === selectedAssignmentId
  );

  const filteredItems = useMemo(() => {
    if (!selectedAssignment) return [];

    const stockLocationType =
      selectedAssignment.targetType === "kandang" ? "kandang" : "gudang";

    return itemStocks.filter(
      (item) =>
        item.locationType === stockLocationType &&
        item.locationId === selectedAssignment.targetId
    );
  }, [selectedAssignment, itemStocks]);

  function handlePhysicalChange(itemId, value) {
    setCounts((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }

  async function handleSave() {
    if (!selectedAssignment) {
      alert("Pilih assignment gudang dulu.");
      return;
    }

    if (filteredItems.length === 0) {
      alert("Tidak ada barang untuk lokasi ini.");
      return;
    }

    const ok = confirm(`Simpan hasil hitung ${selectedAssignment.targetName}?`);
    if (!ok) return;

    try {
      setSaving(true);

      const rows = filteredItems.map((item) => {
        const countedQty = Number(counts[item.id] || 0);
        const systemQty = Number(item.systemStock ?? item.systemQty ?? 0);

        return {
          assignmentId: selectedAssignment.id,
          sessionId: selectedAssignment.sessionId || "",
          sessionName: selectedAssignment.sessionName || "",
          sessionDate: selectedAssignment.sessionDate || "",
          type: "gudang",
          locationId: selectedAssignment.targetId || item.locationId || "",
          locationName: selectedAssignment.targetName || item.locationName || "",
          locationType: selectedAssignment.targetType || "lokasi",
          itemStockId: item.id,
          itemId: item.itemId || "",
          itemCode: item.itemCode || "",
          itemName: item.itemName || "",
          category: item.category || "",
          systemQty,
          countedQty,
          unit: item.unit || "",
          difference: countedQty - systemQty,
          countedBy: selectedAssignment.userName || "",
          countedAt: new Date().toISOString(),
          status: "menunggu_review",
        };
      });

      for (const row of rows) {
        await createStockCount(row);
      }

      await updateAssignment(selectedAssignment.id, {
        ...selectedAssignment,
        status: "selesai",
        progress: 100,
      });

      setSavedRows((prev) => [...rows, ...prev]);
      setCounts({});
      await loadData();
      alert("Input gudang berhasil disimpan.");
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan input gudang.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Input Gudang</h1>
          <p>Input hasil hitung fisik berdasarkan stok barang per lokasi.</p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={loadData} disabled={loading || saving}>
            Refresh
          </button>
          <button className="primary-button" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Hitung"}
          </button>
        </div>
      </div>

      <div className="toolbar-card toolbar-row">
        <div className="search-box">
          <label>Assignment Gudang</label>
          <select
            value={selectedAssignmentId}
            onChange={(e) => {
              setSelectedAssignmentId(e.target.value);
              setCounts({});
            }}
          >
            <option value="">Pilih Assignment</option>
            {assignments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sessionName} - {item.targetName} - {item.userName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Barang yang Dihitung</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Barang</th>
              <th>Kategori</th>
              <th>Stok Sistem</th>
              <th>Fisik</th>
              <th>Selisih</th>
              <th>Satuan</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Mengambil data...</td>
              </tr>
            ) : !selectedAssignment ? (
              <tr>
                <td colSpan="7">Pilih assignment gudang terlebih dahulu.</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan="7">Tidak ada stok barang untuk lokasi ini.</td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const systemQty = Number(item.systemStock ?? item.systemQty ?? 0);
                const countedQty = Number(counts[item.id] || 0);
                const difference = countedQty - systemQty;

                return (
                  <tr key={item.id}>
                    <td>{item.itemCode}</td>
                    <td>{item.itemName}</td>
                    <td>{item.category || "-"}</td>
                    <td>{formatNumber(systemQty)}</td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        value={counts[item.id] || ""}
                        onChange={(e) =>
                          handlePhysicalChange(item.id, e.target.value)
                        }
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <span className={difference === 0 ? "badge green" : "badge red"}>
                        {formatNumber(difference)}
                      </span>
                    </td>
                    <td>{item.unit}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <h3>Data Baru Disimpan</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Sesi</th>
              <th>Lokasi</th>
              <th>Barang</th>
              <th>Sistem</th>
              <th>Fisik</th>
              <th>Selisih</th>
              <th>Petugas</th>
            </tr>
          </thead>

          <tbody>
            {savedRows.length === 0 ? (
              <tr>
                <td colSpan="7">Belum ada data baru disimpan.</td>
              </tr>
            ) : (
              savedRows.map((item, index) => (
                <tr key={`${item.assignmentId}-${item.itemStockId}-${index}`}>
                  <td>{item.sessionName}</td>
                  <td>{item.locationName}</td>
                  <td>{item.itemName}</td>
                  <td>{formatNumber(item.systemQty)}</td>
                  <td>{formatNumber(item.countedQty)}</td>
                  <td>
                    <span className={item.difference === 0 ? "badge green" : "badge red"}>
                      {formatNumber(item.difference)}
                    </span>
                  </td>
                  <td>{item.countedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

export default WarehouseInputPage;
