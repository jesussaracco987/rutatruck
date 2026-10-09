"use client";

import { useEffect, useRef } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker, Popup as MapboxPopup } from "mapbox-gl";
import { getIconoCarga } from "@/lib/iconos-carga";
import type { CargaMapItem } from "./MapaCargas";
import { TIPO_CARGA_LABELS as TIPO_LABELS, TIPO_CARGA_COLORES } from "@/lib/tipos-carga";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function getPinColor(tipoCarga: string, detalle: string | null): string {
  const d = norm(detalle ?? "");
  if (d.includes("maiz")) return "#F5C518";
  if (["trigo","sorgo","cebada","avena","centeno"].some(x => d.includes(x))) return "#C8A800";
  if (d.includes("soja")) return "#2D6A2D";
  if (d.includes("girasol")) return "#FF8C00";
  if (["manzana","pera","durazno","uva","citrico","limon","sandia","frutilla"].some(x => d.includes(x))) return "#FF6B35";
  if (["tomate","papa","cebolla","ajo","zanahoria","zapallo","lechuga","pimiento"].some(x => d.includes(x))) return "#4CAF50";
  if (["bovino","porcino","ovino","caprino","equino"].some(x => d.includes(x))) return "#8B4513";
  if (d.includes("aviar")) return "#E53935";
  return TIPO_CARGA_COLORES[tipoCarga] ?? "#9E9E9E";
}

interface Props {
  cargas: CargaMapItem[];
  yaPostuladoIds: number[];
}

export default function MapaInline({ cargas, yaPostuladoIds }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const popupRef = useRef<MapboxPopup | null>(null);

  const cargasConGeo = cargas.filter(c => c.origenLat != null && c.origenLng != null);
  const yaPostSet = new Set(yaPostuladoIds);

  // Mismo origen exacto (o casi) para dos o más cargas => un solo pin con
  // contador, en vez de quedar tapadas unas debajo de otras.
  const gruposPorCoord = new Map<string, CargaMapItem[]>();
  for (const c of cargasConGeo) {
    const key = `${c.origenLat!.toFixed(5)},${c.origenLng!.toFixed(5)}`;
    const grupo = gruposPorCoord.get(key);
    if (grupo) grupo.push(c);
    else gruposPorCoord.set(key, [c]);
  }
  const grupos = Array.from(gruposPorCoord.values());

  useEffect(() => {
    let active = true;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!active || !containerRef.current || mapRef.current) return;

      mapboxgl.accessToken = TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-63.6167, -38.4161],
        zoom: 4,
        attributionControl: false,
      });
      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (!active) return;

        function cargaPopupHtml(carga: CargaMapItem, emoji: string, color: string) {
          const yaPost = yaPostSet.has(carga.id);
          const presupuestoStr = `<p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#06342A">${carga.presupuesto != null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar"}</p>`;
          const badgeStr = yaPost
            ? `<span style="display:inline-block;padding:2px 8px;background:#DCFCE7;color:#166534;border-radius:999px;font-size:11px;font-weight:600;margin-bottom:6px">✓ Ya me postulé</span><br/>`
            : "";
          const btnBg = yaPost ? "#E8F5E9" : "#06342A";
          const btnColor = yaPost ? "#06342A" : "#FFFFFF";
          const btnText = yaPost ? "Ver mi postulación →" : "Me interesa →";

          return `
            <div style="padding:14px;font-family:inherit">
              ${badgeStr}
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:26px">${emoji}</span>
                <div>
                  <p style="margin:0;font-size:13px;font-weight:800;color:${color}">${TIPO_LABELS[carga.tipoCarga] ?? carga.tipoCarga}</p>
                  ${carga.tipoCargaDetalle ? `<p style="margin:0;font-size:11px;color:#6B7280">${carga.tipoCargaDetalle}</p>` : ""}
                </div>
              </div>
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#111827">${carga.origen} → ${carga.destino}</p>
              ${presupuestoStr}
              <a href="/transportista/cargas/${carga.id}"
                style="display:block;text-align:center;padding:9px 14px;background:${btnBg};color:${btnColor};border-radius:10px;text-decoration:none;font-size:13px;font-weight:700">
                ${btnText}
              </a>
            </div>
          `;
        }

        function grupoPopupHtml(grupo: CargaMapItem[]) {
          const rows = grupo.map((carga) => {
            const emoji = getIconoCarga(carga.tipoCarga, carga.tipoCargaDetalle);
            const color = getPinColor(carga.tipoCarga, carga.tipoCargaDetalle);
            const precio = carga.presupuesto != null ? `$${carga.presupuesto.toLocaleString("es-AR")}` : "A acordar";
            return `
              <a href="/transportista/cargas/${carga.id}"
                style="display:flex;align-items:center;gap:8px;padding:8px 4px;text-decoration:none;border-bottom:1px solid #E2E8E8">
                <span style="font-size:20px">${emoji}</span>
                <span style="flex:1;min-width:0">
                  <span style="display:block;font-size:12px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${carga.origen} → ${carga.destino}</span>
                  <span style="display:block;font-size:11px;font-weight:600;color:#06342A">${precio}</span>
                </span>
                <span style="color:#9CA3AF">→</span>
              </a>
            `;
          }).join("");

          return `
            <div style="padding:10px 4px 4px;font-family:inherit;max-height:280px;overflow-y:auto">
              <p style="margin:0 8px 6px;font-size:11px;font-weight:700;text-transform:uppercase;color:#6B7280">${grupo.length} cargas con este origen</p>
              ${rows}
            </div>
          `;
        }

        for (const grupo of grupos) {
          const carga = grupo[0];
          const emoji = getIconoCarga(carga.tipoCarga, carga.tipoCargaDetalle);
          const color = getPinColor(carga.tipoCarga, carga.tipoCargaDetalle);

          // `el` es el elemento que Mapbox posiciona (transform = translate en
          // cada frame de pan/zoom). El hover va en un hijo (`pin`) aparte
          // para no pisar ese transform y hacer "saltar" el pin a cualquier lado.
          const el = document.createElement("div");
          Object.assign(el.style, {
            width: "40px", height: "40px", cursor: "pointer",
          });

          const pin = document.createElement("div");
          Object.assign(pin.style, {
            position: "relative",
            width: "100%", height: "100%", borderRadius: "50%",
            background: color, border: "2.5px solid white",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px",
            transition: "transform 150ms ease",
            userSelect: "none",
          });
          pin.textContent = emoji;
          el.appendChild(pin);
          el.addEventListener("mouseenter", () => { pin.style.transform = "scale(1.2)"; });
          el.addEventListener("mouseleave", () => { pin.style.transform = "scale(1)"; });

          if (grupo.length > 1) {
            const badge = document.createElement("span");
            Object.assign(badge.style, {
              position: "absolute", top: "-6px", right: "-6px",
              minWidth: "20px", height: "20px", padding: "0 4px",
              borderRadius: "10px", background: "#DC2626", color: "#FFFFFF",
              border: "2px solid white", fontSize: "11px", fontWeight: "800",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            });
            badge.textContent = String(grupo.length);
            pin.appendChild(badge);
          }

          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

            const popup = new mapboxgl.Popup({
              maxWidth: grupo.length > 1 ? "280px" : "260px",
              offset: 20,
              closeButton: true,
              className: "clickcargo-popup",
            }).setHTML(grupo.length > 1 ? grupoPopupHtml(grupo) : cargaPopupHtml(carga, emoji, color));

            popup.setLngLat([carga.origenLng!, carga.origenLat!]).addTo(map);
            popupRef.current = popup;
            map.flyTo({ center: [carga.origenLng!, carga.origenLat!], zoom: Math.max(map.getZoom(), 8), duration: 400, padding: { bottom: 100 } });
          });

          const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([carga.origenLng!, carga.origenLat!])
            .addTo(map);
          markersRef.current.push(marker);
        }

        map.on("click", () => {
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        });

        // Fit to all pins
        if (cargasConGeo.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          for (const c of cargasConGeo) bounds.extend([c.origenLng!, c.origenLat!]);
          map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 1000 });
          // Sin piso de zoom, cargas repartidas por todo el país dejan el mapa
          // muy alejado y el basemap simplifica costas/ríos a esa escala —
          // pueblos costeros bien geolocalizados terminan pareciendo "en el mar".
          map.once("moveend", () => {
            if (map.getZoom() < 5) map.easeTo({ zoom: 5, duration: 400 });
          });
        } else if (cargasConGeo.length === 1) {
          map.flyTo({ center: [cargasConGeo[0].origenLng!, cargasConGeo[0].origenLat!], zoom: 9, duration: 800 });
        }
      });
    })();

    return () => {
      active = false;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      popupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
