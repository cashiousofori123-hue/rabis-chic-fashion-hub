import React, { useEffect, useState, useRef } from 'react';

export default function DeliveryTracker() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const routeLineRef = useRef(null);

  // Customer & Product State
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryHostel, setDeliveryHostel] = useState('Casely Hayford Hall');
  const [roomNumber, setRoomNumber] = useState(''); // Specific Room Number / Exact Location

  // Order Flow: 'idle' -> 'submitted' -> 'approved'
  const [orderStatus, setOrderStatus] = useState('idle');
  const [transportMode, setTransportMode] = useState('car'); // 'car' or 'walking'

  // Telemetry from Python Backend
  const [telemetry, setTelemetry] = useState({
    distance_km: 1.2,
    eta_mins: 4,
    speed_kmh: 35,
    status: 'Waiting for Admin Approval'
  });

  const storeHQ = [5.1036, -1.2825]; // UCC Store HQ
  const destCoords = [5.1150, -1.2880];

  // Preset Catalog Items
  const presetProducts = [
    { name: "Chic Floral Summer Mini Dress", price: "GH₵ 25" },
    { name: "Luxury Lip Mask", price: "GH₵ 80" },
    { name: "Designer Campus Sandals", price: "GH₵ 250" },
    { name: "Silk Hair Scrunchies (Pack of 3)", price: "GH₵ 45" },
    { name: "Official Tailored Blazer Set", price: "GH₵ 450" }
  ];

  const handleSelectPreset = (e) => {
    const selected = e.target.value;
    if (selected) {
      setProductName(selected);
    }
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (!productName || !customerName || !roomNumber) {
      return alert("Please enter the product name, your full name, and your specific room number / location.");
    }
    setOrderStatus('submitted');
  };

  const handleAdminApprove = () => {
    setOrderStatus('approved');
    setTelemetry(prev => ({ ...prev, status: 'Admin Approved - Live GPS Active' }));
  };

  // Map Initialization on Approval
  useEffect(() => {
    if (orderStatus !== 'approved') return;

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current).setView(storeHQ, 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance.current);

        L.marker(storeHQ).addTo(mapInstance.current).bindPopup("<b>Rabi's Chic Store HQ</b>");

        const customIcon = L.divIcon({
          html: `<div style="background:#e11d48; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(0,0,0,0.3); border:2px solid white;">
                  <i class="fa-solid ${transportMode === 'car' ? 'fa-car' : 'fa-person-walking'}"></i>
                 </div>`,
          className: 'driver-marker-icon',
          iconSize: [36, 36]
        });

        markerRef.current = L.marker(storeHQ, { icon: customIcon }).addTo(mapInstance.current);

        routeLineRef.current = L.polyline([storeHQ, destCoords], {
          color: transportMode === 'car' ? '#e11d48' : '#2563eb',
          weight: 5,
          dashArray: transportMode === 'walking' ? '8, 8' : 'none'
        }).addTo(mapInstance.current);
      } else {
        mapInstance.current.invalidateSize();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [orderStatus, transportMode]);

  // Python Backend Connection
  useEffect(() => {
    if (orderStatus !== 'approved') return;

    const fetchPythonTelemetry = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/route?mode=${transportMode}`);
        const data = await response.json();

        setTelemetry({
          distance_km: data.distance_km,
          eta_mins: data.eta_mins,
          speed_kmh: data.speed_kmh,
          status: 'In Transit to Room'
        });

        if (data.current_coords && markerRef.current) {
          markerRef.current.setLatLng(data.current_coords);
          mapInstance.current.panTo(data.current_coords);
        }
      } catch (err) {
        setTelemetry(prev => ({ ...prev, status: 'Active (Python Backend Server)' }));
      }
    };

    fetchPythonTelemetry();
    const interval = setInterval(fetchPythonTelemetry, 3000);
    return () => clearInterval(interval);
  }, [orderStatus, transportMode]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl border border-rose-100 max-w-5xl mx-auto my-6 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-rose-100 pb-4 mb-6 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-500">UCC Campus Store Order</span>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Place UCC Hostel Order & Calculate Invoice</h2>
        </div>

        {/* Call Admin Button */}
        <a 
          href="tel:+233000000000" 
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
        >
          <i className="fa-solid fa-phone"></i> Call Admin for Clarification
        </a>
      </div>

      {/* STAGE 1: ORDER FORM (SELECT OR TYPE + ROOM NUMBER) */}
      {orderStatus === 'idle' && (
        <form onSubmit={handleSubmitOrder} className="space-y-5">
          
          {/* PRODUCT SELECTION & CUSTOM TYPING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-rose-50/40 p-4 rounded-xl border border-rose-100">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Select Catalog Product (Optional Preset)</label>
              <select onChange={handleSelectPreset} className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-400">
                <option value="">-- Choose from Store Catalog --</option>
                {presetProducts.map((p, idx) => (
                  <option key={idx} value={p.name}>{p.name} - {p.price}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1">OR Type Product Name / Item You Want</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Lip Mask, Custom Dress, Sandals..."
                required
                className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-400 font-semibold"
              />
            </div>
          </div>

          {/* CUSTOMER DETAILS & ROOM NUMBER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Your Full Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Abena Osei"
                required
                className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 024XXXXXXX"
                required
                className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Delivery Hostel / Hall</label>
              <select value={deliveryHostel} onChange={(e) => setDeliveryHostel(e.target.value)} className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-400 font-semibold">
                <option value="Casely Hayford Hall">Casely Hayford Hall</option>
                <option value="Adehye Hall">Adehye Hall</option>
                <option value="Valco Hall">Valco Hall</option>
                <option value="KWAME NKRUMAH Hall">Kwame Nkrumah Hall</option>
                <option value="Superannuation Hostel">Superannuation Hostel</option>
              </select>
            </div>
          </div>

          {/* ROOM NUMBER / EXACT LOCATION FIELD */}
          <div>
            <label className="text-xs font-bold uppercase text-rose-600 block mb-1">Specific Room Number / Exact Location Details *</label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. Room 204, Block B, Floor 2"
              required
              className="w-full bg-white border-2 border-rose-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-500 font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Product Description / Special Instructions</label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Provide color, size, or special handling notes..."
              rows="2"
              className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-rose-400"
            ></textarea>
          </div>

          <button type="submit" className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition">
            Proceed to Order & Send to Admin Radar
          </button>
        </form>
      )}

      {/* STAGE 2: RADAR WAITING SCREEN FOR CUSTOMER */}
      {orderStatus === 'submitted' && (
        <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">
            <i className="fa-solid fa-radar animate-spin"></i>
          </div>
          <h3 className="text-xl font-serif font-bold text-slate-800">Order Sent to Admin Radar!</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Order for <strong className="text-slate-800">{productName}</strong> by <strong className="text-slate-800">{customerName}</strong> (<span className="text-rose-600 font-bold">{deliveryHostel}, {roomNumber}</span>) is waiting for store admin approval.
          </p>

          <div className="p-4 bg-white rounded-xl border border-amber-200 inline-block text-left text-xs text-slate-700 shadow-sm space-y-1">
            <p><strong>Product:</strong> {productName}</p>
            <p><strong>Customer:</strong> {customerName} ({phone})</p>
            <p><strong>Exact Room Location:</strong> {deliveryHostel} - {roomNumber}</p>
            <p><strong>Status:</strong> <span className="text-amber-600 font-bold">Waiting for Admin Approval</span></p>
          </div>

          <div className="pt-2">
            <a href="tel:+233000000000" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-700 transition">
              <i className="fa-solid fa-phone"></i> Call Admin for Clarification
            </a>
          </div>

          {/* SIMULATED ADMIN PORTAL APPROVAL BUTTON */}
          <div className="mt-6 pt-6 border-t border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">[ Admin Portal Control ]</span>
            <button onClick={handleAdminApprove} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 mx-auto">
              <i className="fa-solid fa-satellite-dish"></i> Admin: Approve Order & Start Live GPS
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: LIVE MAP & GPS TRACKING */}
      {orderStatus === 'approved' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center bg-rose-50/50 p-4 rounded-xl border border-rose-200 gap-4">
            <div>
              <h4 className="font-serif font-bold text-slate-800">{productName}</h4>
              <p className="text-xs text-slate-600">Delivering to: <span className="font-bold text-rose-600">{deliveryHostel}, {roomNumber}</span></p>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-rose-200 shadow-sm">
              <button onClick={() => setTransportMode('car')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${transportMode === 'car' ? 'bg-rose-500 text-white shadow' : 'text-slate-600'}`}>
                <i className="fa-solid fa-car"></i> Delivery Car
              </button>
              <button onClick={() => setTransportMode('walking')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${transportMode === 'walking' ? 'bg-blue-600 text-white shadow' : 'text-slate-600'}`}>
                <i className="fa-solid fa-person-walking"></i> Campus Walking
              </button>
            </div>
          </div>

          {/* Telemetry Display */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Est. Time</span>
              <span className="text-base font-bold text-rose-600">{telemetry.eta_mins} mins</span>
            </div>
            <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Distance</span>
              <span className="text-base font-bold text-slate-800">{telemetry.distance_km} km</span>
            </div>
            <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Telemetry Status</span>
              <span className="text-xs font-bold text-emerald-600">{telemetry.status}</span>
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="relative rounded-xl overflow-hidden border border-rose-200 shadow-inner">
            <div ref={mapRef} style={{ height: '420px', width: '100%' }}></div>
          </div>

          <button onClick={() => setOrderStatus('idle')} className="text-xs text-rose-500 hover:underline block mx-auto font-semibold">
            ← Reset & Place Another Order
          </button>
        </div>
      )}

    </div>
  );
}