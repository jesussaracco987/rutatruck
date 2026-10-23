import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Analytics from "./_components/Analytics";
import InstallPWA from "./_components/InstallPWA";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Plataforma que conecta a quien necesita enviar una carga con transportistas, para coordinar de forma simple y segura";

export const metadata: Metadata = {
  // Para que las URLs relativas (la imagen de vista previa) salgan absolutas.
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: "ClickCargo — Red Integral de Cargas",
  description,
  openGraph: {
    title: "ClickCargo — Red Integral de Cargas",
    description,
    siteName: "ClickCargo",
    locale: "es_AR",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClickCargo",
  },
  icons: {
    apple: "/icon-192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    // Verificación del dominio en el portfolio comercial de Meta.
    "facebook-domain-verification": "jztya5uex9s6tndi2xzbwsa2lopb99",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
        <InstallPWA />
        <Analytics />
      </body>
    </html>
  );
}
