import { NavLink } from 'react-router-dom';
import { BarChart3, Clock3, FileSpreadsheet, History, LayoutDashboard, Recycle, Settings, Shield, Upload, Users, Building2 } from 'lucide-react';
import clsx from 'clsx';
import type { AppUser } from '../../types';

const baseItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['superAdmin', 'callCenterAdmin', 'viewer'] },
  { to: '/upload', label: 'Upload Excel', icon: Upload, roles: ['superAdmin', 'callCenterAdmin'] },
  { to: '/records', label: 'All Records', icon: Clock3, roles: ['superAdmin', 'callCenterAdmin', 'viewer'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['superAdmin', 'callCenterAdmin', 'viewer'] },
  { to: '/call-centers', label: 'Call Centers', icon: Building2, roles: ['superAdmin'] },
  { to: '/audit-history', label: 'Audit History', icon: History, roles: ['superAdmin', 'callCenterAdmin'] },
  { to: '/deleted-records', label: 'Restore Records', icon: Recycle, roles: ['superAdmin'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['superAdmin'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['superAdmin'] },
];

export function Sidebar({ profile, open, onClose }: { profile: AppUser; open: boolean; onClose: () => void }) {
  const items = baseItems.filter((item) => item.roles.includes(profile.role));
  return (
    <>
      <div className={clsx('fixed inset-0 z-30 bg-slate-950/30 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} />
      <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white"><Shield size={22} /></div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">WatchTower</p>
            <h1 className="text-base font-black text-slate-950">Break Compliance</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition', isActive ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950')
                }
              >
                <Icon size={19} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="m-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">{profile.name}</p>
          <p className="mt-1 text-xs text-slate-500">{profile.email}</p>
          <p className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {profile.role === 'superAdmin' ? 'Super Admin' : profile.callCenterName}
          </p>
        </div>
      </aside>
    </>
  );
}
