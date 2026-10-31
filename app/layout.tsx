import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Plus Jakarta Sans was designed in Jakarta: an ASEAN typeface for an ASEAN product.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "Nexa · Ten countries. One door.",
  description:
    "Upload your pitch deck. Gemma 4 finds the ASEAN grants, programmes, investors and partners you qualify for, and tracks each one until it becomes a deal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
