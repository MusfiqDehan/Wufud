import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchContext } from "@/lib/host";
import { IntroFilm } from "./intro-film";

export const metadata: Metadata = {
  title: "Intro",
  description:
    "A short film on how Wufud helps Hajj and Umrah agencies run storefronts, seats, payments, branches, and accounts — without taking a commission on a booking.",
  alternates: { canonical: "/intro" },
  openGraph: {
    title: "Wufud intro",
    description: "Hajj and Umrah journeys, beautifully managed. Watch the short film.",
    url: "/intro",
  },
};

export default async function IntroPage() {
  const host = (await headers()).get("host") ?? "";
  const context = await fetchContext(host).catch(() => null);
  if (context?.plane === "tenant") redirect("/");
  return <IntroFilm />;
}
