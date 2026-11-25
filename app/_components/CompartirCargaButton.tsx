"use client";

import { useState } from "react";

/**
 * Comparte una carga por WhatsApp (o lo que ofrezca el celular). Pensado para
 * convocatorias grandes: un transportista se la pasa a otros, o quien publica
 * la manda a los grupos donde ya busca camiones. El link lleva a la carga en
 * la app; sin sesión pasa por el login o el registro y vuelve a la carga.
 */
export default function CompartirCargaButton({
  ruta,
  texto,
  etiqueta = "Compartir carga",
}: {
  /** Ruta de la carga dentro de la app, por ejemplo /transportista/cargas/12. */
  ruta: string;
  texto: string;
  etiqueta?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const url = () => `${window.location.origin}${ruta}`;

  async function compartir() {
    const link = url();
    // En el celular abre el menú de compartir (WhatsApp, grupos, etc.).
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: texto, url: link });
        return;
      } catch (err) {
        // Cerrar el menú sin elegir nada no es un error.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${link}`)}`, "_blank", "noopener");
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${texto}\n${url()}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={compartir}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
        style={{ borderColor: "var(--primary-20)", color: "var(--primary)", backgroundColor: "#FFFFFF" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {etiqueta}
      </button>
      <button
        type="button"
        onClick={copiar}
        className="rounded-xl border px-3 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 cursor-pointer"
        style={{ borderColor: "#E2E8E8", color: "#374151", backgroundColor: "#FFFFFF" }}
      >
        {copiado ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
