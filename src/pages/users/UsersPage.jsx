import { useEffect, useMemo, useState } from "react";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/userService";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "../../firebase/firebaseConfig";

// Secondary app instance untuk buat akun baru tanpa mengganggu session admin
function getSecondaryAuth() {
  const secondaryAppName = "secondary";
  const existing = getApps().find((app) => app.name === secondaryAppName);
  const secondaryApp = existing || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(secondaryApp);
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const emptyForm = {
  name: "",
  email: "",
  role: "petugas",
  isActive: true,
};

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdPassword, setCreatedPassword] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data petugas dari Firebase.");
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();

    return users.filter((item) => {
      return (
        String(item.name || "").toLowerCase().includes(keyword) ||
        String(item.email || "").toLowerCase().includes(keyword) ||
        labelRole(item.role).toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Nama petugas wajib diisi.");
      return;
    }

    if (!form.email.trim()) {
      alert("Email wajib diisi.");
      return;
    }

    const emailExists = users.some(
      (item) =>
        String(item.email || "").toLowerCase() === form.email.trim().toLowerCase() &&
        item.id !== editingId
    );

    if (emailExists) {
      alert("Email sudah digunakan.");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        isActive: form.isActive,
        isUsed: false,
      };

      if (editingId) {
        await updateUser(editingId, payload);
        alert("Petugas berhasil diupdate.");
        await loadUsers();
        closeForm();
      } else {
        // Buat akun Auth pakai secondary app agar session admin tidak terganggu
        const tempPassword = generatePassword();
        const secondaryAuth = getSecondaryAuth();
        await createUserWithEmailAndPassword(secondaryAuth, payload.email, tempPassword);
        await secondaryAuth.signOut();

        await createUser(payload);
        await loadUsers();
        closeForm();

        // Tampilkan password sementara ke admin
        setCreatedPassword({ name: payload.name, email: payload.email, password: tempPassword });
      }
    } catch (error) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        alert("Email sudah terdaftar di sistem login. Gunakan email lain.");
      } else {
        alert("Gagal menyimpan petugas ke Firebase.");
      }
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      email: item.email || "",
      role: item.role || "petugas",
      isActive: item.isActive ?? true,
    });
    setShowForm(true);
  }

  async function handleToggleActive(item) {
    const action = item.isActive ? "nonaktifkan" : "aktifkan";
    const ok = confirm(`Yakin ingin ${action} ${item.name}?`);
    if (!ok) return;

    try {
      await updateUser(item.id, {
        ...item,
        isActive: !item.isActive,
      });

      await loadUsers();
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status petugas.");
    }
  }

  async function handleDelete(item) {
    if (item.isUsed) {
      alert("Petugas sudah digunakan. Tidak bisa dihapus, silakan nonaktifkan saja.");
      return;
    }

    const ok = confirm(`Hapus petugas ${item.name}?`);
    if (!ok) return;

    try {
      await deleteUser(item.id);
      await loadUsers();
      alert("Petugas berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus petugas dari Firebase.");
    }
  }

  return (
    <div className="page">
      <div className="page-header page-header-row">
        <div>
          <h1>Petugas</h1>
          <p>Kelola admin, auditor, dan petugas stock opname.</p>
        </div>

        <div className="page-actions">
          <button className="primary-button" onClick={openAddForm}>
            + Tambah Petugas
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="search-box">
          <label>Cari Petugas</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, role..."
          />
        </div>
      </div>

      <div className="table-card">
        <h3>Daftar Petugas</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5">Mengambil data...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5">Tidak ada data petugas.</td>
              </tr>
            ) : (
              filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{labelRole(item.role)}</td>
                  <td>
                    <span className={item.isActive ? "badge green" : "badge gray"}>
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <button className="table-button" onClick={() => handleEdit(item)}>
                      Edit
                    </button>

                    <button
                      className="table-button warning"
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? "Nonaktif" : "Aktifkan"}
                    </button>

                    {!item.isUsed && (
                      <button
                        className="table-button danger"
                        onClick={() => handleDelete(item)}
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? "Edit Petugas" : "Tambah Petugas"}</h3>
              <button type="button" onClick={closeForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Nama Petugas</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Contoh: Budi"
                />
              </div>

              <div className="form-group">
                <label>Email Login</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Contoh: budi@kareumbi.com"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="admin">Admin</option>
                  <option value="auditor">Auditor</option>
                  <option value="petugas">Petugas</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                Aktif
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeForm}>
                  Batal
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? "Update Petugas" : "Simpan Petugas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {createdPassword && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Akun Berhasil Dibuat</h3>
            </div>
            <div style={{ padding: "16px 0" }}>
              <p>Berikan informasi login berikut kepada petugas:</p>
              <br />
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", fontWeight: "600", width: "120px" }}>Nama</td>
                    <td>{createdPassword.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", fontWeight: "600" }}>Email</td>
                    <td>{createdPassword.email}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", fontWeight: "600" }}>Password</td>
                    <td>
                      <strong style={{ fontSize: "18px", letterSpacing: "2px", color: "#2563eb" }}>
                        {createdPassword.password}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />
              <p style={{ color: "#dc2626", fontSize: "13px" }}>
                ⚠️ Catat password ini sekarang. Password tidak akan ditampilkan lagi.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                onClick={() => setCreatedPassword(null)}
              >
                Sudah Dicatat, Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function labelRole(role) {
  const labels = {
    admin: "Admin",
    auditor: "Auditor",
    petugas: "Petugas",
    viewer: "Viewer",
  };

  return labels[role] || role;
}

export default UsersPage;