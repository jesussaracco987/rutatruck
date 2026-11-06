-- Disponibilidad más detallada: fecha, espacio libre y coordenadas del viaje.
-- Todo opcional: las disponibilidades existentes siguen con la regla de
-- vigencia de siempre (fecha NULL).

ALTER TABLE "DisponibilidadTransportista"
  ADD COLUMN "salidaDesdeLat" DOUBLE PRECISION,
  ADD COLUMN "salidaDesdeLng" DOUBLE PRECISION,
  ADD COLUMN "salidaDestinoLat" DOUBLE PRECISION,
  ADD COLUMN "salidaDestinoLng" DOUBLE PRECISION,
  ADD COLUMN "fecha" DATE,
  ADD COLUMN "espacio" TEXT,
  ADD COLUMN "espacioDetalle" TEXT;
