import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasAnyRole, isAdmin, normalizeRole } from "../constants/roles";

export default function ProtectedRoute({ children, adminOnly = false, allowedRoles = null }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin(user)) {
    return (
      <main className="container section-space">
        <h1>Zugriff verweigert</h1>
        <p className="detail-subtitle">Diese Seite ist nur fuer Admin-Benutzer verfuegbar.</p>
      </main>
    );
  }

  if (allowedRoles?.length && !hasAnyRole(user, ...allowedRoles)) {
    return (
      <main className="container section-space">
        <h1>Zugriff verweigert</h1>
        <p className="detail-subtitle">
          Keine Berechtigung fuer diese Seite (Rolle: {normalizeRole(user?.role)}).
        </p>
      </main>
    );
  }

  return children;
}
