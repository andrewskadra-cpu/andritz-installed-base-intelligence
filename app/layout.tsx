import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar, type SidebarLink } from "@/components/layout/AppSidebar";
import { getCustomers, getPlantsForCustomer } from "@/lib/installed-base";
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
    default: "Installed-Base Intelligence",
    template: "%s · Installed-Base Intelligence",
  },
  description: "ANDRITZ installed-base intelligence prototype (demo data).",
};

async function getSidebarLinks(): Promise<SidebarLink[]> {
  const links: SidebarLink[] = [];
  for (const customer of await getCustomers()) {
    links.push({ href: `/customers/${customer.id}`, label: customer.name, kind: "customer" });
    for (const plant of await getPlantsForCustomer(customer.id)) {
      links.push({ href: `/plants/${plant.id}`, label: plant.name, kind: "plant" });
    }
  }
  return links;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const links = await getSidebarLinks();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-screen font-sans">
        <AppSidebar links={links} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
