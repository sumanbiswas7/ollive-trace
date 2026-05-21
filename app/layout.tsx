import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ollive Chat",
  description: "AI-powered chatbot",
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
