import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Analytics from "./_components/Analytics";
import InstallPWA from "./_components/InstallPWA";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";
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

export const metadata: Metadata = {
  title: "ClickCargo — Red Integral de Cargas",
  description:
    "Plataforma que conecta empresas con transportistas para coordinar cargas de forma simple y segura",
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
