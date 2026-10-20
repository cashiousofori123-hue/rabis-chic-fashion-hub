import { useEffect, useState } from 'react';
import api from '../api';

export default function ApprovalStatus({ trackingCode, onApproved }) {
  const [status, setStatus] = useState('pending_approval');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const check = async () => {
    if (!trackingCode) return;
    setChecking(true);
    try {
      const { data } = await api.get(`/orders/track/${encodeURIComponent(trackingCode)}/status`);
      setStatus(data.approvalStatus);
      setError('');
      if (data.approvalStatus === 'approved' && data.trackingEnabled) onApproved(data.order);
      if (data.approvalStatus === 'rejected') setError('The store could not approve this order. Please contact Rabi’s Chic for help.');
    } catch (requestError) { setError(requestError.response?.data?.detail || 'Could not check this tracking code.'); }
    finally { setChecking(false); }
  };
  useEffect(() => {
    check();
    const timer = window.setInterval(check, 10000);
    return () => window.clearInterval(timer);
  }, [trackingCode]);
  const approved = status === 'approved';
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10"><section className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-sm sm:p-8">
    <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full text-3xl ${approved ? 'bg-emerald-100' : 'bg-yellow-100'}`}>{approved ? '✓' : '⏳'}</div>
    <h1 className="mt-4 text-xl font-bold">{approved ? 'Approved! Opening your map…' : status === 'rejected' ? 'Order not approved' : 'Order submitted, waiting for admin approval'}</h1>
    <p className="mt-2 text-sm text-slate-500">Your tracking code: <span className="font-mono font-bold text-black">{trackingCode}</span></p>
    <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[70%] animate-pulse rounded-full bg-black" /></div>
    <p className="mt-3 text-xs text-slate-600">Progress: Waiting for Rabis Chic to approve → then your delivery map opens automatically.</p>
    {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
    <button onClick={check} disabled={checking} className="mt-5 min-h-12 w-full rounded-full bg-black py-3 text-sm font-bold text-white">{checking ? 'Checking…' : 'Check Approval Status'}</button>
    <button onClick={() => navigator.clipboard?.writeText(trackingCode)} className="mt-3 min-h-10 text-sm font-semibold underline">Copy tracking code</button>
  </section></main>;
}
