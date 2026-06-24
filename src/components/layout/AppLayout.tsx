import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PageLoader } from '../ui/Skeleton';

export function AppLayout() {
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="p-8"><PageLoader /></div>;
  if (!profile) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar profile={profile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
