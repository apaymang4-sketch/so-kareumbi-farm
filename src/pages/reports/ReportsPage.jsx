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

  const reportRows = useMemo(() => {
    if (selectedReport === "ayam_hidup_rekap") {
      return groupAyamHidupRekap(rows);
    }

    return rows;
  }, [rows, selectedReport]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return reportRows.filter((row) => {
      const matchReport = matchReportType(row, selectedReport);

      const matchSearch =
        String(row.sessionName || "").toLowerCase().includes(keyword) ||
        String(row.locationName || "").toLowerCase().includes(keyword) ||
        String(row.itemName || "").toLowerCase().includes(keyword) ||
        String(row.countedBy || "").toLowerCase().includes(keyword);

      return matchReport && matchSearch;
    });
  }, [reportRows, selectedReport, search]);

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
        Lorong: selectedReport === "ayam_hidup_detail" ? row.lorong || "" : "",
        Baris: selectedReport === "ayam_hidup_detail" ? row.baris || "" : "",
        Sekat: selectedReport === "ayam_hidup_detail" ? row.sekat || "" : "",
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

      if (selectedReport === "ayam_hidup_rekap") {
        base.JumlahSekatDiinput = row.children?.length || 0;
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

              {selectedReport === "ayam_hidup_rekap" && <th>Sekat Diinput</th>}

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

                    {selectedReport === "ayam_hidup_rekap" && (
                      <td>{row.children?.length || 0}</td>
                    )}

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

function groupAyamHidupRekap(rows) {
  const groups = new Map();

  rows
    .filter((row) => row.type === "ayam_hidup")
    .forEach((row) => {
      const key = [
        row.assignmentId || "",
        row.sessionId || "",
        row.locationId || "",
        row.countedBy || "",
      ].join("__");

      if (!groups.has(key)) {
        groups.set(key, {
          ...row,
          id: `ayam_hidup_rekap_${key}`,
          isGroup: true,
          itemName: "Ayam Hidup",
          unit: "Ekor",
          systemQty: 0,
          countedQty: 0,
          correctedQty: "",
          finalQty: 0,
          hasCorrection: false,
          correctionReasons: new Set(),
          children: [],
        });
      }

      const group = groups.get(key);
      group.children.push(row);
      group.countedQty += Number(row.countedQty || 0);
      group.finalQty += getFinalQty(row);
      if (hasCorrection(row)) {
        group.hasCorrection = true;
      }
      if (row.correctionReason) {
        group.correctionReasons.add(row.correctionReason);
      }
      group.countedAt = getLatestDate(group.countedAt, row.countedAt);
      group.status = mergeStatus(group.children);
    });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    correctedQty: group.hasCorrection ? group.finalQty : "",
    correctionReason: Array.from(group.correctionReasons || []).join("; "),
  }));
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
    return (
      type === "ayam_mati" ||
      (
        type === "ayam_mati_upkir" &&
        itemName.includes("mati")
      )
    );
  }
  
  if (reportType === "ayam_upkir") {
    return (
      type === "ayam_upkir" ||
      (
        type === "ayam_mati_upkir" &&
        (itemName.includes("upkir") ||
         itemName.includes("afkir"))
      )
    );
  }

  if (reportType === "telur_bagus") {
    return (
      type === "telur" &&
      (itemName.includes("bagus") ||
        itemName.includes("utuh") ||
        itemName.includes("normal"))
    );
  }

  if (reportType === "telur_reject") {
    return (
      type === "telur" &&
      (itemName.includes("reject") ||
        itemName.includes("rejek") ||
        itemName.includes("retak") ||
        itemName.includes("pecah"))
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
  if (row.isGroup) {
    return Number(row.finalQty || row.countedQty || 0);
  }

  if (hasCorrection(row)) {
    return Number(row.correctedQty || 0);
  }

  return Number(row.countedQty || 0);
}

function hasCorrection(row) {
  return row.correctedQty !== "" && row.correctedQty != null;
}

function getDifference(row) {
  return getFinalQty(row) - Number(row.systemQty || 0);
}

function mergeStatus(items) {
  if (items.some((item) => item.status === "perlu_hitung_ulang")) {
    return "perlu_hitung_ulang";
  }

  if (items.some((item) => item.status === "menunggu_review")) {
    return "menunggu_review";
  }

  if (items.some((item) => item.status === "dikoreksi")) {
    return "dikoreksi";
  }

  if (items.every((item) => item.status === "disetujui")) {
    return "disetujui";
  }

  return items[0]?.status || "menunggu_review";
}

function getLatestDate(a, b) {
  if (!a) return b;
  if (!b) return a;

  return new Date(a) > new Date(b) ? a : b;
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
