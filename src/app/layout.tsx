import type { Metadata } from "next";
import "./globals.css";
import "./jaad-homepage.css";



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
    <html lang="en" className="h-full antialiased" style={{ backgroundColor: "#171717", colorScheme: "dark" }}>
      <body className="min-h-full flex flex-col font-sans" style={{ backgroundColor: "#171717" }}>{children}</body>
    </html>
  );
}
