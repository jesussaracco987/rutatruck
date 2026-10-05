import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — ClickCargo",
  description: "Política de privacidad de ClickCargo",
};

export default function PoliticaDePrivacidadPage() {
  return (
    <main
      className="min-h-screen px-6 py-12"
      style={{ background: "var(--page-bg)", color: "var(--text)" }}
    >
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm px-8 py-10">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--primary)" }}>
        Política de Privacidad
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Última actualización: octubre 2026
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          1. Información que recopilamos
        </h2>
        <p className="mb-2" style={{ color: "var(--text-secondary)" }}>
          ClickCargo recopila la siguiente información cuando usás nuestra plataforma:
        </p>
        <ul className="list-disc pl-6 space-y-1" style={{ color: "var(--text-secondary)" }}>
          <li>Nombre, correo electrónico y contraseña al registrarte.</li>
          <li>Datos de empresa o transportista (CUIT, razón social, tipo de vehículo, etc.).</li>
          <li>Ubicación geográfica en tiempo real (solo para transportistas, con tu consentimiento).</li>
          <li>Información sobre cargas publicadas y postulaciones realizadas.</li>
          <li>Datos de uso de la aplicación (páginas visitadas, acciones realizadas).</li>
          <li>
            Cómo llegaste a ClickCargo (por ejemplo, desde un anuncio o un enlace compartido) y
            la primera página que visitaste.
          </li>
        </ul>
        <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
          Para esto usamos cookies propias, de Google Analytics y del píxel de Meta. Podés bloquearlas o borrarlas
          desde la configuración de tu navegador.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          2. Cómo usamos tu información
        </h2>
        <ul className="list-disc pl-6 space-y-1" style={{ color: "var(--text-secondary)" }}>
          <li>Conectar empresas con transportistas disponibles.</li>
          <li>Mostrar ubicación de transportistas en el mapa a empresas autorizadas.</li>
          <li>Enviar notificaciones push sobre cargas, postulaciones y actualizaciones.</li>
          <li>Mejorar la plataforma y solucionar problemas técnicos.</li>
          <li>Cumplir con obligaciones legales aplicables.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          3. Compartir información con terceros
        </h2>
        <p className="mb-2" style={{ color: "var(--text-secondary)" }}>
          No vendemos tu información personal. Solo la compartimos con:
        </p>
        <ul className="list-disc pl-6 space-y-1" style={{ color: "var(--text-secondary)" }}>
          <li>
            <strong>Mercado Pago:</strong> para procesar pagos de comisiones (cuando aplique).
          </li>
          <li>
            <strong>Mapbox:</strong> para servicios de mapas y geocodificación.
          </li>
          <li>
            <strong>Google Analytics y Meta (Facebook e Instagram):</strong> para medir el uso de la
            plataforma y el resultado de nuestras campañas. No les enviamos tu nombre, correo ni
            teléfono.
          </li>
          <li>Autoridades competentes si la ley lo requiere.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          4. Ubicación
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Solicitamos acceso a tu ubicación únicamente si sos transportista y tenés disponibilidad
          activa. Esta información se usa para mostrar tu posición a empresas que buscan
          transportistas cercanos. Podés desactivar el seguimiento en cualquier momento desde la
          sección de disponibilidad.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          5. Seguridad
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Usamos HTTPS, contraseñas hasheadas y tokens seguros para proteger tu información.
          Ningún sistema es 100% seguro, pero tomamos medidas razonables para resguardar tus datos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          6. Tus derechos
        </h2>
        <p className="mb-2" style={{ color: "var(--text-secondary)" }}>
          Podés en cualquier momento:
        </p>
        <ul className="list-disc pl-6 space-y-1" style={{ color: "var(--text-secondary)" }}>
          <li>Solicitar acceso a los datos que tenemos sobre vos.</li>
          <li>Pedir la corrección o eliminación de tu cuenta y datos.</li>
          <li>Revocar el permiso de ubicación desde tu dispositivo.</li>
        </ul>
        <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
          Para cualquier solicitud, contactanos a{" "}
          <a href="mailto:clickcargoarg@gmail.com" style={{ color: "var(--primary)" }} className="underline">
            clickcargoarg@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          7. Retención de datos
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Conservamos tu información mientras tu cuenta esté activa. Al eliminar tu cuenta, borramos
          tus datos personales en un plazo de 30 días, salvo obligación legal de retenerlos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          8. Cambios a esta política
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Podemos actualizar esta política. Te notificaremos por correo o dentro de la app ante
          cambios significativos.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
          9. Contacto
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>
          ClickCargo — Argentina
          <br />
          <a href="mailto:clickcargoarg@gmail.com" style={{ color: "var(--primary)" }} className="underline">
            clickcargoarg@gmail.com
          </a>
        </p>
      </section>
      </div>
    </main>
  );
}
