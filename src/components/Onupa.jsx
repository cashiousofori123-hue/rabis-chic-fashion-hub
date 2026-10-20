import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import api from '../api';
import { formatCurrency } from '../utils/formatCurrency';

const PHOTO = '/onupa.jpg';
const WELCOME = "Hey! I'm Onupa, your personal stylist at Rabis Chic. I know our prices, sizes, delivery and collection. What occasion are we dressing for, charley?";
const chips = ['Wedding guest dresses', "What's under GH₵ 200?", 'Do you deliver to Kumasi?', 'Recommend my size'];
const isPrivateRequest = value => ['admin', 'password', 'secret', 'api key', 'token', 'database url', 'show env', 'jwt', 'hack', 'bypass', 'credentials'].some(term => value.toLowerCase().includes(term));

function localAnswer(prompt, products) {
  const query = prompt.toLowerCase();
  const inStock = products.filter(product => !['out_of_stock', 'sold', 'just_sold'].includes(product.status));
  if (isPrivateRequest(query)) return { reply: "Sorry charley, I can't share private store details or help bypass account security. I can help you find a cute look though. What occasion are you dressing for?", products: [] };
  const budget = query.match(/(?:under|below|less than|budget(?: of)?)\s*(?:ghs?\s*)?(\d+(?:\.\d+)?)/i);
  if (budget) {
    const limit = Number(budget[1]);
    const items = inStock.filter(product => Number(product.price) <= limit).slice(0, 3);
    return { reply: items.length ? `These cute in-stock picks are under GH₵ ${limit}:` : `I don't see an in-stock item under GH₵ ${limit}. Want the closest options?`, products: items };
  }
  const terms = ['wedding', 'church', 'date', 'birthday', 'dress', 'bag', 'shoe', 'men', 'women', 'top'].filter(term => query.includes(term));
  const items = inStock.filter(product => !terms.length || terms.some(term => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(term))).slice(0, 3);
  const replies = ['Charley, I found a few looks you might love. What colour are you going for?', 'Cute choice! Here are some lovely options for you, chale.', 'Yesss, let us style that! These pieces could work beautifully.'];
  return { reply: replies[Math.floor(Math.random() * replies.length)], products: items.length ? items : inStock.slice(0, 3) };
}

function Avatar({ size = 'h-8 w-8' }) {
  return <img src={PHOTO} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = 'https://ui-avatars.com/api/?name=Onupa&background=111827&color=fff'; }} alt="Onupa" className={`${size} shrink-0 rounded-full border-2 border-white object-cover`} />;
}

export default function Onupa({ products = [], onNavigate, onPickProduct }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('onupa_chat') || '[]'); return saved.length ? saved : [{ id: 'welcome', from: 'onupa', text: WELCOME }]; }
    catch { return [{ id: 'welcome', from: 'onupa', text: WELCOME }]; }
  });
  const endRef = useRef(null);
  useEffect(() => { try { localStorage.setItem('onupa_chat', JSON.stringify(messages.slice(-40))); } catch {} }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing, open]);
  useEffect(() => { const openChat = () => setOpen(true); window.addEventListener('onupa:open', openChat); return () => window.removeEventListener('onupa:open', openChat); }, []);

  const sendMessage = async value => {
    const prompt = value.trim();
    if (!prompt || typing) return;
    setMessages(current => [...current, { id: `${Date.now()}-user`, from: 'user', text: prompt }]);
    setText('');
    setTyping(true);
    try {
      const { data } = await api.post('/ai/chat', { message: prompt });
      setMessages(current => [...current, { id: `${Date.now()}-onupa`, from: 'onupa', text: data.reply, products: data.products || [], action: data.action }]);
    } catch {
      const answer = localAnswer(prompt, products);
      setMessages(current => [...current, { id: `${Date.now()}-onupa`, from: 'onupa', text: answer.reply, products: answer.products }]);
    } finally { setTyping(false); }
  };

  return <>
    {open && <section className="fixed bottom-[78px] left-3 z-[90] flex h-[min(76dvh,590px)] w-[min(94vw,380px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:bottom-24 sm:left-5" aria-label="Chat with Onupa">
      <header className="flex items-center gap-3 bg-slate-950 px-4 py-3 text-white"><Avatar size="h-10 w-10" /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">Onupa - Your Fashion Assistant</h2><p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Online - Style help</p></div><button onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"><X size={19} /></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f6f7f8] p-3">
        {messages.map(message => <div key={message.id} className={`flex gap-2 ${message.from === 'user' ? 'justify-end' : 'items-end'}`}>
          {message.from !== 'user' && <Avatar size="h-6 w-6" />}
          <div className={`max-w-[84%] rounded-2xl px-3 py-2.5 text-xs leading-5 shadow-sm ${message.from === 'user' ? 'rounded-br-sm bg-slate-950 text-white' : 'rounded-bl-sm bg-white text-slate-700'}`}>
            <p>{message.text}</p>
            {message.action && <button onClick={() => onNavigate?.(message.action === 'faq' ? '/faq' : '/track')} className="mt-2 min-h-9 rounded-lg bg-slate-100 px-3 font-bold text-slate-800">Open {message.action === 'faq' ? 'FAQs' : 'Track Order'}</button>}
            {message.products?.length > 0 && <div className="mt-2 space-y-2">{message.products.map(product => <button key={product.id} onClick={() => onPickProduct?.(products.find(item => String(item.id) === String(product.id)) || product)} className="flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-left"><img src={product.mainImage} alt="" className="h-14 w-12 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-bold">{product.name}</span><span title="GHS - Ghana cedi" className="text-[10px] text-slate-500">{formatCurrency(product.price)}</span></span></button>)}</div>}
          </div>
        </div>)}
        {typing && <div className="flex items-center gap-2"><Avatar size="h-6 w-6" /><span className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500">Onupa is typing...</span></div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-slate-100 bg-white p-3">
        {!messages.some(message => message.from === 'user') && <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{chips.map(chip => <button key={chip} onClick={() => sendMessage(chip)} className="min-h-9 shrink-0 rounded-full border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600">{chip}</button>)}</div>}
        <form onSubmit={event => { event.preventDefault(); sendMessage(text); }} className="flex items-center gap-2"><input value={text} onChange={event => setText(event.target.value)} placeholder="Ask Onupa for style help..." className="h-11 min-w-0 flex-1 rounded-full bg-slate-100 px-4 text-xs outline-none focus:ring-2 focus:ring-slate-300" /><button aria-label="Send message" disabled={!text.trim() || typing} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-950 text-white disabled:opacity-40"><Send size={17} /></button></form>
      </div>
    </section>}
    <button onClick={() => setOpen(value => !value)} className="fixed bottom-4 left-4 z-[95] flex min-h-14 items-center gap-2 rounded-full bg-slate-950 py-2 pl-2 pr-4 text-sm font-bold text-white shadow-xl sm:bottom-5 sm:left-5"><Avatar size="h-10 w-10" /> Talk to Onupa {open ? <X size={16} /> : <MessageCircle size={17} />}</button>
  </>;
}
