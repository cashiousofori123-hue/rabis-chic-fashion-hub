import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';
import { useAuth } from '../../context/AuthContext';
import ImagePickerNative from '../../components/ImagePickerNative';
import { uploadContentImage } from '../../utils/uploadContentImage';

export default function Profile() {
  const { user } = useAuth();
  const [profile,  setProfile]  = useState({ name: '', title: '', bio: '', avatar: '' });
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState('');

  useEffect(() => {
    api.get('/store-profile').then(({ data }) => setProfile(data)).catch(() => {});
  }, []);

  const handleImageChange = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      if (!window.createImageBitmap) throw new Error('This browser cannot resize the photo. Choose a smaller image.');
      const bitmap = await createImageBitmap(file);
      const scale  = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.78));
      if (!imageBlob || imageBlob.size > 650_000) imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.62));
      if (!imageBlob || imageBlob.size > 700_000) throw new Error('Could not compress this photo enough. Choose a smaller image.');
      const imageUrl = await uploadContentImage(new File([imageBlob], `profile.${imageBlob.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: imageBlob.type }));
      setProfile(p => ({ ...p, avatar: imageUrl }));
      setMessage('Photo uploaded. Save to publish.');
    } catch (error) {
      setMessage(error.response?.data?.detail || error.message || 'Could not upload that photo.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage('');
    try {
      const { data } = await api.put('/store-profile', profile);
      setProfile(data);
      localStorage.setItem('rabi_admin_profile', JSON.stringify(data));
      localStorage.setItem('rabis_profile_updated_at', String(Date.now()));
      window.dispatchEvent(new Event('rabis:profile-updated'));
      setMessage('Profile saved and published to the About page.');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Could not save profile.');
    } finally { setSaving(false); }
  };

  return (
    <AdminPageShell title="Profile">
    <section className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
      {profile.avatar && <img src={profile.avatar} alt="Admin profile" className="h-16 w-16 rounded-full object-cover" />}
      <div><p className="font-bold text-slate-900">{profile.name || 'Administrator'}</p><p className="text-sm text-slate-500">{user?.email}</p><p className="text-xs capitalize text-slate-500">Role: {user?.role || 'admin'} · Status: active</p></div>
    </section>
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
          <ImagePickerNative onSelect={files => handleImageChange(files[0])} disabled={saving} />
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
    </AdminPageShell>
  );
}
