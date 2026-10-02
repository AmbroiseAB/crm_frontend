import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { RoleRoute } from "./components/layout/RoleRoute";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import ActionCenter from "./pages/ActionCenter";
import PublicLeadForm from "./pages/PublicLeadForm";
import AdminUsers from "./pages/admin/Users";
import AdminTeam from "./pages/admin/Team";

/* Central route table. Auth routes are public; everything else is wrapped in
   the authenticated AppLayout behind <ProtectedRoute>. */
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Public web-to-lead form — no authentication */}
      <Route path="/f/:orgSlug" element={<PublicLeadForm />} />

      {/* Private */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/action-center" element={<ActionCenter />} />
        <Route path="/settings" element={<Settings />} />
        {/* Team view — admin + manager */}
        <Route
          path="/admin/team"
          element={
            <RoleRoute roles={["admin", "manager"]}>
              <AdminTeam />
            </RoleRoute>
          }
        />
        {/* User management — admin only */}
        <Route
          path="/admin/users"
          element={
            <RoleRoute roles={["admin"]}>
              <AdminUsers />
            </RoleRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
