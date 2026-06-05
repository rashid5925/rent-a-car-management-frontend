import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, KeyRound, Users as UsersIcon, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common';
import { Section, Field, Input, Loading, Spinner, Modal, ConfirmDialog, EmptyState, Badge } from '../components/ui';
import UserForm from '../components/forms/UserForm';

export default function SettingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Business profile, security and team" />
      {isOwner && <BusinessProfile />}
      <ChangePassword />
      {isOwner && <UserManagement currentUserId={user.id} />}
      <Section title="Account" className="mt-4">
        <div className="text-sm text-gray-600 space-y-1">
          <p><span className="text-gray-400">Signed in as:</span> <b>{user?.name}</b></p>
          <p><span className="text-gray-400">Email:</span> {user?.email}</p>
          <p><span className="text-gray-400">Role:</span> {user?.role}</p>
        </div>
      </Section>
    </div>
  );
}

function BusinessProfile() {
  const qc = useQueryClient();
  const [f, setF] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });
  useEffect(() => { if (data) setF(data); }, [data]);

  const save = useMutation({
    mutationFn: (p) => api.put('/settings', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Settings saved'); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading || !f) return <Section title="Business Profile" icon={Building2} className="mb-4"><Loading /></Section>;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Section title="Business Profile" icon={Building2} className="mb-4">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(f); }} className="space-y-4">
        <Field label="Business Name"><Input value={f.business_name || ''} onChange={set('business_name')} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone"><Input value={f.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Currency"><Input value={f.currency || 'PKR'} onChange={set('currency')} /></Field>
        </div>
        <Field label="Address"><Input value={f.address || ''} onChange={set('address')} /></Field>
        <Field label="Default settlement period (days)"><Input type="number" value={f.default_period_days || 30} onChange={set('default_period_days')} /></Field>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner className="w-4 h-4" />} Save Settings
          </button>
        </div>
      </form>
    </Section>
  );
}

function ChangePassword() {
  const [f, setF] = useState({ current_password: '', new_password: '', confirm: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const change = useMutation({
    mutationFn: (p) => api.post('/auth/change-password', p),
    onSuccess: () => { setF({ current_password: '', new_password: '', confirm: '' }); toast.success('Password changed'); },
    onError: (e) => toast.error(apiError(e)),
  });

  const submit = (e) => {
    e.preventDefault();
    if (f.new_password !== f.confirm) return toast.error('New passwords do not match');
    change.mutate({ current_password: f.current_password, new_password: f.new_password });
  };

  return (
    <Section title="Change Password" icon={KeyRound} className="mb-4">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current Password"><Input type="password" value={f.current_password} onChange={set('current_password')} required /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="New Password" hint="Minimum 6 characters"><Input type="password" value={f.new_password} onChange={set('new_password')} required minLength={6} /></Field>
          <Field label="Confirm New Password"><Input type="password" value={f.confirm} onChange={set('confirm')} required /></Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={change.isPending}>
            {change.isPending && <Spinner className="w-4 h-4" />} Update Password
          </button>
        </div>
      </form>
    </Section>
  );
}

function UserManagement({ currentUserId }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // 'add' | user object (edit)
  const [confirmDel, setConfirmDel] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const create = useMutation({
    mutationFn: (p) => api.post('/users', p),
    onSuccess: () => { invalidate(); setModal(null); toast.success('User created'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, p }) => api.put(`/users/${id}`, p),
    onSuccess: () => { invalidate(); setModal(null); toast.success('User updated'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { invalidate(); setConfirmDel(null); toast.success('User deleted'); },
    onError: (e) => { toast.error(apiError(e)); setConfirmDel(null); },
  });

  return (
    <Section title="Team & Users" icon={UsersIcon} className="mb-4"
      action={<button className="btn-primary btn-sm" onClick={() => setModal('add')}><Plus className="w-3.5 h-3.5" /> Add User</button>}>
      {isLoading ? <Loading /> : users.length === 0 ? <EmptyState icon={UsersIcon} title="No users" /> : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">{u.name?.slice(0, 1)}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate flex items-center gap-2">
                    {u.name}
                    {u.id === currentUserId && <Badge className="bg-gray-100 text-gray-500">You</Badge>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={u.role === 'OWNER' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}>
                  {u.role === 'OWNER' && <ShieldCheck className="w-3 h-3" />} {u.role}
                </Badge>
                <button className="btn-ghost btn-sm" onClick={() => setModal(u)}><Pencil className="w-3.5 h-3.5" /></button>
                {u.id !== currentUserId && <button className="btn-danger btn-sm" onClick={() => setConfirmDel(u)}><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add User">
        <UserForm submitting={create.isPending} onCancel={() => setModal(null)} onSubmit={(p) => create.mutate(p)} />
      </Modal>
      <Modal open={!!modal && modal !== 'add'} onClose={() => setModal(null)} title="Edit User">
        {modal && modal !== 'add' && (
          <UserForm initial={modal} submitting={update.isPending} onCancel={() => setModal(null)}
            onSubmit={(p) => update.mutate({ id: modal.id, p })} />
        )}
      </Modal>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} loading={remove.isPending}
        onConfirm={() => remove.mutate(confirmDel.id)}
        title="Delete user?" message={`Remove ${confirmDel?.name}'s access? This cannot be undone.`} />
    </Section>
  );
}
