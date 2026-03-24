import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Next.js optimizes Google Fonts
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
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
        <SidebarProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </SidebarProvider>
      </body>
    </html>
  );
}
