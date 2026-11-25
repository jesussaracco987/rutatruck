-- AlterTable
ALTER TABLE "Postulacion" ADD COLUMN "grupoLiderId" INTEGER;

-- CreateIndex
CREATE INDEX "Postulacion_grupoLiderId_idx" ON "Postulacion"("grupoLiderId");

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_grupoLiderId_fkey" FOREIGN KEY ("grupoLiderId") REFERENCES "Postulacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
