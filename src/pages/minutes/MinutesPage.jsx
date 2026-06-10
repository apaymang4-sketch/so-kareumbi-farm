import { useEffect, useMemo, useState } from "react";

import { getStockCountReports } from "../../services/stockCountReportService";

function MinutesPage() {
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const data = await getStockCountReports();
      setReports(data);
      setSelectedId((current) => current || data[0]?.id || "");
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data berita acara dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const filteredReports = useMemo(() => {
    const keyword = search.toLowerCase();

    return reports.filter((item) => {
      return (
        String(item.sessionName || "").toLowerCase().includes(keyword) ||
        String(item.locationName || "").toLowerCase().includes(keyword) ||
        String(item.officerName || "").toLowerCase().includes(keyword) ||
        String(item.witnessName || "").toLowerCase().includes(keyword)
      );
    });
  }, [reports, search]);

  const selectedReport = useMemo(() => {
    return reports.find((item) => item.id === selectedId) || filteredReports[0] || null;
  }, [filteredReports, reports, selectedId]);

  function printSelected() {
    if (!selectedReport) {
      alert("Pilih berita acara terlebih dahulu.");
      return;
    }

    window.print();
  }

  return (
    <div className="page minutes-page">
      <div className="page-header page-header-row no-print">
        <div>
          <h1>Berita Acara Stock Opname</h1>
          <p>Dokumen final per assignment/kandang yang sudah ditandatangani petugas SO dan saksi.</p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={loadReports}>
            Refresh
          </button>
          <button className="primary-button" onClick={printSelected}>
            Print / PDF
          </button>
        </div>
      </div>

      <div className="minutes-layout">
        <div className="table-card minutes-list no-print">
          <h3>Daftar Berita Acara</h3>

          <div className="search-box minutes-search">
            <label>Cari</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari sesi, kandang, petugas, saksi..."
            />
          </div>

          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kandang</th>
                <th>Petugas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4">Mengambil data...</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="4">Belum ada berita acara.</td>
                </tr>
              ) : (
                filteredReports.map((item) => (
                  <tr
                    key={item.id}
                    className={item.id === selectedReport?.id ? "clickable-row selected-row" : "clickable-row"}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>{formatDate(item.submittedAt || item.signedAt)}</td>
                    <td>{item.locationName || "-"}</td>
                    <td>{item.officerName || "-"}</td>
                    <td>
                      <span className={`badge ${statusBadge(item.status)}`}>
                        {labelStatus(item.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="minutes-document-wrap">
          {selectedReport ? (
            <MinutesDocument report={selectedReport} />
          ) : (
            <div className="table-card">Pilih berita acara untuk ditampilkan.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MinutesDocument({ report }) {
  const submittedDate = formatLongDate(report.submittedAt || report.signedAt);
  const resultRows = getResultRows(report);
  const reportTypeLabel = labelReportType(report.type);

  return (
    <div className="minutes-document" id="minutes-document">
      <div className="minutes-title">
        <h2>BERITA ACARA HASIL STOCK OPNAME</h2>
        <p>{report.sessionName || "Stock Opname"} - {reportTypeLabel}</p>
      </div>

      <div className="minutes-meta">
        <div>
          <span>Tanggal</span>
          <strong>{submittedDate}</strong>
        </div>
        <div>
          <span>Lokasi / Kandang</span>
          <strong>{report.locationName || "-"}</strong>
        </div>
        <div>
          <span>Petugas SO</span>
          <strong>{report.officerName || "-"}</strong>
        </div>
        <div>
          <span>Saksi</span>
          <strong>{report.witnessName || "-"}</strong>
        </div>
      </div>

      <p className="minutes-paragraph">
        Pada tanggal {submittedDate}, telah dilaksanakan stock opname fisik pada
        lokasi/kandang <strong>{report.locationName || "-"}</strong> untuk{" "}
        <strong>{reportTypeLabel}</strong>. Berdasarkan hasil perhitungan yang
        dilakukan oleh petugas stock opname dan disaksikan oleh saksi yang
        bertanda tangan di bawah ini, para pihak menyatakan bahwa hasil
        perhitungan berikut telah diperiksa dan sesuai dengan kondisi fisik di
        lapangan pada saat pemeriksaan.
      </p>

      <table className="data-table minutes-result-table">
        <tbody>
          {resultRows.map((row, index) => (
            <tr key={`${row.label}-${index}`}>
              <th>{row.label}</th>
              <td>{formatResultValue(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="minutes-paragraph">
        Demikian berita acara ini dibuat dengan sebenarnya untuk digunakan sebagai
        dasar pencatatan, pemeriksaan, dan persetujuan hasil stock opname.
      </p>

      <div className="minutes-signatures">
        <SignatureBlock
          title="Petugas Stock Opname"
          name={report.officerName}
          imageUrl={report.officerSignatureUrl}
        />
        <SignatureBlock
          title="Saksi"
          name={report.witnessName}
          imageUrl={report.witnessSignatureUrl}
        />
      </div>
    </div>
  );
}

function getResultRows(report) {
  if (Array.isArray(report.summaryRows) && report.summaryRows.length > 0) {
    const summaryRows = report.summaryRows
      .filter((row) => row && row.label)
      .map((row) => ({
        label: row.label,
        value: row.value,
        unit: row.unit || "",
      }));

    if (summaryRows.length > 0) {
      return summaryRows;
    }
  }

  const type = report.type || "";
  const fallbackRows = {
    ayam_hidup: [
      {
        label: "Ayam Hidup",
        value: report.totalAyamHidup || report.totalPopulation || 0,
        unit: "Ekor",
      },
    ],
    ayam_mati: [
      {
        label: "Ayam Mati",
        value: report.totalAyamMati || report.totalPopulation || 0,
        unit: "Ekor",
      },
    ],
    ayam_upkir: [
      {
        label: "Ayam Upkir",
        value: report.totalAyamUpkir || report.totalPopulation || 0,
        unit: "Ekor",
      },
    ],
    ayam_mati_upkir: [
      {
        label: "Ayam Mati",
        value: report.totalAyamMati || 0,
        unit: "Ekor",
      },
      {
        label: "Ayam Upkir",
        value: report.totalAyamUpkir || 0,
        unit: "Ekor",
      },
    ],
  };

  return fallbackRows[type] || [
    {
      label: labelReportType(type),
      value: report.totalPopulation || 0,
      unit: "",
    },
  ];
}

function formatResultValue(row) {
  const rawValue = row.value;
  const formattedValue = Number.isFinite(Number(rawValue))
    ? formatNumber(rawValue)
    : String(rawValue || "-");
  const unit = row.unit ? ` ${row.unit}` : "";

  return `${formattedValue}${unit}`;
}

function SignatureBlock({ title, name, imageUrl }) {
  return (
    <div className="signature-block">
      <span>{title}</span>
      <div className="signature-image-box">
        {imageUrl ? (
          <SignatureImage imageUrl={imageUrl} alt={`Tanda tangan ${title}`} />
        ) : (
          <small>Belum ada TTD</small>
        )}
      </div>
      <strong>{name || "-"}</strong>
    </div>
  );
}

function SignatureImage({ imageUrl, alt }) {
  const [processedUrl, setProcessedUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const edgeMargin = Math.max(4, Math.round(Math.min(width, height) * 0.015));

        for (let i = 0; i < pixels.length; i += 4) {
          const pixelIndex = i / 4;
          const x = pixelIndex % width;
          const y = Math.floor(pixelIndex / width);
          const red = pixels[i];
          const green = pixels[i + 1];
          const blue = pixels[i + 2];
          const alpha = pixels[i + 3];
          const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
          const isEdgePixel =
            x < edgeMargin ||
            y < edgeMargin ||
            x >= width - edgeMargin ||
            y >= height - edgeMargin;

          if (alpha < 20 || luminance > 248 || isEdgePixel) {
            pixels[i + 3] = 0;
            continue;
          }

          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
          pixels[i + 3] = 255;
        }

        context.putImageData(imageData, 0, 0);

        if (!cancelled) {
          setProcessedUrl(canvas.toDataURL("image/png"));
        }
      } catch {
        if (!cancelled) {
          setProcessedUrl(imageUrl);
        }
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setProcessedUrl(imageUrl);
      }
    };
    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return (
    <img
      className={processedUrl === imageUrl ? "signature-image-fallback" : ""}
      src={processedUrl || imageUrl}
      alt={alt}
    />
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function labelStatus(status) {
  const labels = {
    menunggu_review: "Menunggu Review",
    disetujui: "Disetujui",
    dikoreksi: "Dikoreksi",
  };

  return labels[status] || status || "-";
}

function labelReportType(type) {
  const labels = {
    telur: "Hitung Telur",
    ayam_hidup: "Hitung Ayam Hidup",
    ayam_mati: "Hitung Ayam Mati",
    ayam_upkir: "Hitung Ayam Upkir",
    ayam_mati_upkir: "Hitung Mati/Upkir",
    gudang: "Hitung Gudang",
  };

  return labels[type] || type || "Stock Opname";
}

function statusBadge(status) {
  const badges = {
    menunggu_review: "gray",
    disetujui: "green",
    dikoreksi: "blue",
  };

  return badges[status] || "gray";
}

export default MinutesPage;
