import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { getStockCounts } from "../../services/countService";

function ReportsPage({ initialReport = "stok_gudang" }) {
  const [selectedReport] = useState(initialReport);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRows();
  }, []);

  async function loadRows() {
    try {
      setLoading(true);
      const data = await getStockCounts();
      setRows(data);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data laporan dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const isEggReport =
    selectedReport === "telur_bagus" || selectedReport === "telur_reject";

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return rows.filter((row) => {
      const matchReport = matchReportType(row, selectedReport);

      const matchSearch =
        String(row.sessionName || "").toLowerCase().includes(keyword) ||
        String(row.locationName || "").toLowerCase().includes(keyword) ||
        String(row.itemName || "").toLowerCase().includes(keyword) ||
        String(row.countedBy || "").toLowerCase().includes(keyword);

      return matchReport && matchSearch;
    });
  }, [rows, selectedReport, search]);

  function exportExcel() {
    if (filteredRows.length === 0) {
      alert("Tidak ada data untuk diexport.");
      return;
    }

    const exportRows = filteredRows.map((row) => {
      const base = {
        Sesi: row.sessionName || "",
        Lokasi: row.locationName || "",
        UsiaAyamMinggu: row.ageWeeks || "",
        Lorong: row.lorong || "",
        Baris: row.baris || "",
        Sekat: row.sekat || "",
        Item: row.itemName || "",
        Satuan: row.unit || "",
        Sistem: Number(row.systemQty || 0),
        HasilSO: Number(row.countedQty || 0),
        Selisih: getDifference(row),
        KoreksiAdmin:
          row.correctedQty === "" || row.correctedQty == null
            ? ""
            : Number(row.correctedQty),
        Final: getFinalQty(row),
      };

      if (isEggReport) {
        base.KgTimbang = Number(row.weightKg || row.countedQty || 0);
        base.Butir = Number(row.eggButir || 0);
        base.Ikat = Number(row.eggIkat || 0);
        base.Tray = Number(row.eggTray || 0);
        base.Peti = Number(row.eggPeti || 0);
      }

      return {
        ...base,
        StatusReview: labelStatus(row.status),
        Petugas: row.countedBy || "",
        WaktuInput: formatDateTime(row.countedAt),
        AlasanKoreksi: row.correctionReason || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, getReportTitle(selectedReport));
    XLSX.writeFile(workbook, `${getReportTitle(selectedReport)}.xlsx`);
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>{getReportTitle(selectedReport)}</h1>
          <p>Laporan detail hasil stock opname dari data yang sudah masuk ke Firebase.</p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={loadRows}>
            Refresh
          </button>
          <button className="primary-button" onClick={exportExcel}>
            Download Excel
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <label>Cari Data</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sesi, lokasi, item, petugas..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>{getReportTitle(selectedReport)}</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Sesi</th>
              <th>Lokasi</th>
              {isChickenReport(selectedReport) && <th>Usia</th>}
              {selectedReport === "ayam_hidup_detail" && <th>Lorong</th>}
              {selectedReport === "ayam_hidup_detail" && <th>Baris</th>}
              {selectedReport === "ayam_hidup_detail" && <th>Sekat</th>}
              <th>Item</th>
              <th>Satuan</th>
              <th>Sistem</th>
              <th>Hasil SO</th>
              <th>Selisih</th>
              <th>Koreksi Admin</th>
              <th>Final</th>

              {isEggReport && (
                <>
                  <th>Kg Timbang</th>
                  <th>Butir</th>
                  <th>Ikat</th>
                  <th>Tray</th>
                  <th>Peti</th>
                </>
              )}

              <th>Status</th>
              <th>Petugas</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="20">Mengambil data...</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="20">Tidak ada data laporan.</td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const difference = getDifference(row);

                return (
                  <tr key={row.id}>
                    <td>{row.sessionName || "-"}</td>
                    <td>{row.locationName || "-"}</td>

                    {isChickenReport(selectedReport) && (
                      <td>{row.ageWeeks ? `${row.ageWeeks} minggu` : "-"}</td>
                    )}

                    {selectedReport === "ayam_hidup_detail" && (
                      <td>{row.lorong || "-"}</td>
                    )}
                    {selectedReport === "ayam_hidup_detail" && (
                      <td>{row.baris || "-"}</td>
                    )}
                    {selectedReport === "ayam_hidup_detail" && (
                      <td>{row.sekat || "-"}</td>
                    )}

                    <td className="cell-ellipsis" title={row.itemName || ""}>
                      {row.itemName || "-"}
                    </td>

                    <td>{row.unit || "-"}</td>
                    <td>{formatNumber(row.systemQty)}</td>
                    <td>{formatNumber(row.countedQty)}</td>

                    <td>
                      <span className={difference === 0 ? "badge green" : "badge red"}>
                        {formatNumber(difference)}
                      </span>
                    </td>

                    <td>
                      {row.correctedQty === "" || row.correctedQty == null
                        ? "-"
                        : formatNumber(row.correctedQty)}
                    </td>

                    <td>
                      <strong>{formatNumber(getFinalQty(row))}</strong>
                    </td>

                    {isEggReport && (
                      <>
                        <td>{formatNumber(row.weightKg || row.countedQty || 0)}</td>
                        <td>{formatNumber(row.eggButir)}</td>
                        <td>{formatNumber(row.eggIkat)}</td>
                        <td>{formatNumber(row.eggTray)}</td>
                        <td>{formatNumber(row.eggPeti)}</td>
                      </>
                    )}

                    <td>
                      <span className={`badge ${statusBadge(row.status)}`}>
                        {labelStatus(row.status)}
                      </span>
                    </td>

                    <td>{row.countedBy || "-"}</td>
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

function matchReportType(row, reportType) {
  const type = row.type;
  const itemName = String(row.itemName || "").toLowerCase();

  if (reportType === "stok_gudang") {
    return type === "gudang";
  }

  if (reportType === "selisih_gudang") {
    return getDifference(row) !== 0;
  }

  if (reportType === "ayam_hidup_rekap") {
    return type === "ayam_hidup";
  }

  if (reportType === "ayam_hidup_detail") {
    return type === "ayam_hidup";
  }

  if (reportType === "ayam_mati") {
    return type === "ayam_mati_upkir" && itemName.includes("mati");
  }

  if (reportType === "ayam_upkir") {
    return (
      type === "ayam_mati_upkir" &&
      (itemName.includes("upkir") || itemName.includes("afkir"))
    );
  }

  if (reportType === "telur_bagus") {
    return (
      type === "telur" &&
      (
        itemName.includes("bagus") ||
        itemName.includes("utuh") ||
        itemName.includes("normal")
      )
    );
  }

  if (reportType === "telur_reject") {
    return (
      type === "telur" &&
      (
        itemName.includes("reject") ||
        itemName.includes("rejek") ||
        itemName.includes("retak") ||
        itemName.includes("pecah")
      )
    );
  }

  if (reportType === "koreksi_admin") {
    return (
      row.status === "dikoreksi" ||
      (row.correctedQty !== "" && row.correctedQty != null)
    );
  }

  if (reportType === "kinerja_petugas") {
    return true;
  }

  if (reportType === "foto_so") {
    return !!row.photoUrl;
  }

  return false;
}

function isChickenReport(reportType) {
  return (
    reportType === "ayam_hidup_rekap" ||
    reportType === "ayam_hidup_detail" ||
    reportType === "ayam_mati" ||
    reportType === "ayam_upkir"
  );
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

function getReportTitle(type) {
  const titles = {
    stok_gudang: "Laporan Stok Gudang",
    selisih_gudang: "Laporan Selisih Semua Lokasi",
    ayam_hidup_rekap: "Laporan Ayam Hidup Rekap",
    ayam_hidup_detail: "Laporan Ayam Hidup Detail Sekat",
    ayam_mati: "Laporan Ayam Mati",
    ayam_upkir: "Laporan Ayam Upkir",
    telur_bagus: "Laporan Telur Bagus",
    telur_reject: "Laporan Telur Reject",
    koreksi_admin: "Laporan Koreksi Admin",
    kinerja_petugas: "Laporan Kinerja Petugas",
    foto_so: "Foto Hasil SO",
  };

  return titles[type] || type;
}

function labelStatus(status) {
  const labels = {
    menunggu_review: "Menunggu Review",
    disetujui: "Disetujui",
    perlu_hitung_ulang: "Perlu Hitung Ulang",
    dikoreksi: "Dikoreksi",
  };

  return labels[status] || status || "-";
}

function statusBadge(status) {
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

export default ReportsPage;