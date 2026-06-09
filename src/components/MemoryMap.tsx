"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Memory } from "@/lib/firestore";

// Icône personnalisée élégante et visible sur fond sombre
const customIcon = L.divIcon({
  className: "custom-memory-marker",
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-4 h-4 bg-[#c9a96e] opacity-40 rounded-full animate-ping"></div>
      <div class="relative w-3 h-3 bg-[#c9a96e] border-2 border-white rounded-full shadow-[0_0_10px_rgba(201,169,110,0.6)]"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Composant interne pour gérer l'ajustement automatique du zoom (UX)
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    
    // Crée des frontières pour englober TOUS les points
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { 
      padding: [50, 50], // Évite que les marqueurs collent aux bords du canevas
      maxZoom: 13       // Évite un zoom trop agressif s'il n'y a qu'un seul point
    });
  }, [points, map]);

  return null;
}

interface Props {
  memories: Memory[];
}

export default function MemoryMap({ memories }: Props) {
  // Filtrer et formater les coordonnées valides
  const validMemories = memories.filter(m => m.lat !== undefined && m.lng !== undefined);
  const points = validMemories.map(m => [m.lat!, m.lng!] as [number, number]);
  
  // Centre par défaut si aucun souvenir (Bruxelles)
  const defaultCenter: [number, number] = [50.85, 4.35];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        className="w-full h-full bg-[#1C1C1E]"
        zoomControl={true} // Réactivé pour l'accessibilité sur desktop (ou utilisez-en un personnalisé)
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {/* Ajustement intelligent du zoom et du centrage */}
        <FitBounds points={points} />

        {validMemories.map((m) => (
          <Marker key={m.id} position={[m.lat!, m.lng!]} icon={customIcon}>
            {/* Ajout d'une classe pour styliser la popup directement en CSS/Tailwind */}
            <Popup className="custom-popup">
              <div className="p-1 min-w-[160px] text-neutral-200">
                <h4 className="font-bold text-sm text-black mb-0.5 tracking-wide">
                  {m.title}
                </h4>
                
                {m.location && (
                  <p className="text-xs text-neutral-700 flex items-center gap-1 mb-2">
                    <span>📍</span> {m.location}
                  </p>
                )}
                
                <div className="border-t border-neutral-700/50 pt-1.5 mt-1.5 flex justify-between items-center text-[10px] text-neutral-500">
                  <span>Souvenir</span>
                  <span className="font-medium text-[#c9a96e]">
                    {m.date.toLocaleDateString("fr-BE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}