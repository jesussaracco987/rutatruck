import { NextRequest, NextResponse } from "next/server";
import { parseCargaInput } from "@/lib/carga-input";
import { crearCuenta } from "@/lib/services/cuenta.service";
import { publicarCarga } from "@/lib/services/carga.service";

/**
 * Publicación desde `/publicar`, sin cuenta previa: con los datos de contacto
 * de la carga y una contraseña crea la cuenta de empresa, inicia sesión y
 * publica, todo en un paso. Pedir el registro antes de dejar cargar el flete
 * era donde se perdían las empresas que llegaban por los anuncios.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Se valida la carga antes de crear la cuenta, para no dejar cuentas
  // creadas por un formulario que después no se puede publicar.
  const input = parseCargaInput(body);
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }
  if (body.aceptaTerminos !== true) {
    return NextResponse.json(
      { error: "Tenés que aceptar los Términos y la Política de Privacidad" },
      { status: 400 },
    );
  }

  const cuenta = await crearCuenta({
    name: input.data.contactoNombre,
    email: input.data.contactoEmail,
    password: typeof body.password === "string" ? body.password : "",
    role: "EMPRESA",
  });
  if (!cuenta.ok) {
    return NextResponse.json(
      { error: cuenta.error, emailExistente: cuenta.emailExistente ?? false },
      { status: cuenta.emailExistente ? 409 : 400 },
    );
  }

  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const result = await publicarCarga({ ...input.data, empresaId: cuenta.userId }, origin);
  if (!result.ok) {
    // La cuenta ya quedó creada y con sesión: el formulario lo manda a
    // publicar desde el panel, donde el borrador se restaura solo.
    return NextResponse.json(
      { error: result.error, cuentaCreada: true },
      { status: result.status },
    );
  }
  return NextResponse.json(
    "cargaId" in result ? { cargaId: result.cargaId } : { url: result.url },
    { status: 201 },
  );
}
