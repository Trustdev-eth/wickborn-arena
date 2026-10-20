import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Rajdhani } from "next/font/google";
import "./globals.css";

const rebellionSquad = localFont({
  src: "./fonts/RebellionSquad.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "400",
  fallback: ["Impact", "Arial Black", "sans-serif"],
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#edd4a8",
};

export const metadata: Metadata = {
  title: "Wickborn Arena — 3D Tower Battles",
  description: "Build a stock-creature squad and defend your towers in 3D. Play Classic or command a captain in Skirmish. Start free practice or challenge another player.",
  icons: {
    icon: "/brand/wickborn-mark.svg?v=3",
    shortcut: "/brand/wickborn-mark.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rebellionSquad.variable} ${rajdhani.variable}`}>
      <body className={`${rajdhani.className} antialiased`}>{children}</body>
    </html>
  );
}
