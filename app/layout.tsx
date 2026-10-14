import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DemoModeSync } from "@/components/layout/DemoModeSync";
import { CommandPalette } from "@/components/search/CommandPalette";
import { getComponentNames, getSearchIndex } from "@/lib/installed-base";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IBIS · Installed-Base Intelligence",
    template: "%s · IBIS",
  },
  description: "ANDRITZ installed-base intelligence prototype (demo data).",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Local demo data only; the palette never calls an external search service.
  const [searchIndex, componentNames] = await Promise.all([getSearchIndex(), getComponentNames()]);
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-screen font-sans">
        <Suspense fallback={null}>
          <DemoModeSync />
        </Suspense>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <CommandPalette index={searchIndex} componentNames={componentNames} />
      </body>
    </html>
  );
}
