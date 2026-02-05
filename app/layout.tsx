import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creator Banner Creator",
  description: "Create banner carousels from uploads or AI-generated images. Region-based calendar for celebrations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
