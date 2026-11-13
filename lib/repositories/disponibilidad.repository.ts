import { db } from "@/lib/db";
import { fechaISO, sumarDias, viajeConCoords, whereDisponibilidadVigente } from "@/lib/disponibilidad";
import { cargaQuedaDePaso, enAlcance, viajePasaPorZona } from "@/lib/zona";
import { hoyArgentina } from "@/lib/chat-carga";

/**
 * Transportistas disponibles que le interesan a una empresa en la campana:
 * vigentes, al alcance de su zona o del radio de trabajo del transportista
 * (misma regla que el push), o con un viaje anunciado que pasa por su zona, y sin contarse a sí
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
        salidaDesdeLat: true,
        salidaDesdeLng: true,
        salidaDestinoLat: true,
        salidaDestinoLng: true,
        disponibleDesde: true,
        transportista: { select: { name: true } },
      },
      orderBy: { disponibleDesde: "desc" },
    }),
  ]);
  if (!empresa) return [];

  return disponibilidades
    .filter((d) => {
      if (enAlcance(empresa, d.lat, d.lng, d.radioKm)) return true;
      const viaje = viajeConCoords(d);
      return viaje != null && viajePasaPorZona(empresa, viaje.origen, viaje.destino);
    })
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

/** Días de tolerancia entre la fecha de la carga y la del viaje anunciado. */
const TOLERANCIA_FECHA_DIAS = 1;

/**
 * Transportistas con un viaje anunciado al que la carga le queda de paso (ver
 * cargaQuedaDePaso), en una fecha compatible. Un viaje sin fecha ("salgo esta
 * semana") cuenta siempre: la vigencia de 7 días ya lo acota.
 */
export async function findTransportistasConViajeDePaso(carga: {
  origenLat: number | null;
  origenLng: number | null;
  destinoLat: number | null;
  destinoLng: number | null;
  fechaCarga: Date;
  empresaId: string;
}): Promise<string[]> {
  if (carga.origenLat == null || carga.origenLng == null || carga.destinoLat == null || carga.destinoLng == null) {
    return [];
  }
  const tramo = {
    origen: { lat: carga.origenLat, lng: carga.origenLng },
    destino: { lat: carga.destinoLat, lng: carga.destinoLng },
  };
  const diaCarga = hoyArgentina(carga.fechaCarga);

  const disponibilidades = await db.disponibilidadTransportista.findMany({
    where: {
      ...whereDisponibilidadVigente(),
      transportistaId: { not: carga.empresaId },
      salidaDesdeLat: { not: null },
      salidaDestinoLat: { not: null },
    },
    select: {
      transportistaId: true,
      fecha: true,
      salidaDesdeLat: true,
      salidaDesdeLng: true,
      salidaDestinoLat: true,
      salidaDestinoLng: true,
    },
  });

  return disponibilidades
    .filter((d) => {
      const viaje = viajeConCoords(d);
      if (!viaje || !cargaQuedaDePaso(tramo, viaje)) return false;
      const fecha = fechaISO(d.fecha);
      if (!fecha) return true;
      return fecha >= sumarDias(diaCarga, -TOLERANCIA_FECHA_DIAS) && fecha <= sumarDias(diaCarga, TOLERANCIA_FECHA_DIAS);
    })
    .map((d) => d.transportistaId);
}
