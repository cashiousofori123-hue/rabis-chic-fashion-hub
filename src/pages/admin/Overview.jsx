import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function Overview() {
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);

  useEffect(() => {
    const refresh = () => {
      api.get('/products').then(({ data }) => setProducts(data)).catch(() => {});
      api.get('/orders').then(({ data }) => setOrders(data)).catch(() => {});
      api.get('/users/pending').then(({ data }) => setPendingUsers(data)).catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const revenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const unreadMessages = orders.reduce((sum, order) => sum + (Number(order.unreadCount) || 0), 0);
  const inTransit = orders.filter(order => String(order.status || '').toLowerCase().includes('transit')).length;
  const delivered = orders.filter(order => String(order.status || '').toLowerCase().includes('delivered'));

  return (
    <AdminPageShell title="Overview">
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Products</span>
        <div className="text-3xl font-black text-slate-900">{products.length}</div>
        <p className="text-[11px] text-rose-500 font-medium">Active items in UCC store</p>
      </div>
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Customer Orders</span>
        <div className="text-3xl font-black text-slate-900">{orders.length}</div>
        <p className="text-[11px] text-emerald-600 font-medium">Hostel delivery requests</p>
      </div>
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Revenue</span>
        <div className="text-3xl font-black text-slate-900">GH₵ {revenue.toFixed(0)}</div>
        <p className="text-[11px] text-amber-600 font-medium">From all orders</p>
      </div>
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Users</span>
        <div className="text-3xl font-black text-slate-900">{pendingUsers.length}</div>
        <p className="text-[11px] text-amber-600 font-medium">Accounts awaiting approval</p>
      </div>
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">In Transit</span>
        <div className="text-3xl font-black text-slate-900">{inTransit}</div>
        <p className="text-[11px] text-slate-500">Orders on delivery</p>
      </div>
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm space-y-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">New Messages</span>
        <div className="text-3xl font-black text-red-700">{unreadMessages}</div>
        <p className="text-[11px] text-slate-500">Unread order conversations</p>
      </div>
    </div>
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Delivered History</h2><p className="mt-1 text-xs text-slate-500">Completed customer orders and delivery feedback.</p></header>
      {delivered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Tracking', 'Customer', 'Product', 'Payment', 'Date', 'Rating', 'Review'].map(label => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{delivered.map(order => <tr key={order.id} className="border-t border-slate-100"><td className="px-4 py-3 font-mono text-red-700">{String(order.id).slice(-12)}</td><td className="px-4 py-3">{order.customer}</td><td className="max-w-48 truncate px-4 py-3">{order.items}</td><td className="px-4 py-3">{order.paymentMethod || 'MoMo'}</td><td className="px-4 py-3">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</td><td className="px-4 py-3">{order.rating ? `${'★'.repeat(Math.min(5, Number(order.rating)))} (${order.rating}/5)` : '—'}</td><td className="max-w-56 truncate px-4 py-3">{order.review || '—'}</td></tr>)}</tbody></table></div> : <p className="px-5 py-8 text-center text-sm text-slate-500">No delivered orders yet.</p>}
    </section>
    </AdminPageShell>
  );
}
