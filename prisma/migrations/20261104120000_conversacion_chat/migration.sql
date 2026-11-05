-- CreateTable
CREATE TABLE "ConversacionChat" (
    "id" TEXT NOT NULL,
    "visitante" TEXT NOT NULL,
    "userId" TEXT,
    "origen" TEXT NOT NULL,
    "mensajes" JSONB NOT NULL DEFAULT '[]',
    "borradorAsistente" JSONB,
    "borradorConfirmado" JSONB,
    "camposCorregidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pasoMaximo" TEXT NOT NULL DEFAULT 'chat',
    "preguntas" INTEGER NOT NULL DEFAULT 0,
    "audios" INTEGER NOT NULL DEFAULT 0,
    "audiosCorregidos" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "fallo" TEXT,
    "cargaId" INTEGER,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversacionChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversacionChat_creadaEn_idx" ON "ConversacionChat"("creadaEn");
