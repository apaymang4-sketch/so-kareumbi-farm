import { useEffect, useMemo, useState } from "react";

import { getAssignments } from "../../services/assignmentService";
import { getStockCounts } from "../../services/countService";

function DashboardPage() {
  const [assignments, setAssignments] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
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
      alert("Gagal mengambil data dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const totalAssignments = assignments.length;
    const selesai = assignments.filter((item) => item.status === "selesai").length;

    const activeSessions = new Set(
      assignments
        .filter((item) => item.sessionStatus === "draft" || item.sessionStatus === "berjalan")
        .map((item) => item.sessionId)
        .filter(Boolean)
    );

    const progress =
      totalAssignments === 0 ? 0 : Math.round((selesai / totalAssignments) * 100);

    const perluReview = counts.filter((item) => item.status === "menunggu_review").length;

    const perluHitungUlang = counts.filter(
      (item) => item.status === "perlu_hitung_ulang"
    ).length;

    const totalSelisihSemuaLokasi = counts.reduce(
      (sum, item) => sum + getDifference(item),
      0
    );

    const totalAyamHidup = counts
      .filter((item) => item.type === "ayam_hidup")
      .reduce((sum, item) => sum + getFinalQty(item), 0);

    const totalTelurBagusKg = counts
      .filter((item) => isTelurBagus(item))
      .reduce((sum, item) => sum + getFinalQty(item), 0);

    const totalTelurBagusButir = counts
      .filter((item) => isTelurBagus(item))
      .reduce((sum, item) => sum + Number(item.eggButir || 0), 0);

    return {
      totalAssignments,
      selesai,
      activeSessionCount: activeSessions.size,
      progress,
      perluReview,
      perluHitungUlang,
      totalSelisihSemuaLokasi,
      totalAyamHidup,
      totalTelurBagusKg,
      totalTelurBagusButir,
    };
  }, [assignments, counts]);

  const notifications = useMemo(() => {
    return counts
      .filter((item) => item.status === "menunggu_review")
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: "SO Masuk",
        message: `${item.countedBy || "Petugas"} input ${item.itemName || "-"} di ${
          item.locationName || "-"
        }.`,
        time: formatDateTime(item.createdAt || item.countedAt),
      }));
  }, [counts]);

  const attentionRows = counts
    .filter(
      (item) =>
        item.status === "menunggu_review" ||
        item.status === "perlu_hitung_ulang" ||
        getDifference(item) !== 0
    )
    .slice(0, 8);

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Dashboard</h1>
          <p>
            {loading
              ? "Mengambil ringkasan data..."
              : "Ringkasan stock opname Kareumbi Farm."}
          </p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={loadDashboard}>
            Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-cards">
        <DashCard title="Sesi Aktif" value={summary.activeSessionCount} />
        <DashCard title="Progress Opname" value={`${summary.progress}%`} />
        <DashCard
          title="Assignment Selesai"
          value={`${summary.selesai} / ${summary.totalAssignments}`}
        />
        <DashCard title="Perlu Review" value={summary.perluReview} />
        <DashCard title="Perlu Hitung Ulang" value={summary.perluHitungUlang} />
        <DashCard
          title="Selisih Semua Lokasi"
          value={`${formatNumber(summary.totalSelisihSemuaLokasi)} Kg`}
        />
        <DashCard
          title="Total Ayam Hidup"
          value={`${formatNumber(summary.totalAyamHidup)} Ekor`}
        />
        <DashCard
          title="Telur Bagus"
          value={`${formatNumber(summary.totalTelurBagusKg)} Kg / ${formatNumber(
            summary.totalTelurBagusButir
          )} Butir`}
        />
      </div>

      <div className="dashboard-two-column">
        <div className="table-card">
          <h3>Progress Opname</h3>

          <table className="data-table">
            <thead>
              <tr>
                <th>Lokasi</th>
                <th>Tugas</th>
                <th>Petugas</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="5">Belum ada assignment.</td>
                </tr>
              ) : (
                assignments.slice(0, 6).map((item) => (
                  <tr key={item.id}>
                    <td>{item.targetName || "-"}</td>
                    <td>{item.taskTypeLabel || labelTaskType(item.taskType)}</td>
                    <td>{item.userName || "-"}</td>
                    <td>{getAssignmentProgressText(item, counts)}</td>
                    <td>
                      <span className={`badge ${statusBadge(item.status)}`}>
                        {labelAssignmentStatus(item.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <h3>Notifikasi Terbaru</h3>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-item">
                <p>Belum ada hasil SO baru.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div className="notification-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>{item.time}</small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="table-card">
        <h3>Data Perlu Perhatian</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Lokasi</th>
              <th>Item</th>
              <th>Masalah</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {attentionRows.length === 0 ? (
              <tr>
                <td colSpan="5">Tidak ada data perlu perhatian.</td>
              </tr>
            ) : (
              attentionRows.map((item) => {
                const difference = getDifference(item);

                return (
                  <tr key={item.id}>
                    <td>{labelType(item.type)}</td>
                    <td>{item.locationName || "-"}</td>
                    <td>{item.itemName || "-"}</td>
                    <td>
                      {item.status === "perlu_hitung_ulang"
                        ? "Perlu hitung ulang"
                        : difference !== 0
                        ? `Selisih ${formatNumber(difference)} ${item.unit || ""}`
                        : "Menunggu review"}
                    </td>
                    <td>
                      <span className={`badge ${reviewStatusBadge(item.status)}`}>
                        {labelReviewStatus(item.status)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashCard({ title, value }) {
  return (
    <div className="dash-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isTelurBagus(item) {
  const itemName = String(item.itemName || "").toLowerCase();

  return (
    item.type === "telur" &&
    (itemName.includes("bagus") ||
      itemName.includes("utuh") ||
      itemName.includes("normal"))
  );
}

function getAssignmentProgressText(item, counts) {
  if (item.taskType !== "ayam_hidup") {
    return `${item.progress || 0}%`;
  }

  const rows = counts.filter((x) => x.assignmentId === item.id && x.type === "ayam_hidup");

  return `${rows.length} Sekat`;
}

function getFinalQty(row) {
  if (row.status === "dikoreksi" && row.correctedQty !== "" && row.correctedQty != null) {
    return Number(row.correctedQty || 0);
  }

  return Number(row.countedQty || 0);
}

function getDifference(row) {
  return getFinalQty(row) - Number(row.systemQty || 0);
}

function labelTaskType(type) {
  const labels = {
    gudang: "Hitung Barang",
    telur: "Hitung Telur",
    ayam_hidup: "Hitung Ayam Hidup",
    ayam_mati: "Hitung Ayam Mati",
    ayam_upkir: "Hitung Ayam Upkir",
    ayam_mati_upkir: "Hitung Mati/Upkir Lama",
  };

  return labels[type] || type || "-";
}

function labelType(type) {
  const labels = {
    gudang: "Gudang",
    telur: "Telur",
    ayam_hidup: "Ayam Hidup",
    ayam_mati: "Ayam Mati",
    ayam_upkir: "Ayam Upkir",
    ayam_mati_upkir: "Mati / Upkir Lama",
  };

  return labels[type] || type || "-";
}

function labelAssignmentStatus(status) {
  const labels = {
    belum_dihitung: "Belum Dihitung",
    proses: "Proses",
    selesai: "Selesai",
    perlu_cek: "Perlu Cek",
  };

  return labels[status] || status || "-";
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

function labelReviewStatus(status) {
  const labels = {
    menunggu_review: "Menunggu Review",
    disetujui: "Disetujui",
    perlu_hitung_ulang: "Perlu Hitung Ulang",
    dikoreksi: "Dikoreksi",
  };

  return labels[status] || status || "-";
}

function reviewStatusBadge(status) {
  const badges = {
    menunggu_review: "gray",
    disetujui: "green",
    perlu_hitung_ulang: "red",
    dikoreksi: "blue",
  };

  return badges[status] || "gray";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
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

export default DashboardPage;
