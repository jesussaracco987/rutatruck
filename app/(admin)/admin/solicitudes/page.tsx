import Link from "next/link";
import { db } from "@/lib/db";
import { telefonoWhatsapp } from "@/lib/services/solicitud-transportista.service";
import CrearCuentaForm, { LinkAccesoForm } from "./_components/CrearCuentaForm";

const ESTADO: Record<string, { label: string; color: string }> = {
  CUENTA_CREADA: { label: "Cuenta creada", color: "#4ADE80" },
  DESCARTADA: { label: "Descartada", color: "#6B7280" },
};

export default async function SolicitudesPage() {
  const [pendientes, atendidas] = await Promise.all([
    db.solicitudTransportista.findMany({ where: { estado: "PENDIENTE" }, orderBy: { creadaEn: "asc" } }),
    db.solicitudTransportista.findMany({
      where: { estado: { not: "PENDIENTE" } },
      orderBy: { atendidaEn: "desc" },
      take: 30,
    }),
  ]);

  const tarjeta = { backgroundColor: "#112424", borderColor: "#1E3838" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0C1E1E" }}>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link href="/admin/dashboard" className="text-sm" style={{ color: "#A8C5C5" }}>
            ← Panel
          </Link>
          <h1 className="text-2xl font-bold text-white mt-3">Solicitudes de transportistas</h1>
          <p className="text-sm mt-1" style={{ color: "#A8C5C5" }}>
            Dejaron sus datos con &quot;Quiero sumarme&quot;. Confirmá por WhatsApp, creá la cuenta y mandales el
            link para elegir contraseña.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold text-white">Pendientes ({pendientes.length})</h2>
          {pendientes.length === 0 && (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              No hay solicitudes pendientes.
            </p>
          )}
          {pendientes.map((s) => (
            <div key={s.id} className="rounded-xl border p-4 space-y-3" style={tarjeta}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{s.nombre}</p>
                  <p className="text-sm" style={{ color: "#A8C5C5" }}>
                    {[s.telefono, s.email, s.localidad, s.vehiculo].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                    {s.creadaEn.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
                    {s.origenFuente && ` · ${s.origenFuente}${s.origenCampania ? ` / ${s.origenCampania}` : ""}`}
                  </p>
                </div>
                <a
                  href={`https://wa.me/${telefonoWhatsapp(s.telefono)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  style={{ borderColor: "var(--primary-20)", color: "#4ADE80" }}
                >
                  WhatsApp
                </a>
              </div>
              <CrearCuentaForm id={s.id} email={s.email} />
            </div>
          ))}
        </section>

        <section className="rounded-xl border p-4 space-y-2" style={tarjeta}>
          <h2 className="font-semibold text-white">Link de acceso por teléfono</h2>
          <p className="text-sm" style={{ color: "#A8C5C5" }}>
            Para quien entra con su teléfono y no recuerda la contraseña: no tiene email al que mandarle el link.
          </p>
          <LinkAccesoForm />
        </section>

        {atendidas.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold text-white">Atendidas</h2>
            {atendidas.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
                style={tarjeta}
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{s.nombre}</p>
                  <p className="text-xs truncate" style={{ color: "#6B7280" }}>
                    {s.email ?? s.telefono}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: ESTADO[s.estado]?.color ?? "#6B7280" }}
                >
                  {ESTADO[s.estado]?.label ?? s.estado}
                </span>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
