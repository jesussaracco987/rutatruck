-- Canal por el que llegó cada usuario antes de registrarse (utm_* del link,
-- primera página vista y dominio de referencia). Lo captura proxy.ts en una
-- cookie y signup lo copia acá. Null en los usuarios anteriores a este cambio.

ALTER TABLE "User" ADD COLUMN "origenFuente" TEXT;
ALTER TABLE "User" ADD COLUMN "origenMedio" TEXT;
ALTER TABLE "User" ADD COLUMN "origenCampania" TEXT;
ALTER TABLE "User" ADD COLUMN "origenContenido" TEXT;
ALTER TABLE "User" ADD COLUMN "origenLanding" TEXT;
ALTER TABLE "User" ADD COLUMN "origenReferrer" TEXT;
