export default function AdminPageShell({ title, children }) {
  const backToMenu = () => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800">
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
        <button type="button" onClick={backToMenu} aria-label="Back to admin menu" className="text-3xl leading-none text-slate-700">‹</button>
        <h1 className="font-bold text-slate-900">{title}</h1>
      </header>
      <main className="mx-auto mt-4 max-w-2xl space-y-4 px-4 pb-8">{children}</main>
    </div>
  );
}
