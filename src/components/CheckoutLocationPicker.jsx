import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickToChoose({ onChoose }) {
  useMapEvents({ click: event => onChoose([event.latlng.lat, event.latlng.lng]) });
  return null;
}

function KeepSelectionVisible({ position }) {
  const map = useMap();
  useEffect(() => { map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.5 }); }, [map, position[0], position[1]]);
  return null;
}

export default function CheckoutLocationPicker({ value, onSelect }) {
  const initial = [Number(value?.lat), Number(value?.lng)];
  const center = initial.every(Number.isFinite) ? initial : [5.1144, -1.2933];
  const [pin, setPin] = useState(center);
  useEffect(() => { setPin(center); }, [value?.lat, value?.lng]);
  const choose = async point => {
    setPin(point);
    let address = `${point[0].toFixed(5)}, ${point[1].toFixed(5)}`;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point[0]}&lon=${point[1]}`);
      const result = await response.json();
      address = result.display_name || address;
    } catch { /* Keep the coordinates as a usable delivery pin. */ }
    onSelect({ lat: point[0], lng: point[1], address, isCustom: true });
  };
  return <MapContainer center={center} zoom={16} className="h-52 w-full rounded-xl" scrollWheelZoom>
    <KeepSelectionVisible position={center} />
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <ClickToChoose onChoose={choose} />
    <Marker position={pin} />
  </MapContainer>;
}
