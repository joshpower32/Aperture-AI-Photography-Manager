import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Aperture — AI Photography Asset Manager",
  description:
    "A private, in-browser Digital Asset Manager for photographers. Auto-tagging, captioning, quality scoring and natural-language search powered by on-device AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-bg text-cream antialiased">{children}</body>
    </html>
  );
}
