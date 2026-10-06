import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { siteConfig } from "@/config/site";

import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto-family",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${roboto.variable} antialiased`}>
      <body className="min-h-screen">
        <AppProviders>
          <SiteHeader />
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
