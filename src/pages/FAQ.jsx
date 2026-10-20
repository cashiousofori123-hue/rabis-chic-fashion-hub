import { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const QUESTIONS = [
  ['Where do you deliver?', 'We deliver to Casely Hayford, Valco, Oguaa, Adehye, Superannuation, KNH and other UCC hostels in Cape Coast. Add your hostel and room at checkout.'],
  ['How can I track my order?', 'Use Track Order in the store and look up your order with the order number and phone number used at checkout. Share your delivery location for a more accurate ETA.'],
  ['Which payment methods do you accept?', 'Mobile Money (MoMo) is currently available. The store will confirm payment and delivery details with you.'],
  ['Can I return or exchange an item?', 'Contact Rabi as soon as possible if an item is damaged or different from what you ordered. Return or exchange options depend on the item and its condition.'],
  ['How long does delivery take?', 'Delivery timing depends on your hostel, order confirmation and courier availability. Your tracking page shows the courier location and latest ETA when GPS is shared.'],
];

export default function FAQPage({ onBack }) {
  const [open, setOpen] = useState(0);
  return <main className="min-h-screen bg-[#f8f7f5] text-slate-900">
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3"><button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100" aria-label="Back"><ArrowLeft size={20} /></button><h1 className="text-lg font-bold">Help &amp; FAQs</h1></header>
    <section className="mx-auto max-w-2xl space-y-3 px-4 py-6">{QUESTIONS.map(([question, answer], index) => <article key={question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><button aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold"><span className="flex-1">{question}</span><ChevronDown size={18} className={`transition-transform ${open === index ? 'rotate-180' : ''}`} /></button>{open === index && <p className="border-t border-slate-100 px-4 py-4 text-sm leading-6 text-slate-600">{answer}</p>}</article>)}</section>
  </main>;
}
