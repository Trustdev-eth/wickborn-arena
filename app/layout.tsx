import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#120c2e",
};

export const metadata: Metadata = {
  title: "Wickborn Arena — Stock Creature Battles",
  description: "Build a squad of stock-inspired creatures and battle in Wickborn Arena. Apple, Tesla, NVIDIA and more. Born from the charts. Built for battle. $WICKB on Solana.",
  icons: {
    icon: "/brand/wickborn-bull.png",
    shortcut: "/brand/wickborn-bull.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
