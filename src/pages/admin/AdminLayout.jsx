import { Fingerprint, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  ['/admin/overview', 'Overview', 'fa-chart-pie'],
  ['/admin/products', 'Products', 'fa-boxes-stacked'],
  ['/admin/orders', 'Orders', 'fa-circle-check'],
  ['/admin/users', 'Users', 'fa-users'],
  ['/admin/content', 'Content', 'fa-pen-to-square'],
  ['/admin/profile', 'Profile', 'fa-user-pen'],
  ['/admin/settings', 'Settings', 'fa-sliders'],
];

export default function AdminLayout({ adminProfile, orders = [], onNavigate, onLogout, children }) {
  const { user, lockAdmin } = useAuth();
  const navigate = (path) => onNavigate?.(path);

  return (
    <div className="min-h-screen bg-rose-50/40 px-4 py-6 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <img src={adminProfile?.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
            <div><h1 className="font-serif text-lg font-bold text-slate-900">Rabis Chic Admin</h1><p className="text-xs text-slate-500">{user?.email}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700">View Store ↗</a>
            <button onClick={() => { lockAdmin(); navigate('/admin-secret-login-rabis2024'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Fingerprint className="mr-1 inline" size={15} /> Lock</button>
          </div>
        </header>
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-4">
          <aside className="space-y-2 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm">
            {NAV_ITEMS.map(([path, label, icon]) => <button key={path} onClick={() => navigate(path)} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-xs font-bold ${window.location.pathname === path ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-rose-50'}`}><span><i className={`fa-solid ${icon} mr-3`} />{label}</span>{path === '/admin/orders' && orders.length > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-white">{orders.length}</span>}</button>)}
            <button onClick={onLogout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-rose-700 hover:bg-rose-50"><LogOut size={15} /> Logout</button>
          </aside>
          <main className="min-w-0 md:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
