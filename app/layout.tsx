import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Internet Airport",
  description: "A live arrivals board for every newly registered domain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={spaceMono.className}>{children}</body>
    </html>
  );
}
