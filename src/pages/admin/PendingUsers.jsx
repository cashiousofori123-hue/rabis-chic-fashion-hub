import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);

  const reload = () =>
    api.get('/users/pending').then(({ data }) => setPendingUsers(data)).catch(() => {});

  useEffect(reload, []);

  const action = async (userId, endpoint) => {
    try { await api.post(`/users/${userId}/${endpoint}`); await reload(); }
    catch (e) { alert(e.response?.data?.detail || 'Could not update account.'); }
  };

  return (
    <AdminPageShell title="Pending Users">
    <div className="bg-white/80 p-6 md:p-8 rounded-xl border border-rose-100 space-y-4">
      <h3 className="font-serif font-bold text-xl text-slate-900">Pending Accounts</h3>
      <p className="text-xs text-slate-500">Approve or promote accounts waiting for access.</p>

      {pendingUsers.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No accounts waiting for approval.</p>
      ) : pendingUsers.map(u => (
        <div key={u.id}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-rose-100 pt-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{u.name}</p>
            <p className="text-xs text-slate-500">{u.email}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => action(u.id, 'approve')}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">
              Approve Customer
            </button>
            <button onClick={() => action(u.id, 'make-rider')}
              className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">
              Approve Rider
            </button>
            <button onClick={() => action(u.id, 'make-admin')}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
              Make Admin
            </button>
          </div>
        </div>
      ))}
    </div>
    </AdminPageShell>
  );
}
