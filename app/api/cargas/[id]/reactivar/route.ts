import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { isEmpresa } from "@/lib/roles";
import { reactivarCargaCancelada } from "@/lib/services/carga.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isEmpresa(session.role)) return NextResponse.json({ error: "Solo empresas" }, { status: 403 });

  const { id } = await params;
  const cargaId = parseInt(id);
  if (isNaN(cargaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { fechaCarga, fechaCupo } = body;
  if (!fechaCarga || String(fechaCarga) === "") {
    return NextResponse.json({ error: "Falta la fecha de carga" }, { status: 400 });
  }

  const nuevaFechaCarga = new Date(String(fechaCarga));
  if (isNaN(nuevaFechaCarga.getTime())) {
    return NextResponse.json({ error: "Fecha de carga inválida" }, { status: 400 });
  }

  let nuevaFechaCupo: Date | null = null;
  if (fechaCupo && String(fechaCupo) !== "") {
    nuevaFechaCupo = new Date(String(fechaCupo));
    if (isNaN(nuevaFechaCupo.getTime())) {
      return NextResponse.json({ error: "Fecha de entrega inválida" }, { status: 400 });
    }
  }

  const result = await reactivarCargaCancelada(
    cargaId,
    session.userId,
    nuevaFechaCarga,
    nuevaFechaCupo,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
