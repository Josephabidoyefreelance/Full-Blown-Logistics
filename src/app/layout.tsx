import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JAAD Logistics ERP",
  description: "Operations ERP for JAAD Logistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
