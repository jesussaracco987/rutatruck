import { db } from "@/lib/db";
import { whereDisponibilidadVigente } from "@/lib/disponibilidad";
import { enAlcance } from "@/lib/zona";

/**
 * Transportistas disponibles que le interesan a una empresa en la campana:
 * vigentes, al alcance de su zona o del radio de trabajo del transportista
 * (misma regla que el push) y sin contarse a sí
 * misma — una cuenta EMPRESA_TRANSPORTISTA no tiene que enterarse de su
 * propia disponibilidad. `nueva` = quedó disponible después de la última vez
 * que la empresa marcó la campana como vista.
 *
 * El filtro de zona es en memoria: la cantidad de disponibilidades vigentes es
 * chica y la distancia no se puede expresar en un where de Prisma.
 */
export async function findDisponibilidadesParaEmpresa(empresaId: string) {
  const [empresa, disponibilidades] = await Promise.all([
    db.user.findUnique({
      where: { id: empresaId },
      select: {
        notifZonaLat: true,
        notifZonaLng: true,
        notifRadioKm: true,
        disponibilidadesVistasEn: true,
      },
    }),
    db.disponibilidadTransportista.findMany({
      where: { ...whereDisponibilidadVigente(), transportistaId: { not: empresaId } },
      select: {
        id: true,
        zona: true,
        vehiculo: true,
        lat: true,
        lng: true,
        radioKm: true,
        disponibleDesde: true,
        transportista: { select: { name: true } },
      },
      orderBy: { disponibleDesde: "desc" },
    }),
  ]);
  if (!empresa) return [];

  return disponibilidades
    .filter((d) => enAlcance(empresa, d.lat, d.lng, d.radioKm))
    .map((d) => ({ ...d, nueva: d.disponibleDesde > empresa.disponibilidadesVistasEn }));
}

export async function countDisponibilidadesNuevas(empresaId: string): Promise<number> {
  const disponibilidades = await findDisponibilidadesParaEmpresa(empresaId);
  return disponibilidades.filter((d) => d.nueva).length;
}

export async function marcarDisponibilidadesVistas(empresaId: string) {
  await db.user.update({
    where: { id: empresaId },
    data: { disponibilidadesVistasEn: new Date() },
  });
}
