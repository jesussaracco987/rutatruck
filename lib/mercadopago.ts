
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type { PreferenceRequest } from "mercadopago/dist/clients/preference/commonTypes";

function getClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  });
}

export async function crearPreferencia(body: PreferenceRequest) {
  if (process.env.USE_PAYMENT_MOCK === "true") {
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
  if (process.env.USE_PAYMENT_MOCK === "true") {
    return {
      id: paymentId,
      status: "approved",
      external_reference: paymentId,
    };
  }

  const payment = new Payment(getClient());
  return payment.get({ id: paymentId });
}
