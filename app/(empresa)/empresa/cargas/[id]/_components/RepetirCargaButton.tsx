"use client";

import { useRouter } from "next/navigation";

const DRAFT_KEY = "clickcargo-nueva-carga-draft";

interface Props {
  carga: {
    origen: string;
    origenLat: number | null;
    origenLng: number | null;
    destino: string;
    destinoLat: number | null;
    destinoLng: number | null;
    tipoCarga: string;
    tipoCargaDetalle: string | null;
    peso: number | null;
    pesoUnidad: string | null;
    cantidadCamiones: number;
    presupuesto: number | null;
    preferenciaCamion: string | null;
    descripcion: string | null;
    contactoNombre: string;
    contactoTelefono: string;
    contactoEmail: string;
  };
}

export default function RepetirCargaButton({ carga }: Props) {
  const router = useRouter();

  function handleClick() {
    const draft = {
      origen: carga.origen,
      origenLat: carga.origenLat?.toString() ?? "",
      origenLng: carga.origenLng?.toString() ?? "",
      destino: carga.destino,
      destinoLat: carga.destinoLat?.toString() ?? "",
      destinoLng: carga.destinoLng?.toString() ?? "",
      tipoCarga: carga.tipoCarga,
      tipoCargaDetalle: carga.tipoCargaDetalle ?? "",
      peso: carga.peso?.toString() ?? "",
      pesoUnidad: carga.pesoUnidad ?? "tonelada",
      cantidadCamiones: carga.cantidadCamiones.toString(),
      presupuesto: carga.presupuesto?.toString() ?? "",
      preferenciaCamion: carga.preferenciaCamion ?? "",
      descripcion: carga.descripcion ?? "",
      contactoNombre: carga.contactoNombre,
      contactoTelefono: carga.contactoTelefono,
      contactoEmail: carga.contactoEmail,
      fechaCarga: "",
      fechaCupo: "",
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    // El borrador lo restaura el formulario, no el chat.
    router.push("/empresa/cargas/nueva?modo=formulario");
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-colors cursor-pointer border"
      style={{ borderColor: "var(--primary-27)", color: "var(--primary)", backgroundColor: "var(--primary-5)" }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Repetir carga
    </button>
  );
}
