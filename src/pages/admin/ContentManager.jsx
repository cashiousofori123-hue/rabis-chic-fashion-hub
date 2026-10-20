import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

const DEFAULT_CONTENT = {
  hero: {
    title: "New UCC Campus Arrival",
    subtitle: "Fast UCC hostel delivery with real Google Maps live GPS tracking!",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    ctaText: "Shop Now",
    ctaLink: "#store",
  },
  featured: { productIds: [1, 2, 3, 4, 5, 6], bannerImages: [] },
};

export default function ContentManager() {
  const [content, setContent]   = useState(DEFAULT_CONTENT);
  const [products, setProducts] = useState([]);
  const [saving,  setSaving]    = useState(false);
  const [msg,     setMsg]       = useState('');

  useEffect(() => {
    api.get('/site-content/homepage')
      .then(({ data }) => setContent(data))
      .catch(() => setContent(DEFAULT_CONTENT));
    api.get('/products').then(({ data }) => setProducts(data.map(p => ({ id: p.id, name: p.name, price: p.price, discount: p.discount || 0, mainImage: p.mainImage || '' })))).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.put('/site-content/homepage', { ...content, products });
      localStorage.setItem('rabis_content_updated_at', String(Date.now()));
      window.dispatchEvent(new Event('rabis:content-updated'));
      setMsg('Content saved successfully!');
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Could not save content.');
    } finally { setSaving(false); }
  };

  const hero = content.hero || DEFAULT_CONTENT.hero;
  const featuredIds = (content.featured?.productIds || []).join(', ');

  return (
    <AdminPageShell title="Content Manager">
    <form onSubmit={save}
      className="space-y-6 bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm">
      <div>
        <h3 className="font-serif font-bold text-xl text-slate-900">Homepage Content Manager</h3>
        <p className="text-xs text-slate-500 mt-1">
          Edit the hero section, product names &amp; prices, and featured images visible to customers.
        </p>
      </div>

      {/* ── Hero section ── */}
      <fieldset className="border border-rose-100 rounded-2xl p-5 space-y-4">
        <legend className="text-xs font-bold text-rose-700 uppercase tracking-wider px-2">Hero Section</legend>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hero Title</label>
          <input type="text" value={hero.title} maxLength={120}
            onChange={e => setContent({ ...content, hero: { ...hero, title: e.target.value } })}
            className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hero Subtitle</label>
          <input type="text" value={hero.subtitle} maxLength={200}
            onChange={e => setContent({ ...content, hero: { ...hero, subtitle: e.target.value } })}
            className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hero Image URL</label>
          <input type="url" value={hero.imageUrl}
            onChange={e => setContent({ ...content, hero: { ...hero, imageUrl: e.target.value } })}
            className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm font-mono text-xs" />
          {hero.imageUrl && (
            <img src={hero.imageUrl} alt="Hero preview"
              className="mt-2 h-24 rounded-xl object-cover border border-rose-100" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">CTA Button Text</label>
            <input type="text" value={hero.ctaText} maxLength={40}
              onChange={e => setContent({ ...content, hero: { ...hero, ctaText: e.target.value } })}
              className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">CTA Link</label>
            <input type="text" value={hero.ctaLink} maxLength={200}
              onChange={e => setContent({ ...content, hero: { ...hero, ctaLink: e.target.value } })}
              className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm" />
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-rose-100 rounded-2xl p-5 space-y-3">
        <legend className="text-xs font-bold text-rose-700 uppercase tracking-wider px-2">Product Names, Prices &amp; Discounts</legend>
        <div className="space-y-2">
          {products.map((product, index) => <div key={product.id} className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_7rem_6rem_minmax(0,1.4fr)]">
            <input aria-label={`Name for ${product.name}`} value={product.name} onChange={e => setProducts(list => list.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} className="min-w-0 rounded-xl border border-rose-200 px-3 py-2 text-xs" />
            <input aria-label={`Price for ${product.name}`} type="number" min="0.01" step="0.01" value={product.price} onChange={e => setProducts(list => list.map((p, i) => i === index ? { ...p, price: Number(e.target.value) } : p))} className="rounded-xl border border-rose-200 px-2 py-2 text-xs" />
            <input aria-label={`Discount percent for ${product.name}`} type="number" min="0" max="100" value={product.discount} onChange={e => setProducts(list => list.map((p, i) => i === index ? { ...p, discount: Number(e.target.value) } : p))} className="rounded-xl border border-rose-200 px-2 py-2 text-xs" />
            <input aria-label={`Image URL for ${product.name}`} type="url" value={product.mainImage} onChange={e => setProducts(list => list.map((p, i) => i === index ? { ...p, mainImage: e.target.value } : p))} placeholder="Product image URL" className="min-w-0 rounded-xl border border-rose-200 px-3 py-2 text-xs" />
          </div>)}
        </div>
        <p className="text-[10px] text-slate-500">Edit product name, price (GH₵), discount percent, and product image URL.</p>
      </fieldset>

      {/* ── Featured Products ── */}
      <fieldset className="border border-rose-100 rounded-2xl p-5 space-y-4">
        <legend className="text-xs font-bold text-rose-700 uppercase tracking-wider px-2">Featured Product IDs</legend>
        <p className="text-xs text-slate-500">Enter up to 6 product IDs separated by commas.</p>
        <input type="text" value={featuredIds} placeholder="1, 2, 3, 4, 5, 6"
          onChange={e => setContent({
            ...content,
            featured: {
              ...content.featured,
              productIds: e.target.value.split(',').map(v => Number(v.trim())).filter(Boolean).slice(0, 6),
            },
          })}
          className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm font-mono" />
      </fieldset>

      {/* ── Banner Images ── */}
      <fieldset className="border border-rose-100 rounded-2xl p-5 space-y-4">
        <legend className="text-xs font-bold text-rose-700 uppercase tracking-wider px-2">Slideshow Banner Images</legend>
        {(content.featured?.bannerImages || []).map((url, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input type="url" value={url}
              onChange={e => {
                const imgs = [...(content.featured?.bannerImages || [])];
                imgs[idx] = e.target.value;
                setContent({ ...content, featured: { ...content.featured, bannerImages: imgs } });
              }}
              className="flex-1 px-3 py-2 rounded-xl border border-rose-200 text-xs font-mono" />
            <button type="button"
              onClick={() => {
                const imgs = [...(content.featured?.bannerImages || [])].filter((_, i) => i !== idx);
                setContent({ ...content, featured: { ...content.featured, bannerImages: imgs } });
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl">
              Remove
            </button>
          </div>
        ))}
        <button type="button"
          onClick={() => setContent({
            ...content,
            featured: {
              ...content.featured,
              bannerImages: [...(content.featured?.bannerImages || []), ''],
            },
          })}
          className="px-4 py-2 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-50">
          + Add Banner Image
        </button>
      </fieldset>

      {msg && (
        <p role="status" className={`text-xs font-semibold ${msg.includes('success') ? 'text-emerald-700' : 'text-rose-700'}`}>
          {msg}
        </p>
      )}

      <button type="submit" disabled={saving}
        className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white disabled:opacity-60">
        {saving ? 'Saving…' : 'Save Homepage Content'}
      </button>
    </form>
    </AdminPageShell>
  );
}
