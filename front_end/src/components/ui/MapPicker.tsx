"use client";

import React, { useEffect, useRef } from "react";

interface MapPickerProps {
  location: { lat: number; lng: number };
  onChange: (location: { lat: number; lng: number }) => void;
}

const MapPicker: React.FC<MapPickerProps> = ({ location, onChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      import("leaflet")
        .then((L: any) => {
          if (!mapRef.current) return;

          // Determine map center: use provided location if non-zero, otherwise default to center of Iran
          const { lat = 0, lng = 0 } = location;
          const isDefaultLocation = lat === 0 && lng === 0;
          const centerLat = isDefaultLocation ? 32.427908 : lat;
          const centerLng = isDefaultLocation ? 53.688046 : lng;
          const zoomLevel = isDefaultLocation ? 5 : 13;

          const map = L.map(mapRef.current).setView([centerLat, centerLng], zoomLevel);

          // Use CARTO Voyager basemap for better visuals
          L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
          }).addTo(map);

          const marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(map);

          // Allow dragging the marker for fine-tuning
          marker.on("dragend", (e: any) => {
            const { lat: dLat, lng: dLng } = e.target.getLatLng();
            onChange({ lat: dLat, lng: dLng });
          });
          markerRef.current = marker;

          // If using default location, notify parent so form validation passes
          if (isDefaultLocation) {
            onChange({ lat: centerLat, lng: centerLng });
          }

          map.on("click", (e: any) => {
            const { lat: newLat, lng: newLng } = e.latlng;
            marker.setLatLng([newLat, newLng]);
            onChange({ lat: newLat, lng: newLng });
          });

          mapInstanceRef.current = map;
        })
        .catch((error) => {
          console.error("Error loading Leaflet:", error);
        });
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.error("Error cleaning up map:", error);
        }
      }
    };
  }, [location, onChange]);

  // Re-center map and marker when location prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      const { lat, lng } = location;
      if (lat && lng) {
        // Pan map to new location without changing zoom
        map.panTo([lat, lng]);
        marker.setLatLng([lat, lng]);
      }
    }
  }, [location.lat, location.lng]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div
        ref={mapRef}
        className="w-full h-64 rounded-xl overflow-hidden"
      />
    </>
  );
};

export default MapPicker; 