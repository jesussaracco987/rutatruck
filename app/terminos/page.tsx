import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — ClickCargo",
  description: "Términos y condiciones de uso de ClickCargo",
};

// BORRADOR: redactado a partir de cómo funciona la app. Fija responsabilidades
// legales, así que tiene que revisarlo un abogado antes de darlo por definitivo.
// Si cambia el texto de fondo, actualizar también la fecha de abajo.

type Seccion = { titulo: string; parrafos?: string[]; items?: string[] };

const SECCIONES: Seccion[] = [
  {
    titulo: "Qué es ClickCargo",
    parrafos: [
      "ClickCargo es una plataforma que conecta empresas que necesitan transportar cargas con transportistas que buscan viajes. Las empresas publican cargas, los transportistas se postulan y cada empresa elige con quién trabajar.",
      "ClickCargo no es una empresa de transporte ni un agente de cargas, no presta el servicio de transporte y no es parte del acuerdo entre la empresa y el transportista. Tampoco interviene en el pago del flete, que se acuerda y se paga directamente entre las partes.",
    ],
  },
  {
    titulo: "Aceptación",
    parrafos: [
      "Al crear una cuenta aceptás estos Términos y Condiciones y la Política de Privacidad. Si no estás de acuerdo, no uses la plataforma.",
    ],
  },
  {
    titulo: "Tu cuenta",
    items: [
      "Tenés que ser mayor de 18 años y tener capacidad legal para contratar. Si te registrás en nombre de una empresa, declarás que estás autorizado a hacerlo.",
      "Los datos que cargás tienen que ser reales y estar actualizados.",
      "Sos responsable de cuidar tu contraseña y de todo lo que se haga desde tu cuenta.",
      "Podés eliminar tu cuenta cuando quieras desde la sección de cuenta o escribiéndonos.",
    ],
  },
  {
    titulo: "Empresas que publican cargas",
    items: [
      "La información de la carga (origen, destino, tipo, peso, fecha y condiciones) tiene que ser verdadera y completa.",
      "Solo se pueden publicar cargas lícitas. Si la carga requiere habilitaciones o permisos especiales, tenés que indicarlo y contar con ellos.",
      "La empresa es responsable de la carga que entrega, de su documentación y de pagar el flete acordado con el transportista.",
    ],
  },
  {
    titulo: "Transportistas",
    items: [
      "El transportista es responsable de contar con licencia, habilitaciones, seguros, documentación del vehículo y todo lo que exija la normativa para el tipo de carga que transporta.",
      "Al postularte a una carga te comprometés a cumplirla en las condiciones acordadas si la empresa te elige.",
      "ClickCargo puede mostrar datos, reseñas o indicadores de los usuarios, pero no garantiza la identidad, la solvencia ni la idoneidad de ninguna empresa o transportista.",
    ],
  },
  {
    titulo: "El acuerdo entre las partes",
    parrafos: [
      "El precio del flete, la forma de pago, los plazos y las demás condiciones del viaje los acuerdan directamente la empresa y el transportista. ClickCargo no responde por incumplimientos, demoras, daños, pérdidas, robos, accidentes ni por la falta de pago entre las partes.",
      "Recomendamos dejar por escrito las condiciones acordadas y verificar la documentación de la otra parte antes de cada viaje.",
    ],
  },
  {
    titulo: "Costos del servicio",
    items: [
      "Publicar una carga y concretar una postulación pueden tener un costo. El transportista paga una comisión por cada camión que cubre cuando la empresa acepta su postulación.",
      "El importe se informa siempre antes de pagar. Los pagos se procesan a través de Mercado Pago.",
      "Durante las promociones de lanzamiento, el uso puede ser gratuito por el tiempo que se indique en la plataforma.",
      "Los importes pagados a ClickCargo no se reembolsan, salvo error atribuible a la plataforma o cuando la ley lo exija.",
      "Los valores pueden cambiar. Los cambios no afectan operaciones ya pagadas.",
    ],
  },
  {
    titulo: "Cancelaciones y disputas",
    parrafos: [
      "Si una carga se cancela o hay un desacuerdo sobre cómo terminó un viaje, cualquiera de las partes puede informarlo desde la plataforma. ClickCargo puede revisar el caso y tomar medidas sobre las cuentas involucradas, pero no actúa como árbitro ni está obligada a resolver el conflicto de fondo entre las partes.",
    ],
  },
  {
    titulo: "Reseñas",
    parrafos: [
      "Después de cada viaje, empresa y transportista pueden calificarse. Las reseñas tienen que reflejar una experiencia real. ClickCargo puede ocultar o eliminar reseñas falsas, ofensivas o que no correspondan a un viaje concretado.",
    ],
  },
  {
    titulo: "Mensajes",
    parrafos: [
      "El chat de la plataforma es para coordinar las cargas. Los mensajes se conservan por un tiempo limitado después de finalizado el viaje y pueden ser revisados ante una disputa o una denuncia.",
    ],
  },
  {
    titulo: "Usos no permitidos",
    items: [
      "Publicar información falsa, cargas inexistentes o postularse sin intención de cumplir.",
      "Usar la plataforma para actividades ilegales o para transportar mercadería prohibida.",
      "Acosar, amenazar o engañar a otros usuarios.",
      "Crear cuentas con datos de terceros o intentar acceder a cuentas ajenas.",
      "Interferir con el funcionamiento de la plataforma o extraer datos de forma automatizada.",
    ],
  },
  {
    titulo: "Suspensión de cuentas",
    parrafos: [
      "ClickCargo puede suspender o dar de baja cuentas que incumplan estos términos, acumulen incumplimientos con otros usuarios o pongan en riesgo a la comunidad.",
    ],
  },
  {
    titulo: "Responsabilidad",
    parrafos: [
      "ClickCargo ofrece la plataforma tal como está y trabaja para que funcione de forma continua, pero no garantiza que esté libre de interrupciones o errores. En la medida que la ley lo permita, ClickCargo no responde por los daños derivados de los acuerdos entre usuarios ni del transporte de las cargas.",
    ],
  },
  {
    titulo: "Cambios en estos términos",
    parrafos: [
      "Podemos actualizar estos términos. Si el cambio es importante, te avisamos por correo o dentro de la app. Seguir usando la plataforma después del aviso implica aceptar la nueva versión.",
    ],
  },
  {
    titulo: "Ley aplicable",
    parrafos: [
      "Estos términos se rigen por las leyes de la República Argentina. Nada de lo indicado acá limita los derechos que la ley les reconoce a los consumidores.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <main
      className="min-h-screen px-6 py-12"
      style={{ background: "var(--page-bg)", color: "var(--text)" }}
    >
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm px-8 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--primary)" }}>
          Términos y Condiciones
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Última actualización: octubre 2026
        </p>

        {SECCIONES.map((seccion, i) => (
          <section key={seccion.titulo} className="mb-8">
            <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
              {i + 1}. {seccion.titulo}
            </h2>
            {seccion.parrafos?.map((parrafo) => (
              <p key={parrafo} className="mb-2" style={{ color: "var(--text-secondary)" }}>
                {parrafo}
              </p>
            ))}
            {seccion.items && (
              <ul className="list-disc pl-6 space-y-1" style={{ color: "var(--text-secondary)" }}>
                {seccion.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
            {SECCIONES.length + 1}. Datos personales
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            El tratamiento de tus datos se explica en la{" "}
            <Link href="/politica-de-privacidad" style={{ color: "var(--primary)" }} className="underline">
              Política de Privacidad
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
            {SECCIONES.length + 2}. Contacto
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
