import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';
import { whatsappLink } from '../../utils/contactLinks';

export default function Messages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const refresh = () => api.get('/contact-messages').then(({ data }) => setMessages(data)).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 12000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <AdminPageShell title="Customer Messages">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-900">Customer Contact Messages</h2>
            <p className="mt-1 text-xs text-slate-500">New notes are saved here and emailed to the admin account.</p>
          </div>
          <span className="rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700">{messages.length} Messages</span>
        </div>
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-8 text-center text-xs text-slate-400">No customer messages yet.</div>
        ) : messages.map(message => (
          <article key={message.id} className="space-y-3 rounded-2xl border border-purple-100 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-purple-100 px-2 py-1 font-mono text-[10px] font-bold text-purple-700">{message.id}</span>
              <strong className="text-sm text-slate-900">{message.sender}</strong>
              <span className="text-xs text-slate-500">{message.phone}</span>
              <span className="ml-auto text-[10px] text-slate-400">{message.time}</span>
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-purple-50/60 p-3 text-sm leading-relaxed text-slate-700">{message.text}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400">Admin email: {message.emailStatus || 'queued'}</span>
              <a href={whatsappLink(message.phone, `Hello ${message.sender}, responding to your message to Rabi's Chic.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">
                <MessageCircle size={14} /> Reply on WhatsApp
              </a>
            </div>
          </article>
        ))}
      </section>
    </AdminPageShell>
  );
}
