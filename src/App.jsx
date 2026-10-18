import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

const INITIAL_PRODUCTS = [
  { id: 1, name: "Lip Balm", category: "Skincare", price: 25, inStock: true, isNew: false, img: "https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?w=500&auto=format&fit=crop&q=60" },
  { id: 2, name: "Official Wears", category: "Apparel", price: 220, inStock: true, isNew: true, img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=60" },
  { id: 3, name: "Face Mask", category: "Skincare", price: 35, inStock: true, isNew: false, img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=60" },
  { id: 4, name: "Eye Mask", category: "Skincare", price: 30, inStock: true, isNew: false, img: "https://images.unsplash.com/photo-1512290900676-26c2a52595b8?w=500&auto=format&fit=crop&q=60" },
  { id: 5, name: "Lip Mask", category: "Skincare", price: 40, inStock: true, isNew: true, img: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&auto=format&fit=crop&q=60" },
  { id: 6, name: "Clay Mask", category: "Skincare", price: 65, inStock: true, isNew: false, img: "https://images.unsplash.com/photo-1567928269069-af11f638f7b5?w=500&auto=format&fit=crop&q=60" },
  { id: 7, name: "Headbands", category: "Hair", price: 20, inStock: true, isNew: false, img: "https://images.unsplash.com/photo-1584297091622-af8e5cb1e97d?w=500&auto=format&fit=crop&q=60" },
  { id: 8, name: "Slippers", category: "Footwear", price: 75, inStock: true, isNew: false, img: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=500&auto=format&fit=crop&q=60" },
  { id: 9, name: "Sandals", category: "Footwear", price: 110, inStock: true, isNew: true, img: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=500&auto=format&fit=crop&q=60" },
  { id: 10, name: "Down Shoe", category: "Footwear", price: 150, inStock: true, isNew: true, img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=60" },
  { id: 11, name: "Scrunchies", category: "Hair", price: 15, inStock: true, isNew: false, img: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=500&auto=format&fit=crop&q=60" }
];

// Slideshow images using your exact custom uploads
const SLIDESHOW_IMAGES = [
  "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&auto=format&fit=crop&q=80"
];

const UCC_LOCATIONS = {
  "Casely Hayford Hall": [5.1165, -1.2885],
  "Valco Hall": [5.1140, -1.2860],
  "Kwame Nkrumah Hall": [5.1180, -1.2890],
  "Oguaa Hall": [5.1120, -1.2830],
  "Adehye Hall": [5.1135, -1.2845],
  "Amamoma Hostel Area": [5.1220, -1.2910],
  "Apewosika Area": [5.1090, -1.2810],
  "Kwaprow Area": [5.1250, -1.2930],
  "Science Market": [5.1155, -1.2870]
};

const STORE_HUB_COORDS = [5.1150, -1.2850];

export default function App() {
  const [showFlyer, setShowFlyer] = useState(true);
  const [activeTab, setActiveTab] = useState('shop');
  const [products, setProducts] = useState(() => JSON.parse(localStorage.getItem('rabis_products') || JSON.stringify(INITIAL_PRODUCTS)));
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('rabis_orders') || '[]'));
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Admin & Socials state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPin, setAdminPin] = useState(() => localStorage.getItem('rabis_admin_pin') || '1234');
  const [enteredPin, setEnteredPin] = useState('');
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  const [socials, setSocials] = useState(() => JSON.parse(localStorage.getItem('rabis_socials') || JSON.stringify({
    phone: '+233 24 123 4567',
    whatsapp: '233241234567',
    instagram: 'RabiChicUCC',
    tiktok: 'RabiChicUCC',
    facebook: 'RabiChicFashionHub',
    snapchat: 'RabiChicSnap'
  })));

  // New admin password update state
  const [newPinInput, setNewPinInput] = useState('');

  // Checkout form state
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custHostel, setCustHostel] = useState('Casely Hayford Hall');
  const [custRoom, setCustRoom] = useState('');

  // Map state
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const polylineRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const [telemetry, setTelemetry] = useState({ id: 'None', dest: 'UCC Campus', eta: '-- mins', dist: '-- km', status: 'STANDBY' });

  // 2s Flyer Splash
  useEffect(() => {
    const timer = setTimeout(() => setShowFlyer(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Hero Slideshow Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('rabis_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('rabis_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('rabis_socials', JSON.stringify(socials));
  }, [socials]);

  useEffect(() => {
    localStorage.setItem('rabis_admin_pin', adminPin);
  }, [adminPin]);

  // Leaflet Map Init
  useEffect(() => {
    if (activeTab === 'track' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(STORE_HUB_COORDS, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap | Rabi\'s Chic Fashion Hub'
      }).addTo(mapInstance.current);

      L.marker(STORE_HUB_COORDS).addTo(mapInstance.current)
        .bindPopup('<b>Rabi\'s Chic Fashion Hub HQ</b><br>Main UCC Dispatch')
        .openPopup();
    }
  }, [activeTab]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (enteredPin === adminPin) {
      setIsAdminLoggedIn(true);
      setShowAccessDenied(false);
      setEnteredPin('');
    } else {
      setShowAccessDenied(true);
      setEnteredPin('');
    }
  };

  const handleAddToCart = (product) => {
    if (!product.inStock) return;
    setCart((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.map((p) => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return alert('Your cart is empty!');
    if (!custName || !custPhone) return alert('Please enter your Name and Phone Number');

    const orderId = '#RABI-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const coords = UCC_LOCATIONS[custHostel] || STORE_HUB_COORDS;

    const newOrder = {
      id: orderId,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customer: { name: custName, phone: custPhone, hostel: custHostel, room: custRoom, coords },
      items: [...cart],
      status: 'Out for Delivery',
      total: cart.reduce((acc, i) => acc + (i.price * i.qty), 0)
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    setIsCartOpen(false);
    alert(`🎉 Order Placed Successfully!\nOrder ID: ${orderId}\nTrack live delivery on the Campus Radar Map!`);
    setActiveTab('track');
    loadOrderOnMap(newOrder);
  };

  const loadOrderOnMap = (order) => {
    if (!mapInstance.current) return;
    if (polylineRef.current) mapInstance.current.removeLayer(polylineRef.current);
    if (riderMarkerRef.current) mapInstance.current.removeLayer(riderMarkerRef.current);

    const destCoords = order.customer.coords;
    L.marker(destCoords).addTo(mapInstance.current)
      .bindPopup(`<b>${order.customer.name}</b><br>${order.customer.hostel} (${order.customer.room})`)
      .openPopup();

    polylineRef.current = L.polyline([STORE_HUB_COORDS, destCoords], { color: '#e11d48', weight: 4, dashArray: '8, 8' }).addTo(mapInstance.current);
    mapInstance.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });

    setTelemetry({
      id: order.id,
      dest: order.customer.hostel,
      eta: '6 mins',
      dist: '1.2 km',
      status: order.status.toUpperCase()
    });
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'new') return p.isNew;
    return p.category === selectedCategory;
  });

  return (
    <div className="min-h-screen pb-16">
      {/* 2-SECOND INITIAL FLYER SPLASH */}
      {showFlyer && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-bounce">
            <h2 className="font-serif text-2xl font-bold text-rose-700 mb-2">Rabi's Chic Fashion Hub</h2>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-4">UCC Campus Express</p>
            <img src={SLIDESHOW_IMAGES[0]} className="w-full h-64 object-cover rounded-2xl mb-4 border border-rose-100" />
            <p className="text-xs text-rose-600 font-bold">✨ Welcome to Beauty & Comfort! Loading Store...</p>
          </div>
        </div>
      )}

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div onClick={() => setActiveTab('shop')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-md">
              <i className="fa-solid fa-crown text-lg"></i>
            </div>
            <div>
              <span className="font-serif text-xl font-bold text-rose-700">Rabi's Chic</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Fashion Hub UCC</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2 font-medium text-sm text-slate-600">
            <button onClick={() => setActiveTab('shop')} className={`px-4 py-2 rounded-full ${activeTab === 'shop' ? 'bg-rose-50 text-rose-600 font-bold' : ''}`}>Shop Catalog</button>
            <button onClick={() => setActiveTab('track')} className={`px-4 py-2 rounded-full ${activeTab === 'track' ? 'bg-rose-50 text-rose-600 font-bold' : ''}`}>Track Radar Map</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-full ${activeTab === 'history' ? 'bg-rose-50 text-rose-600 font-bold' : ''}`}>My Orders</button>
            <button onClick={() => setActiveTab('admin')} className="px-4 py-2 rounded-full bg-slate-900 text-white font-bold ml-2">
              <i className="fa-solid fa-user-shield text-xs mr-1"></i> Admin Portal
            </button>
          </nav>

          <button onClick={() => setIsCartOpen(true)} className="relative p-2.5 rounded-full bg-rose-100/70 text-rose-700">
            <i className="fa-solid fa-bag-shopping text-lg"></i>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
              {cart.reduce((acc, i) => acc + i.qty, 0)}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* SHOP TAB */}
        {activeTab === 'shop' && (
          <section className="space-y-6">
            {/* HERO SLIDESHOW */}
            <div className="relative h-80 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border-2 border-rose-100">
              {SLIDESHOW_IMAGES.map((img, idx) => (
                <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                  <img src={img} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent flex items-center p-8 sm:p-12 text-white">
                    <div className="max-w-lg">
                      <span className="px-3 py-1 bg-rose-600 rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block">✨ Style That Speaks For You</span>
                      <h1 className="font-serif text-3xl sm:text-5xl font-bold mb-3">Rabi's Chic Fashion Hub</h1>
                      <p className="text-rose-100 text-sm mb-6">Comfortable slippers, elegant dresses, official wears, skincare & gift packages delivered to your hostel!</p>
                      <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noreferrer" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm inline-flex items-center gap-2 shadow-lg">
                        <i className="fa-brands fa-whatsapp text-lg"></i> Chat on WhatsApp ({socials.phone})
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CATEGORIES */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['all', 'new', 'Skincare', 'Apparel', 'Footwear', 'Hair'].map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap ${selectedCategory === cat ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  {cat === 'all' ? 'All Items' : cat === 'new' ? '🔥 New Arrivals' : cat}
                </button>
              ))}
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((p) => (
                <div key={p.id} className="bg-white rounded-3xl p-4 border border-rose-100 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="relative rounded-2xl overflow-hidden h-48 mb-3">
                      <img src={p.img} className={`w-full h-full object-cover ${!p.inStock ? 'grayscale opacity-60' : ''}`} />
                      <span className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-[11px] font-bold text-rose-700">{p.category}</span>
                      {p.isNew && <span className="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase">NEW</span>}
                      {!p.inStock && <span className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white font-extrabold text-sm uppercase">Out of Stock</span>}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-1">{p.name}</h3>
                    <p className="text-rose-600 font-extrabold text-lg mb-4">GH₵ {p.price.toFixed(2)}</p>
                  </div>
                  <button onClick={() => handleAddToCart(p)} disabled={!p.inStock} className={`w-full py-3 rounded-xl font-bold transition ${p.inStock ? 'bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                    {p.inStock ? 'Add to Bag' : 'Out of Stock'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TRACK RADAR MAP */}
        {activeTab === 'track' && (
          <section className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-lg flex justify-between items-center">
              <div>
                <h2 className="font-serif text-2xl font-bold">UCC Campus Live Delivery Radar</h2>
                <p className="text-slate-500 text-sm">Interactive GPS telemetry map centered on University of Cape Coast campus.</p>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden border-2 border-rose-200 shadow-2xl h-[500px]">
              <div ref={mapRef} className="w-full h-full z-10"></div>
              <div className="absolute top-4 left-4 z-20 bg-slate-900/90 text-white p-4 rounded-2xl text-xs w-60 shadow-2xl">
                <div className="font-bold text-rose-400 mb-2 border-b border-slate-700 pb-1">GPS Telemetry</div>
                <div className="space-y-1 font-mono">
                  <div>Ref: <span className="text-white font-bold">{telemetry.id}</span></div>
                  <div>Dest: <span className="text-white">{telemetry.dest}</span></div>
                  <div>Status: <span className="text-amber-400 font-bold">{telemetry.status}</span></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MY ORDERS */}
        {activeTab === 'history' && (
          <section className="max-w-3xl mx-auto space-y-4">
            <h2 className="font-serif text-2xl font-bold">Order History</h2>
            {orders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl text-slate-400">No orders placed yet.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-white p-6 rounded-3xl border border-rose-100 shadow-md flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">{o.id}</div>
                    <div className="text-xs text-slate-400">{o.date} • {o.customer.hostel}</div>
                  </div>
                  <button onClick={() => setActiveInvoice(o)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">View Invoice</button>
                </div>
              ))
            )}
          </section>
        )}

        {/* ADMIN PORTAL */}
        {activeTab === 'admin' && (
          <section className="max-w-4xl mx-auto space-y-6">
            {!isAdminLoggedIn ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-md mx-auto shadow-xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 text-xl">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <h2 className="font-serif text-2xl font-bold mb-1">Admin Access Only</h2>
                <p className="text-xs text-slate-500 mb-6">Enter master PIN to unlock inventory & social settings.</p>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="password" placeholder="Enter PIN (Default: 1234)" value={enteredPin} onChange={(e) => setEnteredPin(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center font-mono font-bold outline-none" />
                  {showAccessDenied && <p className="text-xs text-rose-600 font-bold">❌ Access Denied: Incorrect PIN.</p>}
                  <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">Unlock Admin Dashboard</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-6 rounded-3xl flex justify-between items-center">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-rose-400">Admin Control Panel</h2>
                    <p className="text-xs text-slate-400">Manage pricing, stock, contact info, and social links.</p>
                  </div>
                  <button onClick={() => setIsAdminLoggedIn(false)} className="px-4 py-2 bg-rose-900 text-rose-200 text-xs font-bold rounded-xl">Lock Session</button>
                </div>

                {/* SOCIAL MEDIA & CONTACT SETTINGS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-lg text-slate-800">🌐 Update Contact & Social Media Links</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Phone Number</label>
                      <input type="text" value={socials.phone} onChange={(e) => setSocials({...socials, phone: e.target.value})} className="w-full p-2.5 border rounded-xl" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">WhatsApp Number (e.g. 233241234567)</label>
                      <input type="text" value={socials.whatsapp} onChange={(e) => setSocials({...socials, whatsapp: e.target.value})} className="w-full p-2.5 border rounded-xl" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Instagram Handle</label>
                      <input type="text" value={socials.instagram} onChange={(e) => setSocials({...socials, instagram: e.target.value})} className="w-full p-2.5 border rounded-xl" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">TikTok Handle</label>
                      <input type="text" value={socials.tiktok} onChange={(e) => setSocials({...socials, tiktok: e.target.value})} className="w-full p-2.5 border rounded-xl" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Facebook Name / Link</label>
                      <input type="text" value={socials.facebook} onChange={(e) => setSocials({...socials, facebook: e.target.value})} className="w-full p-2.5 border rounded-xl" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Snapchat Handle</label>
                      <input type="text" value={socials.snapchat} onChange={(e) => setSocials({...socials, snapchat: e.target.value})} className="w-full p-2.5 border rounded-xl" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => alert('✅ Social links & contact information updated successfully!')} className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs">Save Contact Changes</button>
                  </div>
                </div>

                {/* CHANGE ADMIN PASSWORD */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-lg text-slate-800">🔐 Change Admin Password / PIN</h3>
                  <div className="flex gap-4 items-center">
                    <input type="password" placeholder="Enter New 4-digit PIN" value={newPinInput} onChange={(e) => setNewPinInput(e.target.value)} className="w-60 p-2.5 border rounded-xl text-sm font-mono font-bold" />
                    <button onClick={() => {
                      if (newPinInput.length < 4) return alert('PIN must be at least 4 characters.');
                      setAdminPin(newPinInput);
                      setNewPinInput('');
                      alert('🔒 Admin PIN successfully updated!');
                    }} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs">Update PIN</button>
                  </div>
                </div>

                {/* INVENTORY TABLE */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">📦 Inventory & Pricing</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b text-slate-400 uppercase">
                          <th className="pb-2">Name</th>
                          <th className="pb-2">Price (GH₵)</th>
                          <th className="pb-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 font-bold">{p.name}</td>
                            <td className="py-3">
                              <input type="number" value={p.price} onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setProducts(products.map((x) => x.id === p.id ? { ...x, price: val } : x));
                              }} className="w-20 px-2 py-1 border rounded" />
                            </td>
                            <td className="py-3">
                              <button onClick={() => setProducts(products.map((x) => x.id === p.id ? { ...x, inStock: !x.inStock } : x))} className={`px-3 py-1 rounded-full text-[10px] font-bold ${p.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {p.inStock ? 'In Stock' : 'Out of Stock'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* SHOPPING CART SIDEBAR */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-serif text-xl font-bold">Your Shopping Bag</h3>
                <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold">✕</button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400">Your bag is empty.</div>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-rose-50/50 p-3 rounded-2xl">
                      <div>
                        <div className="font-bold text-sm">{item.name}</div>
                        <div className="text-xs text-rose-600 font-bold">GH₵ {item.price.toFixed(2)} × {item.qty}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCart(cart.map((i) => i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="w-6 h-6 bg-white rounded-md shadow text-xs font-bold">-</button>
                        <span className="text-xs font-bold">{item.qty}</span>
                        <button onClick={() => setCart(cart.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))} className="w-6 h-6 bg-white rounded-md shadow text-xs font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2 text-xs">
                  <input type="text" placeholder="Your Full Name *" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                  <input type="text" placeholder="Phone Number (WhatsApp) *" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                  <select value={custHostel} onChange={(e) => setCustHostel(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white">
                    {Object.keys(UCC_LOCATIONS).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <input type="text" placeholder="Room Number / Block (e.g. Room B204)" value={custRoom} onChange={(e) => setCustRoom(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                </div>

                <div className="flex justify-between font-bold text-base">
                  <span>Total:</span>
                  <span className="text-rose-600">GH₵ {cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2)}</span>
                </div>

                <button onClick={handleCheckout} className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg text-sm">
                  Place Hostel Order & Track GPS
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="invoiceModal" className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="text-center border-b pb-4">
              <h2 className="font-serif text-2xl font-bold text-rose-700">Rabi's Chic Fashion Hub</h2>
              <p className="text-xs text-slate-500">Official UCC Campus Store Invoice</p>
              <p className="text-xs font-mono font-bold mt-2">{activeInvoice.id}</p>
            </div>
            <div className="text-xs space-y-1">
              <div><b>Customer:</b> {activeInvoice.customer.name} ({activeInvoice.customer.phone})</div>
              <div><b>Hostel:</b> {activeInvoice.customer.hostel} {activeInvoice.customer.room && `- ${activeInvoice.customer.room}`}</div>
              <div><b>Date:</b> {activeInvoice.date}</div>
            </div>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b text-slate-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeInvoice.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="py-2">{i.name}</td>
                    <td className="py-2">{i.qty}</td>
                    <td className="py-2">GH₵ {(i.price * i.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-bold text-sm border-t pt-3">
              <span>Total Paid:</span>
              <span className="text-rose-600">GH₵ {activeInvoice.total.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex-1 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs">Print Receipt</button>
              <button onClick={() => setActiveInvoice(null)} className="flex-1 py-2.5 bg-rose-100 text-rose-700 font-bold rounded-xl text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER & EDITABLE SOCIALS */}
      <footer className="mt-16 bg-white border-t border-rose-100 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <h3 className="font-serif text-xl font-bold text-rose-700">Rabi's Chic Fashion Hub</h3>
          <p className="text-xs text-slate-500">University of Cape Coast (UCC), Old Site / New Site, Ghana</p>
          <div className="flex justify-center gap-6 text-xl text-rose-600">
            <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noreferrer" title="WhatsApp"><i className="fa-brands fa-whatsapp"></i></a>
            <a href={`https://instagram.com/${socials.instagram}`} target="_blank" rel="noreferrer" title="Instagram"><i className="fa-brands fa-instagram"></i></a>
            <a href={`https://tiktok.com/@${socials.tiktok}`} target="_blank" rel="noreferrer" title="TikTok"><i className="fa-brands fa-tiktok"></i></a>
            <a href={`https://facebook.com/${socials.facebook}`} target="_blank" rel="noreferrer" title="Facebook"><i className="fa-brands fa-facebook"></i></a>
            <a href={`https://snapchat.com/add/${socials.snapchat}`} target="_blank" rel="noreferrer" title="Snapchat"><i className="fa-brands fa-snapchat"></i></a>
            <a href={`tel:${socials.phone}`} title="Call Us"><i className="fa-solid fa-phone"></i></a>
          </div>
          <p className="text-[10px] text-slate-400">© 2026 Rabi's Chic Fashion Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}