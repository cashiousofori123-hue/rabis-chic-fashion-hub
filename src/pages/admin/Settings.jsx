import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function Settings({ adminContact, setAdminContact, transferEmail, setTransferEmail }) {
  const { logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');

  const saveContact = (e) => {
    e.preventDefault();
    localStorage.setItem('rabi_admin_contact', JSON.stringify(adminContact));
    setMsg('Contact information saved.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/transfer-admin', { new_admin_email: transferEmail });
      logout();
    } catch (err) { alert(err.response?.data?.detail || 'Could not transfer admin.'); }
  };

  return (
    <div className="space-y-6">
      {/* Contact settings */}
      <form onSubmit={saveContact}
        className="bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-xl text-slate-900">Contact Settings</h3>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
          <input type="text" value={adminContact.phone}
            onChange={e => setAdminContact({ ...adminContact, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp (e.g. 23324XXXXXXX)</label>
          <input type="text" value={adminContact.whatsapp}
            onChange={e => setAdminContact({ ...adminContact, whatsapp: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white" />
        </div>
        {msg && <p role="status" className="text-xs text-emerald-700 font-semibold">{msg}</p>}
        <button type="submit"
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow transition">
          Save Contact Information
        </button>
      </form>

      {/* Admin transfer */}
      <div className="bg-amber-50 p-6 md:p-8 rounded-2xl border border-amber-200 space-y-4">
        <div>
          <h3 className="font-serif font-bold text-xl text-slate-900">Client Handover</h3>
          <p className="mt-1 text-xs text-slate-600">Transfer the store owner role to the client. Your account will be downgraded and you will be signed out.</p>
        </div>
        <form onSubmit={handleTransfer} className="flex flex-col sm:flex-row gap-3">
          <input type="email" required placeholder="Client account email"
            value={transferEmail} onChange={e => setTransferEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm" />
          <button type="submit"
            className="rounded-xl bg-amber-700 px-5 py-3 text-xs font-bold text-white">
            Transfer admin &amp; logout
          </button>
        </form>
      </div>
    </div>
  );
}
