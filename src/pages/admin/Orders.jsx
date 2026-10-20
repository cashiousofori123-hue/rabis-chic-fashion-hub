import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);

  const reload = () => {
    api.get('/orders').then(({ data }) => setOrders(data)).catch(() => {});
    api.get('/users/riders').then(({ data }) => setRiders(data)).catch(() => {});
  };

  useEffect(reload, []);

  const approveOrder = async (id) => {
    try {
      const { data } = await api.post(`/orders/${id}/approve`);
      setOrders(orders.map(o => o.id === id ? data : o));
    } catch (e) { alert(e.response?.data?.detail || 'Could not approve order.'); }
  };

  const assignRider = async (orderId, riderId) => {
    if (!riderId) return;
    try {
      const { data } = await api.post(`/orders/${orderId}/assign-rider`, { rider_id: riderId });
      setOrders(orders.map(o => o.id === orderId ? data : o));
    } catch (e) { alert(e.response?.data?.detail || 'Could not assign rider.'); }
  };

  return (
    <AdminPageShell title="Orders">
    <div className="space-y-6 bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-xl border border-white/80 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-serif font-bold text-xl text-slate-900">Order Approvals &amp; Dispatch</h3>
          <p className="text-xs text-slate-500 mt-1">Review incoming orders and approve to start live GPS delivery.</p>
        </div>
        <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl">
          {orders.length} Total Orders
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.length === 0 ? (
          <div className="bg-rose-50/50 p-8 rounded-3xl text-center text-slate-400 border border-rose-100 text-xs font-medium">
            No customer orders yet.
          </div>
        ) : orders.map((order) => (
          <div key={order.id}
            className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-rose-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg">{order.id}</span>
                <span className="text-xs font-bold text-slate-900">{order.customer}</span>
                <span className="text-xs text-slate-400">({order.phone})</span>
              </div>
              <p className="text-xs text-slate-700 font-medium">
                📦 <strong>{order.items}</strong> (Qty: {order.quantity}) — Total: <strong className="text-rose-600">GH₵ {order.amount}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                📍 {order.hostel} — Room: <strong className="text-slate-800">{order.room}</strong>
              </p>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${order.status.includes('Transit') || order.status.includes('Approved') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {order.status}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {riders.length > 0 && (
                <select aria-label="Assign rider"
                  value={order.riderUserId || ''}
                  onChange={e => assignRider(order.id, e.target.value)}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs">
                  <option value="">Assign rider</option>
                  {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              )}
              {order.status.includes('Pending') && (
                <button onClick={() => approveOrder(order.id)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-check" /> Approve
                </button>
              )}
              <a href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=Hello%20${order.customer}...`}
                target="_blank" rel="noreferrer"
                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-2xl transition flex items-center gap-1">
                <i className="fa-brands fa-whatsapp text-sm" /> Chat
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
    </AdminPageShell>
  );
}
