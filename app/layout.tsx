import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow, Geist_Mono } from "next/font/google";

import { LangProvider } from "@/lib/i18n";

import "./globals.css";

// Archivo for reading, Archivo Narrow for uppercase labels, Geist Mono for numbers.
const archivo = Archivo({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-sans" });
const archivoNarrow = Archivo_Narrow({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-narrow" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const logoFace = Archivo({ subsets: ["latin"], style: ["italic"], weight: ["800"], variable: "--font-logo" });

export const metadata: Metadata = {
  title: "Nexa",
  description: "Eleven countries. One door. Nexa finds the grants, investors, programmes and partners across ASEAN that a startup actually qualifies for. Built with Gemma 4 at Hacktoberfest KL 2026.",
};

export const viewport: Viewport = {
  themeColor: "#faf9f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoNarrow.variable} ${geistMono.variable} ${logoFace.variable}`}>
      <body className="min-h-dvh">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
