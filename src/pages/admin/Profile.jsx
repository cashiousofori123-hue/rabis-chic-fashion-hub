import { useEffect, useState } from 'react';
import api from '../../api';

export default function Profile() {
  const [profile,  setProfile]  = useState({ name: '', title: '', bio: '', avatar: '' });
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState('');

  useEffect(() => {
    api.get('/store-profile').then(({ data }) => setProfile(data)).catch(() => {});
  }, []);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const bitmap = await createImageBitmap(file);
    const scale  = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(bitmap.width  * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let img = canvas.toDataURL('image/webp', 0.78);
    if (img.length > 900_000) img = canvas.toDataURL('image/jpeg', 0.62);
    setProfile(p => ({ ...p, avatar: img }));
    setMessage('Photo selected. Save to publish.');
    e.target.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage('');
    try {
      const { data } = await api.put('/store-profile', profile);
      setProfile(data);
      localStorage.setItem('rabi_admin_profile', JSON.stringify(data));
      setMessage('Profile saved and published to the About page.');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Could not save profile.');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSave}
      className="max-w-2xl space-y-6 rounded-2xl border border-rose-100 bg-white/80 p-6 md:p-8">
      <div>
        <h3 className="font-serif text-xl font-bold text-slate-900">Store Profile</h3>
        <p className="mt-1 text-xs text-slate-500">These details appear on the public About page.</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4 border-b border-rose-100 pb-5 sm:flex-row">
        {profile.avatar && (
          <img src={profile.avatar} alt="Profile preview"
            className="h-24 w-24 rounded-full border-4 border-rose-100 object-cover" />
        )}
        <div className="space-y-2">
          <label htmlFor="admin-profile-image"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-50">
            <i className="fa-solid fa-image" /> Select profile photo
          </label>
          <input id="admin-profile-image" type="file" accept="image/*"
            onChange={handleImageChange} className="sr-only" />
          <p className="text-[11px] text-slate-500">Image is resized before upload.</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Display name</label>
        <input type="text" required maxLength={80} value={profile.name}
          onChange={e => setProfile({ ...profile, name: e.target.value })}
          className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Title</label>
        <input type="text" maxLength={140} value={profile.title}
          onChange={e => setProfile({ ...profile, title: e.target.value })}
          className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-600">About</label>
        <textarea rows="4" maxLength={1200} value={profile.bio}
          onChange={e => setProfile({ ...profile, bio: e.target.value })}
          className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm" />
      </div>

      {message && <p role="status" className="text-xs text-slate-600">{message}</p>}

      <button type="submit" disabled={saving}
        className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white disabled:opacity-60">
        {saving ? 'Saving…' : 'Save and publish profile'}
      </button>
    </form>
  );
}
