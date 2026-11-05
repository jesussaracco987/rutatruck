"use client";

import { useState, useEffect, useRef } from "react";

interface Suggestion {
  label: string;
  lat: number;
  lng: number;
}

export interface LocationSelection {
  label: string;
  lat: number;
  lng: number;
}

interface Props {
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  inputClass: string;
  inputStyle: React.CSSProperties;
  initialValue?: string;
  onValueChange?: (value: string) => void;
  onLocationSelect?: (loc: LocationSelection) => void;
}

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (query.length < 2) return [];
  const url = `https://apis.datos.gob.ar/georef/api/localidades?nombre=${encodeURIComponent(query)}&max=8&campos=nombre,provincia.nombre,centroide&orden=nombre`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.localidades ?? []).map((l: {
    nombre: string;
    provincia: { nombre: string };
    centroide: { lat: number; lon: number };
  }) => ({
    label: `${l.nombre}, ${l.provincia.nombre}`,
    lat: l.centroide.lat,
    lng: l.centroide.lon,
  }));
}

/**
 * Localidad con ese nombre exacto ("Rosario, Santa Fe"). `fetchSuggestions` sirve
 * para ir escribiendo, pero ordena por nombre: su primer resultado para "Rosario"
 * es "Balde del Rosario", en San Juan.
 */
export async function buscarLocalidadExacta(lugar: string): Promise<Suggestion | null> {
  const [nombre, provincia] = lugar.split(",").map((p) => p.trim());
  if (!nombre) return null;
  const consulta = async (conProvincia: boolean) => {
    const params = new URLSearchParams({ nombre, exacto: "true", max: "1", campos: "nombre,provincia.nombre,centroide" });
    if (conProvincia) params.set("provincia", provincia);
    const res = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?${params}`);
    if (!res.ok) return null;
    const [l] = (await res.json()).localidades ?? [];
    return l ? { label: `${l.nombre}, ${l.provincia.nombre}`, lat: l.centroide.lat, lng: l.centroide.lon } : null;
  };
  return (provincia ? await consulta(true) : null) ?? consulta(false);
}

export default function LocationAutocomplete({
  id, name, placeholder, required, inputClass, inputStyle, initialValue = "", onValueChange, onLocationSelect,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActive(-1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(newValue: string) {
    setValue(newValue);
    onValueChange?.(newValue);
  }

  function select(s: Suggestion) {
    setValue(s.label);
    onValueChange?.(s.label);
    onLocationSelect?.({ label: s.label, lat: s.lat, lng: s.lng });
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); select(suggestions[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        required={required}
        autoComplete="off"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className={inputClass}
        style={inputStyle}
        placeholder={placeholder}
      />
      {open && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-lg border overflow-hidden shadow-lg"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#E2E8E8" }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.label}
              onMouseDown={() => select(s)}
              className="px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{
                color: i === active ? "var(--primary)" : "#374151",
                backgroundColor: i === active ? "var(--primary-10)" : "transparent",
              }}
              onMouseEnter={() => setActive(i)}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
