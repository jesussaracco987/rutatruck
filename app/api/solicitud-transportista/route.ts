import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { claveVisitante, consumirLimite } from "@/lib/limite-uso";
import { ORIGEN_COOKIE, parseOrigen } from "@/lib/origen";
import { whatsappUrl } from "@/lib/site";
import { crearSolicitud, validarSolicitud } from "@/lib/services/solicitud-transportista.service";

/**
 * "Quiero sumarme como transportista": guarda el pedido (así no se pierde
 * aunque la persona no llegue a mandar el WhatsApp) y devuelve el link de
 * WhatsApp con sus datos ya escritos.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!(await consumirLimite(`solicitud-transp:${claveVisitante(req)}`, 5))) {
    return NextResponse.json({ error: "Ya recibimos tus datos. Escribinos por WhatsApp." }, { status: 429 });
  }

  const datos = validarSolicitud(body);
  if ("error" in datos) return NextResponse.json({ error: datos.error }, { status: 400 });

  const origen = parseOrigen((await cookies()).get(ORIGEN_COOKIE)?.value);
  await crearSolicitud(datos, origen);

  const lineas = [
    `Hola, soy ${datos.nombre} y quiero sumarme como transportista en ClickCargo.`,
    `WhatsApp: ${datos.telefono}`,
    datos.email ? `Email: ${datos.email}` : null,
    datos.localidad ? `Zona: ${datos.localidad}` : null,
    datos.vehiculo ? `Vehículo: ${datos.vehiculo}` : null,
  ].filter(Boolean);

  return NextResponse.json({ whatsapp: whatsappUrl(lineas.join("\n")) }, { status: 201 });
}
