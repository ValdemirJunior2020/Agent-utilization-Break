import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '../../types';
import { useAuthStore } from '../../store/authStore';

export function RoleRoute({ roles }: { roles: Role[] }) {
  const profile = useAuthStore((state) => state.profile);
  if (!profile) return <Navigate to="/login" replace />;
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
