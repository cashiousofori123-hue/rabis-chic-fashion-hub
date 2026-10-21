import { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const results = await Promise.allSettled([api.get('/users/pending'), api.get('/admins/list')]);
    if (results[0].status === 'fulfilled') setPendingUsers(results[0].value.data || []);
    if (results[1].status === 'fulfilled') setAdmins(results[1].value.data || []);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const action = async (userId, endpoint) => {
    try {
      await api.post(`/users/${userId}/${endpoint}`);
      setMessage(endpoint === 'make-admin' ? 'Admin access granted.' : 'Account updated.');
      setIsError(false);
      await reload();
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.detail || 'Could not update account.');
    }
  };

  const addAdmin = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/admins/add', newAdmin);
      setNewAdmin({ name: '', email: '', password: '' });
      setMessage('Admin account added.');
      setIsError(false);
      await reload();
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.detail || 'Could not add this admin.');
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async admin => {
    if (!window.confirm(`Remove admin access for ${admin.email}?`)) return;
    setMessage('');
    try {
      await api.delete(`/admins/${encodeURIComponent(admin.id)}`);
      setMessage('Admin access removed.');
      setIsError(false);
      await reload();
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.detail || 'Could not remove admin access.');
    }
  };

  return (
    <AdminPageShell title="Admin Users">
      <div className="space-y-7">
        <section className="space-y-3">
          <div><h2 className="text-lg font-bold">Admin accounts</h2><p className="mt-1 text-xs text-slate-600">Only admins can open the store dashboard. One admin device can be active at a time.</p></div>
          <form onSubmit={addAdmin} className="grid gap-3 rounded-2xl border border-black p-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Name<input required maxLength={100} value={newAdmin.name} onChange={event => setNewAdmin(current => ({ ...current, name: event.target.value }))} placeholder="Admin name" className="mt-1 min-h-11 w-full rounded-xl border border-black px-3 text-sm" /></label>
            <label className="text-xs font-semibold">Email<input required type="email" maxLength={254} value={newAdmin.email} onChange={event => setNewAdmin(current => ({ ...current, email: event.target.value }))} placeholder="admin@example.com" className="mt-1 min-h-11 w-full rounded-xl border border-black px-3 text-sm" /></label>
            <label className="text-xs font-semibold sm:col-span-2">Temporary password<input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={newAdmin.password} onChange={event => setNewAdmin(current => ({ ...current, password: event.target.value }))} placeholder="At least 10 characters" className="mt-1 min-h-11 w-full rounded-xl border border-black px-3 text-sm" /></label>
            <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-black px-4 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Adding admin…' : 'Add Admin'}</button>
          </form>
          <div className="divide-y divide-slate-200 rounded-2xl border border-black bg-white">
            {admins.length ? admins.map(admin => <div key={admin.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="truncate text-sm font-bold">{admin.name || 'Admin'}</p><p className="truncate text-xs text-slate-600">{admin.email}</p></div>
              <button type="button" onClick={() => removeAdmin(admin)} className="min-h-10 rounded-xl border border-black px-3 text-xs font-bold hover:bg-slate-50">Remove Admin</button>
            </div>) : <p className="p-4 text-sm text-slate-500">No admin accounts found.</p>}
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-6">
          <div><h2 className="text-lg font-bold">Pending customer accounts</h2><p className="mt-1 text-xs text-slate-600">Approve customers, or grant admin access to a trusted account.</p></div>
          {pendingUsers.length ? pendingUsers.map(user => <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black p-4">
            <div><p className="text-sm font-bold">{user.name}</p><p className="text-xs text-slate-600">{user.email}</p></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => action(user.id, 'approve')} className="min-h-10 rounded-xl bg-black px-3 text-xs font-bold text-white">Approve Customer</button>
              <button onClick={() => action(user.id, 'make-rider')} className="min-h-10 rounded-xl border border-black px-3 text-xs font-bold">Approve Rider</button>
              <button onClick={() => action(user.id, 'make-admin')} className="min-h-10 rounded-xl border border-black px-3 text-xs font-bold">Make Admin</button>
            </div>
          </article>) : <p className="rounded-2xl border border-slate-200 p-4 text-center text-sm text-slate-500">No accounts waiting for approval.</p>}
        </section>
        {message && <p role={isError ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm font-semibold ${isError ? 'border-red-700 text-red-800' : 'border-black text-slate-800'}`}>{message}</p>}
      </div>
    </AdminPageShell>
  );
}
