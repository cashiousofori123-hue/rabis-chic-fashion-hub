import { ExternalLink } from 'lucide-react';

export default function AdminPageShell({ title, children }) {
  const backToMenu = () => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800">
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" onClick={backToMenu} aria-label="Back to admin menu" className="text-3xl leading-none text-slate-700">‹</button>
        <h1 className="flex-1 font-bold text-slate-900">{title}</h1>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
          <ExternalLink size={14} /> Visit the Site
        </a>
      </header>
      <main className="mx-auto mt-4 max-w-2xl space-y-4 px-4 pb-8">{children}</main>
    </div>
  );
}
