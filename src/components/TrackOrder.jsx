import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft, ArrowUpDown, Bike, Bookmark, Bus, CarFront, Check,
  Clock3, Fuel, Layers3, LocateFixed, MapPin, MoreVertical, Navigation,
  Plane, Plus, Share2, Signal, SignalZero, Footprints, X,
} from 'lucide-react';
import api from '../api';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SHOP_POINT = [5.1036, -1.2825];
const DEFAULT_DESTINATION = [5.115, -1.288];
const MAP_TILES = {
  street: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};
const WS_TIMEOUT_MS = 3000;

const blueDotIcon = L.divIcon({
  className: 'rabi-blue-dot',
  html: '<span style="display:block;width:22px;height:22px;border:3px solid white;border-radius:50%;background:#4285f4;box-shadow:0 1px 5px #33415599;position:relative"><i style="position:absolute;inset:-8px;border-radius:50%;background:#4285f433;animation:rabiPulse 1.8s ease-out infinite"></i></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const destinationIcon = L.divIcon({
  className: 'rabi-destination-pin',
  html: '<svg width="38" height="48" viewBox="0 0 38 48" aria-label="Destination"><path d="M19 1C9.1 1 1 9.1 1 19c0 13 18 28 18 28s18-15 18-28C37 9.1 28.9 1 19 1Z" fill="#ea4335" stroke="white" stroke-width="2"/><circle cx="19" cy="19" r="6" fill="white"/></svg>',
  iconSize: [38, 48],
  iconAnchor: [19, 46],
});

const riderIcon = L.divIcon({
  className: 'rabi-rider-marker',
  html: '<span style="display:flex;width:36px;height:36px;align-items:center;justify-content:center;border:2px solid white;border-radius:50%;background:#fff;box-shadow:0 2px 8px #0f172a55;font-size:20px">🛵</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const haversineKm = (a, b) => {
  const radians = Math.PI / 180;
  const dLat = (b[0] - a[0]) * radians;
  const dLng = (b[1] - a[1]) * radians;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * radians) * Math.cos(b[0] * radians) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

function FitMapOnce({ orderId, destination }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([SHOP_POINT, destination], { paddingTopLeft: [28, 140], paddingBottomRight: [28, 240], maxZoom: 15 });
  // Reframe for a new order or destination, not every rider GPS update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, orderId, destination[0], destination[1]]);
  return null;
}

function MapFocus({ position, mapType }) {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [map]);
  return (
    <div className="absolute right-3 top-20 z-[700] flex flex-col gap-2">
      <button type="button" aria-label="Switch map style" title="Map layers" onClick={mapType} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-lg">
        <Layers3 size={21} />
      </button>
      <button type="button" aria-label="Focus on your location" title="My location" onClick={() => position && map.flyTo(position, 16, { duration: 0.7 })} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#4285f4] shadow-lg">
        <LocateFixed size={23} />
      </button>
    </div>
  );
}

function AnimatedRider({ position }) {
  const markerRef = useRef(null);
  const previous = useRef(position);
  useEffect(() => {
    if (!position || !markerRef.current) return undefined;
    const from = previous.current || position;
    const to = position;
    const duration = 900;
    const start = performance.now();
    let frame;
    const animate = (now) => {
      const t = Math.min(1, (now - start) / duration);
      markerRef.current?.setLatLng([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
      if (t < 1) frame = requestAnimationFrame(animate);
      else previous.current = to;
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [position]);
  if (!position) return null;
  return <Marker ref={markerRef} position={position} icon={riderIcon} zIndexOffset={500} />;
}

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes)) return '—';
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours} hr${mins ? ` ${mins} min` : ''}`;
};

const modeTabs = [
  { id: 'drive', label: 'Drive', Icon: CarFront, speed: 30 },
  { id: 'bike', label: 'Bike', Icon: Bike, speed: 24 },
  { id: 'transit', label: 'Transit', Icon: Bus, speed: 22 },
  { id: 'walk', label: 'Walk', Icon: Footprints, speed: 5 },
  { id: 'flight', label: 'Flight', Icon: Plane, speed: 600 },
];

export default function TrackOrder({ order, orders = [], onOrderChange, canShare = false }) {
  const [location, setLocation] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [riderPhoneNumber, setRiderPhoneNumber] = useState('');
  const [connectionMode, setConnectionMode] = useState('connecting');
  const [destinationPoint, setDestinationPoint] = useState(DEFAULT_DESTINATION);
  const [destinationError, setDestinationError] = useState('');
  const [customerLocation, setCustomerLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeDurationMinutes, setRouteDurationMinutes] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [transportMode, setTransportMode] = useState('drive');
  const [mapStyle, setMapStyle] = useState('street');
  const [menuOpen, setMenuOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [stopText, setStopText] = useState('');
  const [saved, setSaved] = useState(false);
  const [routeReversed, setRouteReversed] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState('');
  const socketRef = useRef(null);
  const watchRef = useRef(null);
  const pollRef = useRef(null);
  const riderWatchRef = useRef(null);
  const lastRouteRef = useRef({ key: '', time: 0, start: null });

  const orderAddress = [order?.hostel, order?.room && `Room ${order.room}`, 'Cape Coast, Ghana'].filter(Boolean).join(', ') || 'Casely Hayford Hall (Casford)';
  const hasOrderDestination = order?.destinationLat != null && order?.destinationLng != null && Number.isFinite(Number(order.destinationLat)) && Number.isFinite(Number(order.destinationLng));
  const riderPoint = Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng)) ? [Number(location.lat), Number(location.lng)] : null;
  const routeStart = riderPoint || SHOP_POINT;
  const displayedLocation = customerLocation || riderPoint || SHOP_POINT;
  const destinationLabel = order?.hostel || 'Casely Hayford Hall (Casford)';
  const selectedMode = modeTabs.find(({ id }) => id === transportMode) || modeTabs[0];
  const distanceKm = routeDistanceKm ?? (location?.distanceKm != null ? Number(location.distanceKm) : haversineKm(routeStart, destinationPoint));
  const etaMinutes = routeDurationMinutes != null
    ? Math.max(1, Math.round(routeDurationMinutes * (modeTabs[0].speed / selectedMode.speed)))
    : Math.max(1, Math.round((distanceKm / selectedMode.speed) * 60));
  const arrivalTime = new Intl.DateTimeFormat('en-GH', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Accra' }).format(Date.now() + etaMinutes * 60000);
  const routeLine = useMemo(() => routeReversed ? [...routeCoordinates].reverse() : routeCoordinates, [routeCoordinates, routeReversed]);

  const applyUpdate = useCallback((data) => {
    if (Number.isFinite(Number(data.destinationLat)) && Number.isFinite(Number(data.destinationLng))) {
      setDestinationPoint([Number(data.destinationLat), Number(data.destinationLng)]);
    }
    if (Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) setLocation(data);
  }, []);

  useEffect(() => {
    setLocation(null);
    setConnectionMode('connecting');
    if (hasOrderDestination) setDestinationPoint([Number(order.destinationLat), Number(order.destinationLng)]);
    else setDestinationPoint(DEFAULT_DESTINATION);
    setGeocodedAddress('');
    setDestinationError('');
  }, [order?.id, order?.destinationLat, order?.destinationLng, hasOrderDestination]);

  useEffect(() => {
    if (!order?.id || hasOrderDestination || !orderAddress) return undefined;
    const controller = new AbortController();
    const address = orderAddress;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
        const results = await response.json();
        if (results[0]) {
          setDestinationPoint([Number(results[0].lat), Number(results[0].lon)]);
          setGeocodedAddress(results[0].display_name || address);
        }
      } catch { /* Keep the UCC delivery location fallback if address lookup is unavailable. */ }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [order?.id, hasOrderDestination, orderAddress]);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    navigator.geolocation.getCurrentPosition(({ coords }) => setCustomerLocation([coords.latitude, coords.longitude]), () => {}, { enableHighAccuracy: true, maximumAge: 30000, timeout: 12000 });
    riderWatchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => setCustomerLocation([coords.latitude, coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => { if (riderWatchRef.current != null) navigator.geolocation.clearWatch(riderWatchRef.current); };
  }, []);

  useEffect(() => {
    if (!order?.id) return undefined;
    let active = true;
    let pollingStarted = false;
    let wsOpened = false;
    let fallbackTimer;
    const orderPath = `/orders/${encodeURIComponent(order.id)}/live-location`;
    const cleanupConnection = () => {
      if (socketRef.current) { socketRef.current.onclose = null; socketRef.current.close(); socketRef.current = null; }
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
    const refresh = () => api.get(orderPath).then(({ data }) => { if (active) applyUpdate(data); }).catch(() => {});
    const startPolling = () => {
      if (!active || pollingStarted) return;
      pollingStarted = true;
      setConnectionMode('polling');
      cleanupConnection();
      refresh();
      pollRef.current = window.setInterval(refresh, 3000);
    };
    refresh();
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000');
    const wsPath = import.meta.env.PROD ? '/api' : '';
    const socketUrl = `${apiBase.replace(/^http/, 'ws')}${wsPath}/ws/track/${encodeURIComponent(order.id)}`;
    try {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;
      fallbackTimer = window.setTimeout(() => { if (!wsOpened) startPolling(); }, WS_TIMEOUT_MS);
      socket.onopen = () => { wsOpened = true; window.clearTimeout(fallbackTimer); setConnectionMode('ws'); };
      socket.onmessage = ({ data }) => { try { applyUpdate(JSON.parse(data)); } catch { /* Ignore invalid update payloads. */ } };
      socket.onerror = () => { window.clearTimeout(fallbackTimer); startPolling(); };
      socket.onclose = () => { if (wsOpened) startPolling(); else if (!pollingStarted) startPolling(); };
    } catch { startPolling(); }
    return () => { active = false; window.clearTimeout(fallbackTimer); cleanupConnection(); };
  }, [order?.id, applyUpdate]);

  useEffect(() => () => { if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current); }, []);

  useEffect(() => {
    if (!order?.id || !destinationPoint) return undefined;
    const start = routeStart;
    const destination = destinationPoint;
    const key = `${order.id}:${destination.join(',')}`;
    const last = lastRouteRef.current;
    const movedKm = last.start ? haversineKm(last.start, start) : Infinity;
    if (last.key === key && Date.now() - last.time < 18000 && movedKm < 0.25) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRouteLoading(true);
      try {
        const coords = `${start[1]},${start[0]};${destination[1]},${destination[0]}`;
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`, { signal: controller.signal });
        const data = await response.json();
        const route = data.routes?.[0];
        if (route) {
          setRouteCoordinates(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
          setRouteDistanceKm(route.distance / 1000);
          setRouteDurationMinutes(route.duration / 60);
          lastRouteRef.current = { key, time: Date.now(), start };
        } else throw new Error('No road route');
      } catch {
        if (!controller.signal.aborted) {
          setRouteCoordinates([start, destination]);
          setRouteDistanceKm(haversineKm(start, destination));
          setRouteDurationMinutes(null);
          lastRouteRef.current = { key, time: Date.now(), start };
        }
      } finally {
        if (!controller.signal.aborted) setRouteLoading(false);
      }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [order?.id, routeStart[0], routeStart[1], destinationPoint[0], destinationPoint[1]]);

  const shareDeliveryLocation = () => {
    if (!navigator.geolocation) { setDestinationError('This device does not support GPS location.'); return; }
    if (!order?.phone) { setDestinationError('The phone number used for this order is required to share a location.'); return; }
    setDestinationError('Requesting your GPS location…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const { data } = await api.post(`/orders/${encodeURIComponent(order.id)}/destination`, { lat: coords.latitude, lng: coords.longitude, phone: order.phone });
        setDestinationPoint([data.destinationLat, data.destinationLng]);
        setDestinationError('Your delivery location is shared. The courier route and arrival time will update as GPS changes.');
      } catch (error) { setDestinationError(error.response?.data?.detail || 'Could not save your delivery location. Please try again.'); }
    }, (error) => setDestinationError(error.message || 'Location permission was denied.'), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  };

  const toggleGpsSharing = () => {
    if (sharing) {
      navigator.geolocation?.clearWatch(watchRef.current);
      watchRef.current = null;
      setSharing(false);
      return;
    }
    if (!navigator.geolocation) { setGpsError('This device does not support GPS location.'); return; }
    if (!canShare) { setGpsError('Sign in with a courier or admin account before sharing rider GPS.'); return; }
    setGpsError('');
    watchRef.current = navigator.geolocation.watchPosition(async ({ coords }) => {
      try {
        await api.post(`/orders/${encodeURIComponent(order.id)}/location`, { lat: coords.latitude, lng: coords.longitude, rider: 'Courier rider', phone: riderPhoneNumber });
        setSharing(true);
      } catch (error) {
        setGpsError(error.response?.data?.detail || 'GPS updates require an admin account.');
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
        setSharing(false);
      }
    }, (error) => setGpsError(error.message || 'Location permission was denied.'), { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign('/');
  };
  const startNavigation = () => {
    const origin = routeStart.join(',');
    const destination = destinationPoint.join(',');
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${transportMode === 'walk' ? 'walking' : transportMode === 'bike' ? 'bicycling' : 'driving'}`, '_blank', 'noopener,noreferrer');
  };

  if (!order) return <main className="grid h-screen place-items-center bg-[#f3f6fc] px-6 text-center text-slate-600">Place or select an order to see its delivery map.</main>;

  const delivered = order.status?.toLowerCase().includes('delivered') || location?.status === 'Delivered' || Number(location?.progress) >= 100;
  const progress = Math.min(100, Math.max(0, Number(location?.progress ?? order?.progress ?? 0)));
  const statusText = connectionMode === 'ws' ? 'Live GPS' : connectionMode === 'polling' ? 'Polling location' : 'Connecting to courier';

  return (
    <main className="relative h-[100dvh] min-h-[560px] w-screen overflow-hidden bg-[#e9edf2] text-slate-800">
      <style>{`@keyframes rabiPulse{0%{transform:scale(.45);opacity:.85}100%{transform:scale(1.55);opacity:0}}.rabi-blue-dot,.rabi-destination-pin,.rabi-rider-marker{background:transparent;border:0}`}</style>
      <div className="absolute inset-0">
        <MapContainer center={SHOP_POINT} zoom={14} className="h-full w-full" zoomControl={false} scrollWheelZoom>
          <FitMapOnce orderId={order.id} destination={destinationPoint} />
          <MapFocus position={customerLocation || riderPoint} mapType={() => setMapStyle(current => current === 'street' ? 'light' : 'street')} />
          <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url={MAP_TILES[mapStyle]} subdomains="abcd" />
          {routeLine.length > 1
            ? <Polyline positions={routeLine} pathOptions={{ color: '#4285f4', weight: 7, opacity: 0.92, lineCap: 'round', lineJoin: 'round' }} />
            : <Polyline positions={[routeStart, destinationPoint]} pathOptions={{ color: '#4285f4', weight: 6, opacity: 0.9, dashArray: '10 10' }} />}
          {!riderPoint && <Marker position={SHOP_POINT} icon={L.divIcon({ className: 'rabi-shop-marker', html: '<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border:2px solid white;border-radius:50%;background:#1a73e8;color:white;font-size:17px;box-shadow:0 2px 8px #0f172a55">⌂</span>', iconSize: [34, 34], iconAnchor: [17, 17] })} />}
          {customerLocation && <Marker position={customerLocation} icon={blueDotIcon} zIndexOffset={800} />}
          {riderPoint && <AnimatedRider position={riderPoint} />}
          <Marker position={destinationPoint} icon={destinationIcon} zIndexOffset={600} />
        </MapContainer>
      </div>

      <button type="button" aria-label="Back" onClick={goBack} className="absolute left-3 top-4 z-[800] flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg">
        <ArrowLeft size={21} />
      </button>

      <section className="absolute left-[60px] right-3 top-3 z-[800] mx-auto max-w-md rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.15)]">
        <div className="relative flex min-h-10 items-center gap-3 pr-8">
          <span className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[#4285f4] bg-white"><span className="h-1.5 w-1.5 rounded-full bg-[#4285f4]" /></span>
          <div className="min-w-0 flex-1"><p className="text-[10px] leading-3 text-slate-400">From</p><p className="truncate text-sm font-medium text-[#1a73e8]">{customerLocation ? 'Your location' : riderPoint ? 'Courier live location' : 'Rabi’s Chic · Cape Coast'}</p></div>
          <button type="button" aria-label="Swap route points" onClick={() => setRouteReversed(value => !value)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><ArrowUpDown size={17} /></button>
          <button type="button" aria-label="More tracking options" onClick={() => setMenuOpen(value => !value)} className="absolute right-0 top-1 rounded-full p-1 text-slate-500 hover:bg-slate-100"><MoreVertical size={19} /></button>
        </div>
        <div className="ml-[7px] h-3 border-l-2 border-dotted border-slate-300" />
        <div className="flex min-h-10 items-center gap-3">
          <MapPin size={19} className="shrink-0 fill-[#ea4335] text-[#ea4335]" />
          <div className="min-w-0 flex-1"><p className="text-[10px] leading-3 text-slate-400">Destination</p><p className="truncate text-sm font-medium text-slate-800">{destinationLabel}</p></div>
          <span className="mr-1 max-w-[95px] truncate text-[10px] text-slate-400">{geocodedAddress ? 'Address found' : order.room ? `Room ${order.room}` : ''}</span>
        </div>
        {menuOpen && <div className="absolute right-3 top-12 z-[900] w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
          {canShare && orders.length > 1 && <label className="block px-2 py-2 text-xs font-semibold text-slate-500">Select delivery
            <select value={order.id} onChange={event => { onOrderChange?.(orders.find(entry => entry.id === event.target.value)); setMenuOpen(false); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800">
              {orders.map(entry => <option key={entry.id} value={entry.id}>{entry.id} · {entry.hostel}</option>)}
            </select>
          </label>}
          <button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); setMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Copy tracking link</button>
        </div>}
      </section>

      {delivered && <div className="absolute left-1/2 top-[150px] z-[750] -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg">✓ Delivered to {destinationLabel}</div>}

      <section className="absolute bottom-0 left-0 right-0 z-[800] max-h-[52dvh] overflow-y-auto rounded-t-[24px] bg-white shadow-[0_-6px_28px_rgba(15,23,42,0.2)]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300" />
        <div className="mx-auto max-w-2xl px-4 pb-5 pt-2">
          <header className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="text-xl font-semibold text-slate-900">{transportMode === 'drive' ? 'Drive' : selectedMode.label}</p><p className="mt-0.5 truncate text-xs text-slate-500">Order {order.id} · {destinationLabel}</p></div>
            <button type="button" aria-label="Share tracking" onClick={() => navigator.share?.({ title: 'Rabi’s Chic delivery', url: window.location.href })} className="rounded-full p-2.5 text-slate-600 hover:bg-slate-100"><Share2 size={19} /></button>
            <button type="button" aria-label="Close tracking" onClick={goBack} className="rounded-full p-2.5 text-slate-600 hover:bg-slate-100"><X size={20} /></button>
          </header>

          <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2">
            {modeTabs.map(({ id, label, Icon, speed }) => {
              const active = transportMode === id;
              const minutes = Math.max(1, Math.round((distanceKm / speed) * 60));
              return <button key={id} type="button" onClick={() => setTransportMode(id)} className={`flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 ${active ? 'text-[#1a73e8]' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Icon size={20} /><span className="text-[11px] font-semibold">{label}</span><span className="text-[10px]">{formatDuration(minutes)}</span>
              </button>;
            })}
          </nav>

          <div className="my-3 flex items-center justify-between gap-3 rounded-xl bg-[#f1f6fd] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-emerald-600"><Fuel size={19} /></span><span className="min-w-0"><strong className="block text-xs text-slate-800">New! Save fuel on your trip</strong><span className="block truncate text-[10px] text-slate-500">Choose an efficient route for your delivery</span></span></div>
            <button type="button" className="shrink-0 rounded-full bg-white px-3 py-2 text-[10px] font-bold text-[#1a73e8] shadow-sm">Choose engine</button>
          </div>

          <div className="flex items-start gap-3 py-1">
            <div className="min-w-0 flex-1"><p className="text-[30px] font-semibold leading-9 tracking-tight text-[#188038]">{delivered ? 'Delivered' : formatDuration(etaMinutes).replace(' hr', 'h').replace(' min', 'm')}</p>
              <p className="mt-0.5 text-xs text-slate-600">{delivered ? `Delivered to ${destinationLabel}` : `Arrive ${arrivalTime} GMT · ${routeLoading ? 'Finding the best route…' : 'Fastest route based on current road distance'}`}</p>
              <p className="mt-1 text-[11px] text-slate-500">{distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`} · {routeCoordinates.length ? 'Road route' : 'Estimated route'} · {progress}% courier progress</p>
            </div>
            <div className="mt-1 rounded-xl bg-emerald-50 px-3 py-2 text-right"><span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800"><span className={`h-2 w-2 rounded-full ${connectionMode === 'ws' ? 'animate-pulse bg-emerald-500' : connectionMode === 'polling' ? 'bg-amber-500' : 'bg-slate-400'}`} />{statusText}</span><span className="mt-1 block text-[10px] text-emerald-700">{location?.eta || order.eta || 'ETA updates with GPS'}</span></div>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={startNavigation} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1765cc]"><Navigation size={17} fill="white" /> Start</button>
            <button type="button" onClick={() => setStopOpen(value => !value)} className="flex items-center justify-center gap-1.5 rounded-full bg-[#e8f0fe] px-4 py-3 text-xs font-bold text-[#1967d2]"><Plus size={16} /> Add stops</button>
            <button type="button" onClick={() => setSaved(value => !value)} className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-3 text-xs font-bold ${saved ? 'bg-emerald-100 text-emerald-800' : 'bg-[#e8f0fe] text-[#1967d2]'}`}>{saved ? <Check size={16} /> : <Bookmark size={16} />} {saved ? 'Saved' : 'Save'}</button>
          </div>
          {stopOpen && <div className="mt-3 flex gap-2"><input value={stopText} onChange={event => setStopText(event.target.value)} placeholder="Add a stop along the way" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" /><button type="button" onClick={() => { setDestinationError(stopText ? `Stop noted: ${stopText}` : 'Enter a stop first.'); setStopOpen(false); }} className="rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">Add</button></div>}

          {(destinationError || gpsError) && <p role="status" className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">{destinationError || gpsError}</p>}
          {canShare ? <button type="button" onClick={toggleGpsSharing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700"><span className={`h-2 w-2 rounded-full ${sharing ? 'bg-emerald-500' : 'bg-slate-300'}`} />{sharing ? <Signal size={15} /> : <SignalZero size={15} />}{sharing ? 'Stop sharing courier GPS' : 'Share courier GPS'}</button>
            : <button type="button" onClick={shareDeliveryLocation} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700"><LocateFixed size={15} />Share delivery address with courier</button>}
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400"><span>{orderAddress}</span><span className="inline-flex items-center gap-1"><Clock3 size={12} /> Updated live</span></div>
        </div>
      </section>
    </main>
  );
}
