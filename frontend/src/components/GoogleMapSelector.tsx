import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression, LatLngLiteral } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GoogleMapSelectorProps {
  onLocationSelect: (location: string) => void;
  cityCounts?: { city: string; count: number }[];
  focusLocation?: string;
}

export type CityPoint = {
  label: string;
  lat: number;
  lng: number;
};

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const CONTACT_EMAIL = 'support@adoul.ma';

const MOROCCO_CENTER: LatLngExpression = [31.7917, -7.0926];
const MOROCCO_BOUNDS: LatLngBoundsExpression = [
  [23.5, -17.5],
  [36.3, -0.5],
];

export const CITY_POINTS: CityPoint[] = [
  { label: 'الرباط', lat: 34.020882, lng: -6.84165 },
  { label: 'الدار البيضاء', lat: 33.57311, lng: -7.58984 },
  { label: 'طنجة', lat: 35.759465, lng: -5.833954 },
  { label: 'شفشاون', lat: 35.1715, lng: -5.2697 },
  { label: 'تطوان', lat: 35.578449, lng: -5.362634 },
  { label: 'فاس', lat: 34.033333, lng: -5.0000 },
  { label: 'مكناس', lat: 33.8950, lng: -5.5547 },
  { label: 'مراكش', lat: 31.629472, lng: -7.981084 },
  { label: 'أكادير', lat: 30.427755, lng: -9.598107 },
  { label: 'وجدة', lat: 34.6810, lng: -1.9005 },
  { label: 'الصويرة', lat: 31.5085, lng: -9.7595 },
  { label: 'الناظور', lat: 35.16813, lng: -2.93352 },
  { label: 'العيون', lat: 27.125286, lng: -13.1625 },
  { label: 'الداخلة', lat: 23.684774, lng: -15.958237 },
  { label: 'كلميم', lat: 28.9888, lng: -10.0528 },
  { label: 'بني ملال', lat: 32.3373, lng: -6.3498 },
  { label: 'الرشيدية', lat: 31.9246, lng: -4.2272 },
  { label: 'القنيطرة', lat: 34.2684, lng: -6.5786 },
  { label: 'سلا', lat: 34.0331, lng: -6.7985 },
];

const CITY_POINT_LOOKUP = CITY_POINTS.reduce<Record<string, CityPoint>>((acc, city) => {
  acc[city.label] = city;
  return acc;
}, {});

const markerIcon = L.icon({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const createFocusedCityIcon = (city: string) =>
  L.divIcon({
    className: 'adoul-focused-city-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 4px rgba(15,45,98,.35));"><span style="white-space:nowrap;border:2px solid #fff;border-radius:999px;background:#7A0D1A;color:#fff;padding:5px 10px;font-size:12px;font-weight:700;line-height:1.2;">${city}</span><span style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:13px solid #7A0D1A;margin-top:-1px;"></span><span style="width:10px;height:10px;border:2px solid #fff;border-radius:999px;background:#E6BE8A;margin-top:-8px;"></span></div>`,
    iconSize: [130, 58],
    iconAnchor: [65, 52],
  });

const createCityCountIcon = (city: string, count: number) =>
  L.divIcon({
    className: 'adoul-city-count',
    html: `
      <div style="
        min-width:64px;
        padding:6px 10px;
        border-radius:999px;
        background:#0f2d62;
        color:#fff;
        text-align:center;
        font-size:11px;
        font-weight:600;
        box-shadow:0 4px 10px rgba(15,45,98,0.25);
      ">
        <div style="font-size:16px; font-weight:700; line-height:1;">${count}</div>
        <div style="line-height:1.2;">${city}</div>
      </div>
    `,
    iconSize: [70, 40],
    iconAnchor: [35, 20],
  });

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const haversineDistance = (a: LatLngLiteral, b: LatLngLiteral) => {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return R * c;
};

const findNearestCity = (coords: LatLngLiteral): CityPoint | null => {
  let closest: CityPoint | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  CITY_POINTS.forEach((city) => {
    const distance = haversineDistance(coords, city);
    if (distance < minDistance) {
      minDistance = distance;
      closest = city;
    }
  });

  return minDistance <= 250 ? closest : null;
};

const formatCoordinates = (coords: LatLngLiteral) => `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`;

const ClickHandler = ({ onSelect }: { onSelect: (coords: LatLngLiteral) => void }) => {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });
  return null;
};

const MapFocus = ({ point }: { point: CityPoint | undefined }) => {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], 14);
  }, [map, point]);
  return point ? <Marker position={[point.lat, point.lng]} icon={createFocusedCityIcon(point.label)} /> : null;
};

export const GoogleMapSelector: React.FC<GoogleMapSelectorProps> = ({ onLocationSelect, cityCounts, focusLocation }) => {
  const [selectedPosition, setSelectedPosition] = useState<LatLngLiteral | null>(null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const pendingRequestRef = useRef(0);

  const reverseGeocodeCity = useCallback(async (coords: LatLngLiteral): Promise<string | null> => {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: coords.lat.toString(),
        lon: coords.lng.toString(),
        'accept-language': 'ar',
        email: CONTACT_EMAIL,
      });
      const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const address = data.address ?? {};
      return (
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.state_district ||
        address.state ||
        address.county ||
        null
      );
    } catch (error) {
      console.error('Failed to resolve location name from coordinates', error);
      return null;
    }
  }, []);

  const handleSelection = useCallback(
    (coords: LatLngLiteral) => {
      setSelectedPosition(coords);
      const requestId = pendingRequestRef.current + 1;
      pendingRequestRef.current = requestId;
      setIsResolvingLocation(true);

      reverseGeocodeCity(coords).then((resolvedName) => {
        if (pendingRequestRef.current !== requestId) return;

        let locationLabel = resolvedName;
        if (!locationLabel) {
          const nearest = findNearestCity(coords);
          locationLabel = nearest?.label ?? formatCoordinates(coords);
        }

        setResolvedLabel(locationLabel);
        onLocationSelect(locationLabel);
        setIsResolvingLocation(false);
      });
    },
    [onLocationSelect, reverseGeocodeCity],
  );

  const cityCountMarkers = useMemo(() => {
    if (!cityCounts?.length) return null;

    return cityCounts.map((entry) => {
      const point = CITY_POINT_LOOKUP[entry.city];
      if (!point) return null;
      const position = { lat: point.lat, lng: point.lng };
      return (
        <Marker
          key={`city-count-${entry.city}`}
          position={position}
          icon={createCityCountIcon(entry.city, entry.count)}
          eventHandlers={{
            click: () => handleSelection(position),
          }}
        />
      );
    });
  }, [cityCounts, handleSelection]);
  const focusPoint = CITY_POINTS.find((city) => focusLocation?.includes(city.label));

  const cityShortcuts = useMemo(
    () =>
      CITY_POINTS.slice(0, 6).map((city) => (
        <button
          key={city.label}
          type="button"
          className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs text-[#0f2d62] transition hover:bg-white"
          onClick={() => handleSelection({ lat: city.lat, lng: city.lng })}
        >
          {city.label}
        </button>
      )),
    [handleSelection],
  );

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border border-[#e6dfcd] shadow-inner">
        <MapContainer
          center={MOROCCO_CENTER}
          zoom={5}
          minZoom={4}
          maxBounds={MOROCCO_BOUNDS}
          className="h-[320px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFocus point={focusPoint} />
          {cityCountMarkers}
          {selectedPosition && <Marker position={selectedPosition} icon={markerIcon} />}
          <ClickHandler onSelect={handleSelection} />
        </MapContainer>

        <div className="pointer-events-none absolute top-3 right-3 rounded-xl bg-white/90 px-4 py-2 text-xs font-semibold text-[#0f2d62] shadow-lg">
          اختر موقعك من خريطة المغرب
        </div>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">{cityShortcuts}</div>
      </div>

      <div className="text-sm font-semibold text-[#0f2d62]">
        {resolvedLabel
          ? `تم اختيار: ${resolvedLabel}`
          : selectedPosition
            ? `الإحداثيات: ${formatCoordinates(selectedPosition)}`
            : 'انقر على خريطة المغرب لتحديد المدينة أو استخدم الاختصارات السريعة.'}
        {isResolvingLocation && (
          <span className="ml-2 text-xs font-normal text-slate-500">جارٍ تحديد المدينة الدقيقة...</span>
        )}
      </div>
    </div>
  );
};
