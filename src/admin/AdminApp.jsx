import { Navigate, Route, Routes } from "react-router-dom";
import { PageLoader } from "../components/Loading";
import { useAuth } from "../store/auth";
import { isAdmin } from "./access";
import AdminLayout from "./AdminLayout";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberDetail from "./pages/MemberDetail";
import Reports from "./pages/Reports";
import { Photos, Verification } from "./pages/Media";
import { Broadcast, Plans, Stories } from "./pages/Business";
import { ActivityLog, Settings, Support } from "./pages/System";
import "./admin.css";

export default function AdminApp() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="Opening admin console…" />;
  if (!isAdmin(user)) return <Navigate to="/admin/login" replace />;
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:id" element={<MemberDetail />} />
        <Route path="verification" element={<Verification />} />
        <Route path="photos" element={<Photos />} />
        <Route path="reports" element={<Reports />} />
        <Route path="support" element={<Support />} />
        <Route path="plans" element={<Plans />} />
        <Route path="stories" element={<Stories />} />
        <Route path="broadcast" element={<Broadcast />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
