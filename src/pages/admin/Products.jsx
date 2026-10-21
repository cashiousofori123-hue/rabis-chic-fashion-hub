import { useEffect, useRef, useState } from 'react';
import { Check, LockKeyhole, Pencil, Plus, ShieldCheck, Trash2, X, Edit2 } from 'lucide-react';
import api from '../../api';
import { formatCurrency } from '../../utils/formatCurrency';
import ImagePickerNative from '../../components/ImagePickerNative';
import { uploadContentImage } from '../../utils/uploadContentImage';
import ImagePickerSheet from '../../components/ImagePickerSheet';
import AdminPageShell from './AdminPageShell';

const CATEGORIES = ['Women', 'Men', 'Dresses', 'Tops', 'Bags', 'Shoes', 'Accessories'];
const STATUSES = [
  { value: 'in_stock', label: 'In Stock', classes: 'bg-emerald-100 text-emerald-800' },
  { value: 'out_of_stock', label: 'Out of Stock', classes: 'bg-slate-200 text-slate-700' },
  { value: 'just_sold', label: 'Just Sold', classes: 'bg-orange-100 text-orange-800' },
  { value: 'sold', label: 'Sold Out', classes: 'bg-red-100 text-red-800' },
];
const statusFor = (value) => STATUSES.find(status => status.value === value) || STATUSES[0];

async function compressPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (!window.createImageBitmap) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
  if (!blob) return file;
  const stem = file.name.replace(/\.[^.]+$/, '') || 'product-photo';
  return new File([blob], `${stem}.jpg`, { type: 'image/jpeg' });
}

const emptyForm = () => ({ name: '', category: 'Women', price: '', description: '', status: 'in_stock' });

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [priceEditingId, setPriceEditingId] = useState(null);
  const [priceValue, setPriceValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProduct, setPickerProduct] = useState(null);
  const [pickerImageIndex, setPickerImageIndex] = useState(null);
  const previewUrlsRef = useRef(new Set());

  const reload = () => api.get('/products').then(({ data }) => {
    setProducts(data);
    setSelected(current => new Set([...current].filter(id => data.some(item => item.id === id && !item.isDefault))));
  }).catch(() => setError('Could not load the product list. Check your connection and refresh.')).finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);
  useEffect(() => () => previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url)), []);

  const startAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setExistingImages([]);
    setPhotos([]);
    setError('');
    setFormOpen(true);
  };

  const startEdit = (product) => {
    setEditing(product);
    setForm({ name: product.name || '', category: CATEGORIES.includes(product.category) ? product.category : 'Accessories', price: String(product.price ?? ''), description: product.description || '', status: product.status || 'in_stock' });
    setExistingImages(product.images?.length ? [...product.images] : product.mainImage ? [product.mainImage] : []);
    setPhotos([]);
    setError('');
    setFormOpen(true);
  };

  const appendPhotos = (files) => {
    const accepted = Array.from(files || []).filter(file => file.type.startsWith('image/'));
    const room = 5 - existingImages.length - photos.length;
    const next = accepted.slice(0, Math.max(0, room));
    if (accepted.length > next.length) setError('Each product can have up to five photos. Remove a photo before adding more.');
    else setError('');
    const additions = next.map(file => {
      const preview = URL.createObjectURL(file);
      previewUrlsRef.current.add(preview);
      return { file, preview, name: file.name };
    });
    setPhotos(current => [...current, ...additions]);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = new FormData();
      body.append('name', form.name.trim());
      body.append('category', form.category);
      body.append('price', form.price);
      body.append('description', form.description.trim());
      body.append('status', form.status);
      const uploadedImages = [...existingImages];
      let uploadBytes = 0;
      for (const photo of photos) {
        const compressed = await compressPhoto(photo.file);
        uploadBytes += compressed.size;
        if (uploadBytes > 4 * 1024 * 1024) throw new Error('The combined product photos must be 4 MB or smaller.');
        uploadedImages.push(await uploadContentImage(compressed));
      }
      body.append('existingImages', JSON.stringify(uploadedImages));
      if (editing) await api.put(`/products/${editing.id}`, body);
      else await api.post('/products', body);
      await reload();
      setFormOpen(false);
      setPhotos([]);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message || 'Could not save this product. Please try again.');
    } finally { setSaving(false); }
  };

  const handleSavePrice = async (id, value) => {
    try {
      await api.patch(`/products/${id}`, { price: value });
      await reload();
    } catch (err) {
      setError('Could not update price.');
    } finally {
      setPriceEditingId(null);
    }
  };

  const handleImageReplace = async (file) => {
    if (!pickerProduct) return;
    setSaving(true);
    setError('');
    try {
      const compressed = await compressPhoto(file);
      const url = await uploadContentImage(compressed);

      const product = products.find(p => p.id === pickerProduct.id);
      const images = product.images ? [...product.images] : (product.mainImage ? [product.mainImage] : []);

      if (pickerImageIndex !== null && pickerImageIndex < images.length) {
        images[pickerImageIndex] = url;
      } else {
        images.push(url);
      }

      await api.patch(`/products/${pickerProduct.id}`, { images });
      await reload();
    } catch (err) {
      setError(err.message || 'Could not replace image.');
    } finally {
      setSaving(false);
      setPickerOpen(false);
      setPickerProduct(null);
      setPickerImageIndex(null);
    }
  };

  const removeProduct = async (product) => {
    if (product.isDefault) return;
    if (!window.confirm(`Delete “${product.name}” from the store?`)) return;
    try { await api.delete(`/products/${product.id}`); await reload(); }
    catch (requestError) { setError(requestError.response?.data?.detail || 'Could not delete this product.'); }
  };

  const deleteSelected = async () => {
    if (!selected.size || !window.confirm(`Delete ${selected.size} selected product${selected.size === 1 ? '' : 's'}?`)) return;
    const results = await Promise.allSettled([...selected].map(id => api.delete(`/products/${id}`)));
    const rejected = results.filter(result => result.status === 'rejected').length;
    setSelected(new Set());
    if (rejected) setError(`${rejected} product${rejected === 1 ? '' : 's'} could not be deleted.`);
    await reload();
  };

  const markSelected = async (status) => {
    const update = products.filter(product => selected.has(product.id) && !product.isDefault);
    const results = await Promise.allSettled(update.map(product => api.put(`/products/${product.id}`, { status, stock: status === 'out_of_stock' || status === 'sold' ? 0 : Math.max(1, Number(product.stock) || 15) })));
    if (results.some(result => result.status === 'rejected')) setError('Some product statuses could not be updated.');
    await reload();
  };

  const renderCard = (product) => {
    const status = statusFor(product.status);
    const unavailable = ['out_of_stock', 'sold'].includes(product.status);
    const images = product.images?.length ? product.images : (product.mainImage ? [product.mainImage] : []);

    return <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        <div className="grid h-full w-full grid-cols-2 gap-1 p-1">
          {images.slice(0, 4).map((img, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-xl bg-slate-200 group">
              <img src={img} alt={product.name} className={`h-full w-full object-cover ${unavailable ? 'grayscale opacity-50' : ''}`} loading="lazy" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <button
                  type="button"
                  onClick={() => { setPickerProduct(product); setPickerImageIndex(idx); setPickerOpen(true); }}
                  className="p-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 shadow-sm"
                  title="Replace Image"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { if (!product.isDefault && window.confirm('Remove this image?')) { const next = images.filter((_, i) => i !== idx); api.patch(`/products/${product.id}`, { images: next }).then(reload); } }}
                  className="p-1.5 rounded-full bg-white text-red-600 hover:bg-slate-100 shadow-sm"
                  title="Delete Image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {images.length === 0 && <img src={product.mainImage} alt={product.name} className="h-full w-full object-cover" />}
        </div>
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.classes}`}>{status.label}</span>
        {product.isDefault
          ? <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-700 shadow"><LockKeyhole size={12} /> Default</span>
          : <label className="absolute right-2 top-2 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/95 shadow" aria-label={`Select ${product.name}`}>
            <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleSelected(product.id)} className="h-5 w-5 accent-slate-900" />
          </label>}
      </div>
      <div className="space-y-3 p-3.5">
        <div className="min-h-12">
          <h3 className="line-clamp-1 text-sm font-bold text-slate-900">{product.name}</h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span className="line-clamp-1">{product.category} · </span>
            {priceEditingId === product.id ? (
              <input
                autoFocus
                type="number"
                className="w-20 rounded border border-slate-300 px-1 py-0.5 outline-none focus:ring-1 ring-slate-400"
                value={priceValue}
                onChange={e => setPriceValue(e.target.value)}
                onBlur={() => handleSavePrice(product.id, priceValue)}
                onKeyDown={e => { if (e.key === 'Enter') handleSavePrice(product.id, priceValue); }}
              />
            ) : (
              <span
                className="cursor-pointer font-medium text-slate-700 hover:text-slate-900"
                onClick={() => { setPriceEditingId(product.id); setPriceValue(String(product.price)); }}
              >
                {formatCurrency(Number(product.price).toFixed(2))}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
          {product.isDefault ? <span className="flex min-h-11 flex-1 items-center gap-1.5 text-[11px] font-semibold text-slate-500"><ShieldCheck size={15} /> Protected default</span> : <>
            <button type="button" onClick={() => startEdit(product)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700"><Pencil size={15} /> Edit</button>
            <button type="button" onClick={() => removeProduct(product)} aria-label={`Delete ${product.name}`} className="grid h-11 w-11 place-items-center rounded-xl text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
          </>}
        </div>
      </div>
    </article>;
  };

  return <AdminPageShell title="My Products">
    <div className="mx-auto w-full max-w-6xl space-y-5 px-1 pb-24 sm:px-2">
      <header className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><h2 className="text-xl font-black text-slate-900">My Products <span className="ml-1 text-sm font-semibold text-slate-500">{products.length}</span></h2><p className="mt-1 text-xs text-slate-500">Upload new items and manage their availability.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={startAdd} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"><Plus size={18} /> Add New</button>
          <button type="button" onClick={deleteSelected} disabled={!selected.size} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-300 px-3 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /> Delete Selected</button>
        </div>
      </header>

      {error && !formOpen && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}<button onClick={() => setError('')} className="float-right px-2 font-bold">×</button></div>}
      {loading ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Loading products…</p> : products.length ? <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.map(renderCard)}</section> : <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">No products found.</p>}

      {selected.size >= 2 && <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-4xl rounded-2xl bg-slate-950 p-3 text-white shadow-2xl sm:inset-x-6">
        <div className="flex flex-wrap items-center gap-2"><strong className="mr-auto text-sm">{selected.size} selected · Mark as:</strong>
          {STATUSES.map(status => <button key={status.value} type="button" onClick={() => markSelected(status.value)} className="min-h-11 rounded-xl bg-white/10 px-3 text-xs font-bold hover:bg-white/20">{status.label}</button>)}
          <button type="button" onClick={deleteSelected} className="flex min-h-11 items-center gap-1 rounded-xl bg-red-600 px-3 text-xs font-bold"><Trash2 size={15} /> Delete</button>
        </div>
      </div>}

      <ImagePickerSheet
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerProduct(null); setPickerImageIndex(null); }}
        onSelect={handleImageReplace}
        title="Replace Product Image"
      />

      {formOpen && <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 sm:grid sm:place-items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="product-form-title" className="min-h-[100dvh] bg-white sm:min-h-0 sm:w-full sm:max-w-2xl sm:rounded-2xl sm:shadow-2xl">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:rounded-t-2xl">
            <h2 id="product-form-title" className="flex-1 text-lg font-black text-slate-900">{editing ? 'Edit product' : 'Add a product'}</h2>
            <button type="button" aria-label="Close product form" disabled={saving} onClick={() => setFormOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={20} /></button>
          </header>
          <form onSubmit={handleSave} className="space-y-5 px-4 py-4 sm:px-6">
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <ImagePickerNative multiple disabled={saving} onSelect={appendPhotos} onDrop={appendPhotos} />
              <p className="text-center text-[10px] text-slate-500">Up to five photos · JPEG, PNG or WebP</p>
            </div>
            {(existingImages.length > 0 || photos.length > 0) && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {existingImages.map((url, index) => <div key={`old-${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"><img src={url} alt="Product preview" className="h-full w-full object-cover" /><button type="button" onClick={() => setExistingImages(current => current.filter((_, i) => i !== index))} aria-label="Remove photo" className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-white shadow"><X size={16} /></button></div>)}
          {photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"><img src={photo.preview} alt={photo.name} className="h-full w-full object-cover" /><button type="button" onClick={() => { URL.revokeObjectURL(photo.preview); previewUrlsRef.current.delete(photo.preview); setPhotos(current => current.filter((_, i) => i !== index)); }} aria-label="Remove selected photo" className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-white shadow"><X size={16} /></button></div>)}
            </div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-slate-700">Product name<input required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. White Dress with Red Bag" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-slate-700" /></label>
              <label title="GHS · Ghana cedi" className="space-y-1 text-xs font-bold text-slate-700">Price (GH₵)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="180.00" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-slate-700" /></label>
              <label className="space-y-1 text-xs font-bold text-slate-700">Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium">{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
              <label className="space-y-1 text-xs font-bold text-slate-700">Availability<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium">{STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
            </div>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Description<textarea rows={4} maxLength={2000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Describe the product, fit, or fabric…" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-medium outline-none focus:border-slate-700" /></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {editing?.isDefault && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><LockKeyhole size={15} /> This built-in product is protected from deletion. You may still edit its details.</p>}
            <footer className="sticky bottom-0 -mx-4 flex gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pb-1">
              <button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancel</button>
              <button type="submit" disabled={saving} className="min-h-12 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Product'}</button>
            </footer>
          </form>
        </section>
      </div>}
    </div>
  </AdminPageShell>;
}
