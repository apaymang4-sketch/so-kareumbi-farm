import { useMemo, useState } from "react";

const assignments = [
  {
    id: "A001",
    sessionName: "Opname Juni 2026",
    locationName: "Gudang Utama",
    taskType: "gudang",
    userName: "Petugas Gudang",
  },
  {
    id: "A002",
    sessionName: "Opname Juni 2026",
    locationName: "Gudang Pakan",
    taskType: "gudang",
    userName: "Petugas Gudang",
  },
];

const items = [
  {
    id: "I001",
    code: "BB001",
    name: "Jagung",
    category: "Bahan Baku Pakan",
    unit: "Kg",
    systemStock: 1000,
    locationName: "Gudang Utama",
  },
  {
    id: "I002",
    code: "BB002",
    name: "Dedak",
    category: "Bahan Baku Pakan",
    unit: "Kg",
    systemStock: 500,
    locationName: "Gudang Utama",
  },
  {
    id: "I003",
    code: "PF001",
    name: "Pakan Jadi Layer",
    category: "Pakan Jadi",
    unit: "Kg",
    systemStock: 800,
    locationName: "Gudang Pakan",
  },
];

function WarehouseInputPage() {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [counts, setCounts] = useState({});
  const [savedRows, setSavedRows] = useState([]);

  const selectedAssignment = assignments.find(
    (item) => item.id === selectedAssignmentId
  );

  const filteredItems = useMemo(() => {
    if (!selectedAssignment) return [];

    return items.filter(
      (item) => item.locationName === selectedAssignment.locationName
    );
  }, [selectedAssignment]);

  function handlePhysicalChange(itemId, value) {
    setCounts((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }

  function handleSave() {
    if (!selectedAssignment) {
      alert("Pilih assignment gudang dulu.");
      return;
    }

    if (filteredItems.length === 0) {
      alert("Tidak ada barang untuk lokasi ini.");
      return;
    }

    const rows = filteredItems.map((item) => {
      const physicalStock = Number(counts[item.id] || 0);

      return {
        id: `${selectedAssignment.id}-${item.id}`,
        sessionName: selectedAssignment.sessionName,
        locationName: selectedAssignment.locationName,
        itemCode: item.code,
        itemName: item.name,
        category: item.category,
        systemStock: item.systemStock,
        physicalStock,
        difference: physicalStock - item.systemStock,
        unit: item.unit,
        countedBy: selectedAssignment.userName,
      };
    });

    setSavedRows((prev) => {
      const withoutSameAssignment = prev.filter(
        (row) =>
          !rows.some((newRow) => newRow.id === row.id)
      );

      return [...rows, ...withoutSameAssignment];
    });

    alert("Input gudang berhasil disimpan.");
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Input Gudang</h1>
          <p>Input hasil hitung fisik bahan baku, pakan jadi, dan obat.</p>
        </div>

        <div className="page-actions">
          <button className="primary-button" onClick={handleSave}>
            Simpan Hitung
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
                {item.sessionName} - {item.locationName} - {item.userName}
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
            {!selectedAssignment ? (
              <tr>
                <td colSpan="7">Pilih assignment gudang terlebih dahulu.</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan="7">Tidak ada barang untuk lokasi ini.</td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const physicalStock = Number(counts[item.id] || 0);
                const difference = physicalStock - item.systemStock;

                return (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{formatNumber(item.systemStock)}</td>
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
        <h3>Data Tersimpan Sementara</h3>

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
                <td colSpan="7">Belum ada data tersimpan.</td>
              </tr>
            ) : (
              savedRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.sessionName}</td>
                  <td>{item.locationName}</td>
                  <td>{item.itemName}</td>
                  <td>{formatNumber(item.systemStock)}</td>
                  <td>{formatNumber(item.physicalStock)}</td>
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