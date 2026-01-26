import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";
import { TitleBar } from "@/components/titlebar";
import { QueryProvider } from "@/src/lib/query-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Lumo - Claude Code Monitor",
  description: "Monitor your Claude Code usage with real-time insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <QueryProvider>
          <div className="flex h-screen flex-col overflow-hidden">
            <TitleBar />
            <div className="flex min-h-0 flex-1">
              <SidebarLayout className="flex flex-1">
                <AppSidebar />
                <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {children}
                </main>
              </SidebarLayout>
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
