import { useEffect, useState } from 'react';
import api from '../../api';
import AdminPageShell from './AdminPageShell';

const ALL_CATEGORIES = [
  'Dresses','Bags','Footwear','Lip balm','Face mask','Eye mask',
  'Lip mask','Clay mask','Headbands','Slippers','Sandals','Down shoe',
  'Scrunchies','Official dresses',
];

export default function Products() {
  const [products,     setProducts]     = useState([]);
  const [newProdName,  setNewProdName]  = useState('');
  const [newProdCat,   setNewProdCat]   = useState('Dresses');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc,  setNewProdDesc]  = useState('');
  const [newProdImages,setNewProdImages]= useState([]);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data)).catch(() => {});
  }, []);

  const persistPrice = async (id, price) => {
    try { await api.put(`/products/${id}`, { price: Number(price) }); }
    catch (e) { alert(e.response?.data?.detail || 'Could not save price.'); }
  };

  const handlePriceChange = (id, val) =>
    setProducts(products.map(p => p.id === id ? { ...p, price: val } : p));

  const handleMultiImageUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => setNewProdImages(prev => [...prev, evt.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const item = {
      name: newProdName, category: newProdCat, price: Number(newProdPrice),
      stock: 15, rating: 5.0, description: newProdDesc || 'New arrival.',
      mainImage: newProdImages[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      images: newProdImages,
    };
    api.post('/products', item)
      .then(({ data }) => { setProducts(c => [data, ...c]); alert('Product added!'); })
      .catch(e => alert(e.response?.data?.detail || 'Could not add product.'));
    setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdImages([]);
  };

  return (
    <AdminPageShell title="Products">
    <div className="space-y-6 bg-white/70 backdrop-blur-md p-6 md:p-8 rounded-xl border border-white/80 shadow-sm">
      <h3 className="font-serif font-bold text-xl text-slate-900">Manage Store Catalog &amp; Prices</h3>

      {/* Add product form */}
      <form onSubmit={handleAddProduct} className="bg-white/80 p-6 rounded-3xl border border-rose-100 space-y-4">
        <h4 className="font-bold text-xs text-rose-700 uppercase tracking-wider">Add New Item</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" required placeholder="Product Name" value={newProdName}
            onChange={e => setNewProdName(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs font-bold bg-white" />
          <input type="number" required placeholder="Price (GH₵)" value={newProdPrice}
            onChange={e => setNewProdPrice(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs font-bold bg-white" />
          <select value={newProdCat} onChange={e => setNewProdCat(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs font-bold bg-white">
            {ALL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="Description" value={newProdDesc}
            onChange={e => setNewProdDesc(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-rose-200 text-xs bg-white" />
          <input type="file" multiple accept="image/*" onChange={handleMultiImageUpload}
            className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-500 file:text-white hover:file:bg-rose-600" />
        </div>
        <button type="submit"
          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow transition">
          Upload New Product
        </button>
      </form>

      {/* Price table */}
      <div className="space-y-3">
        <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Update Product Prices</h4>
        <div className="grid grid-cols-1 gap-3">
          {products.map(p => (
            <div key={p.id}
              className="flex items-center justify-between p-3 rounded-2xl border border-rose-100 bg-white">
              <div className="flex items-center gap-3">
                <img src={p.mainImage} loading="lazy" decoding="async"
                  className="w-10 h-10 rounded-xl object-cover" alt="" />
                <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">GH₵</span>
                <input type="number" value={p.price}
                  onChange={e => handlePriceChange(p.id, e.target.value)}
                  onBlur={e => persistPrice(p.id, e.target.value)}
                  className="w-20 px-2 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-center" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </AdminPageShell>
  );
}
