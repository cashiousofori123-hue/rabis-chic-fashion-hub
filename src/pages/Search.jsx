import { useEffect, useState } from 'react';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import api from '../api';
import { formatCurrency } from '../utils/formatCurrency';

export default function SearchPage({ onBack, onChoose }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.get('/products', { params: query.trim() ? { search: query.trim() } : {} })
        .then(({ data }) => setProducts(data)).catch(() => setProducts([])).finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);
  return <main className="min-h-screen bg-[#f8f7f5] text-slate-900">
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100" aria-label="Back"><ArrowLeft size={20} /></button>
      <div className="relative flex-1"><SearchIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search dresses, bags, shoes…" className="h-12 w-full rounded-xl bg-slate-100 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" /></div>
    </header>
    <section className="mx-auto max-w-6xl px-4 py-5"><p className="mb-4 text-xs font-semibold text-slate-500">{query.trim() ? `Results for “${query.trim()}”` : 'Popular in the store'}</p>
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Searching products…</p> : products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.map(product => <button key={product.id} onClick={() => onChoose?.(product)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
        <div className="relative aspect-[4/5] bg-slate-100"><img src={product.mainImage} alt={product.name} loading="lazy" className={`h-full w-full object-cover ${['out_of_stock','sold'].includes(product.status) ? 'grayscale opacity-50' : ''}`} />{product.status && product.status !== 'in_stock' && <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-800">{product.status.replaceAll('_', ' ')}</span>}</div>
        <div className="p-3"><p className="line-clamp-1 text-sm font-bold">{product.name}</p><p title="GHS - Ghana cedi" className="mt-1 text-xs text-slate-500">{formatCurrency(product.price)}</p></div>
      </button>)}</div> : <div className="rounded-2xl bg-white py-16 text-center text-sm text-slate-500">No products found. Try another search.</div>}
    </section>
  </main>;
}
