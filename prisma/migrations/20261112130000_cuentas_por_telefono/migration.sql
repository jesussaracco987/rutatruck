-- Cuentas solo con teléfono: email opcional y teléfono de ingreso único.

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "telefonoLogin" TEXT;
CREATE UNIQUE INDEX "User_telefonoLogin_key" ON "User"("telefonoLogin");

-- Links de acceso por usuario (cuentas sin email).
ALTER TABLE "PasswordResetToken" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "PasswordResetToken" ADD COLUMN "userId" TEXT;
