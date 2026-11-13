import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminar cuenta — ClickCargo",
  description: "Solicitá la eliminación de tu cuenta y datos personales en ClickCargo",
};

export default function EliminarCuentaPage() {
  return (
    <main
      className="min-h-screen px-6 py-12"
      style={{ background: "var(--page-bg)", color: "var(--text)" }}
    >
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm px-8 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--primary)" }}>
          Eliminar cuenta y datos
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Última actualización: junio 2026
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
            ¿Cómo solicitar la eliminación?
          </h2>
          <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
            Para solicitar la eliminación de tu cuenta y todos tus datos personales, envianos un
            correo a:
          </p>
          <a
            href="mailto:clickcargoarg@gmail.com?subject=Solicitud%20de%20eliminación%20de%20cuenta&body=Hola%2C%20quiero%20solicitar%20la%20eliminación%20de%20mi%20cuenta%20y%20datos%20personales.%0A%0ANombre%20de%20usuario%20o%20email%20registrado%3A%20"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white text-sm"
            style={{ backgroundColor: "var(--primary)" }}
          >
            clickcargoarg@gmail.com
          </a>
          <p className="mt-4" style={{ color: "var(--text-secondary)" }}>
            Incluí en el correo el nombre de usuario o el email con el que te registraste.
            Procesamos las solicitudes dentro de los <strong>30 días</strong> hábiles.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
            ¿Qué datos se eliminan?
          </h2>
          <ul className="list-disc pl-6 space-y-1" style={{ color: "var(--text-secondary)" }}>
            <li>Nombre, correo electrónico y contraseña.</li>
            <li>Datos de tu perfil y de transportista (CUIT, razón social, vehículo, etc.).</li>
            <li>Historial de cargas, postulaciones y disponibilidad.</li>
            <li>Mensajes del chat interno.</li>
            <li>Notificaciones y preferencias de la cuenta.</li>
            <li>Datos de ubicación almacenados.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
            Datos que podemos retener
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Por obligaciones legales o contables, podemos conservar ciertos registros de
            transacciones durante el período que exige la normativa vigente. Estos datos no se usan
            con ningún otro fin.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
            Contacto
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            ClickCargo — Argentina
            <br />
            <a
              href="mailto:clickcargoarg@gmail.com"
              style={{ color: "var(--primary)" }}
              className="underline"
            >
              clickcargoarg@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
