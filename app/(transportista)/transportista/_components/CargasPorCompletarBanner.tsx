import CompletarViajeButton from "../cargas/[id]/_components/CompletarViajeButton";

type CargaVencida = {
  id: number;
  titulo: string;
  origen: string;
  destino: string;
};

export default function CargasPorCompletarBanner({ cargas }: { cargas: CargaVencida[] }) {
  if (cargas.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <div
        className="rounded-2xl border p-4"
        style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
      >
        <p className="text-sm font-bold" style={{ color: "#92400E" }}>
          {cargas.length === 1
            ? "Tenés un viaje para marcar como completado"
            : `Tenés ${cargas.length} viajes para marcar como completados`}
        </p>
        <p className="text-xs mt-1" style={{ color: "#B45309" }}>
          Ya pasó la fecha de cupo. Marcalos para que el cliente pueda confirmar y cerrar la operación.
        </p>
      </div>

      {cargas.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl border p-4"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8E8" }}
        >
          <p className="font-bold text-sm text-gray-900">{c.titulo}</p>
          <p className="text-xs mt-0.5 mb-3" style={{ color: "#6B7280" }}>
            {c.origen} → {c.destino}
          </p>
          <CompletarViajeButton cargaId={c.id} />
        </div>
      ))}
    </div>
  );
}
