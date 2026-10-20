import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton({ href }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" aria-label="Chat with Rabi on WhatsApp" className="fixed bottom-5 right-4 z-[80] grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-xl transition hover:scale-105 sm:right-5"><MessageCircle size={27} fill="white" className="text-[#25d366]" /></a>;
}
