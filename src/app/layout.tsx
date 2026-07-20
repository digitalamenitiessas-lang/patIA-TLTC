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
  metadataBase: new URL("https://pat-ia-tltc.vercel.app"),
  title: "PatIA · Lawn Tennis",
  description:
    "Clínica de Pateadores Daniel Tejerizo — Tucumán Lawn Tennis Club. Telemetría, técnica y progresión para pateadores en formación.",
  openGraph: {
    title: "PatIA · Clínica de Pateadores TLTC",
    description:
      "Telemetría, técnica y progresión para pateadores en formación. Tucumán Lawn Tennis Club · est. 1902.",
    url: "https://pat-ia-tltc.vercel.app",
    siteName: "PatIA",
    locale: "es_AR",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "PatIA — Clínica de Pateadores del Tucumán Lawn Tennis Club",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PatIA · Clínica de Pateadores TLTC",
    description:
      "Telemetría, técnica y progresión para pateadores en formación.",
    images: ["/og.png"],
  },
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
        <div aria-hidden className="atmosphere" />
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
