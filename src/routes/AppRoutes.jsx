import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import LoginPage from "../pages/auth/LoginPage";

function ProtectedRoute() {
  const user = localStorage.getItem("so_user");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout />;
}

function AppRoutes() {
  const user = localStorage.getItem("so_user");

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route path="/*" element={<ProtectedRoute />} />
    </Routes>
  );
}

export default AppRoutes;