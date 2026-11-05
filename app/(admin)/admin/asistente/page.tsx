import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";
import { sanitizarBorrador, type BorradorCarga, type MensajeChat } from "@/lib/chat-carga";
import { DIAS_RETENCION_CONVERSACIONES } from "@/lib/services/conversacion-chat.service";
import { TIPOS_CARGA } from "@/lib/tipos-carga";
import { formatFechaDia } from "@/lib/fechas";

const DIAS = 30;

const ETIQUETAS: Record<keyof BorradorCarga, string> = {
  origen: "Origen",
  destino: "Destino",
  tipoCarga: "Tipo",
  tipoCargaDetalle: "Qué se mueve",
  peso: "Peso",
  pesoUnidad: "Unidad",
  cantidadCamiones: "Camiones",
  presupuesto: "Presupuesto",
  fechaCarga: "Fecha",
  preferenciaCamion: "Vehículo",
  descripcion: "Descripción",
};

const PASOS = ["chat", "resumen", "mapa", "contacto", "publicada"];
const NOMBRE_PASO: Record<string, string> = {
  chat: "Chat",
  resumen: "Resumen",
  mapa: "Mapa",
  contacto: "Contacto",
  publicada: "Publicó",
};
const NOMBRE_FALLO: Record<string, string> = {
  limite_visitante: "Límite por visitante",
  tope_diario: "Tope diario de gasto",
  openai: "OpenAI no respondió",
};

const FILTROS = [
  { clave: "todas", label: "Todas" },
  { clave: "corregidas", label: "Con correcciones" },
  { clave: "abandonadas", label: "Sin publicar" },
  { clave: "fallos", label: "Con falla" },
] as const;

const pct = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)} %` : "–");

/** Acento legible sobre el fondo oscuro del admin (var(--primary) casi no se ve acá). */
const ACENTO = "#2DD4BF";

function valor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return formatFechaDia(v);
  if (typeof v === "string") return TIPOS_CARGA.find((t) => t.value === v)?.label ?? v;
  return String(v);
}

/** Caso para scripts/evaluar-asistente/casos.json, con lo que la persona dejó como correcto. */
function casoDeEvaluacion(id: string, mensajes: MensajeChat[], confirmado: BorradorCarga) {
  const ciudad = (s: string | null) => s?.split(",")[0].trim() ?? null;
  const espera: Record<string, unknown> = {
    origen: ciudad(confirmado.origen),
    destino: ciudad(confirmado.destino),
    tipoCarga: confirmado.tipoCarga,
    cantidadCamiones: confirmado.cantidadCamiones,
    presupuesto: confirmado.presupuesto,
  };
  if (confirmado.peso !== null) espera.peso = confirmado.peso;
  return JSON.stringify(
    {
      nombre: `real-${id.slice(0, 8)}`,
      turnos: mensajes.filter((m) => m.rol === "usuario").map((m) => m.texto),
      espera,
    },
    null,
    2,
  );
}

function conversacionesRecientes() {
  return db.conversacionChat.findMany({
    where: { creadaEn: { gte: new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000) } },
    orderBy: { creadaEn: "desc" },
    take: 5000,
  });
}

export default async function AdminAsistentePage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }
  const { filtro = "todas" } = await searchParams;
  const filas = await conversacionesRecientes();

  const total = filas.length;
  const alResumen = filas.filter((f) => PASOS.indexOf(f.pasoMaximo) >= 1);
  const publicadas = filas.filter((f) => f.pasoMaximo === "publicada");
  const confirmadas = filas.filter((f) => f.borradorConfirmado !== null);
  const sinCorregir = confirmadas.filter((f) => f.camposCorregidos.length === 0);
  const audios = filas.reduce((s, f) => s + f.audios, 0);
  const audiosCorregidos = filas.reduce((s, f) => s + f.audiosCorregidos, 0);
  const tokens = filas.reduce((s, f) => s + f.tokens, 0);
  const promedioPreguntas = alResumen.length
    ? (alResumen.reduce((s, f) => s + f.preguntas, 0) / alResumen.length).toFixed(1)
    : "–";

  const porCampo = new Map<string, number>();
  for (const f of confirmadas) for (const c of f.camposCorregidos) porCampo.set(c, (porCampo.get(c) ?? 0) + 1);
  const camposRanking = [...porCampo.entries()].sort((a, b) => b[1] - a[1]);

  const porPaso = PASOS.map((p) => ({ paso: p, cantidad: filas.filter((f) => f.pasoMaximo === p).length }));
  const porFallo = new Map<string, number>();
  for (const f of filas) if (f.fallo) porFallo.set(f.fallo, (porFallo.get(f.fallo) ?? 0) + 1);

  const listado = filas
    .filter((f) => {
      if (filtro === "corregidas") return f.camposCorregidos.length > 0 || f.audiosCorregidos > 0;
      if (filtro === "abandonadas") return f.pasoMaximo !== "publicada";
      if (filtro === "fallos") return f.fallo !== null;
      return true;
    })
    .slice(0, 50);

  const tarjeta = { backgroundColor: "#112424", borderColor: "#1E3838" };
  const suave = { color: "#A8C5C5" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0C1E1E" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#1E3838" }}
      >
        <span className="text-white font-semibold text-lg">ClickCargo</span>
        <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">Admin</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <Link href="/admin/dashboard" className="text-sm font-semibold hover:opacity-80" style={{ color: ACENTO }}>
            ← Volver al panel
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Asistente de publicación</h1>
          <p className="mt-1 text-sm" style={suave}>
            Últimos {DIAS} días. Las conversaciones se borran a los {DIAS_RETENCION_CONVERSACIONES} días.
          </p>
        </div>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Conversaciones", valor: total, detalle: `${tokens.toLocaleString("es-AR")} tokens` },
            { label: "Llegan al resumen", valor: pct(alResumen.length, total), detalle: `${promedioPreguntas} preguntas promedio` },
            { label: "Publican", valor: pct(publicadas.length, total), detalle: `${publicadas.length} cargas` },
            { label: "Resumen sin corregir", valor: pct(sinCorregir.length, confirmadas.length), detalle: `de ${confirmadas.length} confirmados` },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border p-4" style={tarjeta}>
              <p className="text-2xl font-bold text-white">{m.valor}</p>
              <p className="text-sm font-medium text-white">{m.label}</p>
              <p className="text-xs mt-1" style={suave}>{m.detalle}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border p-4" style={tarjeta}>
            <h2 className="text-sm font-semibold text-white mb-2">Campos que más corrigen</h2>
            {camposRanking.length === 0 ? (
              <p className="text-sm" style={suave}>Sin correcciones todavía.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {camposRanking.map(([campo, n]) => (
                  <li key={campo} className="flex justify-between text-white">
                    <span>{ETIQUETAS[campo as keyof BorradorCarga] ?? campo}</span>
                    <span style={suave}>{n} · {pct(n, confirmadas.length)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border p-4" style={tarjeta}>
            <h2 className="text-sm font-semibold text-white mb-2">Hasta dónde llegan</h2>
            <ul className="space-y-1 text-sm">
              {porPaso.map(({ paso, cantidad }) => (
                <li key={paso} className="flex justify-between text-white">
                  <span>{NOMBRE_PASO[paso]}</span>
                  <span style={suave}>{cantidad}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border p-4" style={tarjeta}>
            <h2 className="text-sm font-semibold text-white mb-2">Audio y fallas</h2>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between text-white">
                <span>Audios enviados</span>
                <span style={suave}>{audios}</span>
              </li>
              <li className="flex justify-between text-white">
                <span>Corregidos antes de enviar</span>
                <span style={suave}>{pct(audiosCorregidos, audios)}</span>
              </li>
              {[...porFallo.entries()].map(([motivo, n]) => (
                <li key={motivo} className="flex justify-between text-white">
                  <span>{NOMBRE_FALLO[motivo] ?? motivo}</span>
                  <span style={suave}>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <nav className="flex flex-wrap gap-2" aria-label="Filtrar conversaciones">
            {FILTROS.map((f) => (
              <Link
                key={f.clave}
                href={f.clave === "todas" ? "/admin/asistente" : `/admin/asistente?filtro=${f.clave}`}
                className="rounded-full px-3 py-1 text-sm font-semibold"
                style={
                  filtro === f.clave
                    ? { backgroundColor: ACENTO, color: "#0C1E1E" }
                    : { backgroundColor: "#112424", color: "#A8C5C5" }
                }
              >
                {f.label}
              </Link>
            ))}
          </nav>

          {listado.length === 0 && <p className="text-sm" style={suave}>No hay conversaciones.</p>}

          {listado.map((f) => {
            const mensajes = (f.mensajes ?? []) as MensajeChat[];
            const asistente = f.borradorAsistente ? sanitizarBorrador(f.borradorAsistente) : null;
            const confirmado = f.borradorConfirmado ? sanitizarBorrador(f.borradorConfirmado) : null;
            const primero = mensajes.find((m) => m.rol === "usuario")?.texto ?? "(sin mensajes)";
            return (
              <details key={f.id} className="rounded-xl border" style={tarjeta}>
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs" style={suave}>
                    <span>{f.creadaEn.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" })}</span>
                    <span>· {f.origen === "panel" ? "Empresa con sesión" : "Visitante"}</span>
                    <span>· {NOMBRE_PASO[f.pasoMaximo] ?? f.pasoMaximo}</span>
                    {f.camposCorregidos.length > 0 && (
                      <span className="rounded-full bg-amber-500/20 px-2 text-amber-300">
                        corrigió {f.camposCorregidos.map((c) => ETIQUETAS[c as keyof BorradorCarga] ?? c).join(", ")}
                      </span>
                    )}
                    {f.audios > 0 && <span className="rounded-full bg-white/10 px-2">audio ×{f.audios}</span>}
                    {f.fallo && <span className="rounded-full bg-red-500/20 px-2 text-red-300">{NOMBRE_FALLO[f.fallo] ?? f.fallo}</span>}
                    {f.cargaId && <span>· carga #{f.cargaId}</span>}
                  </div>
                  <p className="mt-1 text-sm text-white line-clamp-2">{primero}</p>
                </summary>

                <div className="space-y-4 border-t px-4 pb-4 pt-3" style={{ borderColor: "#1E3838" }}>
                  <div className="flex flex-col gap-2">
                    {mensajes.map((m, i) => (
                      <div key={i} className={m.rol === "usuario" ? "self-end max-w-[85%]" : "self-start max-w-[85%]"}>
                        <p
                          className="rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
                          style={m.rol === "usuario" ? { backgroundColor: "#134E4A", color: "#FFFFFF" } : { backgroundColor: "#1F2937", color: "#E5E7EB" }}
                        >
                          {m.texto}
                        </p>
                        {m.dictado && m.dictado.trim() !== m.texto.trim() && (
                          <p className="mt-1 text-xs" style={suave}>
                            Audio transcripto: “{m.dictado}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {asistente && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr style={suave}>
                            <th className="py-1 pr-3 font-medium">Campo</th>
                            <th className="py-1 pr-3 font-medium">Entendió el asistente</th>
                            <th className="py-1 font-medium">Dejó la persona</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Object.keys(ETIQUETAS) as (keyof BorradorCarga)[]).map((k) => {
                            const corregido = f.camposCorregidos.includes(k);
                            return (
                              <tr key={k} className="border-t" style={{ borderColor: "#1E3838" }}>
                                <td className="py-1 pr-3" style={suave}>{ETIQUETAS[k]}</td>
                                <td className="py-1 pr-3 text-white">{valor(asistente[k])}</td>
                                <td className={`py-1 ${corregido ? "font-semibold text-amber-300" : "text-white"}`}>
                                  {confirmado ? valor(confirmado[k]) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {confirmado && (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold" style={{ color: ACENTO }}>
                        Caso para la evaluación del asistente
                      </summary>
                      <p className="mt-2 text-xs" style={suave}>
                        Copialo a scripts/evaluar-asistente/casos.json. Si el pedido decía la fecha, agregá
                        &quot;fechaCarga&quot; relativa (por ejemplo &quot;dia:jueves&quot; o &quot;hoy+1&quot;).
                      </p>
                      <pre className="mt-2 overflow-x-auto rounded-lg p-3 text-xs" style={{ backgroundColor: "#0F2020", color: "#9CA3AF" }}>
                        {casoDeEvaluacion(f.id, mensajes, confirmado)}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            );
          })}
        </section>
      </main>
    </div>
  );
}
