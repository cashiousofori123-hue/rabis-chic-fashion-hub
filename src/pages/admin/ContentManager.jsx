import { useEffect, useState } from 'react';
import api from '../../api';
import { formatCurrency } from '../../utils/formatCurrency';
import AdminPageShell from './AdminPageShell';

const DEFAULT_SLIDE = { title: 'New UCC Campus Arrival', subtitle: 'Fresh looks delivered around campus.', imageUrl: '', badge: 'New Arrival', buttonText: 'Shop Now', buttonLink: '/shop' };
const BADGES = ['None', 'Just In', 'New Arrival', 'Out of Stock', 'Just Sold', 'Sale', 'Best Seller'];
const LINKS = ['/shop', '/shop?category=dresses', '/track', '/contact'];
const NOTICE_TYPES = ['info', 'sale', 'just_in', 'out_of_stock'];

export default function ContentManager() {
  const [content, setContent] = useState({ heroSlides: [DEFAULT_SLIDE], noticeBar: { text: '', active: false, type: 'info' }, featured: { productIds: [], bannerImages: [] } });
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyImage, setBusyImage] = useState(-1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/site-content/homepage').then(({ data }) => {
      const slides = Array.isArray(data.heroSlides) && data.heroSlides.length ? data.heroSlides : [{ ...DEFAULT_SLIDE, ...data.hero }];
      setContent({ ...data, heroSlides: slides, noticeBar: data.noticeBar || { text: '', active: false, type: 'info' }, featured: { productIds: data.featured?.productIds || [], bannerImages: data.featured?.bannerImages || [] } });
    }).catch(() => {});
    api.get('/products').then(({ data }) => setProducts(data)).catch(() => {});
  }, []);

  const updateSlide = (index, patch) => setContent(current => ({ ...current, heroSlides: current.heroSlides.map((slide, i) => i === index ? { ...slide, ...patch } : slide) }));
  const moveSlide = (index, offset) => setContent(current => {
    const target = index + offset;
    if (target < 0 || target >= current.heroSlides.length) return current;
    const heroSlides = [...current.heroSlides];
    [heroSlides[index], heroSlides[target]] = [heroSlides[target], heroSlides[index]];
    return { ...current, heroSlides };
  });
  const reorderSlides = (from, to) => setContent(current => {
    const heroSlides = [...current.heroSlides];
    const [slide] = heroSlides.splice(from, 1);
    heroSlides.splice(to, 0, slide);
    return { ...current, heroSlides };
  });
  const pickImage = async (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 12000000) { setMsg('Choose a photo smaller than 12 MB.'); event.target.value = ''; return; }
    setBusyImage(index);
    try {
      let imageUrl;
      if (window.createImageBitmap) {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
        imageUrl = canvas.toDataURL('image/jpeg', 0.78);
      } else imageUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read photo.')); reader.readAsDataURL(file); });
      updateSlide(index, { imageUrl });
      setMsg('Photo ready. Save to publish.');
    } catch (error) { setMsg(error.message); }
    finally { setBusyImage(-1); event.target.value = ''; }
  };
  const save = async event => {
    event.preventDefault(); setSaving(true); setMsg('');
    try {
      const slides = content.heroSlides.filter(slide => slide.title?.trim() && slide.imageUrl);
      if (!slides.length) throw new Error('Add a title and photo to at least one hero slide.');
      const featured = { ...content.featured, productIds: (content.featured?.productIds || []).slice(0, 6), bannerImages: slides.map(slide => slide.imageUrl) };
      const payload = { ...content, heroSlides: slides, hero: { ...slides[0], ctaText: slides[0].buttonText, ctaLink: slides[0].buttonLink }, featured, products: products.map(product => ({ id: product.id, name: product.name, price: product.price, discount: product.discount || 0 })) };
      await api.put('/site-content/homepage', payload);
      localStorage.setItem('rabis_content_updated_at', String(Date.now()));
      window.dispatchEvent(new Event('rabis:content-updated'));
      setMsg('Updated live.');
    } catch (error) { setMsg(error.response?.data?.detail || error.message || 'Could not save content.'); }
    finally { setSaving(false); }
  };
  const selected = content.featured?.productIds || [];
  const toggleFeatured = id => setContent(current => {
    const ids = current.featured?.productIds || [];
    return { ...current, featured: { ...current.featured, productIds: ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id].slice(0, 6) } };
  });

  return <AdminPageShell title="Content Manager">
    <form onSubmit={save} className="mx-auto max-w-4xl space-y-5 pb-24">
      <header className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-4 shadow-sm"><div className="mr-auto"><h2 className="text-lg font-black">Homepage Content</h2><p className="text-xs text-slate-500">Pick photos from your phone and preview before publishing.</p></div><a href="/" target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold">Visit Site</a></header>
      <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-sm font-black">Hero Slides</legend>
        {content.heroSlides.map((slide, index) => <article key={slide.id || index} draggable onDragStart={event => { event.dataTransfer.setData('text/plain', String(index)); }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (Number.isInteger(from) && from >= 0 && from < content.heroSlides.length && from !== index) reorderSlides(from, index); }} className="space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4"><div className="flex items-center"><b className="mr-auto text-sm">Slide {index + 1}</b><button type="button" aria-label="Move slide up" disabled={index === 0} onClick={() => moveSlide(index, -1)} className="min-h-10 rounded-full px-2 text-xs font-bold disabled:opacity-30">Up</button><button type="button" aria-label="Move slide down" disabled={index === content.heroSlides.length - 1} onClick={() => moveSlide(index, 1)} className="min-h-10 rounded-full px-2 text-xs font-bold disabled:opacity-30">Down</button><button type="button" disabled={content.heroSlides.length === 1} onClick={() => setContent(current => ({ ...current, heroSlides: current.heroSlides.filter((_, i) => i !== index) }))} className="min-h-10 rounded-full px-3 text-xs font-bold text-red-700 disabled:opacity-40">Delete</button></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Title<input maxLength={100} value={slide.title || ''} onChange={event => updateSlide(index, { title: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" /></label><label className="text-xs font-semibold">Subtitle<input maxLength={180} value={slide.subtitle || ''} onChange={event => updateSlide(index, { subtitle: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" /></label>
            <label className="text-xs font-semibold">Badge<select value={slide.badge || 'None'} onChange={event => updateSlide(index, { badge: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">{BADGES.map(badge => <option key={badge}>{badge}</option>)}</select></label><label className="text-xs font-semibold">Button destination<select value={slide.buttonLink || '/shop'} onChange={event => updateSlide(index, { buttonLink: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">{LINKS.map(link => <option key={link} value={link}>{link}</option>)}</select></label>
            <label className="text-xs font-semibold">Button text<input maxLength={32} value={slide.buttonText || 'Shop Now'} onChange={event => updateSlide(index, { buttonText: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm" /></label>
          </div>
          <label className="flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-bold">{busyImage === index ? 'Loading photo...' : 'Add a hero photo'}<span className="mt-1 text-[10px] font-medium text-slate-500">Photo Library · Take photo · Choose File · Google Drive</span><input type="file" accept="image/*" onChange={event => pickImage(index, event)} className="sr-only" /></label>
          {slide.imageUrl && <img src={slide.imageUrl} alt={`Slide ${index + 1} preview`} className="aspect-video w-full rounded-xl object-cover" />}
        </article>)}
        <button type="button" onClick={() => setContent(current => ({ ...current, heroSlides: [...current.heroSlides, { ...DEFAULT_SLIDE, id: `slide-${Date.now()}`, title: '' }] }))} className="min-h-12 w-full rounded-xl border border-slate-300 text-sm font-bold">+ Add New Slide</button>
        <p className="text-[11px] text-slate-500">Slides auto-advance every 4 seconds. Customers can use arrows, dots, and swipe on phones.</p>
      </fieldset>
      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-sm font-black">Notice Bar</legend><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(content.noticeBar?.active)} onChange={event => setContent(current => ({ ...current, noticeBar: { ...current.noticeBar, active: event.target.checked } }))} /> Show notice at top of store</label><input value={content.noticeBar?.text || ''} onChange={event => setContent(current => ({ ...current, noticeBar: { ...current.noticeBar, text: event.target.value } }))} placeholder="e.g. New arrivals this week" className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm"/><select value={content.noticeBar?.type || 'info'} onChange={event => setContent(current => ({ ...current, noticeBar: { ...current.noticeBar, type: event.target.value } }))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">{NOTICE_TYPES.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></fieldset>
      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-sm font-black">Featured Products</legend><p className="text-xs text-slate-500">Choose up to six products. Update product photos from My Products.</p><div className="grid gap-2 sm:grid-cols-2">{products.map(product => <label key={product.id} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 p-2"><input type="checkbox" checked={selected.includes(product.id)} disabled={!selected.includes(product.id) && selected.length >= 6} onChange={() => toggleFeatured(product.id)} /><img src={product.mainImage} alt="" className="h-12 w-10 rounded-lg object-cover"/><span className="min-w-0 flex-1 truncate text-xs font-bold">{product.name}</span><span title="GHS · Ghana cedi" className="text-[10px] text-slate-500">{formatCurrency(product.price)}</span></label>)}</div></fieldset>
      <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold">Edit product display names and prices</summary><div className="mt-3 space-y-2">{products.map((product, index) => <div key={product.id} className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2"><input aria-label={`Name for ${product.name}`} value={product.name} onChange={event => setProducts(list => list.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className="min-w-0 rounded-lg border border-slate-300 px-2 py-2 text-xs"/><input aria-label={`Price for ${product.name}`} type="number" min="0.01" step="0.01" value={product.price} onChange={event => setProducts(list => list.map((item, i) => i === index ? { ...item, price: Number(event.target.value) } : item))} className="rounded-lg border border-slate-300 px-2 py-2 text-xs"/></div>)}</div></details>
      {msg && <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${msg.startsWith('Updated') || msg.startsWith('Photo') ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{msg}</p>}
      <button type="submit" disabled={saving} className="fixed inset-x-3 bottom-3 z-40 mx-auto min-h-12 max-w-4xl rounded-full bg-slate-950 px-6 text-sm font-bold text-white shadow-2xl disabled:opacity-60">{saving ? 'Saving...' : 'Save and Update Live Site'}</button>
    </form>
  </AdminPageShell>;
}
