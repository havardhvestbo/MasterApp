import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Trondheim Reparasjonsguide",
  description: "Finn og filtrer reparasjonsverksteder i Trondheim etter kategori og bydel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body className={`${dmSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
