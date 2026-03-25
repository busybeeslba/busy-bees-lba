import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Next.js optimizes Google Fonts
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { BrandProvider } from "@/context/BrandContext";
import MainLayout from "@/components/layout/MainLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Busy Bees LBA - Admin Console",
  description: "Management portal for Busy Bees LBA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <BrandProvider>
          <SidebarProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </SidebarProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
