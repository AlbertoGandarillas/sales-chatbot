import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Uru — Vende sin parar",
  description:
    "Agente de ventas por WhatsApp para negocios en Perú. Atiende, cotiza y toma pedidos 24/7.",
  openGraph: {
    title: "Uru — Vende sin parar",
    description:
      "Agente de ventas por WhatsApp para negocios en Perú. Atiende, cotiza y toma pedidos 24/7.",
    siteName: "Uru",
    type: "website",
    locale: "es_PE",
  },
  icons: {
    icon: "/brand/uru-isotipo.svg",
    apple: "/brand/uru-isotipo.svg",
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
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
