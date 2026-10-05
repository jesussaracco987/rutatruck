import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import truckImg from "@/app/assets/truck2.png";

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
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#060F0F" }}
    >
      {/* Phone-width container */}
      <div
        className="relative w-full sm:max-w-[420px] flex flex-col overflow-hidden"
        style={{ minHeight: "100svh" }}
      >
        {/* Image section — upper portion only */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "56svh" }}>
          <Image
            src={truckImg}
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: "center 45%" }}
            priority
            quality={88}
          />
          {/* Overlay: dark top for logo, clear middle for truck, dark fade to bottom */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(6,15,15,0.1) 20%, rgba(0,0,0,0.0) 85%, rgba(6,15,15,0.88) 95%, rgba(6,15,15,1) 100%)",
            }}
          />

          {/* Logo — top center */}
          <div className="absolute top-8 left-0 right-0 flex flex-col items-center">
            <h1
              className="font-black leading-none mb-1"
              style={{ fontSize: "2.6rem", letterSpacing: "-0.01em", textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)" }}
            >
              <span style={{ color: "#4ADE80" }}>CLICK</span>
              <span className="text-white">CARGO</span>
            </h1>
            <p
              className="uppercase tracking-widest font-medium"
              style={{ fontSize: "0.65rem", color: "#4ADE80", opacity: 0.9, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
            >
              Red integral de cargas
            </p>
          </div>
        </div>

        {/* Dark section — buttons */}
        <div
          className="flex flex-col justify-center flex-1 px-6 py-8 gap-3"
          style={{ backgroundColor: "#060F0F" }}
        >
          <Link
            href="/registro?rol=transportista"
            className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl font-bold text-sm tracking-wide transition-opacity active:opacity-80"
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
            SOY TRANSPORTISTA
          </Link>

          <Link
            href="/registro?rol=empresa"
            className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl font-bold text-sm tracking-wide border transition-opacity active:opacity-80"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            SOY EMPRESA
          </Link>

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-sm" style={{ color: "#9CA3AF" }}>Lanzamiento inicial</span>
            <span
              className="text-sm font-black px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: "#4ADE8022", color: "#4ADE80", border: "1px solid #4ADE8044" }}
            >
              GRATIS 60 días
            </span>
          </div>

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
  );
}
