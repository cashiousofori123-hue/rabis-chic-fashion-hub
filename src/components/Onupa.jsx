import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

const PHOTO = '/onupa.jpg';
const WELCOME = "Hi! I'm Onupa — your personal stylist at Rabis Chic. I can help you find outfits, check sizes, track orders. What are you shopping for today?";
const chips = ['Find wedding dress', 'Check my size', 'Track my order', "Men's collection"];

function answerFor(text, products) {
  const q = text.toLowerCase();
  if (q.includes('track') || q.includes('delivery') || q.includes('order')) return { text: 'You can follow a courier on the Track Order page. Look up the order with its order number and checkout phone number, then share your delivery location for a more accurate ETA.', action: 'track' };
  if (q.includes('return') || q.includes('exchange')) return { text: 'If an item arrives damaged or differs from your order, contact Rabi promptly. See the store’s delivery and return details in Help & FAQs.', action: 'faq' };
  if (q.includes('size') || q.includes('fit')) return { text: 'For the best fit, compare your bust, waist and hip measurements with the garment sizing. Message the shop with the item name and your measurements and we can help you choose.' };
  if (q.includes('price') || q.includes('cost') || q.includes('budget') || q.includes('gh₵')) return { text: 'Prices are shown on each item card. You can browse the current collection below and choose an item to see its price and details.' };
  const terms = ['wedding', 'party', 'church', 'date', 'birthday', 'men', 'women', 'dress', 'shirt', 'bag', 'shoe'].filter(word => q.includes(word));
  const matches = terms.length ? products.filter(product => terms.some(word => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(word))) : products;
  return { text: matches.length ? 'Here are a few pieces from the current collection that may suit you:' : 'I couldn’t find a close match in the current collection. Try a style, occasion or product type such as dresses, bags or shoes.', productIds: (matches.length ? matches : products).slice(0, 3).map(product => product.id) };
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
  useEffect(() => { localStorage.setItem('onupa_chat', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing, open]);

  const sendMessage = (value) => {
    const prompt = value.trim();
    if (!prompt || typing) return;
    setMessages(current => [...current, { id: `${Date.now()}-user`, from: 'user', text: prompt }]);
    setText('');
    setTyping(true);
    window.setTimeout(() => {
      const answer = answerFor(prompt, products);
      setMessages(current => [...current, { id: `${Date.now()}-onupa`, from: 'onupa', ...answer }]);
      setTyping(false);
    }, 600);
  };

  return <>
    {open && <section className="fixed bottom-[78px] left-3 z-[90] flex h-[min(76dvh,590px)] w-[min(94vw,380px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:bottom-24 sm:left-5" aria-label="Chat with Onupa">
      <header className="flex items-center gap-3 bg-slate-950 px-4 py-3 text-white"><Avatar size="h-10 w-10" /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">Onupa — Your Fashion Assistant</h2><p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Online · Style help</p></div><button onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"><X size={19} /></button></header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f6f7f8] p-3">
        {messages.map(message => <div key={message.id} className={`flex gap-2 ${message.from === 'user' ? 'justify-end' : 'items-end'}`}>
          {message.from !== 'user' && <Avatar size="h-6 w-6" />}
          <div className={`max-w-[84%] rounded-2xl px-3 py-2.5 text-xs leading-5 shadow-sm ${message.from === 'user' ? 'rounded-br-sm bg-slate-950 text-white' : 'rounded-bl-sm bg-white text-slate-700'}`}>
            <p>{message.text}</p>
            {message.action && <button onClick={() => onNavigate?.(message.action === 'faq' ? '/faq' : '/track')} className="mt-2 min-h-9 rounded-lg bg-slate-100 px-3 font-bold text-slate-800">Open {message.action === 'faq' ? 'FAQs' : 'Track Order'}</button>}
            {message.productIds?.length > 0 && <div className="mt-2 space-y-2">{message.productIds.map(id => products.find(product => String(product.id) === String(id))).filter(Boolean).map(product => <button key={product.id} onClick={() => onPickProduct?.(product)} className="flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-left"><img src={product.mainImage} alt="" className="h-12 w-10 rounded-lg object-cover" /><span className="min-w-0 flex-1"><span className="block truncate font-bold">{product.name}</span><span className="text-[10px] text-slate-500">GH₵ {product.price}</span></span></button>)}</div>}
          </div>
        </div>)}
        {typing && <div className="flex items-center gap-2"><Avatar size="h-6 w-6" /><span className="rounded-2xl bg-white px-3 py-2 text-xs text-slate-500">Onupa is typing…</span></div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-slate-100 bg-white p-3">
        {!messages.some(message => message.from === 'user') && <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{chips.map(chip => <button key={chip} onClick={() => sendMessage(chip)} className="min-h-9 shrink-0 rounded-full border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600">{chip}</button>)}</div>}
        <form onSubmit={event => { event.preventDefault(); sendMessage(text); }} className="flex items-center gap-2"><input value={text} onChange={event => setText(event.target.value)} placeholder="Ask Onupa for style help…" className="h-11 min-w-0 flex-1 rounded-full bg-slate-100 px-4 text-xs outline-none focus:ring-2 focus:ring-slate-300" /><button aria-label="Send message" disabled={!text.trim() || typing} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-950 text-white disabled:opacity-40"><Send size={17} /></button></form>
      </div>
    </section>}
    <button onClick={() => setOpen(value => !value)} className="fixed bottom-4 left-4 z-[95] flex min-h-14 items-center gap-2 rounded-full bg-slate-950 py-2 pl-2 pr-4 text-sm font-bold text-white shadow-xl sm:bottom-5 sm:left-5"><Avatar size="h-10 w-10" /> Talk to Onupa {open ? <X size={16} /> : <MessageCircle size={17} />}</button>
  </>;
}
