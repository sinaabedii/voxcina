"use client";

import { useCallback, useRef } from "react";
import { MapComponent, MapTypes } from "@neshan-maps-platform/mapbox-gl-react";
import "@neshan-maps-platform/mapbox-gl-react/dist/style.css";
import nmp_mapboxgl, { Marker as NeshanMarker } from "@neshan-maps-platform/mapbox-gl";
import type SDKMap from "@neshan-maps-platform/mapbox-gl/dist/src/core/Map";

interface NeshanStaticMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  title?: string;
  address?: string;
  className?: string;
}

const MAP_KEY = process.env.NEXT_PUBLIC_NESHAN_API_KEY;

const NeshanStaticMap: React.FC<NeshanStaticMapProps> = ({
  lat,
  lng,
  zoom = 15,
  title,
  address,
  className,
}) => {
  const markerRef = useRef<InstanceType<typeof NeshanMarker> | null>(null);

  const handleMapReady = useCallback(
    (map: SDKMap) => {
      if (markerRef.current) return;
      const el = document.createElement("div");
      el.style.cssText = `
        background: #1e40af;
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      el.innerHTML = `<div style="background:white;width:8px;height:8px;border-radius:50%;transform:rotate(45deg);"></div>`;

      const marker = new nmp_mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map as unknown as mapboxgl.Map);

      if (title || address) {
        const popupHtml = `
          <div style="text-align: center; font-family: 'Vazir', sans-serif; direction: rtl; padding: 4px 8px;">
            ${title ? `<h3 style="margin: 0 0 4px 0; color: #1e40af; font-size: 14px; font-weight: bold;">${title}</h3>` : ""}
            ${address ? `<p style="margin: 0; color: #6b7280; font-size: 12px;">${address}</p>` : ""}
          </div>
        `;
        const popup = new nmp_mapboxgl.Popup({ offset: 30 });
        popup.setHTML(popupHtml);
        marker.setPopup(popup);
        marker.togglePopup();
      }

      markerRef.current = marker;
    },
    [lat, lng, title, address]
  );

  if (!MAP_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-voxcina-cream/30 dark:bg-voxcina-blue/20 text-xs text-voxcina-blue/60 dark:text-voxcina-cream/60 p-4 text-center">
        کلید API نقشه نشان تنظیم نشده است
      </div>
    );
  }

  return (
    <div className={`${className} [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib-button]:hidden`}>
      <MapComponent
        options={{
          mapKey: MAP_KEY,
          mapType: MapTypes.neshanVector,
          center: [lng, lat],
          zoom,
          mapTypeControllerOptions: { show: false, position: "bottom-left" },
          poiControllerOptions: { show: false },
          trafficControllerOptions: { show: false },
        }}
        mapSetter={handleMapReady}
      />
    </div>
  );
};

export default NeshanStaticMap;
