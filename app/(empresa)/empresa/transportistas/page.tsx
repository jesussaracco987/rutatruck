import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import { BottomTabBar } from "@/app/_components/BottomTabBar";
import type { TransportistaDisp } from "./_components/MapaTransportistas";
import MapaTransportistasWrapper from "./_components/MapaTransportistasWrapper";
import { whereDisponibilidadVigente } from "@/lib/disponibilidad";
import { CONFIANZA_VACIA, findConfianzaTransportistas } from "@/lib/repositories/resena.repository";

export default async function TransportistasMapPage() {
  const session = await verifySession();

  const disponibilidades = await db.disponibilidadTransportista.findMany({
    where: {
      ...whereDisponibilidadVigente(),
      transportistaId: { not: session.userId },
    },
    select: {
      id: true,
      transportistaId: true,
      vehiculo: true,
      zona: true,
      lat: true,
      lng: true,
      radioKm: true,
      regresoVacio: true,
      buscaCarga: true,
      voyAPuerto: true,
      disponibleHoy: true,
      salidaDesde: true,
      salidaDestino: true,
      actualizadoEn: true,
    },
  });

  const favs = await db.favoritoTransportista.findMany({
    where: { empresaId: session.userId },
    select: { transportistaId: true },
  });
  const favSet = new Set(favs.map((f: { transportistaId: string }) => f.transportistaId));

  // El mapa es anónimo (sin nombre ni contacto), pero la reputación sí se
  // muestra: es lo que le permite a la empresa elegir a quién le escribe.
  const confianza = await findConfianzaTransportistas(disponibilidades.map((d) => d.transportistaId));

  const data: TransportistaDisp[] = disponibilidades.map((d: typeof disponibilidades[0]) => ({
    ...d,
    actualizadoEn: d.actualizadoEn.toISOString(),
    esFavorito: favSet.has(d.transportistaId),
    ...(confianza.get(d.transportistaId) ?? CONFIANZA_VACIA),
  }));

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="sticky top-0 z-30 border-b px-5 py-3.5 flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
      >
        <div>
          <LogoClickCargo />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: "#374151" }}>
            Mapa de transportistas
          </span>
          <HamburgerMenu role="empresa" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
        </div>
      </header>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-5">
          <div
            className="rounded-2xl border p-10 text-center max-w-sm w-full"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <p className="text-4xl mb-4">🗺️</p>
            <p className="text-base font-bold text-gray-900 mb-2">
              Sin transportistas disponibles
            </p>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Cuando los transportistas se marquen como disponibles, los verás en el mapa.
            </p>
          </div>
        </div>
      ) : (
        <MapaTransportistasWrapper initialData={data} />
      )}

      <BottomTabBar role="empresa" />
    </div>
  );
}
