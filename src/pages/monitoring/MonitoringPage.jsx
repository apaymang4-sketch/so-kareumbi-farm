import { useEffect, useMemo, useState } from "react";

import { getAssignments } from "../../services/assignmentService";
import { getStockCounts } from "../../services/countService";

function MonitoringPage() {
  const [assignments, setAssignments] = useState([]);
  const [counts, setCounts] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [detailRow, setDetailRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    try {
      setLoading(true);

      const [assignmentData, countData] = await Promise.all([
        getAssignments(),
        getStockCounts(),
      ]);

      setAssignments(assignmentData);
      setCounts(countData);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data monitoring dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const filteredAssignments = useMemo(() => {
    const keyword = search.toLowerCase();

    return assignments.filter((item) => {
      const matchSearch =
        String(item.sessionName || "").toLowerCase().includes(keyword) ||
        String(item.userName || "").toLowerCase().includes(keyword) ||
        String(item.targetName || "").toLowerCase().includes(keyword) ||
        labelTaskType(item.taskType).toLowerCase().includes(keyword);

      const matchStatus =
        statusFilter === "semua" ? true : item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [assignments, search, statusFilter]);

  const summary = useMemo(() => {
    const total = assignments.length;
    const belum = assignments.filter((item) => item.status === "belum_dihitung").length;
    const proses = assignments.filter((item) => item.status === "proses").length;
    const selesai = assignments.filter((item) => item.status === "selesai").length;
    const perluCek = assignments.filter((item) => item.status === "perlu_cek").length;

    const progress = total === 0 ? 0 : Math.round((selesai / total) * 100);

    return {
      total,
      belum,
      proses,
      selesai,
      perluCek,
      progress,
    };
  }, [assignments]);

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Monitoring Input</h1>
          <p>Pantau progress tugas stock opname per petugas dan lokasi.</p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={loadAssignments}>
            Refresh
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard title="Total Tugas" value={summary.total} />
        <SummaryCard title="Belum Dihitung" value={summary.belum} type="gray" />
        <SummaryCard title="Proses" value={summary.proses} type="blue" />
        <SummaryCard title="Selesai" value={summary.selesai} type="green" />
        <SummaryCard title="Perlu Cek" value={summary.perluCek} type="red" />
        <SummaryCard title="Progress" value={`${summary.progress}%`} type="purple" />
      </div>

      <div className="toolbar-card toolbar-row">
        <div className="search-box">
          <label>Cari Monitoring</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sesi, petugas, lokasi..."
          />
        </div>

        <div className="search-box">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="semua">Semua Status</option>
            <option value="belum_dihitung">Belum Dihitung</option>
            <option value="proses">Proses</option>
            <option value="selesai">Selesai</option>
            <option value="perlu_cek">Perlu Cek</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Progress Assignment</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Sesi</th>
              <th>Tanggal</th>
              <th>Petugas</th>
              <th>Tipe Tugas</th>
              <th>Lokasi/Kandang</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Mengambil data...</td>
              </tr>
            ) : filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan="7">Tidak ada data monitoring.</td>
              </tr>
            ) : (
              filteredAssignments.map((item) => {
                const progress = Number(item.progress || 0);

                return (
                  <tr
                    key={item.id}
                    className="clickable-row"
                    onClick={() => setDetailRow(item)}
                  >
                    <td>{item.sessionName}</td>
                    <td>{formatDate(item.sessionDate)}</td>
                    <td>{item.userName}</td>
                    <td>{item.taskTypeLabel || labelTaskType(item.taskType)}</td>
                    <td>{item.targetName}</td>
                    <td>
                      <span className={`badge ${statusBadge(item.status)}`}>
                        {labelStatus(item.status)}
                      </span>
                    </td>
                    <td>
                      <div className="progress-wrap">
                        <div className="progress-bar">
                          <div
                            className={`progress-fill ${statusBadge(item.status)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {item.taskType === "ayam_hidup" ? (
                          <span>{getAyamHidupProgress(item, counts)} Sekat</span>
                        ) : (
                          <span>{progress}%</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detailRow && (
        <div className="modal-backdrop">
          <div className="modal-card detail-modal">
            <div className="modal-header">
              <h3>Detail Monitoring</h3>
              <button type="button" onClick={() => setDetailRow(null)}>
                ×
              </button>
            </div>

            <div className="detail-summary">
              <div>
                <span>Sesi</span>
                <strong>{detailRow.sessionName}</strong>
              </div>
              <div>
                <span>Tanggal</span>
                <strong>{formatDate(detailRow.sessionDate)}</strong>
              </div>
              <div>
                <span>Petugas</span>
                <strong>{detailRow.userName}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{labelStatus(detailRow.status)}</strong>
              </div>
            </div>

            <table className="data-table detail-table">
              <tbody>
                <tr>
                  <th>Tipe Tugas</th>
                  <td>{detailRow.taskTypeLabel || labelTaskType(detailRow.taskType)}</td>
                </tr>
                <tr>
                  <th>Lokasi / Kandang</th>
                  <td>{detailRow.targetName}</td>
                </tr>
                <tr>
                  <th>Tipe Target</th>
                  <td>{labelTargetType(detailRow.targetType)}</td>
                </tr>
                <tr>
                  <th>Progress</th>
                  <td>
                    <div className="progress-wrap">
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${statusBadge(detailRow.status)}`}
                          style={{ width: `${Number(detailRow.progress || 0)}%` }}
                        />
                      </div>

                      {detailRow.taskType === "ayam_hidup" ? (
                        <span>{getAyamHidupProgress(detailRow, counts)} Sekat</span>
                      ) : (
                        <span>{Number(detailRow.progress || 0)}%</span>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>Catatan</th>
                  <td>{detailRow.note || "-"}</td>
                </tr>
                <tr>
                  <th>Dibuat</th>
                  <td>{formatDateTime(detailRow.createdAt)}</td>
                </tr>
                <tr>
                  <th>Update Terakhir</th>
                  <td>{formatDateTime(detailRow.updatedAt)}</td>
                </tr>
              </tbody>
            </table>

            {detailRow.taskType === "ayam_hidup" && (
              <div className="table-card" style={{ marginTop: 16 }}>
                <h3>Detail Sekat Terinput</h3>

                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Lorong</th>
                      <th>Baris</th>
                      <th>Sekat</th>
                      <th>Jumlah</th>
                      <th>Petugas</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>

                  <tbody>
                    {getAyamHidupRows(detailRow, counts).length === 0 ? (
                      <tr>
                        <td colSpan="6">Belum ada sekat yang masuk.</td>
                      </tr>
                    ) : (
                      getAyamHidupRows(detailRow, counts).map((row) => (
                        <tr key={row.id}>
                          <td>{row.lorong || "-"}</td>
                          <td>{row.baris || "-"}</td>
                          <td>{row.sekat || "-"}</td>
                          <td>
                            <strong>{formatNumber(row.countedQty)} Ekor</strong>
                          </td>
                          <td>{row.countedBy || "-"}</td>
                          <td>{formatDateTime(row.countedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getAyamHidupProgress(item, counts) {
  if (item.taskType !== "ayam_hidup") {
    return Number(item.progress || 0);
  }

  const rows = counts.filter((x) => x.assignmentId === item.id && x.type === "ayam_hidup");

  return rows.length;
}

function getAyamHidupRows(item, counts) {
  return counts
    .filter((x) => x.assignmentId === item.id && x.type === "ayam_hidup")
    .sort(
      (a, b) =>
        Number(a.lorong || 0) - Number(b.lorong || 0) ||
        Number(a.baris || 0) - Number(b.baris || 0) ||
        Number(a.sekat || 0) - Number(b.sekat || 0)
    );
}

function SummaryCard({ title, value, type = "blue" }) {
  return (
    <div className={`summary-card ${type}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function labelTaskType(type) {
  const labels = {
    gudang: "Hitung Gudang",
    telur: "Hitung Telur",
    ayam_hidup: "Hitung Ayam Hidup",
    ayam_mati: "Hitung Ayam Mati",
    ayam_upkir: "Hitung Ayam Upkir",
    ayam_mati_upkir: "Hitung Mati/Upkir Lama",
  };

  return labels[type] || type;
}

function labelStatus(status) {
  const labels = {
    belum_dihitung: "Belum Dihitung",
    proses: "Proses",
    selesai: "Selesai",
    perlu_cek: "Perlu Cek",
  };

  return labels[status] || status;
}

function statusBadge(status) {
  const badges = {
    belum_dihitung: "gray",
    proses: "blue",
    selesai: "green",
    perlu_cek: "red",
  };

  return badges[status] || "gray";
}

function labelTargetType(type) {
  const labels = {
    lokasi: "Lokasi / Gudang",
    kandang: "Kandang",
  };

  return labels[type] || type || "-";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default MonitoringPage;