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
