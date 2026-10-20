import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';
import { whatsappLink } from '../../utils/contactLinks';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [chatOrder, setChatOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const reload = () => {
    api.get('/orders').then(({ data }) => setOrders(data)).catch(() => {});
    api.get('/users/riders').then(({ data }) => setRiders(data)).catch(() => {});
  };
  useEffect(() => {
    reload();
    const timer = window.setInterval(() => api.get('/orders').then(({ data }) => setOrders(data)).catch(() => {}), 5000);
    return () => window.clearInterval(timer);
  }, []);
  const approveOrder = async id => {
    try { const { data } = await api.post(`/orders/${id}/approve`); setOrders(current => current.map(order => order.id === id ? data : order)); }
    catch (error) { alert(error.response?.data?.detail || 'Could not approve order.'); }
  };
  const assignRider = async (orderId, riderId) => {
    if (!riderId) return;
    try { const { data } = await api.post(`/orders/${orderId}/assign-rider`, { rider_id: riderId }); setOrders(current => current.map(order => order.id === orderId ? data : order)); }
    catch (error) { alert(error.response?.data?.detail || 'Could not assign rider.'); }
  };
  const markPaid = async order => {
    try { const { data } = await api.post(`/orders/${encodeURIComponent(order.id)}/mark-paid`); setOrders(current => current.map(item => item.id === order.id ? data : item)); }
    catch (error) { alert(error.response?.data?.detail || 'Could not update payment status.'); }
  };
  const markDelivered = async order => {
    try { const { data } = await api.post(`/orders/${encodeURIComponent(order.id)}/mark-delivered`); setOrders(current => current.map(item => item.id === order.id ? data : item)); }
    catch (error) { alert(error.response?.data?.detail || 'Could not update delivery status.'); }
  };
  const viewChat = async order => {
    setChatOrder(order); setChatText('');
    try {
      const [, thread] = await Promise.all([api.post(`/orders/${encodeURIComponent(order.id)}/read`), api.get(`/orders/${encodeURIComponent(order.id)}/messages`)]);
      setChatMessages(thread.data || []);
      setOrders(current => current.map(item => item.id === order.id ? { ...item, unreadCount: 0 } : item));
    } catch (error) { setChatMessages([]); }
  };
  const sendReply = async event => {
    event.preventDefault(); if (!chatText.trim() || !chatOrder || chatBusy) return;
    setChatBusy(true);
    try { const { data } = await api.post(`/orders/${encodeURIComponent(chatOrder.id)}/reply`, { text: chatText.trim() }); setChatMessages(current => [...current, data]); setChatText(''); }
    catch (error) { alert(error.response?.data?.detail || 'Could not send reply.'); }
    finally { setChatBusy(false); }
  };
  const sortedOrders = [...orders].sort((a, b) => (Number(b.unreadCount) || 0) - (Number(a.unreadCount) || 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return <AdminPageShell title="Orders">
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Orders &amp; Dispatch</h2><p className="mt-1 text-xs text-slate-500">New messages and recent orders appear first.</p></div><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold">{orders.length} total</span></header>
      {!sortedOrders.length ? <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No customer orders yet.</p> : <div className="space-y-3">{sortedOrders.map(order => {
        const created = order.createdAt ? new Date(order.createdAt) : null;
        const transit = String(order.status || '').toLowerCase().includes('transit');
        return <article key={order.id} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5"><span title={order.id} className="max-w-[140px] truncate rounded-full bg-red-50 px-2 py-1 font-mono text-[10px] font-bold text-red-700">{order.id}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${transit ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{order.status}</span>{Number(order.unreadCount) > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{order.unreadCount}</span>}</div>
            <span title={order.customer} className="max-w-[110px] shrink-0 truncate text-right text-xs font-bold text-slate-900">{order.customer}</span>
          </div>
          <p className="break-words text-xs text-slate-700"><b>{order.items}</b> · Qty {order.quantity} · <b className="text-red-700">GH₵ {order.amount}</b></p>
          <p className="break-words text-[11px] text-slate-500">{order.hostel} · Room {order.room} · {order.phone}</p>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-[10px] text-slate-500"><span>Payment<br/><b className={String(order.paymentMethod || '').toLowerCase().includes('cash') ? 'text-emerald-700' : 'text-amber-700'}>{order.paymentMethod || 'MoMo'} · {order.paymentStatus || 'pending'}</b></span><span>Date<br/><b className="text-slate-800">{created ? created.toLocaleDateString() : '—'}</b></span><span>Time<br/><b className="text-slate-800">{created ? created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</b></span></div>
          {order.email && <p className="break-all text-[10px] text-slate-400">Invoice: {order.email}</p>}
          <div className="flex flex-wrap items-center gap-2">{riders.length > 0 && <select aria-label="Assign rider" value={order.riderUserId || ''} onChange={event => assignRider(order.id, event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="">Assign rider</option>{riders.map(rider => <option key={rider.id} value={rider.id}>{rider.name}</option>)}</select>}{String(order.status).includes('Pending') && <button onClick={() => approveOrder(order.id)} className="min-h-11 rounded-full bg-emerald-700 px-4 text-xs font-bold text-white">Approve</button>}{!String(order.status).toLowerCase().includes('delivered') && <button onClick={() => markDelivered(order)} className="min-h-11 rounded-full border border-blue-700 px-4 text-xs font-bold text-blue-800">Mark Delivered</button>}{order.paymentStatus !== 'paid' && <button onClick={() => markPaid(order)} className="min-h-11 rounded-full border border-emerald-700 px-4 text-xs font-bold text-emerald-800">Mark Paid</button>}<button onClick={() => viewChat(order)} className="relative min-h-11 flex-1 rounded-full bg-slate-950 px-4 text-xs font-bold text-white">Chat{Number(order.unreadCount) > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px]">{order.unreadCount}</span>}</button><a href={`/track?order=${encodeURIComponent(order.id)}`} className="flex min-h-11 items-center rounded-full border border-slate-300 px-4 text-xs font-bold text-slate-700">Track</a></div>
        </article>;
      })}</div>}
    </section>
    {chatOrder && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-3" onMouseDown={event => { if (event.target === event.currentTarget) setChatOrder(null); }}><section className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center gap-3 border-b p-4"><div className="min-w-0 flex-1"><h2 className="truncate font-bold">Order conversation</h2><p className="truncate text-xs text-slate-500">{chatOrder.customer} · {chatOrder.id}</p></div><button onClick={() => setChatOrder(null)} className="grid h-11 w-11 place-items-center rounded-full bg-slate-100">×</button></header><div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">{chatMessages.length ? chatMessages.map(message => <div key={message.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${message.sender === 'Rabis Chic' ? 'ml-auto bg-slate-950 text-white' : 'bg-white shadow-sm'}`}><p className="mb-1 text-[10px] font-bold opacity-60">{message.sender}</p><p className="whitespace-pre-wrap">{message.text}</p><p className="mt-1 text-right text-[9px] opacity-50">{message.timestamp ? new Date(message.timestamp).toLocaleString() : ''}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">No order messages yet. Start a reply or use WhatsApp.</p>}</div><form onSubmit={sendReply} className="flex gap-2 border-t p-3"><input value={chatText} onChange={event => setChatText(event.target.value)} placeholder="Write a reply..." className="min-h-11 min-w-0 flex-1 rounded-full border px-4 text-sm"/><button disabled={chatBusy || !chatText.trim()} className="rounded-full bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-40">Send</button></form><a href={whatsappLink(chatOrder.phone, `Hello ${chatOrder.customer}, regarding your order ${chatOrder.id} at Rabi's Chic.`)} target="_blank" rel="noreferrer" className="pb-3 text-center text-xs font-semibold text-slate-600">Continue on WhatsApp</a></section></div>}
  </AdminPageShell>;
}
