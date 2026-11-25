import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import { SessionProvider } from "@/lib/SessionProvider";
import { PageViewTracker } from "@/components/PageViewTracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Premium Math Calculator",
  description: "Advanced mathematics calculator for all levels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} ${inter.className}`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <PageViewTracker />
          <LanguageProvider>
            <MotionConfig reducedMotion="user">
              {children}
            </MotionConfig>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
