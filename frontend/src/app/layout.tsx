import { headers } from "next/headers";
import { fetchContext } from "@/lib/host";
import { HostProvider } from "@/components/host-provider";
import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-sans" });

const BASE_URL = "https://wufud.musfiqdehan.com";

const PLATFORM_META = {
  title: "Wufud | Hajj & Umrah Booking Platform",
  description:
    "From the first booking to the journey home. Bring your packages, pilgrims, teams, and payments together in one calm, connected workspace.",
  keywords: [
    "hajj",
    "umrah",
    "ziyarah",
    "hajj booking",
    "umrah booking",
    "travel agency software",
    "hajj management",
    "umrah management",
    "pilgrim management",
    "travel agency SaaS",
    "hajj packages",
    "umrah packages",
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "localhost";
  const context = await fetchContext(host).catch(() => null);

  const isPlatform = !context || context.plane === "platform";
  const title = (context?.branding?.title && context.branding.title.length > 3)
    ? context.branding.title
    : (isPlatform ? PLATFORM_META.title : (context?.branding?.display_name ?? context?.tenant?.name ?? "Wufud Agency"));
  const description = context?.branding?.description ?? (isPlatform ? PLATFORM_META.description : undefined);
  const ogImage = isPlatform ? `${BASE_URL}/og-platform.jpg` : (context?.branding?.og_image_url ?? `${BASE_URL}/og-tenant-default.jpg`);
  const siteName = isPlatform ? "Wufud" : (context?.branding?.display_name ?? context?.tenant?.name ?? "Wufud Agency");

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: title,
      template: isPlatform ? `%s | Wufud` : `%s | ${siteName}`,
    },
    description,
    keywords: isPlatform ? PLATFORM_META.keywords : undefined,
    applicationName: "Wufud",
    authors: [{ name: "Musfiq Dehan", url: BASE_URL }],
    creator: "Musfiq Dehan",
    publisher: "Wufud",
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      siteName,
      title,
      description: description ?? undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: isPlatform
            ? "Wufud | Hajj & Umrah journeys, beautifully managed."
            : `${siteName} — Your Hajj & Umrah Partner`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? undefined,
      images: [ogImage],
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
    },
    manifest: "/manifest.webmanifest",
    other: {
      "msapplication-TileColor": "#102D29",
    },
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
