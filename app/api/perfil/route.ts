import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      phone: true,
      telefonoLogin: true,
      emailVerified: true,
      notifZonaLat: true,
      notifZonaLng: true,
      notifRadioKm: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { phone, notifZonaLat, notifZonaLng, notifRadioKm } = body;

  const data: Record<string, unknown> = {};

  if (phone !== undefined) {
    data.phone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
  }

  if (notifZonaLat !== undefined || notifZonaLng !== undefined) {
    if (notifZonaLat == null || notifZonaLng == null) {
      data.notifZonaLat = null;
      data.notifZonaLng = null;
      data.notifRadioKm = null;
    } else {
      data.notifZonaLat = Number(notifZonaLat);
      data.notifZonaLng = Number(notifZonaLng);
      data.notifRadioKm = notifRadioKm != null ? Number(notifRadioKm) : null;
    }
  } else if (notifRadioKm !== undefined) {
    data.notifRadioKm = notifRadioKm != null ? Number(notifRadioKm) : null;
  }

  const user = await db.user.update({
    where: { id: session.userId },
    data,
    select: {
      name: true,
      email: true,
      phone: true,
      emailVerified: true,
      notifZonaLat: true,
      notifZonaLng: true,
      notifRadioKm: true,
    },
  });

  return NextResponse.json({ user });
}
