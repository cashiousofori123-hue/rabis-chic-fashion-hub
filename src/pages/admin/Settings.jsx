import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function Settings({ adminContact, setAdminContact, transferEmail, setTransferEmail }) {
  const { logout, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    api.get('/store-contact').then(({ data }) => setAdminContact(data)).catch(() => {});
  }, [setAdminContact]);

  const saveContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setIsError(false);
    try {
      const { data } = await api.put('/store-contact', adminContact);
      setAdminContact(data);
      localStorage.setItem('rabi_admin_contact', JSON.stringify(data));
      localStorage.setItem('rabis_contact_updated_at', String(Date.now()));
      window.dispatchEvent(new Event('rabis:contact-updated'));
      setMsg('Contact details saved and published for customers.');
    } catch (error) {
      setIsError(true);
      setMsg(error.response?.data?.detail || 'Could not save contact details.');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/transfer-admin', { new_admin_email: transferEmail });
      logout();
    } catch (err) { alert(err.response?.data?.detail || 'Could not transfer admin.'); }
  };

  return (
    <AdminPageShell title="Settings">
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Site name</label>
        <input readOnly value="Rabis Chic Fashion Hub" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <label className="mb-1 mt-3 block text-xs font-bold uppercase text-slate-500">Admin email</label>
        <input readOnly value={user?.email || ''} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>
      {/* Contact settings */}
      <form onSubmit={saveContact}
        className="bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-xl text-slate-900">Contact Settings</h3>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
          <input type="tel" required minLength={8} maxLength={32} placeholder="e.g. +233 24 123 4567 or 0241234567" value={adminContact.phone}
            onChange={e => setAdminContact({ ...adminContact, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp (e.g. 23324XXXXXXX)</label>
          <input type="tel" required minLength={8} maxLength={32} placeholder="Include country code, or enter a Ghana number" value={adminContact.whatsapp}
            onChange={e => setAdminContact({ ...adminContact, whatsapp: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contact Email</label>
          <input type="email" maxLength={254} value={adminContact.email || ''}
            onChange={e => setAdminContact({ ...adminContact, email: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Store Location</label>
          <input type="text" maxLength={200} value={adminContact.location || ''}
            onChange={e => setAdminContact({ ...adminContact, location: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-rose-200 text-xs font-bold bg-white" />
        </div>
        {msg && <p role={isError ? 'alert' : 'status'} className={`text-xs font-semibold ${isError ? 'text-rose-700' : 'text-emerald-700'}`}>{msg}</p>}
        <button type="submit" disabled={saving}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow transition disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Contact Information'}
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
    </AdminPageShell>
  );
}
