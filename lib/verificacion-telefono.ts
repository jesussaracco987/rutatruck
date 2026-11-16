/**
 * Confirmación del teléfono por WhatsApp (ver verificacion-telefono.service).
 *
 * Apagada a propósito: falta dar de alta el número en la WhatsApp Cloud API y
 * apuntar el webhook a /api/whatsapp/webhook. Mientras esté en `false`, el
 * botón no aparece en Mi cuenta y las rutas responden 404. Es una constante y
 * no una variable de entorno para que se prenda con un commit.
 */
export const VERIFICACION_TELEFONO_HABILITADA = false;
