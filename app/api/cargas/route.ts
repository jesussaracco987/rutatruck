import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isEmpresa } from "@/lib/roles";
import { parseCargaInput } from "@/lib/carga-input";
import { publicarCarga } from "@/lib/services/carga.service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isEmpresa(session.role)) {
    return NextResponse.json(
      { error: "Solo empresas pueden publicar cargas" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const input = parseCargaInput(body);
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const result = await publicarCarga({ ...input.data, empresaId: session.userId }, origin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(
    "cargaId" in result ? { cargaId: result.cargaId } : { url: result.url },
    { status: 201 },
  );
}
