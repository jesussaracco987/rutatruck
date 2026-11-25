export type Events = {
  "pago.aprobado.publicacion": {
    cargaId: number;
    titulo: string;
    origen: string;
    destino: string;
    origenLat: number | null;
    origenLng: number | null;
    empresaId: string;
  };
  "carga.publicada": {
    cargaId: number;
    titulo: string;
    origen: string;
    destino: string;
    origenLat: number | null;
    origenLng: number | null;
    empresaId: string;
  };
  "postulacion.aceptada": {
    transportistaId: string;
    cargaId: number;
    titulo: string;
    convocatoriaCubierta?: boolean;
  };
  /** Abrió la ronda de cobro: cada uno de estos transportistas debe pagar su comisión. */
  "comision.requerida": {
    cargaId: number;
    titulo: string;
    transportistaIds: string[];
    deadlineHoras: number;
  };
  "oferta-privada.respondida": {
    empresaId: string;
    transportistaId: string;
    cargaId: number;
    titulo: string;
    accion: "aceptar" | "rechazar";
    /** Aceptó, pero el viaje se confirma recién cuando pague la comisión. */
    pagoPendiente: boolean;
  };
  "carga.completada": {
    empresaId: string;
    cargaId: number;
    titulo: string;
  };
  "convocatoria.cerrada": {
    cargaId: number;
    titulo: string;
    transportistaIds: string[];
  };
  /** Alguien se sumó con el link de invitación a la postulación grupal de este líder. */
  "grupo.miembro_sumado": {
    liderId: string;
    cargaId: number;
    titulo: string;
    miembroNombre: string;
    camiones: number;
  };
  /** El líder sacó a este transportista de su grupo (su postulación se borró). */
  "grupo.miembro_quitado": {
    miembroId: string;
    liderNombre: string;
    cargaId: number;
    titulo: string;
  };
  /** El líder del grupo quedó afuera y el grupo (con su chat) pasó a otro miembro. */
  "grupo.lider_cambiado": {
    nuevoLiderId: string;
    miembroIds: string[];
    cargaId: number;
    titulo: string;
  };
  "postulacion.creada": {
    cargaId: number;
    empresaId: string;
    titulo: string;
  };
  "postulacion.vista_transportista": {
    transportistaId: string;
  };
  "postulacion.vista_empresa": {
    empresaId: string;
  };
  /** El transportista pasó de no disponible (sin publicar, desactivada o vencida) a disponible. */
  "disponibilidad.activada": {
    transportistaId: string;
    vehiculo: string;
    zona: string;
    lat: number;
    lng: number;
    radioKm: number | null;
    disponibleHoy: boolean;
    /** "YYYY-MM-DD" o null. */
    fecha: string | null;
    salidaDesde: string | null;
    salidaDestino: string | null;
    viaje: { origen: { lat: number; lng: number }; destino: { lat: number; lng: number } } | null;
  };
  "oferta-privada.creada": {
    transportistaId: string;
    cargaId: number;
    titulo: string;
  };
  "mensaje.creado": {
    postulacionId: number;
    autorId: string;
    /** Un hilo es una postulación: siempre hay exactamente un destinatario. */
    destinatarioId: string;
    destinatarioRole: "empresa" | "transportista";
    autorNombre: string;
    cuerpo: string;
    titulo: string;
  };
};
