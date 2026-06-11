import { useMemo, useState } from "react";

import {
  resetSelectedData,
  resetCollections,
} from "../../services/resetTransactionService";

const defaultSelected = [
  "stock_counts",
  "stock_count_reports",
  "assignments",
  "sessions",
  "master_change_requests",
  "notifications_read",
];

function ResetTransactionsPage() {
  const [selectedCollections, setSelectedCollections] = useState(defaultSelected);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const selectedSet = useMemo(
    () => new Set(selectedCollections),
    [selectedCollections]
  );

  const groupedCollections = useMemo(() => {
    const groups = new Map();

    resetCollections.forEach((item) => {
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group).push(item);
    });

    return Array.from(groups, ([group, rows]) => ({ group, rows }));
  }, []);

  function toggleCollection(collectionName) {
    setSelectedCollections((current) => {
      if (current.includes(collectionName)) {
        return current.filter((item) => item !== collectionName);
      }

      return [...current, collectionName];
    });
  }

  async function handleReset() {
    if (selectedCollections.length === 0) {
      alert("Pilih minimal satu data yang akan direset.");
      return;
    }

    const selectedLabels = resetCollections
      .filter((item) => selectedCollections.includes(item.name))
      .map((item) => `- ${item.label}`)
      .join("\n");

    const ok = confirm(
      `Data berikut akan dihapus:\n\n${selectedLabels}\n\nUser login tidak akan dihapus.\n\nLanjutkan?`
    );

    if (!ok) return;

    const secondOk = confirm(
      "Konfirmasi sekali lagi: data yang dihapus tidak bisa dikembalikan dari aplikasi.\n\nYakin reset data terpilih?"
    );

    if (!secondOk) return;

    try {
      setLoading(true);
      setResult(null);

      const resetResult = await resetSelectedData(selectedCollections);
      setResult(resetResult);
      alert("Reset data terpilih selesai.");
    } catch (error) {
      console.error(error);
      alert("Gagal reset data. Cek koneksi dan izin Firebase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Reset Data</h1>
          <p>Pilih data yang ingin dihapus. User login tidak ditampilkan dan tidak direset.</p>
        </div>
      </div>

      <div className="table-card reset-transaction-card">
        <div className="page-header-row">
          <h3>Data yang bisa direset</h3>

          <div className="page-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedCollections(resetCollections.map((item) => item.name))}
              disabled={loading}
            >
              Pilih Semua
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedCollections([])}
              disabled={loading}
            >
              Kosongkan
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Pilih</th>
              <th>Menu / Data</th>
              <th>Group</th>
              <th>Collection Firebase</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {groupedCollections.map((group) =>
              group.rows.map((item) => (
                <tr key={item.name}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(item.name)}
                      onChange={() => toggleCollection(item.name)}
                      disabled={loading}
                    />
                  </td>
                  <td>{item.label}</td>
                  <td>{group.group}</td>
                  <td>{item.name}</td>
                  <td>
                    {result && item.name in result
                      ? `${result[item.name] || 0} data dihapus`
                      : selectedSet.has(item.name)
                        ? "Dipilih"
                        : "Tidak dipilih"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="reset-warning">
          User login tidak ikut direset. Hati-hati memilih master data karena lokasi,
          kandang, barang, dan stok per lokasi akan hilang jika dicentang.
        </div>

        <div className="detail-actions">
          <button
            type="button"
            className="table-button danger reset-button"
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? "Mereset..." : "Reset Data Terpilih"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetTransactionsPage;
