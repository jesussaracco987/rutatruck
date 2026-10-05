import { verifySession } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { db } from "@/lib/db";
import { getComisionConfig } from "@/lib/comision";
import ComisionForm from "./_components/ComisionForm";
import PrecioPublicacionForm from "./_components/PrecioPublicacionForm";

export default async function AdminDashboard() {
  const session = await verifySession();

  if (session.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const [empresas, transportistas, cargas, disputas, comision] = await Promise.all([
    db.user.count({ where: { role: "EMPRESA" } }),
    db.user.count({ where: { role: "TRANSPORTISTA" } }),
    db.carga.count(),
    db.carga.count({ where: { estado: "DISPUTA" } }),
    getComisionConfig(),
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0C1E1E" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">ClickCargo</h1>
          <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm cursor-pointer hover:text-gray-400"
            style={{ color: "#A8C5C5" }}
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Panel de Administración</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Empresas",
                value: empresas,
                href: null,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
              },
              {
                label: "Transportistas",
                value: transportistas,
                href: null,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h.01M12 17h.01M16 17h.01M3 9h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9 9V5a3 3 0 016 0v4" />
                  </svg>
                ),
              },
              {
                label: "Cargas",
                value: cargas,
                href: null,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
              },
              {
                label: "Disputas",
                value: disputas,
                href: "/admin/disputas",
                alert: disputas > 0,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ),
              },
            ].map(({ label, value, href, alert, icon }) => {
              const card = (
                <div
                  key={label}
                  className="rounded-xl border p-4 text-center flex flex-col items-center gap-2"
                  style={{
                    backgroundColor: alert ? "#2D1B3A" : "#112424",
                    borderColor: alert ? "#7C3AED55" : "var(--primary-20)",
                  }}
                >
                  <span style={{ color: alert ? "#C084FC" : "var(--primary)" }}>{icon}</span>
                  <p className="text-3xl font-bold" style={{ color: alert ? "#C084FC" : "white" }}>{value}</p>
                  <p className="text-sm font-medium" style={{ color: alert ? "#A855F7" : "#C4DCDC" }}>{label}</p>
                </div>
              );
              return href ? (
                <a key={label} href={href} className="hover:opacity-80 transition-opacity">
                  {card}
                </a>
              ) : (
                <div key={label}>{card}</div>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: "#112424", borderColor: "#1E3838" }}
        >
          <h3 className="font-semibold text-white mb-1">Precio de publicación de carga</h3>
          <p className="text-sm mb-5" style={{ color: "#A8C5C5" }}>
            Monto que paga la empresa para publicar una carga.
          </p>
          <PrecioPublicacionForm precioPublicacion={comision.precioPublicacion} />
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: "#112424", borderColor: "#1E3838" }}
        >
          <h3 className="font-semibold text-white mb-1">Comisión del transportista</h3>
          <p className="text-sm mb-5" style={{ color: "#A8C5C5" }}>
            Monto que paga el transportista para activar un viaje.
          </p>
          <ComisionForm
            comisionTipo={comision.comisionTipo}
            comisionValor={comision.comisionValor}
            comisionSinPresupuesto={comision.comisionSinPresupuesto}
          />
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: "#112424", borderColor: "#1E3838" }}
        >
          <h3 className="font-semibold text-white mb-1">Crear usuario admin</h3>
          <p className="text-sm mb-3" style={{ color: "#A8C5C5" }}>
            Desde terminal con{" "}
            <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "#0F2020", color: "var(--primary)" }}>
              ADMIN_SETUP_SECRET
            </code>{" "}
            configurado en env:
          </p>
          <pre
            className="text-xs rounded-lg p-3 overflow-x-auto"
            style={{ backgroundColor: "#0F2020", color: "#9CA3AF" }}
          >
{`Invoke-RestMethod -Method POST \\
  -Uri "https://tu-app/api/admin/setup" \\
  -Headers @{"Authorization"="Bearer TU_SECRET"} \\
  -ContentType "application/json" \\
  -Body '{"name":"Admin","email":"a@a.com","password":"pass"}'`}
          </pre>
        </div>
      </main>
    </div>
  );
}
