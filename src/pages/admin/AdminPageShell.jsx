import { useState } from 'react';
import { ArrowRight, BarChart3, Box, CheckCircle2, ExternalLink, FileImage, LogOut, Mail, Menu, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  ['/admin/overview', 'Overview', BarChart3],
  ['/admin/products', 'Products', Box],
  ['/admin/orders', 'Orders', CheckCircle2],
  ['/admin/content', 'Hero Manager', FileImage],
  ['/admin/socials', 'Socials', Settings],
  ['/admin/messages', 'Messages', Mail],
  ['/admin/users', 'Users', Users],
  ['/admin/profile', 'Profile', ShieldCheck],
  ['/admin/settings', 'Settings', Settings],
];

export default function AdminPageShell({ title, children, onNavigate, onLogout }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentPath = window.location.pathname;
  const activePath = currentPath === '/admin' ? '/admin/overview' : currentPath;
  const navigate = path => {
    setMobileMenuOpen(false);
    if (onNavigate) onNavigate(path);
    else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const requestLogout = onLogout || logout;
  const navItems = NAV_ITEMS.map(([path, label, Icon]) => (
    <button key={path} type="button" onClick={() => navigate(path)} aria-current={activePath === path ? 'page' : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${activePath === path ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
      <Icon size={17} /><span className="flex-1">{label}</span>{activePath === path && <ArrowRight size={15} />}
    </button>
  ));

  return (
    <div className="min-h-screen bg-neutral-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMobileMenuOpen(value => !value)} aria-label={mobileMenuOpen ? 'Close admin menu' : 'Open admin menu'} className="grid h-10 w-10 place-items-center rounded-xl border border-black bg-white">{mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Rabi's Chic Admin</p><h1 className="truncate text-base font-bold">{title}</h1></div>
          <a href="/" aria-label="Visit store" className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white"><ExternalLink size={17} /></a>
        </div>
        {mobileMenuOpen && <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-3 shadow-lg"><nav aria-label="Admin navigation" className="grid grid-cols-2 gap-2">{navItems}<button type="button" onClick={requestLogout} className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black bg-white text-sm font-bold"><LogOut size={16} /> Log out</button></nav></div>}
      </header>

      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 gap-5 px-3 py-4 sm:px-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7 lg:px-7 lg:py-7">
        <aside className="hidden lg:block">
          <div className="sticky top-7 space-y-4">
            <section className="rounded-2xl border border-black bg-white p-4 shadow-sm">
              <a href="/" className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-black font-serif text-xl font-bold text-white">R</span>
                <span><span className="block text-sm font-bold">Rabi's Chic</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Admin Portal</span></span>
              </a>
              <div className="mt-4 border-t border-slate-200 pt-3"><p className="truncate text-xs font-semibold text-slate-900">{user?.name || 'Store Administrator'}</p><p className="mt-1 truncate text-[11px] text-slate-500">{user?.email || 'Admin account'}</p></div>
            </section>
            <nav aria-label="Admin navigation" className="space-y-1 rounded-2xl border border-black bg-white p-2 shadow-sm">{navItems}</nav>
            <a href="/" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black bg-white text-sm font-semibold hover:bg-slate-50"><ExternalLink size={16} /> Visit the Site</a>
            <button type="button" onClick={requestLogout} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white hover:bg-slate-800"><LogOut size={16} /> Log out</button>
            <p className="flex items-center justify-center gap-1 text-xs text-slate-500"><ShieldCheck size={14} /> Private admin access</p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="mb-5 hidden items-center justify-between rounded-2xl border border-black bg-white px-5 py-4 shadow-sm lg:flex">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Rabi's Chic Admin</p><h1 className="mt-0.5 text-xl font-bold">{title}</h1></div>
            <a href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white hover:bg-slate-800"><ExternalLink size={16} /> Visit the Site</a>
          </header>
          <main className="min-w-0 rounded-2xl border border-black bg-white p-3 shadow-sm sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
