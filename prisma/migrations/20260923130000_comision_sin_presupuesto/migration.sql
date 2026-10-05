-- Con la comisión en PORCENTAJE y una carga sin presupuesto ("a acordar"),
-- calcularComision devolvía comisionValor tal cual: con 0.08 (8%) se cobraban
-- $0,08. Este es el monto fijo por camión que se cobra en ese caso.

ALTER TABLE "ConfigApp" ADD COLUMN "comisionSinPresupuesto" DOUBLE PRECISION NOT NULL DEFAULT 5000;
