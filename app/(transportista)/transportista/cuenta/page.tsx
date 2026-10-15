import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import { HamburgerMenu } from "@/app/_components/HamburgerMenu";
import CuentaForm from "@/app/_components/CuentaForm";
import CompletarPerfilBanner from "@/app/_components/CompletarPerfilBanner";
import MiReputacion from "@/app/_components/MiReputacion";

export default async function CuentaTransportistaPage() {
  const session = await verifySession();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      phone: true,
      emailVerified: true,
      notifZonaLat: true,
      notifZonaLng: true,
      notifRadioKm: true,
    },
  });

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="sticky top-0 z-30 border-b px-5 py-3.5 flex items-center justify-between"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <LogoClickCargo />
        <HamburgerMenu role="transportista" isMultiRole={session.role === "EMPRESA_TRANSPORTISTA"} />
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">Mi cuenta</h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Tus datos y preferencias de notificación
          </p>
        </div>

        <CompletarPerfilBanner phone={user.phone} emailVerified={user.emailVerified} />

        <MiReputacion userId={session.userId} />

        <div
          className="rounded-2xl border p-5"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <CuentaForm
            email={user.email}
            emailVerified={user.emailVerified}
            phone={user.phone}
            notifZonaLat={user.notifZonaLat}
            notifZonaLng={user.notifZonaLng}
            notifRadioKm={user.notifRadioKm}
            zonaCompartida={session.role === "EMPRESA_TRANSPORTISTA"}
          />
        </div>
      </main>
    </div>
  );
}
