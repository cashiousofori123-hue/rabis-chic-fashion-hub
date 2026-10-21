import {
  BarChart3, Bell, Box, CheckCircle2, ChevronRight, CircleHelp,
  ExternalLink, FileImage, LogOut, Mail, MoreHorizontal, QrCode,
  Search, Settings, ShieldCheck, Users, UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STORE_ITEMS = [
  ['/admin/overview', 'Overview', 'Stats and revenue', BarChart3],
  ['/admin/products', 'Products', 'Add, edit, or remove items', Box],
  ['/admin/orders', 'Orders', 'Review and update orders', CheckCircle2],
  ['/admin/messages', 'Messages', 'Customer notes and inquiries', Mail],
  ['/admin/users', 'Pending Users', 'Approve account requests', Users],
  ['/admin/content', 'Content Manager', 'Hero, prices, and images', FileImage],
];

const ACCOUNT_ITEMS = [
  ['/admin/profile', 'Account', 'Profile and store details', UserRound],
  ['/admin/settings', 'Privacy', 'Admin access and security', ShieldCheck],
  ['/admin/messages', 'Chats', 'Customer conversations', Mail],
  ['/admin/settings', 'Appearance', 'Store preferences', Settings],
  ['/admin/settings', 'Notifications', 'Order alert preferences', Bell],
];

function SettingsCard({ title, items, onNavigate }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {items.map(([path, label, description, Icon], index) => (
          <button key={`${title}-${label}`} type="button" onClick={() => onNavigate(path)} className={`flex min-h-[62px] w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 ${index < items.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"><Icon size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{label}</span><span className="block truncate text-xs text-slate-500">{description}</span></span>
            <ChevronRight size={18} className="shrink-0 text-slate-400" />
          </button>
        ))}
      </div>
    </section>
  );
}

export default function AdminLayout({ adminProfile, onNavigate, onLogout }) {
  const { user } = useAuth();
  const name = user?.name || adminProfile?.name || 'Cashious Ofori';
  const email = user?.email || localStorage.getItem('rabi_user_email') || 'Admin account';
  const avatar = adminProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=075e54&color=fff`;

  const go = path => onNavigate?.(path);
  const bottomTabs = [
    ['/admin/overview', 'Updates', BarChart3],
    ['/admin/orders', 'Calls', CheckCircle2],
    ['/admin/users', 'Communities', Users],
    ['/admin/messages', 'Chats', Mail],
    ['/admin', 'You', UserRound],
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5] px-3 pb-24 pt-3 text-slate-900 sm:px-4 sm:pt-5">
      <main className="mx-auto max-w-[430px] space-y-4">
        <header className="flex min-h-12 items-center gap-3 px-1">
          <button type="button" onClick={() => go('/admin/products')} aria-label="Search store" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-sm"><Search size={19} /></button>
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold">{name}</h1>
          <button type="button" onClick={() => go('/admin/profile')} aria-label="Edit profile" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-sm"><QrCode size={19} /></button>
          <button type="button" onClick={() => go('/admin/profile')} aria-label="Edit account" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-sm"><MoreHorizontal size={20} /></button>
        </header>

        <button type="button" onClick={() => go('/admin/profile')} className="w-full rounded-2xl bg-white px-5 py-5 text-center shadow-sm transition hover:shadow-md">
          <span className="relative mx-auto block h-20 w-20">
            <img src={avatar} alt={`${name} profile`} className="h-20 w-20 rounded-full object-cover ring-4 ring-[#e5ddd5]" />
            <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-[#25d366] text-white ring-2 ring-white"><span className="text-lg leading-none">+</span></span>
          </span>
          <span className="mt-3 block text-xs text-slate-500">Be an Eagle not a Chicken. ~Joyce Meyer</span>
          <span className="mt-1 flex items-center justify-center gap-1 text-xl font-bold">{name}<ShieldCheck size={17} className="fill-sky-500 text-sky-500" /></span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{email}</span>
          <span className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-xs font-bold text-slate-700"><span className="text-base leading-none">✎</span> Edit profile</span>
        </button>

        <button type="button" onClick={() => go('/')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"><ExternalLink size={17} /> Visit Site</button>

        <SettingsCard title="Store Management" items={STORE_ITEMS} onNavigate={go} />
        <SettingsCard title="Account" items={ACCOUNT_ITEMS} onNavigate={go} />
        <section>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <button type="button" onClick={() => go('/contact')} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-semibold hover:bg-slate-50"><CircleHelp size={19} className="text-slate-600" /><span className="flex-1">Help and feedback</span><ChevronRight size={18} className="text-slate-400" /></button>
            <button type="button" onClick={() => go('/')} className="flex min-h-12 w-full items-center gap-3 border-t border-slate-100 px-4 text-left text-sm font-semibold hover:bg-slate-50"><Users size={19} className="text-slate-600" /><span className="flex-1">Invite a friend</span><ChevronRight size={18} className="text-slate-400" /></button>
          </div>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold">Accounts Centre</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Control your experience across Rabi’s Chic, Instagram, and more.</p>
          <button type="button" onClick={() => go('/admin/profile')} className="mt-3 flex min-h-9 items-center gap-2 text-xs font-bold text-slate-700">Manage account <ChevronRight size={16} /></button>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Also from Meta</h2>
          <div className="mt-3 flex flex-wrap gap-2">{['Instagram', 'Facebook', 'Threads', 'Meta AI'].map(item => <span key={item} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{item}</span>)}</div>
        </section>
        <button type="button" onClick={onLogout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-red-600 shadow-sm hover:bg-red-50"><LogOut size={17} /> Log out</button>
        <p className="pb-3 text-center text-[11px] text-slate-400">Administrator access</p>
      </main>

      <nav aria-label="Admin dashboard tabs" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <div className="mx-auto grid max-w-[430px] grid-cols-5">
          {bottomTabs.map(([path, label, Icon]) => <button key={label} type="button" onClick={() => go(path)} aria-current={path === '/admin' ? 'page' : undefined} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${path === '/admin' ? 'text-[#075e54]' : 'text-slate-500'}`}><Icon size={20} /><span>{label}</span>{path === '/admin' && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#25d366]" />}</button>)}
        </div>
      </nav>
    </div>
  );
}
