import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./voice.css";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Linc — A little clarity. A lot of care.",
  description:
    "Explore your life insurance needs through a thoughtful conversation and math you can follow.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
