import Link from "next/link";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { TIPOS_CUENTA } from "@/lib/services/alta-admin.service";
import AltaCuentaForm from "./_components/AltaCuentaForm";

const ROL_LABEL: Record<string, string> = {
  EMPRESA: "Publica cargas",
  TRANSPORTISTA: "Transportista",
  TRANSPORTISTA_FLOTA: "Transportista con flota",
  EMPRESA_TRANSPORTISTA: "Publica y transporta",
  ADMIN: "Administrador",
};

export default async function CuentasPage() {
  // Leer la sesión además hace la página dinámica (ver admin/solicitudes).
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const recientes = await db.user.findMany({
    where: { origenFuente: "alta_admin" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, name: true, email: true, telefonoLogin: true, role: true, terminosAceptadosEn: true },
  });

  const tipos = Object.entries(TIPOS_CUENTA).map(([value, t]) => ({ value, label: t.label }));
  const tarjeta = { backgroundColor: "#112424", borderColor: "#1E3838" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0C1E1E" }}>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link href="/admin/dashboard" className="text-sm" style={{ color: "#A8C5C5" }}>
            ← Panel
          </Link>
          <h1 className="text-2xl font-bold text-white mt-3">Crear cuenta</h1>
          <p className="text-sm mt-1" style={{ color: "#A8C5C5" }}>
            Para dar de alta clientes sin que pasen por el registro. Se crea la cuenta y se genera un link para que
            elijan su contraseña; al activarla aceptan los términos.
          </p>
        </div>

        <section className="rounded-xl border p-4" style={tarjeta}>
          <AltaCuentaForm tipos={tipos} />
        </section>

        {recientes.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold text-white">Creadas desde acá</h2>
            {recientes.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
                style={tarjeta}
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {u.name} <span style={{ color: "#6B7280" }}>· {ROL_LABEL[u.role] ?? u.role}</span>
                  </p>
                  <p className="text-xs truncate" style={{ color: "#6B7280" }}>
                    {[u.email, u.telefonoLogin].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: u.terminosAceptadosEn ? "#4ADE80" : "#F59E0B" }}
                >
                  {u.terminosAceptadosEn ? "Activa" : "Sin activar"}
                </span>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
