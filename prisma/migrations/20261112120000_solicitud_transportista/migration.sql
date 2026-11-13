-- Alta asistida de transportistas: el pedido queda guardado y un admin crea la cuenta.

CREATE TABLE "SolicitudTransportista" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "localidad" TEXT,
    "vehiculo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "userId" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendidaEn" TIMESTAMP(3),
    "origenFuente" TEXT,
    "origenMedio" TEXT,
    "origenCampania" TEXT,
    "origenContenido" TEXT,
    "origenLanding" TEXT,
    "origenReferrer" TEXT,

    CONSTRAINT "SolicitudTransportista_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SolicitudTransportista_estado_creadaEn_idx" ON "SolicitudTransportista"("estado", "creadaEn");
