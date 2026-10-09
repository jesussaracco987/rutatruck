import Image from "next/image";
import Link from "next/link";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import truckImg from "@/app/assets/truck2.png";
import { FREE_TIER, diasRestantesFreeTier } from "@/lib/free-tier";
import { PLAY_STORE_URL, whatsappUrl } from "@/lib/site";

export type LandingVariant = "empresa" | "transportista";

type Item = { titulo: string; detalle: string };

type Copy = {
  titulo: string;
  bajada: string;
  cta: string;
  registroHref: string;
  whatsappTexto: string;
  pasos: Item[];
  beneficiosTitulo: string;
  beneficios: Item[];
  gratisDetalle: string;
  preguntas: { pregunta: string; respuesta: string }[];
  otra: { texto: string; link: string; href: string };
};

const COPY: Record<LandingVariant, Copy> = {
  empresa: {
    titulo: "Conseguí camión para tu carga sin llamar a medio mundo",
    bajada:
      "Publicás la carga una sola vez y los transportistas de la zona se postulan. Elegís con quién viajar y coordinás por chat.",
    cta: "Publicar mi primera carga",
    registroHref: "/registro?rol=empresa",
    whatsappTexto: "Hola, tengo una empresa y quiero publicar cargas en ClickCargo.",
    pasos: [
      {
        titulo: "Publicá la carga",
        detalle: "Origen, destino, tipo de carga, peso y fecha. Lleva un par de minutos.",
      },
      {
        titulo: "Recibí postulaciones",
        detalle: "Los transportistas con camión disponible se postulan a tu carga.",
      },
      {
        titulo: "Elegí y coordiná",
        detalle: "Mirá la reputación de cada uno, elegí y cerrá los detalles por chat.",
      },
    ],
    beneficiosTitulo: "Pensada para quien despacha",
    beneficios: [
      {
        titulo: "Transportistas de la zona",
        detalle: "Tu carga le llega como aviso a los transportistas que trabajan cerca del origen.",
      },
      {
        titulo: "Reputación a la vista",
        detalle: "Cada viaje terminado deja una reseña. Sabés con quién vas a trabajar antes de elegir.",
      },
      {
        titulo: "Varios camiones, una publicación",
        detalle: "Si la carga necesita más de un camión, lo indicás al publicar.",
      },
      {
        titulo: "Todo en un solo lugar",
        detalle: "Postulaciones, chat e historial de cargas, desde el celular o la computadora.",
      },
    ],
    gratisDetalle: "Publicá todas las cargas que necesites sin pagar nada y sin cargar tarjeta.",
    preguntas: [
      {
        pregunta: "¿Qué tipo de cargas puedo publicar?",
        respuesta:
          "La que necesites mover. Al publicar indicás el tipo de carga, el peso, la fecha y, si querés, el camión que preferís.",
      },
      {
        pregunta: "¿Tengo que instalar algo?",
        respuesta:
          "No. Funciona desde el navegador del celular o de la computadora. Si preferís, también podés instalar la app.",
      },
      {
        pregunta: "¿En qué zona funciona?",
        respuesta:
          "En todo el país. Podés publicar cargas con origen y destino en cualquier punto de Argentina.",
      },
    ],
    otra: {
      texto: "¿Tenés camión y buscás cargas?",
      link: "Mirá ClickCargo para transportistas",
      href: "/para-transportistas",
    },
  },
  transportista: {
    titulo: "Cargas cerca tuyo, para no volver vacío",
    bajada:
      "Mirá las cargas publicadas en tu zona, postulate desde el celular y arreglá directo con la empresa por chat.",
    cta: "Registrarme y ver cargas",
    registroHref: "/registro?rol=transportista",
    whatsappTexto: "Hola, soy transportista y quiero buscar cargas en ClickCargo.",
    pasos: [
      {
        titulo: "Creá tu cuenta",
        detalle: "Con un camión o con flota. Elegís tu zona y hasta qué distancia querés recibir avisos.",
      },
      {
        titulo: "Recibí avisos de cargas",
        detalle: "Te llega una notificación cuando se publica una carga dentro de tu zona.",
      },
      {
        titulo: "Postulate y coordiná",
        detalle: "Te postulás desde el celular y cerrás los detalles por chat con la empresa.",
      },
    ],
    beneficiosTitulo: "Pensada para quien maneja",
    beneficios: [
      {
        titulo: "Cargas en el mapa",
        detalle: "Ves de dónde sale y a dónde va cada carga antes de postularte.",
      },
      {
        titulo: "Avisos a tu medida",
        detalle: "Elegís un radio de 50, 100 o 200 km alrededor de tu localidad, o todo el país.",
      },
      {
        titulo: "Un camión o una flota",
        detalle: "Sirve igual si trabajás solo o si manejás varios camiones.",
      },
      {
        titulo: "Tu reputación suma",
        detalle: "Cada viaje terminado deja una reseña que las empresas ven al elegir.",
      },
    ],
    gratisDetalle: "Postulate a todas las cargas que quieras, sin comisión y sin cargar tarjeta.",
    preguntas: [
      {
        pregunta: "¿Sirve si tengo un solo camión?",
        respuesta:
          "Sí. Al registrarte elegís si trabajás con un camión o con una flota de dos o más.",
      },
      {
        pregunta: "¿Tengo que instalar algo?",
        respuesta:
          "No hace falta: funciona desde el navegador del celular. Si instalás la app, los avisos de cargas nuevas te llegan como notificación.",
      },
      {
        pregunta: "¿En qué zona hay cargas?",
        respuesta:
          "En todo el país. Podés recibir avisos solo de tu zona o de cualquier punto de Argentina.",
      },
    ],
    otra: {
      texto: "¿Tenés una empresa y necesitás transporte?",
      link: "Mirá ClickCargo para empresas",
      href: "/para-empresas",
    },
  },
};

const VERDE = "#4ADE80";
const FONDO = "#060F0F";
const TARJETA = { backgroundColor: "#0C1A1A", borderColor: "#1C3030" };

function BotonPrincipal({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm tracking-wide transition-opacity hover:opacity-90 active:opacity-80"
      style={{ backgroundColor: VERDE, color: FONDO }}
    >
      {children}
    </Link>
  );
}

export default function Landing({ variant }: { variant: LandingVariant }) {
  const copy = COPY[variant];
  const dias = diasRestantesFreeTier();
  const gratis = FREE_TIER && dias !== 0;
  const whatsapp = whatsappUrl(copy.whatsappTexto);

  const preguntas = gratis
    ? [
        {
          pregunta: "¿Cuánto cuesta?",
          respuesta: `Durante el lanzamiento es gratis. ${copy.gratisDetalle}`,
        },
        ...copy.preguntas,
      ]
    : copy.preguntas;

  return (
    <div className="flex-1 text-white" style={{ backgroundColor: FONDO }}>
      <header className="mx-auto max-w-5xl px-5 py-5 flex items-center justify-between">
        <Link href="/">
          <LogoClickCargo size={40} />
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold px-4 py-2 rounded-xl border transition-opacity hover:opacity-80"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          Ingresar
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-5 pt-6 pb-14 grid gap-10 lg:grid-cols-2 lg:items-center lg:pt-12">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: VERDE }}
            >
              En todo el país
            </p>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.08] tracking-tight text-balance">
              {copy.titulo}
            </h1>
            <p className="mt-5 text-base sm:text-lg leading-relaxed" style={{ color: "#D1D5DB" }}>
              {copy.bajada}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
              <BotonPrincipal href={copy.registroHref}>{copy.cta}</BotonPrincipal>
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm tracking-wide border transition-opacity hover:opacity-80"
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}
                >
                  Consultar por WhatsApp
                </a>
              )}
            </div>

            {gratis && (
              <p className="mt-5 flex flex-wrap items-center gap-2 text-sm" style={{ color: "#9CA3AF" }}>
                <span
                  className="font-black px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "#4ADE8022", color: VERDE, border: "1px solid #4ADE8044" }}
                >
                  GRATIS
                </span>
                {dias === null
                  ? "por tiempo limitado, sin tarjeta"
                  : dias === 1
                    ? "último día de la promoción de lanzamiento"
                    : `quedan ${dias} días de la promoción de lanzamiento`}
              </p>
            )}
          </div>

          <div
            className="relative overflow-hidden rounded-3xl border aspect-[4/3] lg:aspect-[4/5]"
            style={{ borderColor: "#1C3030" }}
          >
            <Image
              src={truckImg}
              alt="Camiones, utilitarios y camionetas de carga en ruta"
              fill
              priority
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover"
              style={{ objectPosition: "center 68%" }}
            />
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="border-t" style={{ borderColor: "#12201F" }}>
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Cómo funciona</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {copy.pasos.map((paso, i) => (
                <li key={paso.titulo} className="rounded-2xl border p-5" style={TARJETA}>
                  <span
                    className="inline-flex w-9 h-9 items-center justify-center rounded-xl font-black text-sm"
                    style={{ backgroundColor: "#4ADE8022", color: VERDE }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-bold text-lg">{paso.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
                    {paso.detalle}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Beneficios */}
        <section className="border-t" style={{ borderColor: "#12201F" }}>
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {copy.beneficiosTitulo}
            </h2>
            <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {copy.beneficios.map((beneficio) => (
                <li key={beneficio.titulo} className="flex gap-3">
                  <svg
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke={VERDE}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h3 className="font-bold">{beneficio.titulo}</h3>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
                      {beneficio.detalle}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Preguntas */}
        <section className="border-t" style={{ borderColor: "#12201F" }}>
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Preguntas frecuentes</h2>
            <div className="mt-6 divide-y" style={{ borderColor: "#1C3030" }}>
              {preguntas.map(({ pregunta, respuesta }) => (
                <details key={pregunta} className="group py-4" style={{ borderColor: "#1C3030" }}>
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden">
                    {pregunta}
                    <svg
                      className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke={VERDE}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
                    {respuesta}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="border-t" style={{ borderColor: "#12201F" }}>
          <div className="mx-auto max-w-3xl px-5 py-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-balance">
              {gratis ? "Empezá hoy, gratis" : "Empezá hoy"}
            </h2>
            {gratis && (
              <p className="mt-3 text-sm sm:text-base" style={{ color: "#9CA3AF" }}>
                {copy.gratisDetalle}
              </p>
            )}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <BotonPrincipal href={copy.registroHref}>{copy.cta}</BotonPrincipal>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm tracking-wide border transition-opacity hover:opacity-80"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                Descargar en Play Store
              </a>
            </div>
            <p className="mt-10 text-sm" style={{ color: "#6B7280" }}>
              {copy.otra.texto}{" "}
              <Link href={copy.otra.href} className="font-semibold" style={{ color: VERDE }}>
                {copy.otra.link}
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: "#12201F" }}>
        <div
          className="mx-auto max-w-5xl px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
          style={{ color: "#6B7280" }}
        >
          <span>ClickCargo · Red integral de cargas</span>
          <span>
            <Link href="/terminos" className="hover:opacity-80">
              Términos y condiciones
            </Link>
            {" · "}
            <Link href="/politica-de-privacidad" className="hover:opacity-80">
              Política de privacidad
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
