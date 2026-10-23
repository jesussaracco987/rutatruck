import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import truckImg from "@/app/assets/truck2.jpg";
import { FREE_TIER, diasRestantesFreeTier } from "@/lib/free-tier";
import { OG_IMAGE, absoluteUrl } from "@/lib/site";
import JsonLd from "@/app/_components/JsonLd";
import type { Metadata } from "next";

// Es lo que aparece cuando alguien busca "ClickCargo" en Google.
const title = "ClickCargo: cargas y camiones conectados";
const description =
  "Conectamos a quien necesita enviar una carga con transportistas de todo el país. Publicá tu carga o encontrá viajes cerca, con avisos por zona y chat directo.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/"),
    siteName: "ClickCargo",
    locale: "es_AR",
    type: "website",
    images: [OG_IMAGE],
  },
};

const dashboardByRole = {
  EMPRESA: "/empresa/dashboard",
  TRANSPORTISTA: "/transportista/cargas",
  TRANSPORTISTA_FLOTA: "/transportista/cargas",
  EMPRESA_TRANSPORTISTA: "/empresa/dashboard",
  ADMIN: "/admin/dashboard",
} as const;

export default async function LandingPage() {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (session?.role) redirect(dashboardByRole[session.role]);
  const dias = diasRestantesFreeTier();
  const gratis = FREE_TIER && dias !== 0;
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#060F0F" }}
    >
      <JsonLd />
      {/* Celular: columna angosta (imagen arriba, botones abajo).
          Escritorio (lg): pantalla partida, imagen a la izquierda y panel a la derecha. */}
      <div
        className="relative w-full sm:max-w-[420px] lg:max-w-none flex flex-col lg:flex-row overflow-hidden"
        style={{ minHeight: "100svh" }}
      >
        {/* Image section */}
        <div className="relative flex-shrink-0 overflow-hidden h-[56svh] lg:h-auto lg:min-h-screen lg:w-1/2 xl:w-[55%]">
          <Image
            src={truckImg}
            alt=""
            fill
            sizes="(min-width: 1280px) 55vw, (min-width: 1024px) 50vw, 420px"
            className="object-cover object-[center_45%] lg:object-[center_60%]"
            priority
            quality={88}
          />
          {/* Overlay: dark top for logo, clear middle for truck, dark fade to bottom */}
          <div
            className="absolute inset-0 lg:hidden"
            style={{
              background:
                "linear-gradient(to bottom, rgba(6,15,15,0.1) 20%, rgba(0,0,0,0.0) 85%, rgba(6,15,15,0.88) 95%, rgba(6,15,15,1) 100%)",
            }}
          />
          {/* En escritorio la imagen se funde hacia el panel de la derecha */}
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                "linear-gradient(to right, rgba(6,15,15,0) 70%, rgba(6,15,15,0.85) 94%, rgba(6,15,15,1) 100%)",
            }}
          />

          {/* Logo — top center */}
          <div className="absolute top-8 lg:top-14 left-0 right-0 flex flex-col items-center">
            <h1
              className="font-black leading-none mb-1 text-[2.6rem] lg:text-6xl"
              style={{ letterSpacing: "-0.01em", textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)" }}
            >
              <span style={{ color: "#4ADE80" }}>CLICK</span>
              <span className="text-white">CARGO</span>
            </h1>
            <p
              className="uppercase tracking-widest font-medium text-[0.65rem] lg:text-sm"
              style={{ color: "#4ADE80", opacity: 0.9, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
            >
              Red integral de cargas
            </p>
          </div>
        </div>

        {/* Dark section — buttons */}
        <div
          className="flex flex-col justify-center flex-1 px-6 py-8 lg:px-16 xl:px-24"
          style={{ backgroundColor: "#060F0F" }}
        >
          <div className="w-full lg:max-w-md lg:mx-auto flex flex-col gap-3">
          {/* Solo escritorio: en la PC sobra lugar para explicar qué es antes de elegir */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-4xl font-black leading-tight text-white">
              Cargas y camiones, <span style={{ color: "#4ADE80" }}>conectados</span>.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#9CA3AF" }}>
              Desde un flete chico hasta varios camiones: quien necesita enviar y quien transporta, en un solo lugar.
            </p>
            <ul className="mt-6 space-y-3 text-sm" style={{ color: "#D1D5DB" }}>
              {[
                "Publicá tu carga y recibí postulaciones de transportistas",
                "Encontrá viajes cerca, con avisos por zona",
                "Chat directo para coordinar sin intermediarios",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-px" fill="none" stroke="#4ADE80" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
              ¿Qué necesitás hacer?
            </p>
          </div>

          <Link
            href="/registro?rol=transportista"
            className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl font-bold text-sm tracking-wide transition-opacity hover:opacity-90 active:opacity-80 lg:py-5 lg:text-base"
            style={{ backgroundColor: "rgba(255,255,255,0.93)", color: "#060F0F" }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--primary-13)" }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h1m4-8h1a2 2 0 012 2v6h-3M13 8h5l2 4" />
              </svg>
            </span>
            <span className="flex flex-col">
              QUIERO TRANSPORTAR
              <span className="text-xs font-medium normal-case tracking-normal" style={{ color: "#4B5563" }}>
                Tengo un vehículo y busco viajes
              </span>
            </span>
          </Link>

          <Link
            href="/publicar"
            className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl font-bold text-sm tracking-wide border transition-colors hover:border-white/40 active:opacity-80 lg:py-5 lg:text-base"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "white",
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#3B82F618" }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </span>
            <span className="flex flex-col">
              QUIERO ENVIAR
              <span className="text-xs font-medium normal-case tracking-normal" style={{ color: "#9CA3AF" }}>
                Desde un flete chico hasta varios camiones
              </span>
            </span>
          </Link>

          {/* Quien llega desde redes sin conocer la app puede ver de qué se trata */}
          <p className="text-center text-xs" style={{ color: "#9CA3AF" }}>
            ¿Qué es ClickCargo?{" "}
            <Link href="/enviar" className="font-semibold underline underline-offset-2">
              Para enviar
            </Link>
            {" · "}
            <Link href="/para-transportistas" className="font-semibold underline underline-offset-2">
              Para transportar
            </Link>
          </p>

          {gratis && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="text-sm" style={{ color: "#9CA3AF" }}>Lanzamiento inicial</span>
              <span
                className="text-sm font-black px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#4ADE8022", color: "#4ADE80", border: "1px solid #4ADE8044" }}
              >
                {dias === null ? "GRATIS" : dias === 1 ? "GRATIS hasta mañana" : `GRATIS ${dias} días más`}
              </span>
            </div>
          )}

          <p className="text-center text-xs" style={{ color: "#6B7280" }}>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#4ADE80" }}>
              Ingresá
            </Link>
          </p>

          <p className="text-center text-xs" style={{ color: "#4B5563" }}>
            <Link href="/terminos">Términos</Link>
            {" · "}
            <Link href="/politica-de-privacidad">Privacidad</Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
