import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { obtenerMetricas } from "@/lib/services/metricas.service";
import type { FilaEmbudo, Totales } from "@/lib/metricas-sql";
import { obtenerMetricasGa4, EVENTOS_GA4, type EventoGa4, type MetricasGa4 } from "@/lib/services/ga4-metricas.service";

const ZONA = "America/Argentina/Buenos_Aires";
const DIA_MS = 86_400_000;
const RANGOS = [7, 30, 90] as const;
const DIAS_DEFAULT = 30;

/** Acento legible sobre el fondo oscuro del admin (var(--primary) casi no se ve acá). */
const ACENTO = "#2DD4BF";
const tarjeta = { backgroundColor: "#112424", borderColor: "#1E3838" };
const suave = { color: "#A8C5C5" };

const NOMBRE_CANAL: Record<string, string> = {
  ig: "Instagram",
  fb: "Facebook",
  facebook: "Facebook",
  an: "Meta Audience Network",
  "apps.facebook.com": "Meta (anuncio de instalación)",
  google: "Google",
  "google-play": "Play Store",
  "(directo)": "Directo",
  "(direct)": "Directo",
  "ref:ar.com.clickcargo.twa": "App Android (sin campaña)",
};

function nombreCanal(canal: string): string {
  if (NOMBRE_CANAL[canal]) return NOMBRE_CANAL[canal];
  if (canal.startsWith("ref:")) return `Desde ${canal.slice(4)}`;
  return canal;
}

const ETIQUETA_TOTAL: Record<keyof Totales, string> = {
  registros: "Registros",
  cargas_publicadas: "Cargas publicadas",
  cargas_sin_pagar: "Cargas sin pagar",
  postulaciones: "Postulaciones",
  matches: "Matches confirmados",
  viajes_finalizados: "Viajes finalizados",
};

const ETIQUETA_EVENTO: Record<EventoGa4, string> = {
  registro_iniciado: "Inició registro",
  sign_up: "Se registró",
  publicacion_iniciada: "Inició publicación",
  descarga_app: "Clic a Play Store",
  contacto_whatsapp: "Clic a WhatsApp",
};

const pct = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)} %` : "–");

/** "2026-11-12" en Argentina → instante de la medianoche argentina de ese día. */
const inicioDia = (dia: string) => new Date(`${dia}T00:00:00-03:00`);
const diaArgentina = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
const fechaCorta = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: ZONA, day: "numeric", month: "numeric" });
const esDia = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

function periodo(params: { dias?: string; desde?: string; hasta?: string }) {
  if (esDia(params.desde)) {
    const desde = inicioDia(params.desde);
    // `hasta` se elige inclusive en el formulario; la consulta lo excluye.
    const hasta = esDia(params.hasta) ? new Date(inicioDia(params.hasta).getTime() + DIA_MS) : new Date();
    if (hasta > desde) return { desde, hasta, dias: null };
  }
  const dias = RANGOS.find((r) => String(r) === params.dias) ?? DIAS_DEFAULT;
  const hasta = new Date();
  return { desde: new Date(hasta.getTime() - dias * DIA_MS), hasta, dias };
}

function Variacion({ actual, anterior }: { actual: number; anterior: number }) {
  if (!anterior) return <span style={suave}>antes: {anterior}</span>;
  const cambio = Math.round(((actual - anterior) / anterior) * 100);
  const signo = cambio > 0 ? "+" : "";
  return (
    <span style={suave}>
      {signo}
      {cambio} % · antes {anterior}
    </span>
  );
}

function sumar(filas: FilaEmbudo[]) {
  const total = { registros: 0, dadores: 0, transportistas: 0, publicaron: 0, se_postularon: 0, con_match: 0, con_viaje: 0 };
  for (const f of filas) for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += f[k];
  return total;
}

export default async function AdminMetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string; desde?: string; hasta?: string }>;
}) {
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  const params = await searchParams;
  const { desde, hasta, dias } = periodo(params);
  const hastaInclusive = new Date(hasta.getTime() - 1);
  const desdeAnterior = new Date(desde.getTime() - (hasta.getTime() - desde.getTime()));
  const [m, ga4] = await Promise.all([
    obtenerMetricas(desde, hasta),
    obtenerMetricasGa4(
      diaArgentina(desde),
      diaArgentina(hastaInclusive),
      diaArgentina(desdeAnterior),
      diaArgentina(new Date(desde.getTime() - 1)),
    ),
  ]);
  const total = sumar(m.embudo);

  // Una barra por día del período, con los días sin registros en cero.
  const porDia = new Map<string, number>();
  for (const f of m.registrosPorDia) porDia.set(f.dia, (porDia.get(f.dia) ?? 0) + f.registros);
  const diasSerie: { dia: string; registros: number }[] = [];
  for (let d = inicioDia(diaArgentina(desde)); d < hasta; d = new Date(d.getTime() + DIA_MS)) {
    const dia = diaArgentina(d);
    diasSerie.push({ dia, registros: porDia.get(dia) ?? 0 });
  }
  const maxDia = Math.max(1, ...diasSerie.map((d) => d.registros));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0C1E1E" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <span className="text-white font-semibold text-lg">ClickCargo</span>
        <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">Admin</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <Link href="/admin/dashboard" className="text-sm font-semibold hover:opacity-80" style={{ color: ACENTO }}>
            ← Volver al panel
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Métricas</h1>
          <p className="mt-1 text-sm" style={suave}>
            Del {fechaCorta(desde)} al {fechaCorta(hastaInclusive)}, comparado con el período anterior de igual duración.
            Datos de la base: el canal es el que tenía cada usuario al registrarse.
          </p>
        </div>

        <nav className="flex flex-wrap items-end gap-2" aria-label="Período">
          {RANGOS.map((r) => (
            <Link
              key={r}
              href={`/admin/metricas?dias=${r}`}
              className="rounded-full px-3 py-1 text-sm font-semibold"
              style={dias === r ? { backgroundColor: ACENTO, color: "#0C1E1E" } : { backgroundColor: "#112424", color: "#A8C5C5" }}
            >
              {r} días
            </Link>
          ))}
          <form action="/admin/metricas" className="flex flex-wrap items-end gap-2 sm:ml-auto">
            <label className="text-xs" style={suave}>
              Desde
              <input
                type="date"
                name="desde"
                defaultValue={dias ? "" : diaArgentina(desde)}
                required
                className="block mt-1 rounded-lg px-2 py-1 text-sm text-white border"
                style={{ backgroundColor: "#0F2020", borderColor: "#1E3838", colorScheme: "dark" }}
              />
            </label>
            <label className="text-xs" style={suave}>
              Hasta
              <input
                type="date"
                name="hasta"
                defaultValue={dias ? "" : diaArgentina(hastaInclusive)}
                className="block mt-1 rounded-lg px-2 py-1 text-sm text-white border"
                style={{ backgroundColor: "#0F2020", borderColor: "#1E3838", colorScheme: "dark" }}
              />
            </label>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer"
              style={dias ? { backgroundColor: "#112424", color: ACENTO } : { backgroundColor: ACENTO, color: "#0C1E1E" }}
            >
              Ver
            </button>
          </form>
        </nav>

        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label="Actividad de la plataforma">
          {(Object.keys(ETIQUETA_TOTAL) as (keyof Totales)[]).map((k) => (
            <div key={k} className="rounded-xl border p-4" style={tarjeta}>
              <p className="text-2xl font-bold text-white">{m.totales[k]}</p>
              <p className="text-sm font-medium text-white">{ETIQUETA_TOTAL[k]}</p>
              <p className="text-xs mt-1">
                <Variacion actual={m.totales[k]} anterior={m.totalesAnterior[k]} />
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border p-4" style={tarjeta}>
          <h2 className="text-sm font-semibold text-white">Registros por día</h2>
          <p className="text-xs mb-3" style={suave}>
            {m.totales.registros} en el período · máximo {maxDia} en un día
          </p>
          <div className="flex items-end h-28 gap-[2px]" role="img" aria-label="Registros por día del período">
            {diasSerie.map((d) => (
              <div
                key={d.dia}
                className="flex-1 h-full flex items-end group relative"
                title={`${d.dia.split("-").reverse().slice(0, 2).join("/")}: ${d.registros} registro${d.registros === 1 ? "" : "s"}`}
              >
                <div
                  className="w-full rounded-t group-hover:opacity-80"
                  style={{
                    height: d.registros ? `${(d.registros / maxDia) * 100}%` : "1px",
                    backgroundColor: d.registros ? ACENTO : "#1E3838",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs mt-1" style={suave}>
            <span>{fechaCorta(desde)}</span>
            <span>{fechaCorta(hastaInclusive)}</span>
          </div>
        </section>

        <section className="rounded-xl border p-4" style={tarjeta}>
          <h2 className="text-sm font-semibold text-white">Embudo por canal</h2>
          <p className="text-xs mb-3" style={suave}>
            Usuarios registrados en el período y lo que hicieron hasta hoy. Publicaron se mide sobre dadores de carga;
            se postularon, sobre transportistas.
          </p>
          {m.embudo.length === 0 ? (
            <p className="text-sm" style={suave}>No hubo registros en el período.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm text-white min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs" style={suave}>
                    <th className="py-2 pr-3 font-medium">Canal</th>
                    <th className="py-2 pr-3 font-medium">Medio</th>
                    <th className="py-2 pr-3 font-medium">Campaña</th>
                    <th className="py-2 pr-3 font-medium text-right">Registros</th>
                    <th className="py-2 pr-3 font-medium text-right">Dadores / Transp.</th>
                    <th className="py-2 pr-3 font-medium text-right">Publicaron</th>
                    <th className="py-2 pr-3 font-medium text-right">Se postularon</th>
                    <th className="py-2 pr-3 font-medium text-right">Match</th>
                    <th className="py-2 font-medium text-right">Viaje</th>
                  </tr>
                </thead>
                <tbody>
                  {m.embudo.map((f) => (
                    <tr key={`${f.canal}|${f.medio}|${f.campania}`} className="border-t" style={{ borderColor: "#1E3838" }}>
                      <td className="py-2 pr-3">{nombreCanal(f.canal)}</td>
                      <td className="py-2 pr-3" style={suave}>{f.medio}</td>
                      <td className="py-2 pr-3 max-w-[180px] truncate" style={suave} title={f.campania}>{f.campania}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{f.registros}</td>
                      <td className="py-2 pr-3 text-right" style={suave}>{f.dadores} / {f.transportistas}</td>
                      <td className="py-2 pr-3 text-right">{f.publicaron} <span style={suave}>{pct(f.publicaron, f.dadores)}</span></td>
                      <td className="py-2 pr-3 text-right">{f.se_postularon} <span style={suave}>{pct(f.se_postularon, f.transportistas)}</span></td>
                      <td className="py-2 pr-3 text-right">{f.con_match} <span style={suave}>{pct(f.con_match, f.registros)}</span></td>
                      <td className="py-2 text-right">{f.con_viaje} <span style={suave}>{pct(f.con_viaje, f.registros)}</span></td>
                    </tr>
                  ))}
                  <tr className="border-t font-semibold" style={{ borderColor: "#2A4A4A" }}>
                    <td className="py-2 pr-3" colSpan={3}>Total</td>
                    <td className="py-2 pr-3 text-right">{total.registros}</td>
                    <td className="py-2 pr-3 text-right">{total.dadores} / {total.transportistas}</td>
                    <td className="py-2 pr-3 text-right">{total.publicaron} <span style={suave}>{pct(total.publicaron, total.dadores)}</span></td>
                    <td className="py-2 pr-3 text-right">{total.se_postularon} <span style={suave}>{pct(total.se_postularon, total.transportistas)}</span></td>
                    <td className="py-2 pr-3 text-right">{total.con_match} <span style={suave}>{pct(total.con_match, total.registros)}</span></td>
                    <td className="py-2 text-right">{total.con_viaje} <span style={suave}>{pct(total.con_viaje, total.registros)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border p-4" style={tarjeta}>
            <h2 className="text-sm font-semibold text-white mb-2">Página de entrada</h2>
            {m.landings.length === 0 ? (
              <p className="text-sm" style={suave}>Sin registros.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {m.landings.map((l) => (
                  <li key={`${l.landing}|${l.canal}`} className="flex justify-between gap-3 text-white">
                    <span className="truncate">
                      {l.landing} <span style={suave}>· {nombreCanal(l.canal)}</span>
                    </span>
                    <span style={suave}>{l.registros}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border p-4" style={tarjeta}>
            <h2 className="text-sm font-semibold text-white mb-2">Meta Ads</h2>
            <p className="text-sm" style={suave}>
              Gasto, impresiones y costo por registro se suman acá cuando se conecte la API de Meta. Mientras tanto,
              mirarlos en el Administrador de anuncios. Las campañas de Meta figuran por ID en la columna Campaña.
            </p>
          </div>
        </section>

        <SeccionGa4 ga4={ga4} />
      </main>
    </div>
  );
}


function SeccionGa4({ ga4 }: { ga4: MetricasGa4 }) {
  if (ga4.estado === "sin-configurar") {
    return (
      <section className="rounded-xl border p-4" style={tarjeta}>
        <h2 className="text-sm font-semibold text-white mb-1">Google Analytics</h2>
        <p className="text-sm" style={suave}>
          Faltan GA4_PROPERTY_ID, GA4_CLIENT_EMAIL o GA4_PRIVATE_KEY en las variables de entorno.
        </p>
      </section>
    );
  }
  if (ga4.estado === "error") {
    return (
      <section className="rounded-xl border p-4" style={tarjeta}>
        <h2 className="text-sm font-semibold text-white mb-1">Google Analytics</h2>
        <p className="text-sm" style={suave}>No se pudo consultar GA4: {ga4.mensaje}</p>
      </section>
    );
  }

  const { resumen, resumenAnterior, canales } = ga4;
  const tiles = [
    { label: "Usuarios", actual: resumen.usuarios, anterior: resumenAnterior.usuarios },
    { label: "Usuarios nuevos", actual: resumen.usuariosNuevos, anterior: resumenAnterior.usuariosNuevos },
    { label: "Sesiones", actual: resumen.sesiones, anterior: resumenAnterior.sesiones },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-white">Google Analytics</h2>
        <p className="text-xs" style={suave}>
          Visitas a la web, incluidas las que no se registran. GA4 tarda hasta 48 h en procesar los datos, así que los
          últimos días pueden estar incompletos.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border p-4" style={tarjeta}>
            <p className="text-2xl font-bold text-white">{t.actual.toLocaleString("es-AR")}</p>
            <p className="text-sm font-medium text-white">{t.label}</p>
            <p className="text-xs mt-1">
              <Variacion actual={t.actual} anterior={t.anterior} />
            </p>
          </div>
        ))}
        <div className="rounded-xl border p-4" style={tarjeta}>
          <p className="text-2xl font-bold text-white">{Math.round(resumen.tasaInteraccion * 100)} %</p>
          <p className="text-sm font-medium text-white">Tasa de interacción</p>
          <p className="text-xs mt-1" style={suave}>
            antes {Math.round(resumenAnterior.tasaInteraccion * 100)} % · sesiones de más de 10 s o con conversión
          </p>
        </div>
      </div>

      <div className="rounded-xl border p-4" style={tarjeta}>
        <h3 className="text-sm font-semibold text-white">Visitas y acciones por canal</h3>
        <p className="text-xs mb-3" style={suave}>
          Cantidad de veces que ocurrió cada acción en sesiones de ese canal.
        </p>
        {canales.length === 0 ? (
          <p className="text-sm" style={suave}>Sin datos en el período.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm text-white min-w-[820px]">
              <thead>
                <tr className="text-left text-xs" style={suave}>
                  <th className="py-2 pr-3 font-medium">Fuente</th>
                  <th className="py-2 pr-3 font-medium">Medio</th>
                  <th className="py-2 pr-3 font-medium">Campaña</th>
                  <th className="py-2 pr-3 font-medium text-right">Sesiones</th>
                  <th className="py-2 pr-3 font-medium text-right">Nuevos</th>
                  {EVENTOS_GA4.map((e) => (
                    <th key={e} className="py-2 pr-3 font-medium text-right last:pr-0">
                      {ETIQUETA_EVENTO[e]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {canales.map((c) => (
                  <tr key={`${c.fuente}|${c.medio}|${c.campania}`} className="border-t" style={{ borderColor: "#1E3838" }}>
                    <td className="py-2 pr-3">{nombreCanal(c.fuente)}</td>
                    <td className="py-2 pr-3" style={suave}>{c.medio}</td>
                    <td className="py-2 pr-3 max-w-[180px] truncate" style={suave} title={c.campania}>{c.campania}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{c.sesiones.toLocaleString("es-AR")}</td>
                    <td className="py-2 pr-3 text-right" style={suave}>{c.usuariosNuevos.toLocaleString("es-AR")}</td>
                    {EVENTOS_GA4.map((e) => (
                      <td key={e} className="py-2 pr-3 text-right last:pr-0" style={c.eventos[e] ? undefined : suave}>
                        {c.eventos[e]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
