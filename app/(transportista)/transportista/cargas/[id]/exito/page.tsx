import Link from "next/link";

const PASOS = [
  "El cliente revisará tu solicitud",
  "Si te seleccionan, te confirmarán el viaje",
  "Podrás ver el contacto para coordinar",
];

export default function ExitoPostulacionPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 py-16"
      style={{ backgroundColor: "var(--primary)" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        {/* Checkmark */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-8 flex-shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--primary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white text-center mb-2">
          ¡Propuesta enviada!
        </h1>
        <p className="text-base text-center mb-10" style={{ color: "rgba(255,255,255,0.65)" }}>
          El cliente fue notificado.
        </p>

        {/* Próximos pasos */}
        <div className="w-full rounded-2xl p-6" style={{ backgroundColor: "rgba(255,255,255,0.97)" }}>
          <p className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--primary)" }}>
            Próximos pasos
          </p>
          <div className="space-y-4">
            {PASOS.map((paso, i) => (
              <div key={i} className="flex items-start gap-4">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
                  style={{ backgroundColor: "var(--primary-10)", color: "var(--primary)", border: "1.5px solid var(--primary-20)" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm font-medium pt-0.5 leading-snug" style={{ color: "#374151" }}>
                  {paso}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm mt-10">
        <Link
          href="/transportista/postulaciones"
          className="block w-full py-4 rounded-2xl text-center font-black text-base tracking-wide transition-opacity active:opacity-80"
          style={{ border: "2px solid rgba(255,255,255,0.5)", color: "white" }}
        >
          VER MIS VIAJES
        </Link>
      </div>
    </div>
  );
}
