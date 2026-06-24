import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (profile) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await login(email, password);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_34%),linear-gradient(135deg,#020617,#0f172a)] p-4 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl place-items-center lg:grid-cols-2">
        <div className="hidden p-8 lg:block">
          <div className="inline-flex rounded-3xl bg-white/10 p-4 backdrop-blur"><ShieldCheck size={48} /></div>
          <h1 className="mt-8 max-w-xl text-5xl font-black leading-tight tracking-tight">Agent Utilization and Break Time Compliance</h1>
          <p className="mt-5 max-w-lg text-lg text-slate-300">Upload Tableau Excel reports, detect breaks above 60 minutes, track repeated issues, audit every change, and report results by call center.</p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-black">60+</p><p className="text-sm text-slate-300">Warning threshold</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-black">90+</p><p className="text-sm text-slate-300">Critical threshold</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-black">6</p><p className="text-sm text-slate-300">Centers supported</p></div>
          </div>
        </div>

        <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 text-slate-950 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white"><ShieldCheck size={28} /></div>
            <h2 className="mt-5 text-2xl font-black">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Role-based access for Super Admin, Call Center Admin, and Viewer users.</p>
          </div>
          <div className="grid gap-4">
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></Field>
            {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">{error}</div>}
            <Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
