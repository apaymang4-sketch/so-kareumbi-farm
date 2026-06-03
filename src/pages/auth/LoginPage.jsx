import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, getUserProfileByEmail } from "../../services/authService";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (!email.trim()) {
      alert("Email wajib diisi.");
      return;
    }

    if (!password.trim()) {
      alert("Password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      await loginUser(email.trim().toLowerCase(), password);

      const profile = await getUserProfileByEmail(email.trim().toLowerCase());

      if (!profile) {
        alert("Login berhasil, tapi data user belum ada di Firestore.");
        return;
      }

      if (profile.isActive === false) {
        alert("User nonaktif. Hubungi admin.");
        return;
      }

      localStorage.setItem("so_user", JSON.stringify(profile));

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Login gagal. Cek email dan password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">SO</div>

        <h1>Login</h1>
        <p>Stock Opname Kareumbi Farm</p>

        <form onSubmit={handleLogin}>
          <div className="form-group full">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kareumbi.com"
            />
          </div>

          <div className="form-group full">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>

          <button className="primary-button login-button" disabled={loading}>
            {loading ? "Masuk..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;