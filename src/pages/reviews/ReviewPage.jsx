import { useEffect, useMemo, useState } from "react";

import { getStockCounts, updateStockCount, deleteStockCount } from "../../services/countService";
import { updateAssignment } from "../../services/assignmentService";
import { updateStockCountReport } from "../../services/stockCountReportService";

const emptyCorrection = {
  id: null,
  correctedQty: "",
  correctionReason: "",
};

function ReviewPage() {
  const [rows, setRows] = useState([]);
  const [selectedSession, setSelectedSession] = useState("semua");
  const [selectedPetugas, setSelectedPetugas] = useState("semua");
  const [selectedType, setSelectedType] = useState("semua");
  const [search, setSearch] = useState("");
  const [detailRow, setDetailRow] = useState(null);
  const [correction, setCorrection] = useState(emptyCorrection);
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
      alert("Gagal mengambil data review dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const sessions = useMemo(() => {
    const map = new Map();

    rows.forEach((item) => {
      if (item.sessionId && item.sessionName) {
        map.set(item.sessionId, item.sessionName);
      }
    });

    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [rows]);

  const petugas = useMemo(() => {
    return [...new Set(rows.map((item) => item.countedBy).filter(Boolean))];
  }, [rows]);

  const reviewRows = useMemo(() => {
    return buildReviewRows(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return reviewRows.filter((item) => {
      const matchSession =
        selectedSession === "semua" ? true : item.sessionId === selectedSession;

      const matchPetugas =
        selectedPetugas === "semua"
          ? true
          : String(item.countedBy || "").includes(selectedPetugas);

      const matchType =
        selectedType === "semua" ? true : item.type === selectedType;

      const matchSearch =
        String(item.locationName || "").toLowerCase().includes(keyword) ||
        String(item.itemName || "").toLowerCase().includes(keyword) ||
        String(item.sessionName || "").toLowerCase().includes(keyword) ||
        String(item.countedBy || "").toLowerCase().includes(keyword);

      return matchSession && matchPetugas && matchType && matchSearch;
    });
  }, [reviewRows, selectedSession, selectedPetugas, selectedType, search]);

  function getFinalQty(item) {
    if (item.isGroup) return Number(item.finalQty || 0);

    if (hasCorrection(item)) {
      return Number(item.correctedQty || 0);
    }

    return Number(item.countedQty || 0);
  }

  async function approveRow(item) {
    const ok = confirm(`Setujui data ${item.itemName}?`);
    if (!ok) return;

    try {
      const assignmentIds = new Set();
      if (item.assignmentId) assignmentIds.add(item.assignmentId);

      if (item.isGroup && item.children?.length) {
        await Promise.all(
          item.children.map((child) => {
            if (child.assignmentId) assignmentIds.add(child.assignmentId);
            return updateStockCount(child.id, {
              status: "disetujui",
              reviewedBy: "Admin",
              reviewedAt: new Date().toISOString(),
            });
          })
        );
      } else {
        await updateStockCount(item.id, {
          status: "disetujui",
          reviewedBy: "Admin",
          reviewedAt: new Date().toISOString(),
        });
      }

      // Update related assignment and report status
      if (assignmentIds.size > 0) {
        await Promise.all(
          Array.from(assignmentIds).map(async (id) => {
            await updateAssignment(id, { status: "disetujui" });
            try {
              await updateStockCountReport(id, { status: "disetujui" });
            } catch (e) {
              console.warn("Stock count report not found for assignment", id);
            }
          })
        );
      }

      await loadRows();
      setDetailRow(null);
    } catch (error) {
      console.error(error);
      alert("Gagal menyetujui data.");
    }
  }

  async function markRecount(item) {
    const ok = confirm(`Hapus hasil input lama dan minta hitung ulang untuk ${item.locationName}?`);
    if (!ok) return;

    try {
      const assignmentIds = new Set();
      if (item.assignmentId) assignmentIds.add(item.assignmentId);

      if (item.isGroup && item.children?.length) {
        await Promise.all(
          item.children.map((child) => {
            if (child.assignmentId) assignmentIds.add(child.assignmentId);
            // Delete record so it's fresh for the officer
            return deleteStockCount(child.id);
          })
        );
      } else {
        // Delete record so it's fresh for the officer
        await deleteStockCount(item.id);
      }

      // Reset assignment status and report so it appears back for the officer
      if (assignmentIds.size > 0) {
        await Promise.all(
          Array.from(assignmentIds).map(async (id) => {
            await updateAssignment(id, {
              status: "belum_dihitung",
              progress: 0,
            });
            try {
              await updateStockCountReport(id, { status: "hitung_ulang" });
            } catch (e) {
              // Report might not exist yet
            }
          })
        );
      }

      await loadRows();
      setDetailRow(null);
      alert("Input lama dihapus. Penugasan dikirim kembali ke petugas.");
    } catch (error) {
      console.error(error);
      alert("Gagal memproses hitung ulang.");
    }
  }

  function openCorrection(item) {
    if (item.isGroup) {
      alert("Koreksi ayam hidup dilakukan dari data detail per sekat, bukan total kandang.");
      return;
    }

    setCorrection({
      id: item.id,
      correctedQty: item.correctedQty || item.countedQty,
      correctionReason: item.correctionReason || "",
    });
  }

  function closeCorrection() {
    setCorrection(emptyCorrection);
  }

  async function saveCorrection(e) {
    e.preventDefault();

    if (!correction.correctedQty && correction.correctedQty !== 0) {
      alert("Qty koreksi wajib diisi.");
      return;
    }

    if (!correction.correctionReason.trim()) {
      alert("Alasan koreksi wajib diisi.");
      return;
    }

    const selected = rows.find((item) => item.id === correction.id);
    if (!selected) return;

    try {
      await updateStockCount(correction.id, {
        correctedQty: Number(correction.correctedQty),
        correctionReason: correction.correctionReason.trim(),
        status: "dikoreksi",
        correctedBy: "Admin",
        correctedAt: new Date().toISOString(),
      });

      alert("Koreksi berhasil disimpan.");

      await loadRows();
      closeCorrection();
      setDetailRow(null);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan koreksi.");
    }
  }

  const selectedCorrectionRow = rows.find((item) => item.id === correction.id);

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Review Data</h1>
          <p>Review, setujui, minta hitung ulang, atau koreksi hasil input petugas.</p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={loadRows}>
            Refresh
          </button>
        </div>
      </div>

      <div className="toolbar-card toolbar-row">
        <div className="search-box">
          <label>Sesi Opname</label>
          <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
            <option value="semua">Semua Sesi</option>
            {sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="search-box">
          <label>Petugas</label>
          <select value={selectedPetugas} onChange={(e) => setSelectedPetugas(e.target.value)}>
            <option value="semua">Semua Petugas</option>
            {petugas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="search-box">
          <label>Jenis Data</label>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="semua">Semua Jenis</option>
            <option value="gudang">Gudang</option>
            <option value="telur">Telur</option>
            <option value="ayam_hidup">Ayam Hidup</option>
            <option value="ayam_mati">Ayam Mati</option>
            <option value="ayam_upkir">Ayam Upkir</option>
            <option value="ayam_mati_upkir">Mati / Upkir Lama</option>
          </select>
        </div>

        <div className="search-box">
          <label>Cari</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari lokasi, item, sesi, petugas..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>Data Masuk dari APK</h3>

        <table className="data-table compact-table">
          <thead>
            <tr>
              <th>Lokasi</th>
              <th>Item</th>
              <th>Sistem</th>
              <th>Hasil SO</th>
              <th>Selisih</th>
              <th>Koreksi Admin</th>
              <th>Final</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Mengambil data...</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="8">Tidak ada data review.</td>
              </tr>
            ) : (
              filteredRows.map((item) => {
                const finalQty = getFinalQty(item);
                const difference = finalQty - Number(item.systemQty || 0);

                return (
                  <tr key={item.id} className="clickable-row" onClick={() => setDetailRow(item)}>
                    <td className="cell-ellipsis" title={item.locationName}>
                      {item.locationName || "-"}
                    </td>
                    <td className="cell-ellipsis" title={item.itemName}>
                      {item.itemName || "-"}
                    </td>
                    <td>
                      {formatNumber(item.systemQty)} {item.unit}
                    </td>
                    <td>
                      {formatNumber(item.countedQty)} {item.unit}
                    </td>
                    <td>
                      <span className={difference === 0 ? "badge green" : "badge red"}>
                        {formatNumber(difference)}
                      </span>
                    </td>
                    <td>
                      {item.correctedQty === "" || item.correctedQty == null
                        ? "-"
                        : `${formatNumber(item.correctedQty)} ${item.unit}`}
                    </td>
                    <td>
                      <strong>
                        {formatNumber(finalQty)} {item.unit}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(item.status)}`}>
                        {labelStatus(item.status)}
                      </span>
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
              <h3>Detail Review Data</h3>
              <button type="button" onClick={() => setDetailRow(null)}>
                ×
              </button>
            </div>

            <div className="detail-summary">
              <div>
                <span>Sesi</span>
                <strong>{detailRow.sessionName || "-"}</strong>
              </div>
              <div>
                <span>Jenis</span>
                <strong>{labelType(detailRow.type)}</strong>
              </div>
              <div>
                <span>Petugas</span>
                <strong>{detailRow.countedBy || "-"}</strong>
              </div>
              <div>
                <span>Waktu Input</span>
                <strong>{formatDateTime(detailRow.countedAt)}</strong>
              </div>
            </div>

            {detailRow.isGroup ? (
              <AyamHidupGroupDetail
                row={{
                  ...detailRow,
                  onCorrection: openCorrection,
                }}
              />
            ) : (
              <table className="data-table detail-table">
                <tbody>
                  <tr>
                    <th>Lokasi</th>
                    <td>{detailRow.locationName || "-"}</td>
                  </tr>
                  <tr>
                    <th>Item</th>
                    <td>{detailRow.itemName || "-"}</td>
                  </tr>
                  <tr>
                    <th>Stok Sistem</th>
                    <td>
                      {formatNumber(detailRow.systemQty)} {detailRow.unit}
                    </td>
                  </tr>
                  <tr>
                    <th>Hasil Petugas</th>
                    <td>
                      {formatNumber(detailRow.countedQty)} {detailRow.unit}
                    </td>
                  </tr>

                  {detailRow.type === "telur" && (
                    <>
                      <tr>
                        <th>Kg Timbang</th>
                        <td>{formatNumber(detailRow.weightKg)} Kg</td>
                      </tr>
                      <tr>
                        <th>Jumlah Butir</th>
                        <td>{formatNumber(detailRow.eggButir)} Butir</td>
                      </tr>
                      <tr>
                        <th>Jumlah Ikat</th>
                        <td>{formatNumber(detailRow.eggIkat)} Ikat</td>
                      </tr>
                      <tr>
                        <th>Jumlah Tray</th>
                        <td>{formatNumber(detailRow.eggTray)} Tray</td>
                      </tr>
                      <tr>
                        <th>Jumlah Peti</th>
                        <td>{formatNumber(detailRow.eggPeti)} Peti</td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <th>Selisih</th>
                    <td>
                      {formatNumber(getFinalQty(detailRow) - Number(detailRow.systemQty || 0))}{" "}
                      {detailRow.unit}
                    </td>
                  </tr>
                  <tr>
                    <th>Koreksi Admin</th>
                    <td>
                      {detailRow.correctedQty === "" || detailRow.correctedQty == null
                        ? "-"
                        : `${formatNumber(detailRow.correctedQty)} ${detailRow.unit}`}
                    </td>
                  </tr>
                  <tr>
                    <th>Final</th>
                    <td>
                      <strong>
                        {formatNumber(getFinalQty(detailRow))} {detailRow.unit}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>{labelStatus(detailRow.status)}</td>
                  </tr>
                  <tr>
                    <th>Alasan Koreksi</th>
                    <td>{detailRow.correctionReason || "-"}</td>
                  </tr>
                </tbody>
              </table>
            )}

            <div className="detail-actions">
              <button className="table-button success" onClick={() => approveRow(detailRow)}>
                Setujui
              </button>

              <button className="table-button warning" onClick={() => markRecount(detailRow)}>
                Hitung Ulang
              </button>

              {!detailRow.isGroup && (
                <button className="table-button" onClick={() => openCorrection(detailRow)}>
                  Koreksi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {correction.id && selectedCorrectionRow && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Koreksi Data</h3>
              <button type="button" onClick={closeCorrection}>
                ×
              </button>
            </div>

            <form onSubmit={saveCorrection} className="form-grid">
              <div className="form-group">
                <label>Lokasi</label>
                <input value={selectedCorrectionRow.locationName || "-"} disabled />
              </div>

              <div className="form-group">
                <label>Item</label>
                <input value={selectedCorrectionRow.itemName || "-"} disabled />
              </div>

              <div className="form-group">
                <label>Input Petugas</label>
                <input
                  value={`${formatNumber(selectedCorrectionRow.countedQty)} ${
                    selectedCorrectionRow.unit || ""
                  }`}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Qty Koreksi</label>
                <input
                  type="number"
                  value={correction.correctedQty}
                  onChange={(e) =>
                    setCorrection((prev) => ({
                      ...prev,
                      correctedQty: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group full">
                <label>Alasan Koreksi</label>
                <input
                  value={correction.correctionReason}
                  onChange={(e) =>
                    setCorrection((prev) => ({
                      ...prev,
                      correctionReason: e.target.value,
                    }))
                  }
                  placeholder="Contoh: salah input petugas / hasil timbang ulang"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeCorrection}>
                  Batal
                </button>
                <button type="submit" className="primary-button">
                  Simpan Koreksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AyamHidupGroupDetail({ row }) {
  const lorongGroups = groupByLorong(row.children || []);

  return (
    <div>
      <table className="data-table detail-table">
        <tbody>
          <tr>
            <th>Lokasi</th>
            <td>{row.locationName || "-"}</td>
          </tr>
          <tr>
            <th>Item</th>
            <td>Ayam Hidup</td>
          </tr>
          <tr>
            <th>Total Kandang</th>
            <td>
              <strong>
                {formatNumber(row.countedQty)} {row.unit}
              </strong>
            </td>
          </tr>
          <tr>
            <th>Koreksi Admin</th>
            <td>
              {row.correctedQty === "" || row.correctedQty == null
                ? "-"
                : `${formatNumber(row.correctedQty)} ${row.unit}`}
            </td>
          </tr>
          <tr>
            <th>Final Kandang</th>
            <td>
              <strong>
                {formatNumber(row.finalQty)} {row.unit}
              </strong>
            </td>
          </tr>
          <tr>
            <th>Jumlah Sekat Diinput</th>
            <td>{row.children?.length || 0} sekat</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>{labelStatus(row.status)}</td>
          </tr>
        </tbody>
      </table>

      {lorongGroups.map((lorong) => (
        <div className="table-card" key={lorong.lorong} style={{ marginTop: 16 }}>
          <h3>
            Lorong {lorong.lorong}: {formatNumber(lorong.total)} Ekor
          </h3>

          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>Baris</th>
                <th>Sekat</th>
                <th>Hasil SO</th>
                <th>Koreksi Admin</th>
                <th>Final</th>
                <th>Petugas</th>
                <th>Waktu</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {lorong.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.baris || "-"}</td>
                  <td>{item.sekat || "-"}</td>
                  <td>
                    <strong>{formatNumber(item.countedQty)} Ekor</strong>
                  </td>
                  <td>
                    {item.correctedQty === "" || item.correctedQty == null
                      ? "-"
                      : `${formatNumber(item.correctedQty)} Ekor`}
                  </td>
                  <td>
                    <strong>{formatNumber(getChildFinalQty(item))} Ekor</strong>
                  </td>
                  <td>{item.countedBy || "-"}</td>
                  <td>{formatDateTime(item.countedAt)}</td>
                  <td>
                    <button
                      className="table-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        row.onCorrection(item);
                      }}
                    >
                      Koreksi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function buildReviewRows(rows) {
  const result = [];
  const ayamGroups = new Map();

  rows.forEach((item) => {
    if (item.type !== "ayam_hidup") {
      result.push(item);
      return;
    }

    const key = [item.sessionId || "", item.locationId || "", item.type || ""].join("__");

    if (!ayamGroups.has(key)) {
      ayamGroups.set(key, {
        ...item,
        id: `ayam_hidup_group_${key}`,
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
        petugasList: new Set(),
      });
    }

    const group = ayamGroups.get(key);
    group.children.push(item);
    group.systemQty = getAyamHidupSystemQty(group, item);

    if (item.countedBy) {
      group.petugasList.add(item.countedBy);
    }

    group.countedQty += Number(item.countedQty || 0);
    group.finalQty += getChildFinalQty(item);
    if (hasCorrection(item)) {
      group.hasCorrection = true;
    }
    if (item.correctionReason) {
      group.correctionReasons.add(item.correctionReason);
    }
    group.countedAt = getLatestDate(group.countedAt, item.countedAt);
    group.status = mergeStatus(group.children);
  });

  const groups = Array.from(ayamGroups.values()).map((group) => ({
    ...group,
    correctedQty: group.hasCorrection ? group.finalQty : "",
    correctionReason: Array.from(group.correctionReasons || []).join("; "),
    countedBy: Array.from(group.petugasList || []).join(", "),
  }));

  return [...result, ...groups];
}

function groupByLorong(items) {
  const map = new Map();

  items.forEach((item) => {
    const lorong = Number(item.lorong || 0);

    if (!map.has(lorong)) {
      map.set(lorong, {
        lorong,
        total: 0,
        items: [],
      });
    }

    const group = map.get(lorong);
    group.items.push(item);
    group.total += getChildFinalQty(item);
  });

  return Array.from(map.values())
    .sort((a, b) => a.lorong - b.lorong)
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (a, b) =>
          Number(a.baris || 0) - Number(b.baris || 0) ||
          Number(a.sekat || 0) - Number(b.sekat || 0)
      ),
    }));
}

function getChildFinalQty(item) {
  if (hasCorrection(item)) {
    return Number(item.correctedQty || 0);
  }

  return Number(item.countedQty || 0);
}

function hasCorrection(item) {
  return item.correctedQty !== "" && item.correctedQty != null;
}

function getAyamHidupSystemQty(group, item) {
  const currentQty = Number(group.systemQty || 0);
  const rowQty = Number(
    item.systemQty || item.targetPopulation || item.totalPopulation || 0
  );

  return Math.max(currentQty, rowQty);
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

export default ReviewPage;
