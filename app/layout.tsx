import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "domains.today",
  description: "A global live feed of every newly registered domain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
