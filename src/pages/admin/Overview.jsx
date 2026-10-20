import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function Overview() {
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data)).catch(() => {});
    api.get('/orders').then(({ data }) => setOrders(data)).catch(() => {});
    api.get('/users/pending').then(({ data }) => setPendingUsers(data)).catch(() => {});
  }, []);

  const revenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

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
    </div>
    </AdminPageShell>
  );
}
