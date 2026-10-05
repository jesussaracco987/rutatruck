-- Momento en que el usuario aceptó los Términos y la Política de Privacidad al
-- registrarse. Null en las cuentas creadas antes de que existiera el checkbox.

ALTER TABLE "User" ADD COLUMN "terminosAceptadosEn" TIMESTAMP(3);
