import { headers } from "next/headers";
import { fetchContext } from "@/lib/host";
import { HostProvider } from "@/components/host-provider";
import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "localhost";
  const context = await fetchContext(host).catch(() => null);
  return {
    title: context?.branding?.title ?? "Website unavailable",
    description: context?.branding?.description,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("host") ?? "localhost";
  const context = await fetchContext(host).catch(() => null);
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${urbanist.variable} font-sans`}>
        <Providers><HostProvider context={context}>{children}</HostProvider></Providers>
      </body>
    </html>
  );
}
