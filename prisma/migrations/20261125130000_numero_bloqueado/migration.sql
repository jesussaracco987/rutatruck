-- CreateTable
CREATE TABLE "NumeroBloqueado" (
    "telefono" TEXT NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NumeroBloqueado_pkey" PRIMARY KEY ("telefono")
);
