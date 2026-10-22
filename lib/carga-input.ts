/**
 * Valida y normaliza el formulario de nueva carga. Lo comparten la publicación
 * con cuenta (`POST /api/cargas`) y la publicación sin cuenta
 * (`POST /api/cargas/invitado`).
 */
export function parseCargaInput(body: Record<string, unknown>) {
  const {
    origen,
    origenLat,
    origenLng,
    destino,
    destinoLat,
    destinoLng,
    tipoCarga,
    tipoCargaDetalle,
    peso,
    pesoUnidad,
    volumen,
    cantidadCamiones,
    presupuesto,
    fechaCarga,
    fechaCupo,
    preferenciaCamion,
    descripcion,
    contactoNombre,
    contactoTelefono,
    contactoEmail,
  } = body as Record<string, string>;

  if (
    !origen ||
    !destino ||
    !tipoCarga ||
    !fechaCarga ||
    !contactoNombre ||
    !contactoTelefono ||
    !contactoEmail
  ) {
    return { ok: false as const, error: "Faltan campos requeridos" };
  }

  if (fechaCupo && new Date(fechaCupo) < new Date(fechaCarga)) {
    return {
      ok: false as const,
      error: "La fecha de cupo no puede ser anterior a la fecha de carga",
    };
  }

  return {
    ok: true as const,
    data: {
      titulo: `${origen} → ${destino}`,
      origen,
      origenLat: origenLat ? parseFloat(origenLat) : null,
      origenLng: origenLng ? parseFloat(origenLng) : null,
      destino,
      destinoLat: destinoLat ? parseFloat(destinoLat) : null,
      destinoLng: destinoLng ? parseFloat(destinoLng) : null,
      tipoCarga,
      tipoCargaDetalle: tipoCargaDetalle || null,
      peso: peso ? parseFloat(peso) : null,
      pesoUnidad: pesoUnidad || null,
      volumen: volumen ? parseFloat(volumen) : null,
      cantidadCamiones: cantidadCamiones ? Math.max(1, parseInt(cantidadCamiones)) : 1,
      presupuesto: presupuesto ? parseFloat(presupuesto) : null,
      fechaCarga: new Date(fechaCarga),
      fechaCupo: fechaCupo ? new Date(fechaCupo) : null,
      preferenciaCamion: preferenciaCamion || null,
      descripcion: descripcion || null,
      contactoNombre,
      contactoTelefono,
      contactoEmail,
    },
  };
}
