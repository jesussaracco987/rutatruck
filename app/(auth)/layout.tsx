import type { Metadata } from "next";

// Login, registro y recuperación de contraseña no aportan nada en Google: los
// links siguen (follow) pero las páginas no se indexan.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
