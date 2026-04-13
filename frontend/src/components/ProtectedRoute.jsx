import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user?.role !== "admin") {
    return (
      <main className="container section-space">
        <h1>Zugriff verweigert</h1>
        <p className="detail-subtitle">Diese Seite ist nur fuer Admin-Benutzer verfuegbar.</p>
      </main>
    );
  }

  return children;
}
