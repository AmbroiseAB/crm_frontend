import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Gate a route by role. Renders children only when the user's role is allowed;
 * otherwise bounces to the dashboard. Assumes it sits inside <ProtectedRoute>,
 * so `user` is already resolved.
 */
export function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
