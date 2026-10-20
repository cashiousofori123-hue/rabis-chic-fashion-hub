import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
import api from '../api';

export default function WishlistPage({ onBack, wishlist, setWishlist, onChoose }) {
  const [products, setProducts] = useState([]);
  useEffect(() => { api.get('/products').then(({ data }) => setProducts(data)).catch(() => setProducts([])); }, []);
  const saved = products.filter(product => wishlist.includes(String(product.id)) || wishlist.includes(product.id));
  const remove = (id) => setWishlist(current => {
    const next = current.filter(entry => String(entry) !== String(id));
    localStorage.setItem('wishlist', JSON.stringify(next));
    return next;
  });
  return <main className="min-h-screen bg-[#f8f7f5] text-slate-900">
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3"><button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100" aria-label="Back"><ArrowLeft size={20} /></button><div><h1 className="text-lg font-bold">Wishlist</h1><p className="text-xs text-slate-500">{saved.length} saved item{saved.length === 1 ? '' : 's'}</p></div></header>
    <section className="mx-auto max-w-6xl px-4 py-5">{saved.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{saved.map(product => <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button onClick={() => onChoose?.(product)} className="block w-full text-left"><img src={product.mainImage} alt={product.name} className="aspect-[4/5] w-full object-cover" /><div className="p-3"><p className="line-clamp-1 text-sm font-bold">{product.name}</p><p className="mt-1 text-xs text-slate-500">GH₵ {product.price}</p></div></button><button onClick={() => remove(product.id)} className="m-2 flex min-h-11 w-[calc(100%-1rem)] items-center justify-center gap-2 rounded-xl bg-rose-50 text-xs font-bold text-rose-700"><Trash2 size={15} /> Remove</button></article>)}</div> : <div className="rounded-2xl bg-white px-6 py-16 text-center"><Heart className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-bold">Your wishlist is empty</p><p className="mt-1 text-sm text-slate-500">Tap the heart on any product to save it here.</p></div>}</section>
  </main>;
}
