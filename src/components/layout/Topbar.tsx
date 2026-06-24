import { Menu, Search, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onMenuClick} className="p-2 lg:hidden">
          <Menu size={22} />
        </Button>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">HotelPlanner Operations</p>
          <h2 className="text-xl font-black text-slate-950">Agent Utilization Control</h2>
        </div>
      </div>
      <div className="hidden min-w-80 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
        <Search size={17} className="text-slate-400" />
        <span className="text-sm text-slate-400">Search HP ID, agent, center...</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right md:block">
          <p className="text-sm font-black text-slate-950">{profile?.name}</p>
          <p className="text-xs text-slate-500">{profile?.role}</p>
        </div>
        <Button variant="secondary" onClick={logout} className="px-3">
          <LogOut size={17} />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
