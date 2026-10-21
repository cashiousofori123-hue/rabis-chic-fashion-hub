import { useState } from 'react';
import { ArrowRight, Bell, Box, CheckCircle2, FileImage, Settings } from 'lucide-react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

const decodeVapidKey = key => {
  const padded = key + '='.repeat((4 - key.length % 4) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
};

const QUICK_LINKS = [
  ['/admin/products', 'Products', 'Add, update, or remove products.', Box],
  ['/admin/orders', 'Orders', 'Review and update customer orders.', CheckCircle2],
  ['/admin/content', 'Hero Manager', 'Update homepage slides and featured items.', FileImage],
  ['/admin/socials', 'Socials', 'Edit store contact and social links.', Settings],
];

export default function AdminLayout({ adminProfile, onNavigate, onLogout }) {
  const [alertsEnabled, setAlertsEnabled] = useState(() => localStorage.getItem('rabi_order_alerts_enabled') === 'true');
  const [alertSetupMessage, setAlertSetupMessage] = useState('');

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
        setAlertSetupMessage('Background order alerts are enabled on this device.');
      } else {
        setAlertSetupMessage('Alerts work while the site is open. Add VAPID keys on the server for background alerts.');
      }
    } catch {
      setAlertSetupMessage('Could not enable alerts. Please try again while signed in as admin.');
      return;
    }
    localStorage.setItem('rabi_order_alerts_enabled', 'true');
    setAlertsEnabled(true);
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
    } catch { /* Audio may be unavailable on muted devices. */ }
  };

  return (
    <AdminPageShell title="Admin Dashboard" onNavigate={onNavigate} onLogout={onLogout}>
      <section className="rounded-2xl border border-black bg-white p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Store management</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Welcome back, {adminProfile?.name || 'Rabi'}.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage products, customer orders, and the content customers see on your store.</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold">Quick access</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map(([path, label, description, Icon]) => <button key={path} type="button" onClick={() => onNavigate?.(path)} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-black bg-white p-4 text-left shadow-sm transition hover:bg-slate-50">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-white"><Icon size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block font-bold">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
            <ArrowRight size={17} className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5" />
          </button>)}
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-black bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black"><Bell size={18} /></span><div><h2 className="text-sm font-bold">New order alerts</h2><p className="mt-1 text-xs leading-5 text-slate-600">{alertsEnabled ? 'Alerts are enabled on this device.' : 'Allow notifications to hear about incoming orders.'}</p></div></div>
        <button type="button" onClick={enableOrderAlerts} className="min-h-11 rounded-xl bg-black px-4 text-sm font-bold text-white hover:bg-slate-800">{alertsEnabled ? 'Alerts enabled' : 'Enable alerts'}</button>
        {alertSetupMessage && <p role="status" className="text-xs text-slate-600 sm:basis-full">{alertSetupMessage}</p>}
      </section>
    </AdminPageShell>
  );
}
