import { NextRequest, NextResponse } from "next/server";
import { limpiarDatosVencidos } from "@/lib/services/publicar-chat.service";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json(await limpiarDatosVencidos());
}
