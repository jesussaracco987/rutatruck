import { db } from "@/lib/db";
import { emit } from "@/lib/events/bus";

/** Mejor candidato primero: con el viaje confirmado (pagó), después aceptado, después pendiente. */
function prioridad(p: { estado: string; matchConfirmadoEn: Date | null }): number {
  if (p.estado === "ACEPTADA" && p.matchConfirmadoEn) return 0;
  if (p.estado === "ACEPTADA") return 1;
  return 2;
}

/**
 * Si el líder de un grupo quedó afuera (postulación RECHAZADA, por ejemplo
 * porque no pagó la comisión a tiempo y los demás sí), el grupo pasa al
 * siguiente miembro que sigue adentro: el que ya tiene el viaje confirmado y,
 * entre iguales, el que se sumó primero.
 *
 * El chat grupal es el hilo del líder, así que se mudan los mensajes al hilo
 * del nuevo líder (la historia no se pierde) y el resto del grupo pasa a
 * colgar de él. El líder anterior deja de ver el chat.
 *
 * Idempotente: se puede llamar después de cualquier cambio de estado de la
 * carga; si no hay grupos sin líder, no hace nada. Si cancelan la carga quedan
 * todos RECHAZADA y no hay a quién pasarle el grupo.
 */
export async function traspasarGruposSinLider(cargaId: number) {
  const huerfanos = await db.postulacion.findMany({
    where: {
      cargaId,
      estado: { not: "RECHAZADA" },
      grupoLider: { estado: "RECHAZADA" },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      estado: true,
      matchConfirmadoEn: true,
      transportistaId: true,
      grupoLiderId: true,
      carga: { select: { titulo: true } },
    },
  });
  if (huerfanos.length === 0) return;

  const porGrupo = new Map<number, typeof huerfanos>();
  for (const p of huerfanos) {
    porGrupo.set(p.grupoLiderId!, [...(porGrupo.get(p.grupoLiderId!) ?? []), p]);
  }

  for (const [liderAnteriorId, miembros] of porGrupo) {
    // sort es estable: entre iguales queda el orden de llegada.
    const [nuevo, ...resto] = [...miembros].sort((a, b) => prioridad(a) - prioridad(b));

    await db.$transaction([
      db.postulacion.update({ where: { id: nuevo.id }, data: { grupoLiderId: null } }),
      db.postulacion.updateMany({
        where: { id: { in: resto.map((m) => m.id) } },
        data: { grupoLiderId: nuevo.id },
      }),
      db.mensaje.updateMany({ where: { postulacionId: liderAnteriorId }, data: { postulacionId: nuevo.id } }),
    ]);

    emit("grupo.lider_cambiado", {
      nuevoLiderId: nuevo.transportistaId,
      miembroIds: resto.map((m) => m.transportistaId),
      cargaId,
      titulo: nuevo.carga.titulo,
    });
  }
}
