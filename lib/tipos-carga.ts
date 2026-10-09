/**
 * Tipos de carga que ofrece el formulario de publicación.
 *
 * `tipoCarga` se guarda como string libre en la base: agregar un tipo acá no
 * requiere migración, y las cargas viejas siguen mostrando su etiqueta.
 * El orden es el del selector — los tipos generales van primero para que la
 * app no se lea como exclusiva del agro.
 */
export const TIPOS_CARGA = [
  { value: "paqueteria", label: "Paquetería", placeholder: "Ej: Cajas, encomiendas, bultos...", color: "#2563EB" },
  { value: "mercaderia", label: "Mercadería general", placeholder: "Ej: Pallets, bebidas, electrodomésticos...", color: "#7C3AED" },
  { value: "materiales", label: "Materiales de construcción", placeholder: "Ej: Ladrillos, cemento, hierro...", color: "#B45309" },
  { value: "granos", label: "Granos", placeholder: "Ej: Maíz, Soja, Trigo...", color: "#C8A800" },
  { value: "frutas", label: "Frutas", placeholder: "Ej: Banana, Manzana, Pera...", color: "#FF6B35" },
  { value: "verduras", label: "Verduras", placeholder: "Ej: Tomate, Lechuga, Papa...", color: "#4CAF50" },
  { value: "animales", label: "Animales", placeholder: "Ej: Bovinos, Porcinos, Ovinos...", color: "#8B4513" },
  { value: "otro", label: "Otro", placeholder: "Especificá el tipo de carga", color: "#9E9E9E" },
] as const;

export const TIPO_CARGA_LABELS: Record<string, string> = Object.fromEntries(
  TIPOS_CARGA.map((t) => [t.value, t.label]),
);

export const TIPO_CARGA_COLORES: Record<string, string> = Object.fromEntries(
  TIPOS_CARGA.map((t) => [t.value, t.color]),
);

export function placeholderDetalleCarga(tipoCarga: string): string {
  return TIPOS_CARGA.find((t) => t.value === tipoCarga)?.placeholder ?? "Especificá el tipo de carga";
}
