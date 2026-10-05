import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getComisionConfig } from "@/lib/comision";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const config = await getComisionConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { comisionTipo: string; comisionValor: number; comisionSinPresupuesto?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!["FIJO", "PORCENTAJE"].includes(body.comisionTipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }
  if (typeof body.comisionValor !== "number" || body.comisionValor < 0) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }
  // El porcentaje va como fracción: 8 en vez de 0.08 cobraría el 800%.
  if (body.comisionTipo === "PORCENTAJE" && body.comisionValor > 1) {
    return NextResponse.json(
      { error: "El porcentaje va como fracción: 0.08 = 8%" },
      { status: 400 },
    );
  }
  if (
    body.comisionSinPresupuesto !== undefined &&
    (typeof body.comisionSinPresupuesto !== "number" || body.comisionSinPresupuesto < 0)
  ) {
    return NextResponse.json({ error: "Monto sin presupuesto inválido" }, { status: 400 });
  }

  const data = {
    comisionTipo: body.comisionTipo,
    comisionValor: body.comisionValor,
    ...(body.comisionSinPresupuesto !== undefined
      ? { comisionSinPresupuesto: body.comisionSinPresupuesto }
      : {}),
  };

  const config = await db.configApp.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  return NextResponse.json(config);
}
