import HomeClient from "./HomeClient";

// Serverskal för startsidan. Sidfoten renderas av root-layouten (på servern),
// så dess data (t.ex. CITIES) hamnar inte i startsidans JavaScript.
export default function Home() {
  return <HomeClient />;
}
