import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  path: "/",
  title: "elpris.ai — Realtidspriser och AI-rådgivning för svensk el",
  absoluteTitle: true,
  description:
    "Se elpriset just nu för SE1, SE2, SE3 och SE4. AI-driven rådgivning för när du bör ladda elbilen, tvätta eller använda el.",
  ogDescription:
    "Se elpriset just nu för SE1, SE2, SE3 och SE4. AI-driven rådgivning för när du bör använda el.",
  twitterDescription: "Se elpriset just nu för SE1, SE2, SE3 och SE4.",
});

// Serverskal för startsidan. Sidfoten renderas av root-layouten (på servern),
// så dess data (t.ex. CITIES) hamnar inte i startsidans JavaScript.
export default function Home() {
  return <HomeClient />;
}
