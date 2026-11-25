-- AlterTable
ALTER TABLE "ConversacionChat" ADD COLUMN "telefono" TEXT;

-- CreateIndex
CREATE INDEX "ConversacionChat_telefono_creadaEn_idx" ON "ConversacionChat"("telefono", "creadaEn");
