import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { RoleRoute } from './components/layout/RoleRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { RecordsPage } from './pages/RecordsPage';
import { AgentDetailsPage } from './pages/AgentDetailsPage';
import { CallCentersPage } from './pages/CallCentersPage';
import { AuditHistoryPage } from './pages/AuditHistoryPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { DeletedRecordsPage } from './pages/DeletedRecordsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => bootstrap(), [bootstrap]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route element={<RoleRoute roles={['superAdmin', 'callCenterAdmin']} />}>
          <Route path="upload" element={<UploadPage />} />
        </Route>
        <Route path="records" element={<RecordsPage />} />
        <Route path="agents/:agentHpId" element={<AgentDetailsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route element={<RoleRoute roles={['superAdmin']} />}>
          <Route path="call-centers" element={<CallCentersPage />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="deleted-records" element={<DeletedRecordsPage />} />
        </Route>
        <Route element={<RoleRoute roles={['superAdmin', 'callCenterAdmin']} />}>
          <Route path="audit-history" element={<AuditHistoryPage />} />
        </Route>
        <Route path="not-found" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Route>
    </Routes>
  );
}
