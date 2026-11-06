import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/theme-context";
import { RetirementProvider } from "@/contexts/retirement-store-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RetireWise - Your Path to Financial Freedom",
  description: "Plan your retirement with confidence. Track savings accounts, forecast growth, and reach your financial goals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <RetirementProvider>{children}</RetirementProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
