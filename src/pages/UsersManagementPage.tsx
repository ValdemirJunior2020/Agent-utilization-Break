import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { AppUser, Role } from '../types';
import { CALL_CENTERS, getCallCenterName } from '../constants/callCenters';
import { createManagedUser, getUsers, updateManagedUser } from '../services/usersService';
import { useAuthStore } from '../store/authStore';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SoftBadge } from '../components/ui/Badge';
import { formatDateTime } from '../utils/dates';

export function UsersManagementPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setUsers(await getUsers());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(user: AppUser) {
    await updateManagedUser(user.uid, { active: !user.active }, profile);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Users Management"
        description="Create and manage Super Admin, Call Center Admin, and Viewer users. Each non-Super Admin user is assigned to one operational center."
        actions={<Button onClick={() => setCreateOpen(true)}><UserPlus size={18} /> Create User</Button>}
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">User</th>
                <th className="table-cell">Role</th>
                <th className="table-cell">Call Center</th>
                <th className="table-cell">Logins</th>
                <th className="table-cell">Last Login</th>
                <th className="table-cell">Status</th>
                <th className="table-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.uid}>
                  <td className="table-cell"><p className="font-black text-slate-950">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                  <td className="table-cell"><SoftBadge tone={user.role === 'superAdmin' ? 'red' : user.role === 'callCenterAdmin' ? 'blue' : 'slate'}>{user.role}</SoftBadge></td>
                  <td className="table-cell text-slate-600">{user.callCenterName || 'All call centers'}</td>
                  <td className="table-cell font-semibold text-slate-700">{user.loginCount ?? 0}</td>
                  <td className="table-cell text-slate-600">{formatDateTime(user.lastLoginAt)}</td>
                  <td className="table-cell"><SoftBadge tone={user.active ? 'emerald' : 'slate'}>{user.active ? 'Active' : 'Inactive'}</SoftBadge></td>
                  <td className="table-cell text-right"><Button variant="secondary" onClick={() => toggleActive(user)}>{user.active ? 'Deactivate' : 'Activate'}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} onCreated={load} />}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const profile = useAuthStore((state) => state.profile)!;
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer' as Role,
    callCenterId: CALL_CENTERS[0].id,
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const callCenterName = form.role === 'superAdmin' ? null : getCallCenterName(form.callCenterId);
    await createManagedUser(
      {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        callCenterId: form.role === 'superAdmin' ? null : form.callCenterId,
        callCenterName,
      },
      profile,
    );
    setSaving(false);
    onClose();
    await onCreated();
  }

  return (
    <Modal title="Create Managed User" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Creating...' : 'Create User'}</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Temporary Password"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="viewer">Viewer</option><option value="callCenterAdmin">Call Center Admin</option><option value="superAdmin">Super Admin</option></Select></Field>
        {form.role !== 'superAdmin' && <Field label="Assigned Call Center"><Select value={form.callCenterId} onChange={(e) => setForm({ ...form, callCenterId: e.target.value })}>{CALL_CENTERS.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</Select></Field>}
      </div>
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">The app creates the Firebase Auth account with a secondary Firebase app so the Super Admin session stays logged in.</p>
    </Modal>
  );
}
