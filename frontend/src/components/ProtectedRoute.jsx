import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasAnyRole, isAdmin, normalizeRole } from "../constants/roles";
import { Container, Section } from "./ui";

export default function ProtectedRoute({ children, adminOnly = false, allowedRoles = null }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin(user)) {
    return (
      <Section>
        <Container>
          <h1 className="text-2xl font-semibold text-heading">Access denied</h1>
          <p className="mt-2 text-muted">This page is only available to admin users.</p>
        </Container>
      </Section>
    );
  }

  if (allowedRoles?.length && !hasAnyRole(user, ...allowedRoles)) {
    return (
      <Section>
        <Container>
          <h1 className="text-2xl font-semibold text-heading">Access denied</h1>
          <p className="mt-2 text-muted">
            You do not have permission for this page (role: {normalizeRole(user?.role)}).
          </p>
        </Container>
      </Section>
    );
  }

  return children;
}
