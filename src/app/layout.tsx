import type { Metadata, Viewport } from "next";
import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PlayerProvider } from "@/lib/store";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PatIA · Lawn Tennis",
  description:
    "Clínica de Pateadores Daniel Tejerizo — Tucumán Lawn Tennis Club. Telemetría, técnica y progresión para pateadores en formación.",
};

export const viewport: Viewport = {
  themeColor: "#050810",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="grain stadium-glow min-h-dvh">
        <PlayerProvider>
          <div className="mx-auto max-w-md min-h-dvh px-4 pt-6 pb-28">
            {children}
          </div>
          <BottomNav />
        </PlayerProvider>
      </body>
    </html>
  );
}
