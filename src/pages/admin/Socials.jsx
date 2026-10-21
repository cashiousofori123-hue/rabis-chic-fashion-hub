import React, { useState, useEffect } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function Socials() {
  const [socials, setSocials] = useState({
    instagram: '',
    tiktok: '',
    facebook: '',
    whatsapp: '',
    phone: '',
    email: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/settings/socials').then(({ data }) => setSocials(data)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const { data } = await api.post('/settings/socials', socials);
      setSocials(data);
      setMsg('Social links and contact info updated successfully!');
    } catch (error) {
      setMsg(error.response?.data?.detail || 'Could not save socials. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageShell title="Social Media & Contact">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Manage Social Links</h3>
          <p className="text-xs text-slate-500 mb-6">These links will be automatically updated on the public Contact page.</p>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">Instagram Link</label>
                <input
                  type="url"
                  value={socials.instagram}
                  onChange={e => setSocials({...socials, instagram: e.target.value})}
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">TikTok Link</label>
                <input
                  type="url"
                  value={socials.tiktok}
                  onChange={e => setSocials({...socials, tiktok: e.target.value})}
                  placeholder="https://tiktok.com/..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">Facebook Link</label>
              <input
                type="url"
                value={socials.facebook}
                onChange={e => setSocials({...socials, facebook: e.target.value})}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">WhatsApp Number</label>
                <input
                  type="tel"
                  value={socials.whatsapp}
                  onChange={e => setSocials({...socials, whatsapp: e.target.value})}
                  placeholder="233..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</label>
                <input
                  type="tel"
                  value={socials.phone}
                  onChange={e => setSocials({...socials, phone: e.target.value})}
                  placeholder="024..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">Contact Email</label>
              <input
                type="email"
                value={socials.email}
                onChange={e => setSocials({...socials, email: e.target.value})}
                placeholder="email@example.com"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">Store Address</label>
              <input
                type="text"
                value={socials.address}
                onChange={e => setSocials({...socials, address: e.target.value})}
                placeholder="UCC Campus..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            {msg && <p className={`text-xs font-bold p-2 rounded-lg ${msg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-slate-950 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All Socials & Contact Info'}
            </button>
          </form>
        </div>
      </div>
    </AdminPageShell>
  );
}
