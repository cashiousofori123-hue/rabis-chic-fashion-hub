import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bike, Phone, Radio, Signal, SignalZero } from 'lucide-react';
import api from '../api';
import 'leaflet/dist/leaflet.css';

const shopPoint = [5.1036, -1.2825];
const destinationPoint = [5.115, -1.288];
const bikeIcon = L.divIcon({
  className: 'courier-bike-marker',
  html: '<span aria-label="Courier bike">&#128757;</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

function FitRoute() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([shopPoint, destinationPoint], { padding: [36, 36] });
  }, [map]);
  return null;
}

export default function TrackOrder({ order, canShare = false }) {
  const [location, setLocation] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [riderPhoneNumber, setRiderPhoneNumber] = useState('');
  const socketRef = useRef(null);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!order?.id) return undefined;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const socketUrl = `${apiUrl.replace(/^http/, 'ws')}/ws/track/${encodeURIComponent(order.id)}`;
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    socket.onmessage = ({ data }) => {
      const update = JSON.parse(data);
      if (Number.isFinite(update.lat) && Number.isFinite(update.lng)) setLocation(update);
    };
    api.get(`/orders/${encodeURIComponent(order.id)}/live-location`)
      .then(({ data }) => {
        if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) setLocation(data);
      })
      .catch(() => {});
    return () => socket.close();
  }, [order?.id]);

  useEffect(() => () => {
    if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
  }, []);

  const toggleGpsSharing = () => {
    if (sharing) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setSharing(false);
      return;
    }
    if (!navigator.geolocation) {
      setGpsError('This device does not support GPS location.');
      return;
    }
    if (!canShare) {
      setGpsError('Sign in with a courier or admin account before sharing rider GPS.');
      return;
    }
    setGpsError('');
    watchRef.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        try {
          await api.post(`/orders/${encodeURIComponent(order.id)}/location`, {
            lat: coords.latitude,
            lng: coords.longitude,
            rider: 'Courier rider',
            phone: riderPhoneNumber,
          });
          setSharing(true);
        } catch (error) {
          setGpsError(error.response?.data?.detail || 'GPS updates require an admin account.');
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
          setSharing(false);
        }
      },
      (error) => setGpsError(error.message || 'Location permission was denied.'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  };

  const riderPoint = location ? [location.lat, location.lng] : shopPoint;
  const progress = Number(location?.progress || order?.progress || 0);
  const riderPhone = location?.phone;

  if (!order) {
    return <main className="max-w-3xl mx-auto px-4 py-12 text-center text-slate-600">Place an order to see its delivery tracking.</main>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-600">Order {order.id}</span>
          <h2 className="mt-1 font-serif text-2xl font-bold text-slate-900">Courier tracking</h2>
          <p className="text-sm text-slate-500">{order.hostel} · {order.room}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">{location?.status || order.status}</span>
      </div>
      {canShare && orders.length > 1 && <label className="block max-w-md text-xs font-bold text-slate-600">Dispatch order
        <select value={order.id} onChange={(event) => onOrderChange(orders.find((entry) => entry.id === event.target.value))} className="mt-1 block w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm">
          {orders.map((entry) => <option key={entry.id} value={entry.id}>{entry.id} · {entry.hostel} · {entry.status}</option>)}
        </select>
      </label>}

      <div className="relative h-[350px] overflow-hidden rounded-2xl border border-rose-100">
        <MapContainer center={shopPoint} zoom={14} className="h-full w-full" scrollWheelZoom>
          <FitRoute />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={[shopPoint, destinationPoint]} pathOptions={{ color: '#8d253e', weight: 5, dashArray: '10 9' }} />
          <Marker position={riderPoint} icon={bikeIcon} />
        </MapContainer>
      </div>

      <section className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <div className="border-y border-rose-100 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700"><Bike size={21} /></span>
            <div>
              <h3 className="font-bold text-slate-900">{location?.rider || 'Rider assigned on dispatch'}</h3>
              <p className="text-xs text-slate-500">Courier bike · ETA {location?.eta || order.eta || 'pending GPS'}</p>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-rose-100">
            <div className="h-full bg-rose-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <p className="mt-2 text-right text-xs font-semibold text-slate-500">{progress}% complete</p>
          {riderPhone && <div className="mt-4 flex gap-2">
            <a href={`tel:${riderPhone}`} aria-label="Call rider" className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white" title="Call rider"><Phone size={17} /></a>
            <a href={`https://wa.me/${riderPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp rider" className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white" title="WhatsApp rider">WA</a>
          </div>}
        </div>

        <div className="border-y border-rose-100 py-5">
          <div className="space-y-4 text-sm">
            <p className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Order received</p>
            <p className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> {order.status.includes('Transit') ? 'Rider dispatched' : 'Waiting for admin approval'}</p>
            <p className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${progress >= 100 ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Delivered to your location</p>
          </div>
          {canShare && <button onClick={toggleGpsSharing} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">
            {sharing ? <Signal size={16} /> : <SignalZero size={16} />}
            {sharing ? 'Stop sharing GPS' : 'Share this device GPS'}
          </button>}
          {canShare && <label className="mt-4 block max-w-xs text-xs font-bold text-slate-600">Rider phone for customer contact
            <input type="tel" value={riderPhoneNumber} onChange={(event) => setRiderPhoneNumber(event.target.value)} placeholder="+233..." className="mt-1 block w-full rounded-lg border border-rose-200 px-3 py-2" />
          </label>}
          {gpsError && <p role="alert" className="mt-2 text-xs text-rose-700">{gpsError}</p>}
          {!location && <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Radio size={14} /> Waiting for rider location. GPS permission and a secure HTTPS connection are required.</p>}
        </div>
      </section>
    </main>
  );
}