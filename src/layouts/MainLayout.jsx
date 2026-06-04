import { useEffect, useState } from "react";
import {
  Grid2X2,
  Database,
  ClipboardList,
  FileSpreadsheet,
  X,
  Warehouse,
  Home,
  Package,
  Users,
  UserCheck,
  Activity,
  Egg,
  Bird,
  Settings,
  Bell,
  UserCircle,
  LogOut,
  KeyRound,
  User,
} from "lucide-react";

import DashboardPage from "../pages/dashboard/DashboardPage";
import LocationsPage from "../pages/locations/LocationsPage";
import CagesPage from "../pages/cages/CagesPage";
import ItemsPage from "../pages/items/ItemsPage";
import SessionsPage from "../pages/sessions/SessionsPage";
import AssignmentsPage from "../pages/assignments/AssignmentsPage";
import MonitoringPage from "../pages/monitoring/MonitoringPage";
import ReportsPage from "../pages/reports/ReportsPage";
import ReviewPage from "../pages/reviews/ReviewPage";
import UsersSettingPage from "../pages/settings/UsersSettingPage";

import {
  logoutUser,
  changeCurrentUserPassword,
} from "../services/authService";

import {
  getAdminNotifications,
  markNotificationAsRead,
} from "../services/notificationService";

const pageMenus = {
  master: {
    title: "Master Data",
    color: "blue",
    menus: [
      { id: "locations", title: "Lokasi Gudang", icon: Warehouse, component: LocationsPage },
      { id: "cages", title: "Kandang", icon: Home, component: CagesPage },
      { id: "items", title: "Barang", icon: Package, component: ItemsPage },
    ],
  },

  opname: {
    title: "Stock Opname",
    color: "green",
    menus: [
      { id: "sessions", title: "Sesi Opname", icon: ClipboardList, component: SessionsPage },
      { id: "assignments", title: "Assignment", icon: UserCheck, component: AssignmentsPage },
      { id: "monitoring", title: "Monitoring", icon: Activity, component: MonitoringPage },
    ],
  },

  input: {
    title: "Review Data",
    color: "orange",
    menus: [
      { id: "reviewData", title: "Review Data", icon: Activity, component: ReviewPage },
    ],
  },

  reports: {
    title: "Laporan",
    color: "purple",
    menus: [
      {
        id: "report_stok_gudang",
        title: "Stok Gudang",
        icon: Warehouse,
        component: () => <ReportsPage initialReport="stok_gudang" />,
      },
      {
        id: "report_selisih_gudang",
        title: "Selisih Gudang",
        icon: FileSpreadsheet,
        component: () => <ReportsPage initialReport="selisih_gudang" />,
      },
      {
        id: "report_ayam_hidup_rekap",
        title: "Ayam Hidup Rekap",
        icon: Bird,
        component: () => <ReportsPage initialReport="ayam_hidup_rekap" />,
      },
      {
        id: "report_ayam_hidup_detail",
        title: "Ayam Hidup Detail",
        icon: Bird,
        component: () => <ReportsPage initialReport="ayam_hidup_detail" />,
      },
      {
        id: "report_ayam_mati",
        title: "Ayam Mati",
        icon: Bird,
        component: () => <ReportsPage initialReport="ayam_mati" />,
      },
      {
        id: "report_ayam_upkir",
        title: "Ayam Upkir",
        icon: Bird,
        component: () => <ReportsPage initialReport="ayam_upkir" />,
      },
      {
        id: "report_telur_bagus",
        title: "Telur Bagus",
        icon: Egg,
        component: () => <ReportsPage initialReport="telur_bagus" />,
      },
      {
        id: "report_telur_reject",
        title: "Telur Reject",
        icon: Egg,
        component: () => <ReportsPage initialReport="telur_reject" />,
      },
      {
        id: "report_koreksi_admin",
        title: "Koreksi Admin",
        icon: FileSpreadsheet,
        component: () => <ReportsPage initialReport="koreksi_admin" />,
      },
      {
        id: "report_kinerja_petugas",
        title: "Kinerja Petugas",
        icon: Users,
        component: () => <ReportsPage initialReport="kinerja_petugas" />,
      },
      {
        id: "report_foto_so",
        title: "Foto Hasil SO",
        icon: FileSpreadsheet,
        component: () => <ReportsPage initialReport="foto_so" />,
      },
    ],
  },

  settings: {
    title: "Sistem",
    color: "purple",
    menus: [
      {
        id: "setting_users",
        title: "User Login",
        icon: Settings,
        component: UsersSettingPage,
      },
    ],
  },
};

function MainLayout() {
  const [tabs, setTabs] = useState([
    { id: "dashboard", title: "Dashboard", component: DashboardPage },
  ]);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeMenuPanel, setActiveMenuPanel] = useState(null);

  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem("so_user")) || {};

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const data = await getAdminNotifications(currentUser.email || "");
      setNotifCount(data.count || 0);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Gagal mengambil notifikasi:", error);
      setNotifCount(0);
      setNotifications([]);
    }
  }
  async function handleReadNotification(item) {
    try {
      await markNotificationAsRead(currentUser.email || "", item);
  
      setNotifications((prev) => prev.filter((notif) => notif.key !== item.key));
      setNotifCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Gagal menandai notifikasi dibaca:", error);
      alert("Gagal menandai notifikasi.");
    }
  }

  async function handleLogout() {
    const ok = confirm("Yakin logout?");
    if (!ok) return;

    try {
      await logoutUser();
      localStorage.removeItem("so_user");
      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      alert("Gagal logout.");
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert("Password minimal 6 karakter.");
      return;
    }

    try {
      await changeCurrentUserPassword(newPassword);

      alert("Password berhasil diganti.");

      setNewPassword("");
      setShowPassword(false);
    } catch (error) {
      console.error(error);
      alert("Gagal ganti password. Silakan login ulang lalu coba lagi.");
    }
  }

  function openTab(menu) {
    const exists = tabs.find((tab) => tab.id === menu.id);

    if (!exists) {
      setTabs((prev) => [...prev, menu]);
    }

    setActiveTab(menu.id);
    setActiveMenuPanel(null);
  }

  function closeTab(tabId) {
    if (tabId === "dashboard") return;

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    if (activeTab === tabId) {
      setActiveTab(newTabs[newTabs.length - 1]?.id || "dashboard");
    }
  }

  const currentTab = tabs.find((tab) => tab.id === activeTab);
  const ActiveComponent = currentTab?.component || DashboardPage;

  return (
    <div className="accurate-shell">
      <aside className="icon-sidebar">
        <div className="icon-logo">SO</div>

        <button
          className="side-icon"
          title="Dashboard"
          onClick={() => {
            setActiveTab("dashboard");
            setActiveMenuPanel(null);
          }}
        >
          <Grid2X2 size={19} />
        </button>

        <button
          className={activeMenuPanel === "master" ? "side-icon active" : "side-icon"}
          title="Master Data"
          onClick={() =>
            setActiveMenuPanel(activeMenuPanel === "master" ? null : "master")
          }
        >
          <Database size={19} />
        </button>

        <button
          className={activeMenuPanel === "opname" ? "side-icon active" : "side-icon"}
          title="Stock Opname"
          onClick={() =>
            setActiveMenuPanel(activeMenuPanel === "opname" ? null : "opname")
          }
        >
          <ClipboardList size={19} />
        </button>

        <button
          className={activeMenuPanel === "input" ? "side-icon active" : "side-icon"}
          title="Review Data"
          onClick={() =>
            setActiveMenuPanel(activeMenuPanel === "input" ? null : "input")
          }
        >
          <Bird size={19} />
        </button>

        <button
          className={activeMenuPanel === "reports" ? "side-icon active" : "side-icon"}
          title="Laporan"
          onClick={() =>
            setActiveMenuPanel(activeMenuPanel === "reports" ? null : "reports")
          }
        >
          <FileSpreadsheet size={19} />
        </button>

        <button
          className={activeMenuPanel === "settings" ? "side-icon active" : "side-icon"}
          title="Sistem"
          onClick={() =>
            setActiveMenuPanel(activeMenuPanel === "settings" ? null : "settings")
          }
        >
          <Settings size={19} />
        </button>
      </aside>

      {activeMenuPanel && (
        <div className="menu-popup">
          <div className="menu-popup-header">
            <h3>{pageMenus[activeMenuPanel].title}</h3>

            <button type="button" onClick={() => setActiveMenuPanel(null)}>
              <X size={16} />
            </button>
          </div>

          <div className="accurate-menu-grid">
            {pageMenus[activeMenuPanel].menus.map((menu) => {
              const Icon = menu.icon;

              return (
                <button
                  key={menu.id}
                  className={`accurate-menu-card ${pageMenus[activeMenuPanel].color}`}
                  onClick={() => openTab(menu)}
                >
                  <Icon size={28} />
                  <span>{menu.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="accurate-main">
        <div className="app-topbar">
          <div className="topbar-left">
            <h2>Stock Opname KAREUMBI FARM</h2>
          </div>

          <div className="topbar-right">
            <div className="top-action-wrap">
              <button
                type="button"
                className="notification-box"
                onClick={() => {
                  const next = !showNotif;
                  setShowNotif(next);
                  setShowUserMenu(false);

                  if (next) {
                    loadNotifications();
                  }
                }}
              >
                <Bell size={18} />
                {notifCount > 0 && <span>{notifCount}</span>}
              </button>

              {showNotif && (
                <div className="top-dropdown notif-dropdown">
                  <h4>Notifikasi</h4>

                  {notifications.length === 0 ? (
                    <div className="dropdown-notif-item">
                      <p>Tidak ada notifikasi baru.</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((item) => (
                      <button
  type="button"
  className="dropdown-notif-item"
  key={item.key}
  onClick={() => handleReadNotification(item)}
>
  <strong>{item.title}</strong>
  <p>{item.message}</p>
  <small>Klik untuk tandai sudah dibaca</small>
</button>
                    ))
                  )}

                  <div className="dropdown-notif-item">
                    <button
                      type="button"
                      className="table-button"
                      onClick={loadNotifications}
                    >
                      Refresh Notifikasi
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="top-action-wrap">
              <button
                type="button"
                className="login-user-box"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotif(false);
                }}
              >
                <UserCircle size={20} />

                <div>
                  <strong>{currentUser.name || "Administrator"}</strong>
                  <small>{currentUser.role || "admin"}</small>
                </div>
              </button>

              {showUserMenu && (
                <div className="top-dropdown user-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(true);
                      setShowUserMenu(false);
                    }}
                  >
                    <User size={15} />
                    Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(true);
                      setShowUserMenu(false);
                    }}
                  >
                    <KeyRound size={15} />
                    Ganti Password
                  </button>

                  <button
                    type="button"
                    className="danger-text"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tabbar">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={activeTab === tab.id ? "app-tab active" : "app-tab"}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.title}</span>

              {tab.id !== "dashboard" && (
                <button
                  type="button"
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <section className="accurate-content">
          <ActiveComponent />
        </section>

        {showProfile && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header">
                <h3>Profile User</h3>

                <button type="button" onClick={() => setShowProfile(false)}>
                  ✕
                </button>
              </div>

              <div className="detail-summary">
                <div>
                  <span>Nama</span>
                  <strong>{currentUser.name || "-"}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{currentUser.email || "-"}</strong>
                </div>

                <div>
                  <span>Role</span>
                  <strong>{currentUser.role || "-"}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{currentUser.isActive === false ? "Nonaktif" : "Aktif"}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPassword && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header">
                <h3>Ganti Password</h3>

                <button type="button" onClick={() => setShowPassword(false)}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>Password Baru</label>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowPassword(false)}
                  >
                    Batal
                  </button>

                  <button type="submit" className="primary-button">
                    Simpan Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MainLayout;