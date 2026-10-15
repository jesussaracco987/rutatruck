/** Etiqueta, emoji y color de cada código de vehículo de DisponibilidadTransportista.vehiculo. */
export const VEHICULO_META: Record<string, { label: string; emoji: string; color: string }> = {
  tolva_cerealera_comun:     { label: "Tolva cerealera común",     emoji: "🌾", color: "#92400E" },
  tolva_cerealera_escalable: { label: "Tolva cerealera escalable", emoji: "🌾", color: "#92400E" },
  batea_comun:               { label: "Batea común",               emoji: "🪣", color: "#065F46" },
  batea_escalable:           { label: "Batea escalable",           emoji: "🪣", color: "#065F46" },
  chasis_acoplado_comun:     { label: "Chasis c/Acoplado común",   emoji: "🚛", color: "#1D4ED8" },
  chasis_acoplado_escalable: { label: "Chasis c/Acoplado escal.",  emoji: "🚛", color: "#1D4ED8" },
  semirremolque_comun:       { label: "Semirremolque común",       emoji: "🚚", color: "#1D4ED8" },
  semirremolque_escalable:   { label: "Semirremolque escalable",   emoji: "🚚", color: "#1D4ED8" },
  jaula_ganadera:            { label: "Jaula ganadera",            emoji: "🐄", color: "#065F46" },
  sider:                     { label: "Sider",                     emoji: "📦", color: "#BE185D" },
  furgon:                    { label: "Furgón",                    emoji: "🚐", color: "#7C3AED" },
  playo:                     { label: "Playo",                     emoji: "🛻", color: "#0F766E" },
  frigorifico:               { label: "Frigorífico",               emoji: "❄️", color: "#0369A1" },
  cisterna:                  { label: "Cisterna",                  emoji: "🛢️", color: "#374151" },
  portacontenedor:           { label: "Portacontenedor",           emoji: "🏗️", color: "#374151" },
  carreton:                  { label: "Carretón",                  emoji: "🚜", color: "#92400E" },
  volcador:                  { label: "Volcador",                  emoji: "⬆️", color: "#374151" },
  // legacy
  camion_chasis:             { label: "Camión chasis",             emoji: "🚛", color: "#1D4ED8" },
  camion_acoplado_comun:     { label: "Acoplado común",            emoji: "🚛", color: "#1D4ED8" },
  camion_acoplado_escalable: { label: "Acoplado escalable",        emoji: "🚛", color: "#1D4ED8" },
  paletizado:                { label: "Paletizado",                emoji: "📦", color: "#BE185D" },
  batea:                     { label: "Batea",                     emoji: "🪣", color: "#065F46" },
};

export function getVehiculoLabel(v: string): string {
  return VEHICULO_META[v]?.label ?? v;
}
