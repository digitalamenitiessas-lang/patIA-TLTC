import type { Metadata, Viewport } from "next";
import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { ApprovalGate } from "@/components/ApprovalGate";
import { Onboarding } from "@/components/Onboarding";
import { ProductTour } from "@/components/ProductTour";
import { PlayerProvider } from "@/lib/store";
import { TourProvider } from "@/lib/tour";

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PatIA",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
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
          <TourProvider>
            <AppNav />
            <div className="lg:pl-60">
              <div className="mx-auto min-h-dvh w-full max-w-md px-4 pt-6 pb-28 lg:max-w-3xl lg:px-8 lg:pt-10 lg:pb-16 xl:max-w-4xl">
                <ApprovalGate>
                  <Onboarding>{children}</Onboarding>
                </ApprovalGate>
              </div>
            </div>
            <ProductTour />
          </TourProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}
