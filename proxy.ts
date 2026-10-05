import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { isEmpresa, isTransportista } from "@/lib/roles";
import { ORIGEN_COOKIE, ORIGEN_MAX_AGE, origenDesdeRequest } from "@/lib/origen";

const PUBLIC_ROUTES = ["/", "/login", "/registro"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookie = req.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  const isProtected =
    pathname.startsWith("/empresa") ||
    pathname.startsWith("/transportista") ||
    pathname.startsWith("/admin");

  const isAuthRoute = pathname === "/login" || pathname === "/registro";

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (pathname.startsWith("/admin") && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (
    pathname.startsWith("/empresa") &&
    !isEmpresa(session?.role ?? "") &&
    session?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (
    pathname.startsWith("/transportista") &&
    !isTransportista(session?.role ?? "") &&
    session?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAuthRoute && session) {
    const role = session.role;
    const dest =
      role === "EMPRESA" || role === "EMPRESA_TRANSPORTISTA"
        ? "/empresa/dashboard"
        : role === "TRANSPORTISTA" || role === "TRANSPORTISTA_FLOTA"
          ? "/transportista/cargas"
          : "/admin/dashboard";
    return NextResponse.redirect(new URL(dest, req.nextUrl));
  }

  const res = NextResponse.next();

  // Canal de origen: solo visitantes sin sesión y solo navegaciones de página
  // (los pedidos RSC, el manifest o el service worker no mandan text/html).
  if (!session && req.headers.get("accept")?.includes("text/html")) {
    const origen = origenDesdeRequest(req.nextUrl, req.headers.get("referer"));
    // Un link con campaña pisa lo anterior (último canal conocido); una visita
    // sin campaña solo se guarda si todavía no había nada.
    if (origen.fuente || !req.cookies.has(ORIGEN_COOKIE)) {
      res.cookies.set(ORIGEN_COOKIE, JSON.stringify(origen), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: ORIGEN_MAX_AGE,
        path: "/",
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$|.*\\.svg$).*)"],
};
