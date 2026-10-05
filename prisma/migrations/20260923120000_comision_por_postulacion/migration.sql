-- La comisión se cobraba una sola vez por carga, al escalar
-- "transportistaAsignadoId": en una convocatoria de varios camiones pagaba el
-- primer aceptado y el resto viajaba gratis. Ahora cada postulación aceptada
-- paga la suya y guarda cuándo quedó confirmado su match.

ALTER TABLE "Postulacion" ADD COLUMN "matchConfirmadoEn" TIMESTAMP(3);
ALTER TABLE "Postulacion" ADD COLUMN "comisionMpPaymentId" TEXT;

-- Backfill: los matches que ya estaban en curso se dan por confirmados (hasta
-- ahora corría FREE_TIER, así que ya tenían chat y contacto habilitados). Se
-- excluyen los que todavía esperaban el pago de la comisión.
UPDATE "Postulacion" p
SET "matchConfirmadoEn" = p."updatedAt"
FROM "Carga" c
WHERE p."cargaId" = c."id"
  AND p."estado" = 'ACEPTADA'
  AND c."estado" <> 'PENDIENTE_PAGO_TRANSPORTISTA';
