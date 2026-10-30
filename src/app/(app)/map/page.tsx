"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { useMemories } from "@/store/dataStore";
import { photosOf, type Memory } from "@/lib/firestore";
import { haptic } from "@/lib/device";
import "leaflet/dist/leaflet.css";

// La carte s'arrête pile au-dessus de la tab bar (variable CSS partagée).
const BELOW_NAV = "var(--tabbar-space)";

// Pastille photo (style « Been ») construite en HTML pour un divIcon Leaflet.
function pinHtml(photoUrl: string | null, selected: boolean): string {
  const size = selected ? 64 : 46;
  const ring = selected ? "#FF2D55" : "#FFFFFF";
  const inner = photoUrl
    ? `<img src="${photoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#262629;color:#8E8E93;font-size:18px;">📍</div>`;
  return `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      border:3px solid ${ring};overflow:hidden;
      box-shadow:0 3px 10px rgba(0,0,0,0.5);
      background:#161618;">
      ${inner}
    </div>`;
}

export default function MapPage() {
  const { memories, loading } = useMemories();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const located = useMemo(
    () => memories.filter((m) => typeof m.lat === "number" && typeof m.lng === "number"),
    [memories]
  );
  const selected = located.find((m) => m.id === selectedId) || null;
  const cityCount = useMemo(
    () => new Set(located.map((m) => m.location.split(",")[0].trim().toLowerCase())).size,
    [located]
  );

  // Init de la carte (une seule fois, Leaflet importé côté client)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mapRef.current || !containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || mapRef.current || !containerRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [50.85, 4.35], // Bruxelles par défaut
        zoom: 6,
        zoomControl: false, // pincer pour zoomer : pas de boutons +/- sur mobile
        attributionControl: true,
        tapTolerance: 20,
      } as any);
      // Fond OpenStreetMap standard — public, sans clé API.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // (Re)pose les marqueurs quand les souvenirs / la sélection changent
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady) return;

    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current.clear();

    located.forEach((m) => {
      const icon = L.divIcon({
        html: pinHtml(photosOf(m)[0] ?? null, m.id === selectedId),
        className: "",
        iconSize: m.id === selectedId ? [64, 64] : [46, 46],
        iconAnchor: m.id === selectedId ? [32, 32] : [23, 23],
      });
      const marker = L.marker([m.lat, m.lng], { icon, title: m.title, zIndexOffset: m.id === selectedId ? 1000 : 0 })
        .addTo(map)
        .on("click", () => {
          haptic(8);
          setSelectedId(m.id);
          map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
        });
      markersRef.current.set(m.id, marker);
    });

    if (located.length > 0 && selectedId === null) {
      const bounds = L.latLngBounds(located.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [60, 80], maxZoom: 13 });
    }
  }, [located, mapReady, selectedId]);

  // Arrivée depuis une publication (/map?focus=<id>) : on centre sur ce lieu
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || !mapReady || located.length === 0) return;
    const id = new URLSearchParams(window.location.search).get("focus");
    const m = id ? located.find((x) => x.id === id) : null;
    if (!m) return;
    focused.current = true;
    const t = setTimeout(() => {
      setSelectedId(m.id);
      mapRef.current?.flyTo([m.lat, m.lng], 13, { duration: 0.8 });
    }, 250);
    return () => clearTimeout(t);
  }, [mapReady, located]);

  // La carte doit recalculer sa taille après le 1er rendu (conteneur dimensionné)
  useEffect(() => {
    if (mapReady && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [mapReady]);

  function focusMemory(m: Memory) {
    haptic(6);
    setSelectedId(m.id);
    const map = mapRef.current;
    if (map) map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }

  return (
    <div className="screen-in" style={{ position: "relative", height: "100%", width: "100%", background: "#0A0A0C", overflow: "hidden" }}>

      {/* Carte : s'arrête au-dessus de la navbar (ne la recouvre plus) */}
      <div
        ref={containerRef}
        aria-label="Carte de nos lieux"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: BELOW_NAV, background: "#0A0A0C" }}
      />

      {/* ── EN-TÊTE STATS (style Been) ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 500, padding: "calc(var(--safe-top) + 12px) 16px 28px", background: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#FFF", letterSpacing: -0.5, lineHeight: 1.1, textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>Nos lieux</h1>
          <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
            <span style={{ background: "rgba(28,28,30,0.9)", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#FFF", backdropFilter: "blur(8px)" }}>
              {located.length} lieu{located.length > 1 ? "x" : ""}
            </span>
            <span style={{ background: "rgba(28,28,30,0.9)", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#FFF", backdropFilter: "blur(8px)" }}>
              {cityCount} ville{cityCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* États vides / chargement */}
      {(loading || located.length === 0) && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: BELOW_NAV, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, pointerEvents: "none" }}>
          <p style={{ background: "rgba(28,28,30,0.92)", borderRadius: 14, padding: "16px 20px", fontSize: 14, color: "#AEAEB2", textAlign: "center", maxWidth: 280 }}>
            {loading ? "Chargement de la carte..." : "Aucun souvenir géolocalisé pour l'instant. Ajoute un lieu à un souvenir pour le voir apparaître ici."}
          </p>
        </div>
      )}

      {/* ── CARTE DÉTAIL du lieu sélectionné (au-dessus de la bande photo) ── */}
      {selected && (
        <div style={{ position: "absolute", left: 12, right: 12, bottom: `calc(${BELOW_NAV} + 92px)`, zIndex: 600 }}>
          <div style={{ background: "#161618", borderRadius: 16, padding: 12, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.5)", border: "1px solid #262629" }}>
            {photosOf(selected)[0]
              ? <img src={photosOf(selected)[0]} alt={`Photo : ${selected.title}`} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 64, height: 64, borderRadius: 12, background: "#262629", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }} aria-hidden="true">📍</div>}
            <Link href={`/p/${selected.id}`} style={{ minWidth: 0, flex: 1, textDecoration: "none", color: "inherit" }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.title} <span style={{ color: "#4CB5F9", fontSize: 13, fontWeight: 600 }}>Voir ›</span></p>
              <p style={{ fontSize: 13, color: "#AEAEB2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.location}</p>
              <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>
                {selected.date.toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Fermer le détail"
              style={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#8E8E93" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── BANDE PHOTO horizontale, calée juste au-dessus de la navbar ── */}
      {located.length > 0 && (
        <div
          role="group"
          aria-label="Liste des lieux"
          style={{ position: "absolute", left: 0, right: 0, bottom: BELOW_NAV, zIndex: 550, display: "flex", gap: 10, padding: "10px 16px 12px", background: "linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)" }}
          className="scroll-x"
        >
          {located.map((m) => {
            const active = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => focusMemory(m)}
                aria-pressed={active}
                aria-label={`${m.title}, ${m.location}`}
                style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 14, overflow: "hidden", padding: 0, cursor: "pointer", background: "#262629", border: active ? "3px solid #FF2D55" : "3px solid transparent", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
              >
                {photosOf(m)[0]
                  ? <img src={photosOf(m)[0]} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span aria-hidden="true" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📍</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}