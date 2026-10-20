import { useState } from 'react';
import { ArrowRight, BarChart3, Box, CheckCircle2, ExternalLink, FileImage, LogOut, Mail, Settings, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

const decodeVapidKey = (key) => {
  const padded = key + '='.repeat((4 - key.length % 4) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
};

const GROUPS = [
  {
    title: 'Store Management',
    items: [
      ['/admin/overview', 'Overview', 'Stats, revenue', BarChart3],
      ['/admin/products', 'Products', 'Add, edit, delete', Box],
      ['/admin/orders', 'Orders', 'Manage orders', CheckCircle2],
      ['/admin/messages', 'Messages', 'Customer notes & inquiries', Mail],
      ['/admin/users', 'Pending Users', 'Approve accounts', Users],
      ['/admin/content', 'Content Manager', 'Hero, prices, images', FileImage],
    ],
  },
  {
    title: 'Account',
    items: [
      ['/admin/profile', 'Profile', 'Your info', UserRound],
      ['/admin/settings', 'Settings', 'Site, email', Settings],
    ],
  },
];

export default function AdminLayout({ adminProfile, onNavigate, onLogout }) {
  const { user } = useAuth();
  const [alertsEnabled, setAlertsEnabled] = useState(() => localStorage.getItem('rabi_order_alerts_enabled') === 'true');
  const [alertSetupMessage, setAlertSetupMessage] = useState('');
  const email = user?.email || localStorage.getItem('rabi_user_email') || 'Admin account';
  const avatar = adminProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminProfile?.name || email)}&background=e11d48&color=fff`;

  const enableOrderAlerts = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setAlertSetupMessage('This browser does not support background notifications.');
      return;
    }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') {
      setAlertSetupMessage('Allow notifications in your browser settings to receive admin alerts.');
      return;
    }
    try {
      const { data } = await api.get('/notifications/vapid-public-key');
      const registration = await navigator.serviceWorker.register('/sw.js');
      if (data.publicKey) {
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(data.publicKey) });
        await api.post('/notifications/subscribe', { subscription: subscription.toJSON() });
        setAlertSetupMessage('Background alerts are enabled on this device.');
      } else {
        setAlertSetupMessage('Browser alerts are enabled while the site is open. Add VAPID keys in Vercel to enable alerts while using other apps.');
      }
      localStorage.setItem('rabi_order_alerts_enabled', 'true');
      setAlertsEnabled(true);
    } catch {
      setAlertSetupMessage('Could not enable alerts. Please try again while signed in as admin.');
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = 880;
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.12);
        window.setTimeout(() => audio.close().catch(() => {}), 300);
      }
    } catch { /* Sound can be unavailable on muted devices. */ }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] px-4 py-6 text-slate-800">
      <main className="mx-auto max-w-2xl space-y-5">
        <button type="button" onClick={() => onNavigate?.('/admin/profile')} className="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-sm hover:bg-gray-50">
          <img src={avatar} alt="Admin profile" className="h-14 w-14 rounded-full object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-slate-900">{adminProfile?.name || 'Admin Profile'}</span>
            <span className="block truncate text-sm text-slate-500">{email}</span>
            <span className="mt-1 block text-xs text-slate-500">Be an Eagle not a Chicken</span>
          </span>
          <ArrowRight className="text-slate-400" size={20} />
        </button>

        {GROUPS.map(group => (
          <section key={group.title}>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">{group.title}</h2>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              {group.items.map(([path, label, description, Icon], index) => (
                <button key={path} type="button" onClick={() => onNavigate?.(path)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${index < group.items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="block text-xs text-slate-500">{description}</span></span>
                  <ArrowRight className="text-slate-400" size={18} />
                </button>
              ))}
            </div>
          </section>
        ))}

        <a href="/" target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-gray-50">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700"><ExternalLink size={18} /></span>
          <span className="flex-1">Visit the Site</span>
          <ArrowRight className="text-slate-400" size={18} />
        </a>

        <button type="button" onClick={enableOrderAlerts} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 p-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
          <span aria-hidden="true">{alertsEnabled ? '🔔' : '♬'}</span>
          {alertsEnabled ? 'Admin alerts enabled' : 'Enable admin alerts'}
        </button>
        {alertSetupMessage && <p role="status" className="-mt-3 text-center text-xs text-slate-500">{alertSetupMessage}</p>}

        <button type="button" onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white p-4 text-sm font-bold text-red-600 shadow-sm hover:bg-red-50">
          <LogOut size={17} /> Log Out
        </button>
        <p className="flex items-center justify-center gap-1 text-center text-xs text-slate-400"><ShieldCheck size={14} /> Administrator access</p>
      </main>
    </div>
  );
}
