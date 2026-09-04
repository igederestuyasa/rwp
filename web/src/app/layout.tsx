import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RWP Hutama Karya",
  description:
    "Kanal resmi Respectful Workplace Policy PT Hutama Karya (Persero): baca kebijakan, laporkan insiden secara rahasia, dan lacak penanganannya.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable} h-full`} suppressHydrationWarning>
      {/* Anti-flash: terapkan tema SEBELUM render untuk hindari kedip putih → gelap */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}catch(e){}})();` }} />
      </head>
      <body className="min-h-full font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
