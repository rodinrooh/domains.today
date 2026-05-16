import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const shareTechMono = Share_Tech_Mono({ subsets: ["latin"], weight: "400" });

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
      <body className={shareTechMono.className}>{children}</body>
    </html>
  );
}
