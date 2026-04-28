import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindDump — for the brain that won't switch off",
  description: "A calm place to dump what's in your head.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
