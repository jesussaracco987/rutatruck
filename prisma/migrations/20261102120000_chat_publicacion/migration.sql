-- CreateTable
CREATE TABLE "CodigoPublicacion" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoPublicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimiteUso" (
    "clave" TEXT NOT NULL,
    "ventana" TIMESTAMP(3) NOT NULL,
    "conteo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LimiteUso_pkey" PRIMARY KEY ("clave","ventana")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoPublicacion_email_key" ON "CodigoPublicacion"("email");

-- CreateIndex
CREATE INDEX "LimiteUso_ventana_idx" ON "LimiteUso"("ventana");
