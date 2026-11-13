import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/app/_components/JsonLd";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import truckImg from "@/app/assets/truck2.jpg";
import { FREE_TIER, diasRestantesFreeTier, ultimoDiaFreeTier } from "@/lib/free-tier";
import { playStoreUrl, whatsappUrl } from "@/lib/site";
import { getPrecioPublicacion } from "@/lib/comision";
import ChatPublicar from "@/app/_components/publicar-chat/ChatPublicar";
import SumarmeTransportista from "@/app/_components/SumarmeTransportista";

export type LandingVariant = "empresa" | "transportista";

type Item = { titulo: string; detalle: string };

type Copy = {
  titulo: string;
  bajada: string;
  cta: string;
  ctaHref: string;
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
    titulo: "Contá qué necesitás mover y conseguí quién lo lleve",
    bajada:
      "Escribilo o mandá un audio, como si fuera un mensaje. Armamos la carga por vos y los transportistas de la zona se postulan.",
    cta: "Publicar mi carga",
    ctaHref: "#publicar",
    whatsappTexto: "Hola, necesito enviar una carga y quiero publicarla en ClickCargo.",
    pasos: [
      {
        titulo: "Contá qué necesitás mover",
        detalle: "Por escrito o con un audio. El asistente arma la carga, te pregunta lo que falte y vos revisás el resumen.",
      },
      {
        titulo: "Recibí postulaciones",
        detalle: "Los transportistas con vehículo disponible cerca del origen reciben el aviso y se postulan.",
      },
      {
        titulo: "Elegí y coordiná",
        detalle: "Mirá la reputación de cada uno, elegí y cerrá los detalles por chat.",
      },
    ],
    beneficiosTitulo: "Pensada para quien despacha",
    beneficios: [
      {
        titulo: "Publicás en un minuto",
        detalle: "Sin formularios largos: lo contás con tus palabras. Si preferís, el formulario sigue disponible.",
      },
      {
        titulo: "Con quien ya va para ese lado",
        detalle:
          "Tu carga le llega a los transportistas de la zona y a los que ya tienen un viaje por esa ruta: comisionistas y camiones que vuelven con lugar libre.",
      },
      {
        titulo: "Reputación a la vista",
        detalle: "Calificaciones, viajes hechos en la app y antigüedad de cada transportista antes de elegir.",
      },
      {
        titulo: "Varios camiones, una publicación",
        detalle: "Si la carga necesita más de un vehículo, lo indicás al publicar.",
      },
    ],
    gratisDetalle: "Publicá todas las cargas que necesites sin pagar nada.",
    preguntas: [
      {
        pregunta: "¿Tengo que registrarme antes?",
        respuesta:
          "No. Contás la carga, marcás los puntos en el mapa y te mandamos un código al email. Con eso se crea tu cuenta para que veas las postulaciones.",
      },
      {
        pregunta: "¿Cómo funciona el asistente?",
        respuesta:
          "Es una inteligencia artificial que lee lo que escribís o grabás y completa origen, destino, tipo de carga y fecha. Si falta algo te pregunta, como máximo tres veces. Antes de publicar ves un resumen y podés corregir cualquier dato.",
      },
      {
        pregunta: "¿Puedo completar un formulario en lugar de usar el asistente?",
        respuesta: "Sí. Debajo del chat está el enlace al formulario de siempre.",
      },
      {
        pregunta: "¿Qué tipo de cargas puedo publicar?",
        respuesta:
          "La que necesites mover: una mudanza, pallets, materiales de obra, una máquina, mercadería refrigerada o cereal. Desde un flete chico en utilitario hasta varios camiones completos.",
      },
      {
        pregunta: "¿Sirve para mandar una caja o un paquete?",
        respuesta:
          "Sí. Muchos transportistas y comisionistas anuncian el viaje que ya van a hacer y cuánto lugar les queda. Si tu envío les queda de paso, les avisamos y se postulan. Antes de elegir podés escribirles por el chat.",
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
      "Mudanzas, pallets, materiales, maquinaria o cereal: mirá las cargas de tu zona, postulate desde el celular y arreglá directo con el cliente por chat.",
    cta: "Registrarme y ver cargas",
    ctaHref: "/registro?rol=transportista",
    whatsappTexto: "Hola, soy transportista y quiero buscar cargas en ClickCargo.",
    pasos: [
      {
        titulo: "Creá tu cuenta",
        detalle: "Con un vehículo o con flota. Elegís tu zona y hasta qué distancia querés recibir avisos.",
      },
      {
        titulo: "Recibí avisos de cargas",
        detalle: "Te llega una notificación cuando se publica una carga dentro de tu zona.",
      },
      {
        titulo: "Postulate y coordiná",
        detalle: "Te postulás desde el celular y cerrás los detalles por chat con el cliente.",
      },
    ],
    beneficiosTitulo: "Pensada para quien maneja",
    beneficios: [
      {
        titulo: "Avisos a tu medida",
        detalle: "Elegís un radio de 50, 100 o 200 km alrededor de tu localidad, o todo el país.",
      },
      {
        titulo: "Llená el lugar libre",
        detalle:
          "Anunciá el viaje que ya vas a hacer y cuánto lugar te queda. Te avisamos de los envíos que te quedan de paso, y quienes tienen cargas te ven en el mapa.",
      },
      {
        titulo: "Un utilitario o una flota",
        detalle: "Sirve igual con una camioneta, un chasis, un semi o varios camiones.",
      },
      {
        titulo: "Tu reputación suma",
        detalle: "Calificaciones, viajes hechos y antigüedad: es lo que miran al elegirte.",
      },
    ],
    gratisDetalle: "Postulate a todas las cargas que quieras, sin comisión.",
    preguntas: [
      {
        pregunta: "¿Sirve si tengo un solo vehículo?",
        respuesta:
          "Sí. Al registrarte elegís si trabajás con un vehículo o con una flota de dos o más. Hay cargas para utilitarios y camionetas, no solo para camiones.",
      },
      {
        pregunta: "¿Sirve si soy comisionista?",
        respuesta:
          "Sí. Cargá tu recorrido, la fecha y el lugar que te queda (por ejemplo, \"entran 3 cajas\"). Cuando alguien publica un envío que te queda de paso te llega un aviso, y podés chatear con el cliente antes de que elija.",
      },
      {
        pregunta: "¿Qué tipo de cargas hay?",
        respuesta:
          "De todo tipo: mudanzas, mercadería en pallets, materiales de obra, maquinaria, refrigerados y cereal. Ves cada carga en el mapa antes de postularte.",
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
      texto: "¿Necesitás enviar una carga?",
      link: "Mirá cómo enviar con ClickCargo",
      href: "/enviar",
    },
  },
};

const VERDE = "#4ADE80";
const FONDO = "#060F0F";
const TARJETA = { backgroundColor: "#0C1A1A", borderColor: "#1C3030" };

/**
 * La variedad de cargas, a la vista: es lo que más rápido saca la idea de que
 * la app es solo para el agro. El cereal va último a propósito.
 */
const TIPOS_DE_CARGA: { label: string; path: string }[] = [
  { label: "Mudanzas", path: "M3 11V8a2 2 0 012-2h14a2 2 0 012 2v3M2 13a2 2 0 014 0v2h12v-2a2 2 0 014 0v5H2v-5zM5 18v2M19 18v2" },
  { label: "Pallets y mercadería", path: "M5 4h6v6H5zM13 7h6v3h-6zM3 13h18M3 17h18M5 17v3M12 17v3M19 17v3M3 13v4M21 13v4" },
  { label: "Paquetería", path: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { label: "Materiales de obra", path: "M3 5h18v4H3zM3 9h18v5H3zM3 14h18v5H3zM9 5v4M15 9v5M9 14v5" },
  { label: "Maquinaria", path: "M3 18h12M4 18a2 2 0 104 0 2 2 0 00-4 0zm7 0a2 2 0 104 0 2 2 0 00-4 0zM4 16V11h7l2 3v2M13 11l4-6 4 3-2 5" },
  { label: "Refrigerados", path: "M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" },
  { label: "Cereal y agro", path: "M12 21V10M12 10c-2.5-.5-4-2.5-4-5 2.5 0 4 1.5 4 4m0 1c2.5-.5 4-2.5 4-5-2.5 0-4 1.5-4 4m0 6c-2.5-.5-4.5-2-5-4.5 2.5 0 4.5 1.5 5 3.5m0 1c2.5-.5 4.5-2 5-4.5-2.5 0-4.5 1.5-5 3.5" },
  { label: "Lo que necesites", path: "M12 5v14M5 12h14" },
];

function TiposDeCarga() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {TIPOS_DE_CARGA.map((t) => (
        <li key={t.label} className="flex items-center gap-3 rounded-2xl border px-4 py-3.5" style={TARJETA}>
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke={VERDE}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d={t.path} />
          </svg>
          <span className="text-sm font-semibold leading-tight">{t.label}</span>
        </li>
      ))}
    </ul>
  );
}

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

export default async function Landing({ variant }: { variant: LandingVariant }) {
  const copy = COPY[variant];
  const dias = diasRestantesFreeTier();
  const gratis = FREE_TIER && dias !== 0;
  const whatsapp = whatsappUrl(copy.whatsappTexto);
  const esEmpresa = variant === "empresa";
  const precioPublicacion = esEmpresa && !FREE_TIER ? await getPrecioPublicacion() : 0;

  const imagen = (proporcion: string) => (
    <div
      className={`relative overflow-hidden rounded-3xl border ${proporcion}`}
      style={{ borderColor: "#1C3030" }}
    >
      <Image
        src={truckImg}
        alt="Camiones, utilitarios y camionetas de carga en ruta"
        fill
        priority={!esEmpresa}
        sizes="(min-width: 1024px) 480px, 100vw"
        className="object-cover"
        style={{ objectPosition: "center 68%" }}
      />
    </div>
  );

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
      <JsonLd />
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

            <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              {/* En empresas el chat ya está al lado (o abajo en el celular): no hace falta el botón. */}
              {!esEmpresa && <BotonPrincipal href={copy.ctaHref}>{copy.cta}</BotonPrincipal>}
              {/* Transportistas: en vez de un WhatsApp suelto, el alta asistida
                  (deja los datos, sigue por WhatsApp y le creamos la cuenta). */}
              {!esEmpresa && <SumarmeTransportista />}
              {esEmpresa && whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  // En el celular de empresas empujaría el chat fuera de la pantalla: va como link debajo del chat.
                  className={`${esEmpresa ? "hidden lg:inline-flex" : "inline-flex"} items-center justify-center w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm tracking-wide border transition-opacity hover:opacity-80`}
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
                {ultimoDiaFreeTier()
                  ? `durante el lanzamiento, hasta el ${ultimoDiaFreeTier()}`
                  : "durante el lanzamiento"}
              </p>
            )}
          </div>

          {esEmpresa ? (
            <div id="publicar" className="scroll-mt-6">
              <ChatPublicar freeTier={FREE_TIER} precioPublicacion={precioPublicacion} />
              {whatsapp && (
                <p className="mt-3 text-center text-sm lg:hidden" style={{ color: "#9CA3AF" }}>
                  ¿Dudas?{" "}
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: VERDE }}>
                    Escribinos por WhatsApp
                  </a>
                </p>
              )}
            </div>
          ) : (
            imagen("aspect-[4/3] lg:aspect-[4/5]")
          )}
        </section>

        {/* Tipos de carga */}
        <section className="border-t" style={{ borderColor: "#12201F" }}>
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {esEmpresa ? "Para cualquier carga" : "Cargas de todo tipo"}
            </h2>
            <p className="mt-2 text-sm sm:text-base" style={{ color: "#9CA3AF" }}>
              Desde una caja en utilitario hasta varios camiones completos, a cualquier punto del país.
            </p>
            <div className={`mt-8 grid gap-6 ${esEmpresa ? "lg:grid-cols-[2fr_3fr] lg:items-center" : ""}`}>
              {esEmpresa && <div className="hidden lg:block">{imagen("aspect-[4/3]")}</div>}
              <TiposDeCarga />
            </div>
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
              <BotonPrincipal href={copy.ctaHref}>{copy.cta}</BotonPrincipal>
              <a
                href={playStoreUrl({ source: "web", medium: "landing", campaign: `para-${variant}s` })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-sm tracking-wide border transition-opacity hover:opacity-80"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                Descargar en Play Store
              </a>
            </div>
            {!esEmpresa && (
              <div className="mt-3 mx-auto max-w-sm flex justify-center">
                <SumarmeTransportista />
              </div>
            )}
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
