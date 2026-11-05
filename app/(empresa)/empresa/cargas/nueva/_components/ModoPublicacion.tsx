import Link from "next/link";

export type Modo = "asistente" | "formulario";

const OPCIONES: { modo: Modo; label: string; href: string }[] = [
  { modo: "asistente", label: "Con el asistente", href: "/empresa/cargas/nueva" },
  { modo: "formulario", label: "Formulario", href: "/empresa/cargas/nueva?modo=formulario" },
];

/** Elige cómo publicar. Son links: cada modo tiene su URL y el navegador vuelve al que estaba. */
export default function ModoPublicacion({ actual }: { actual: Modo }) {
  return (
    <nav aria-label="Cómo publicar" className="mb-6 inline-flex rounded-xl border bg-white p-1" style={{ borderColor: "#E2E8E8" }}>
      {OPCIONES.map((o) => {
        const activo = o.modo === actual;
        return (
          <Link
            key={o.modo}
            href={o.href}
            replace
            aria-current={activo ? "page" : undefined}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={activo ? { backgroundColor: "var(--primary)", color: "#FFFFFF" } : { color: "#4B5563" }}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
