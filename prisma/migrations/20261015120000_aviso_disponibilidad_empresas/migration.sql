-- Avisos a empresas cuando un transportista pasa a estar disponible.
-- El orden importa: `disponibleDesde` se rellena antes que
-- `disponibilidadesVistasEn`, así nunca queda más nuevo que lo "visto" y nada
-- de lo ya publicado aparece como novedad en la campana al migrar.

ALTER TABLE "DisponibilidadTransportista" ADD COLUMN "disponibleDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "User" ADD COLUMN "disponibilidadesVistasEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
