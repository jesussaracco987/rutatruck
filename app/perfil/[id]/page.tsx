import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import {
  findPerfilPublico,
  findPromediosPorCriterio,
  findResenasPublicadasDe,
  contarViajesFinalizados,
} from "@/lib/repositories/resena.repository";
import { criteriosDe, formatPromedio, type CriterioKey, type TipoResena } from "@/lib/resenas";
import LogoClickCargo from "@/app/_components/LogoClickCargo";
import BadgeVerificado from "@/app/_components/BadgeVerificado";
import Estrellas from "@/app/_components/Estrellas";
import { isEmpresa } from "@/lib/roles";

/**
 * Perfil público de reputación. Sirve para los dos lados: la empresa entra
 * desde la lista de postulantes y el transportista desde la carga. No expone
 * datos de contacto, solo nombre y calificaciones publicadas.
 */
export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const perfil = await findPerfilPublico(id);
  if (!perfil) notFound();

  const [promedios, resenas, viajes] = await Promise.all([
    findPromediosPorCriterio(id),
    findResenasPublicadasDe(id, 10),
    contarViajesFinalizados(id),
  ]);

  const esCuentaEmpresa = isEmpresa(perfil.role);
  const viajesFinalizados = esCuentaEmpresa ? viajes.comoEmpresa : viajes.comoTransportista;
  const promedio = formatPromedio(perfil.ratingPromedio);

  // Se listan solo los criterios que aplican al rol; los del otro lado quedan
  // en null porque nunca se completaron.
  const criterios = criteriosDe(esCuentaEmpresa ? "A_EMPRESA" : "A_TRANSPORTISTA").filter(
    (c) => promedios[c.key] != null,
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2F5F5" }}>
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: "#0A1A1A", borderColor: "#E2E8E8" }}
      >
        <Link href="/">
          <LogoClickCargo />
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div
          className="rounded-2xl border p-6 mb-6"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-black text-gray-900">{perfil.name}</h1>
            <BadgeVerificado verificado={perfil.emailVerified} />
          </div>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            {esCuentaEmpresa ? "Cliente" : "Transportista"} · en ClickCargo desde{" "}
            {perfil.createdAt.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </p>

          <div className="mt-5 flex items-center gap-6 flex-wrap">
            <div>
              {perfil.ratingCantidad > 0 && promedio ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900">{promedio}</span>
                    <Estrellas valor={perfil.ratingPromedio ?? 0} size="md" />
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                    {perfil.ratingCantidad}{" "}
                    {perfil.ratingCantidad === 1 ? "calificación" : "calificaciones"}
                  </p>
                </>
              ) : (
                <p className="text-sm" style={{ color: "#6B7280" }}>
                  Todavía no tiene calificaciones publicadas.
                </p>
              )}
            </div>

            <div className="rounded-xl border px-4 py-3" style={{ borderColor: "#E2E8E8" }}>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                style={{ color: "#6B7280" }}
              >
                Viajes finalizados
              </p>
              <p className="text-lg font-bold text-gray-900">{viajesFinalizados}</p>
            </div>
          </div>

          {criterios.length > 0 && (
            <div className="mt-6 pt-5 border-t space-y-2" style={{ borderColor: "#E2E8E8" }}>
              {criterios.map((c) => {
                const valor = promedios[c.key] as number;
                return (
                  <div key={c.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm" style={{ color: "#374151" }}>
                      {c.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <Estrellas valor={valor} />
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPromedio(valor)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {resenas.length > 0 && (
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
          >
            <h2 className="font-medium text-gray-900 mb-4">Reseñas</h2>
            <div className="space-y-3">
              {resenas.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border p-4"
                  style={{ backgroundColor: "#FAFAFA", borderColor: "#E2E8E8" }}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{r.autor.name}</span>
                    <Estrellas valor={r.promedio} />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                    {r.carga.titulo}
                    {r.publicadaEn ? ` · ${r.publicadaEn.toLocaleDateString("es-AR")}` : ""}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {criteriosDe(r.tipo as TipoResena).map((c) => {
                      const valor = r[c.key as CriterioKey];
                      if (valor == null) return null;
                      return (
                        <div key={c.key} className="flex items-center justify-between gap-2">
                          <span className="text-xs" style={{ color: "#6B7280" }}>
                            {c.label}
                          </span>
                          <Estrellas valor={valor} />
                        </div>
                      );
                    })}
                  </div>
                  {r.comentario && (
                    <p className="text-sm mt-2 italic" style={{ color: "#374151" }}>
                      “{r.comentario}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
