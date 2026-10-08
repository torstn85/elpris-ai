import Footer from "@/components/Footer";
import HomeClient from "./HomeClient";

// Serverskal för startsidan: sidfoten renderas här (på servern) och skickas in
// i klientdelen, så att sidfotens data inte följer med i klientens JavaScript.
export default function Home() {
  return <HomeClient footer={<Footer id="om-oss" />} />;
}
