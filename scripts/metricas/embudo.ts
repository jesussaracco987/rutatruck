/**
 * Embudo por canal de adquisición, a partir de la base (no de GA ni Meta).
 *
 *   npm run metricas                                    últimos 30 días, base de producción (.env)
 *   npm run metricas -- --desde 2026-10-12 --hasta 2026-11-12
 *   npm run metricas -- --dev                           usa .env.local
 *   npm run metricas -- --csv                           además deja CSVs en scripts/metricas/salida/
 *
 * Solo lee. El canal es el que guardó lib/origen.ts al registrarse (utm_*,
 * gclid/fbclid o referrer). La actividad de cada cohorte se cuenta hasta hoy,
 * no solo dentro del período: un usuario que se registró el día 29 y publicó
 * el 35 suma para su canal.
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Client } from "pg";
import { SQL_EMBUDO_CANAL as SQL_COHORTE, SQL_LANDINGS as SQL_LANDING, SQL_TOTALES } from "../../lib/metricas-sql";

const args = process.argv.slice(2);
const arg = (nombre: string) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
};

dotenv.config({ path: args.includes("--dev") ? ".env.local" : ".env", quiet: true });

const hasta = arg("hasta") ? new Date(`${arg("hasta")}T00:00:00-03:00`) : new Date();
const desde = arg("desde")
  ? new Date(`${arg("desde")}T00:00:00-03:00`)
  : new Date(hasta.getTime() - 30 * 86_400_000);
const duracion = hasta.getTime() - desde.getTime();
const desdeAnterior = new Date(desde.getTime() - duracion);

const fecha = (d: Date) => d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

function aCsv(filas: Record<string, unknown>[]): string {
  if (!filas.length) return "";
  const cols = Object.keys(filas[0]);
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...filas.map((f) => cols.map((c) => celda(f[c])).join(","))].join("\n");
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SET default_transaction_read_only = on");
    const cohorte = await client.query(SQL_COHORTE, [desde, hasta]);
    const landing = await client.query(SQL_LANDING, [desde, hasta]);
    const actual = await client.query(SQL_TOTALES, [desde, hasta]);
    const anterior = await client.query(SQL_TOTALES, [desdeAnterior, desde]);

    console.log(`\nPeríodo: ${fecha(desde)} → ${fecha(hasta)} (comparado con ${fecha(desdeAnterior)} → ${fecha(desde)})\n`);

    const a = actual.rows[0];
    const b = anterior.rows[0];
    console.log("Actividad total de la plataforma");
    console.table(
      Object.keys(a).map((k) => ({
        metrica: k,
        periodo: a[k],
        anterior: b[k],
        variacion: b[k] ? `${Math.round(((a[k] - b[k]) / b[k]) * 100)}%` : "-",
      })),
    );

    console.log("Embudo por canal (usuarios registrados en el período, actividad hasta hoy)");
    console.table(cohorte.rows);

    console.log("Landing de entrada");
    console.table(landing.rows);

    if (args.includes("--csv")) {
      const dir = path.join("scripts", "metricas", "salida");
      fs.mkdirSync(dir, { recursive: true });
      const sufijo = `${desde.toISOString().slice(0, 10)}_${hasta.toISOString().slice(0, 10)}`;
      fs.writeFileSync(path.join(dir, `embudo-canal_${sufijo}.csv`), aCsv(cohorte.rows));
      fs.writeFileSync(path.join(dir, `landings_${sufijo}.csv`), aCsv(landing.rows));
      fs.writeFileSync(
        path.join(dir, `totales_${sufijo}.csv`),
        aCsv(Object.keys(a).map((k) => ({ metrica: k, periodo: a[k], anterior: b[k] }))),
      );
      console.log(`CSVs en ${dir}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
