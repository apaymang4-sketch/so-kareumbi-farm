import { useState } from "react";

import {
  resetTransactionData,
  transactionCollections,
} from "../../services/resetTransactionService";

const collectionLabels = {
  stock_counts: "Hasil input stock opname",
  assignments: "Assignment petugas",
  sessions: "Sesi opname",
  master_change_requests: "Request approval master",
  notifications_read: "Status baca notifikasi",
};

function ResetTransactionsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleReset() {
    const ok = confirm(
      "Reset data transaksi akan menghapus sesi, assignment, hasil input, request approval master, dan status baca notifikasi.\n\nMaster barang, lokasi, kandang, dan user tidak dihapus.\n\nLanjutkan?"
    );

    if (!ok) return;

    const secondOk = confirm(
      "Konfirmasi sekali lagi: data transaksi yang dihapus tidak bisa dikembalikan dari aplikasi.\n\nYakin reset data transaksi?"
    );

    if (!secondOk) return;

    try {
      setLoading(true);
      setResult(null);

      const resetResult = await resetTransactionData();
      setResult(resetResult);
      alert("Reset data transaksi selesai.");
    } catch (error) {
      console.error(error);
      alert("Gagal reset data transaksi. Cek koneksi dan izin Firebase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Reset Data Transaksi</h1>
          <p>Hapus data uji coba tanpa menghapus master data.</p>
        </div>
      </div>

      <div className="table-card reset-transaction-card">
        <h3>Data yang akan dihapus</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Collection Firebase</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {transactionCollections.map((collectionName) => (
              <tr key={collectionName}>
                <td>{collectionLabels[collectionName] || collectionName}</td>
                <td>{collectionName}</td>
                <td>
                  {result ? `${result[collectionName] || 0} data dihapus` : "Menunggu reset"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="reset-warning">
          Master barang, lokasi, kandang, petugas, dan user login tetap disimpan.
        </div>

        <div className="detail-actions">
          <button
            type="button"
            className="table-button danger reset-button"
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? "Mereset..." : "Reset Data Transaksi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetTransactionsPage;
