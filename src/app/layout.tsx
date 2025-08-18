import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
// import ConnectionStatus from '@/components/ConnectionStatus'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KOMA POS - Café & Retail POS System",
  description: "Square-integrated POS for café and retail operations",
  manifest: '/manifest.json',
  themeColor: '#1f2937',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
