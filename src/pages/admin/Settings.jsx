import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function Settings({ adminContact, setAdminContact }) {
  const { logout, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  const [isError, setIsError] = useState(false);
  const [adminSession, setAdminSession] = useState(null);

  useEffect(() => {
    api.get('/store-contact').then(({ data }) => setAdminContact(data)).catch(() => {});
    api.get('/admin/session/check').then(({ data }) => { if (data.valid && data.isOwnDevice) setAdminSession(data); }).catch(() => {});
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

  return (
    <AdminPageShell title="Settings">
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Site name</label>
        <input readOnly value="Rabis Chic Fashion Hub" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <label className="mb-1 mt-3 block text-xs font-bold uppercase text-slate-500">Admin email</label>
        <input readOnly value={user?.email || ''} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">Current device session</h3>
        <p className="mt-2 text-xs text-slate-600">Signed in: {adminSession?.loginTime ? new Date(adminSession.loginTime).toLocaleString() : 'Loading'}</p>
        <p className="mt-1 text-xs text-slate-600">IP address: {adminSession?.ip || 'Unavailable'}</p>
        <button type="button" onClick={logout} className="mt-4 min-h-10 rounded-full bg-slate-950 px-5 text-xs font-bold text-white">Logout / hand over device</button>
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <h3 className="font-serif text-xl font-bold text-slate-900">Client Handover</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">Use “Logout / hand over device” above when you are ready. The two-step confirmation closes this single-device session, clears its passkey, and makes Admin Sign In visible so the next authorized admin can enroll their device.</p>
      </div>
    </div>
    </AdminPageShell>
  );
}
