"use client";

import dynamic from "next/dynamic";
import type { TransportistaDisp, ZonaEmpresa } from "./MapaTransportistas";

const MapaTransportistas = dynamic(() => import("./MapaTransportistas"), { ssr: false });

export default function MapaTransportistasWrapper({
  initialData,
  zonaEmpresa,
}: {
  initialData: TransportistaDisp[];
  zonaEmpresa: ZonaEmpresa | null;
}) {
  return <MapaTransportistas initialData={initialData} zonaEmpresa={zonaEmpresa} />;
}
