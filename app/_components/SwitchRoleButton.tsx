"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOtroRolPendiente } from "./EventsProvider";

interface Props {
  toRole: "empresa" | "transportista";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function SwitchRoleButton({ toRole, className, style, children }: Props) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const otroRolPendiente = useOtroRolPendiente();

  const dest = toRole === "empresa" ? "/empresa/dashboard" : "/transportista/cargas";
  const label = toRole === "empresa" ? "Cliente" : "Transportista";

  function handleClick() {
    setSwitching(true);
    setTimeout(() => {
      router.push(dest);
      setTimeout(() => setSwitching(false), 400);
    }, 700);
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className} style={style}>
        <span className="relative inline-flex items-center gap-2">
          {children}
          {otroRolPendiente > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
              {otroRolPendiente > 9 ? "9+" : otroRolPendiente}
            </span>
          )}
        </span>
      </button>

      {switching && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200"
          style={{ backgroundColor: "#060F0F" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
            style={{ backgroundColor: toRole === "empresa" ? "#06342A" : "#0C2A4A" }}
          >
            {toRole === "empresa" ? (
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            )}
          </div>
          <p className="text-white text-lg font-bold">Cambiando a {label}</p>
          <p className="text-sm" style={{ color: "#6B7280" }}>Vista de {label.toLowerCase()}</p>
        </div>
      )}
    </>
  );
}
