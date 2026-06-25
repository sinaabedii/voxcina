"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Search, MapPin, Loader2, Crosshair, X } from "lucide-react";
import { MapComponent, MapTypes } from "@neshan-maps-platform/mapbox-gl-react";
import "@neshan-maps-platform/mapbox-gl-react/dist/style.css";
import nmp_mapboxgl, { Marker as NeshanMarker } from "@neshan-maps-platform/mapbox-gl";
import { cn } from "@/lib/utils";

interface MapPickerProps {
  location: { lat: number; lng: number };
  onChange: (location: { lat: number; lng: number }) => void;
  onAddressResolved?: (address: string) => void;
}

const DEFAULT_CENTER = { lat: 35.6892, lng: 51.389 }; // Tehran
const DEFAULT_ZOOM = 11;
const EXTERNAL_ZOOM = 13; // city selection / existing address
const PICKED_ZOOM = 16;   // user click / drag for precise selection

interface SearchResult {
  title: string;
  address: string;
  location: { x: number; y: number };
}

const MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_API_KEY;

const MapPicker: React.FC<MapPickerProps> = ({ location, onChange, onAddressResolved }) => {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<InstanceType<typeof NeshanMarker> | null>(null);
  const onAddressResolvedRef = useRef(onAddressResolved);
  onAddressResolvedRef.current = onAddressResolved;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const reverseGeocodeRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const placeMarkerRef = useRef<((lat: number, lng: number, flyTo?: boolean) => void) | null>(null);
  const isInternalChangeRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isDefaultLocation = location.lat === 0 && location.lng === 0;
  const center = isDefaultLocation ? DEFAULT_CENTER : location;
  const zoom = isDefaultLocation ? DEFAULT_ZOOM : EXTERNAL_ZOOM;

  const handleMapReady = useCallback((map: any) => {
    mapRef.current = map;
    map.addControl(new nmp_mapboxgl.NavigationControl({ showCompass: false }), "top-left");
    setMounted(true);
  }, []);

  const onResolvedAddress = useCallback(
    (address: string) => {
      setResolvedAddress(address);
      onAddressResolvedRef.current?.(address);
    },
    []
  );

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setResolvingAddress(true);
    try {
      const res = await fetch(
        `/api/neshan/reverse?lat=${lat}&lng=${lng}`
      );
      if (!res.ok) throw new Error("reverse geocode failed");
      const data = await res.json();
      const addr = data.formatted_address || data.address || data.formattedAddress || "";
      onResolvedAddress(addr);
    } catch {
      onResolvedAddress("");
    } finally {
      setResolvingAddress(false);
    }
  }, [onResolvedAddress]);
  reverseGeocodeRef.current = reverseGeocode;

  const placeMarker = useCallback(
    (lat: number, lng: number, flyTo = true) => {
      const map = mapRef.current;
      if (!map) return;

      markerRef.current?.remove();
      markerRef.current = null;

      const el = document.createElement("div");
      el.className = "voxcina-marker";
      el.style.cssText = `
        width: 28px;
        height: 28px;
        background: #1A3C69;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const marker = new nmp_mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map as unknown as mapboxgl.Map);
      marker.on("dragend", () => {
        const { lng: dLng, lat: dLat } = marker.getLngLat();
        isInternalChangeRef.current = true;
        onChangeRef.current({ lat: dLat, lng: dLng });
        reverseGeocodeRef.current?.(dLat, dLng);
      });
      markerRef.current = marker;

      if (flyTo) {
        map.flyTo({ center: [lng, lat], zoom: PICKED_ZOOM, duration: 800 });
      }
    },
    []
  );
  placeMarkerRef.current = placeMarker;

  useEffect(() => {
    if (!mounted) return;
    placeMarkerRef.current?.(center.lat, center.lng, false);
    if (!isDefaultLocation) {
      reverseGeocodeRef.current?.(center.lat, center.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mounted) return;
    const onClick = (e: { lngLat: { lat: number; lng: number } }) => {
      const { lat, lng } = e.lngLat;
      isInternalChangeRef.current = true;
      onChangeRef.current({ lat, lng });
      placeMarkerRef.current?.(lat, lng, false);
      reverseGeocodeRef.current?.(lat, lng);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [center.lng, center.lat], zoom: EXTERNAL_ZOOM, duration: 800 });
    placeMarkerRef.current?.(center.lat, center.lng, false);
    reverseGeocodeRef.current?.(center.lat, center.lng);
  }, [mounted, center.lat, center.lng]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  const searchAddress = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/neshan/geocode?address=${encodeURIComponent(term)}`
        );
        if (!res.ok) throw new Error("geocode failed");
        const data = await res.json();
        if (data.location) {
          setSearchResults([
            {
              title: term,
              address: "",
              location: { x: data.location.x, y: data.location.y },
            },
          ]);
          setShowResults(true);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchAddress(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm, searchAddress]);

  const pickResult = (r: SearchResult) => {
    const lat = r.location.y;
    const lng = r.location.x;
    onChangeRef.current({ lat, lng });
    onAddressResolvedRef.current?.(r.address || r.title);
    setSearchTerm("");
    setShowResults(false);
    setSearchResults([]);
    placeMarkerRef.current?.(lat, lng, true);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChangeRef.current({ lat, lng });
        placeMarkerRef.current?.(lat, lng, true);
        reverseGeocodeRef.current?.(lat, lng);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("دسترسی به موقعیت مکانی رد شد. لطفاً از نوار آدرس اجازه دهید.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError("موقعیت مکانی در دسترس نیست (معمولاً در کامپیوترهای بدون GPS رخ می‌دهد).");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("دریافت موقعیت مکانی زمان‌بر شد. لطفاً روی نقشه کلیک کنید.");
        } else {
          setLocationError("خطا در دریافت موقعیت مکانی. لطفاً روی نقشه کلیک کنید.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!MAP_KEY) {
    return (
      <div className="w-full h-64 rounded-xl border border-dashed border-red-300 bg-red-50 dark:bg-red-900/20 flex items-center justify-center p-4 text-center text-sm text-red-700 dark:text-red-300">
        کلید API نقشه نشان تنظیم نشده است. لطفاً NEXT_PUBLIC_NESHAN_API_KEY را به .env اضافه کنید.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-voxcina-blue/50 dark:text-voxcina-cream/50 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="جستجوی آدرس (مثلاً: پاسداران، تهران)"
              className="w-full h-10 pr-9 pl-3 rounded-xl border border-secondary-200 dark:border-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30"
            />
            {searching && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-voxcina-blue/50 animate-spin" />
            )}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-20 top-full mt-1 inset-x-0 max-h-60 overflow-y-auto rounded-xl border border-secondary-200 dark:border-voxcina-blue/30 bg-white dark:bg-voxcina-blue/95 shadow-lg">
                {searchResults.map((r, idx) => (
                  <button
                    key={`${r.location.x}-${r.location.y}-${idx}`}
                    type="button"
                    onClick={() => pickResult(r)}
                    className="w-full text-right px-3 py-2 hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 border-b border-secondary-100 dark:border-voxcina-blue/20 last:border-b-0 transition-colors"
                  >
                    <p className="text-xs font-bold text-voxcina-blue dark:text-voxcina-cream">
                      {r.title}
                    </p>
                    {r.address && (
                      <p className="text-[10px] text-voxcina-blue/60 dark:text-voxcina-cream/60 mt-0.5">
                        {r.address}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className={cn(
              "h-10 px-3 rounded-xl border border-secondary-200 dark:border-voxcina-blue/30 bg-white dark:bg-voxcina-blue/10 text-voxcina-blue dark:text-voxcina-cream hover:bg-voxcina-cream/40 dark:hover:bg-voxcina-blue/30 transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
            )}
            title="موقعیت من"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">موقعیت من</span>
          </button>
        </div>
        {locationError && (
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">{locationError}</p>
        )}
      </div>

      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-secondary-200 dark:border-voxcina-blue/30 [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib-button]:hidden">
        <MapComponent
            options={{
              mapKey: MAP_KEY,
              mapType: MapTypes.neshanVector,
              center: [center.lng, center.lat],
              zoom,
              mapTypeControllerOptions: { show: false },
            }}
          mapSetter={handleMapReady}
        />
        {!mounted && (
          <div className="absolute inset-0 flex items-center justify-center bg-voxcina-cream/30 dark:bg-voxcina-blue/20 pointer-events-none">
            <Loader2 className="h-6 w-6 text-voxcina-blue dark:text-voxcina-cream animate-spin" />
          </div>
        )}
      </div>

      {(resolvedAddress || resolvingAddress) && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-voxcina-cream/30 dark:bg-voxcina-blue/10 border border-secondary-200 dark:border-voxcina-blue/30">
          <MapPin className="h-3.5 w-3.5 text-voxcina-blue dark:text-voxcina-cream flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50 mb-0.5">
              آدرس انتخاب‌شده
            </p>
            <p className="text-xs text-voxcina-blue dark:text-voxcina-cream leading-relaxed">
              {resolvingAddress ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  در حال دریافت آدرس...
                </span>
              ) : (
                resolvedAddress
              )}
            </p>
          </div>
          {resolvedAddress && !resolvingAddress && (
            <button
              type="button"
              onClick={() => setResolvedAddress("")}
              className="flex-shrink-0 text-voxcina-blue/50 hover:text-voxcina-blue dark:text-voxcina-cream/50 dark:hover:text-voxcina-cream"
              aria-label="پاک کردن آدرس"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <p className="text-[10px] text-voxcina-blue/40 dark:text-voxcina-cream/40">
        برای انتخاب دقیق، روی نقشه کلیک کنید یا نشانگر را بکشید
      </p>
    </div>
  );
};

MapPicker.displayName = "MapPicker";

export default MapPicker;
