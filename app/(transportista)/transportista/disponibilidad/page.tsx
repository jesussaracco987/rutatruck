import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import { BottomTabBar } from "@/app/_components/BottomTabBar";
import DisponibilidadForm from "./_components/DisponibilidadForm";
import { esDisponibilidadVigente } from "@/lib/disponibilidad";

export default async function DisponibilidadPage() {
  const session = await verifySession();

  const disp = await db.disponibilidadTransportista.findUnique({
    where: { transportistaId: session.userId },
  });

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#F2F5F5" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b px-5 py-3.5 flex items-center justify-between"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <LogoClickCargo />
        <HamburgerMenu role="transportista" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">Mi disponibilidad</h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Los clientes te verán en el mapa de transportistas disponibles.
          </p>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <DisponibilidadForm
            inicial={
              disp
                ? {
                    ...disp,
                    actualizadoEn: disp.actualizadoEn.toISOString(),
                  }
                : null
            }
            vigenteInicial={disp ? esDisponibilidadVigente(disp) : false}
          />
        </div>

        {disp?.activo && (
          <div
            className="mt-4 rounded-xl border px-4 py-3 text-xs"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#E2E8E8", color: "#6B7280" }}
          >
            Última actualización:{" "}
            {new Date(disp.actualizadoEn).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {esDisponibilidadVigente(disp) ? (
              disp.disponibleHoy ? " · Expira en 24 h" : " · Expira en 7 días"
            ) : (
              <span style={{ color: "#B45309", fontWeight: 700 }}> · Venció, ya no aparecés en el mapa</span>
            )}
          </div>
        )}
      </main>

      <BottomTabBar role="transportista" />
    </div>
  );
}
