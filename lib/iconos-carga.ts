const iconosPorDetalle: Record<string, string> = {
  // Cereales y granos
  maiz: "🌽",
  trigo: "🌾",
  soja: "🫘",
  girasol: "🌻",
  sorgo: "🌾",
  cebada: "🌾",
  arroz: "🍚",
  avena: "🌾",
  centeno: "🌾",

  // Frutas
  manzana: "🍎",
  pera: "🍐",
  durazno: "🍑",
  uva: "🍇",
  citricos: "🍊",
  limon: "🍋",
  sandia: "🍉",
  melon: "🍈",
  frutilla: "🍓",
  cereza: "🍒",
  ciruela: "🫐",

  // Verduras y hortalizas
  tomate: "🍅",
  papa: "🥔",
  cebolla: "🧅",
  ajo: "🧄",
  zanahoria: "🥕",
  zapallo: "🎃",
  lechuga: "🥬",
  espinaca: "🥬",
  pimiento: "🫑",
  mani: "🥜",
  poroto: "🫘",

  // Animales
  bovino: "🐄",
  porcino: "🐷",
  ovino: "🐑",
  caprino: "🐐",
  aviar: "🐔",
  equino: "🐴",
  conejo: "🐇",

  // Lácteos y derivados
  lacteos: "🥛",
  queso: "🧀",
  huevos: "🥚",

  // Paquetería y mercadería general
  paquete: "📦",
  encomienda: "📦",
  caja: "📦",
  bulto: "📦",
  pallet: "📦",
  bebida: "🥤",
  electrodomestico: "📺",
  mueble: "🛋️",

  // Materiales de construcción
  ladrillo: "🧱",
  cemento: "🧱",
  hierro: "🔩",
  madera: "🪵",
  arena: "⛏️",

  // Otros
  lana: "🧶",
  cuero: "🟫",
  miel: "🍯",
  aceite: "🫙",
  harina: "🌾",
  forraje: "🌿",
  otro: "📦",
};

const iconosPorCategoria: Record<string, string> = {
  paqueteria: "📦",
  mercaderia: "🛒",
  materiales: "🧱",
  granos: "🌾",
  frutas: "🍎",
  verduras: "🥬",
  animales: "🐄",
  otro: "📦",
};

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function getIconoCarga(
  tipoCarga: string,
  tipoCargaDetalle?: string | null
): string {
  if (tipoCargaDetalle) {
    const key = normalizar(tipoCargaDetalle);
    if (key in iconosPorDetalle) return iconosPorDetalle[key];
    // Busca coincidencia parcial (ej: "Bovinos" → "bovino")
    for (const [k, v] of Object.entries(iconosPorDetalle)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
  }
  return iconosPorCategoria[tipoCarga] ?? "📦";
}
