
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type { PreferenceRequest } from "mercadopago/dist/clients/preference/commonTypes";

function getClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  });
}

/**
 * Modo de pago simulado (dev / preview): aprueba cualquier pago sin Mercado
 * Pago. Nunca corre en producción aunque la variable quede puesta por error,
 * porque haría gratis todas las publicaciones y comisiones.
 */
export function pagoMockActivo(): boolean {
  if (process.env.USE_PAYMENT_MOCK !== "true") return false;
  if (process.env.VERCEL_ENV === "production") {
    console.error("[mercadopago] USE_PAYMENT_MOCK está activo en producción; se ignora.");
    return false;
  }
  return true;
}

export async function crearPreferencia(body: PreferenceRequest) {
  if (pagoMockActivo()) {
    const externalRef = body.external_reference ?? "mock";
    const mockBase = externalRef.startsWith("comision_post_")
      ? `${process.env.NEXTAUTH_URL}/transportista/pago-mock`
      : `${process.env.NEXTAUTH_URL}/empresa/pago-mock`;
    return {
      id: "mock-preference-id",
      init_point: `${mockBase}?ref=${externalRef}`,
      sandbox_init_point: `${mockBase}?ref=${externalRef}`,
    };
  }

  const preference = new Preference(getClient());
  return preference.create({ body });
}

export async function obtenerPago(paymentId: string) {
  if (pagoMockActivo()) {
    return {
      id: paymentId,
      status: "approved",
      external_reference: paymentId,
    };
  }

  const payment = new Payment(getClient());
  return payment.get({ id: paymentId });
}
