import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="border-b border-[#1E4976] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
      <Link href="/" className="font-extrabold text-xl tracking-tight text-white">
        elpris<span className="text-[#00E5FF]">.ai</span>
      </Link>
      <div className="flex items-center gap-4 text-sm text-[#8fafc9] flex-wrap">
        <Link href="/elpris-idag" className="hover:text-white transition-colors">
          Elpris idag
        </Link>
        <Link href="/elpris-imorgon" className="hover:text-white transition-colors">
          Elpris imorgon
        </Link>
        <Link href="/elomrade" className="hover:text-white transition-colors">
          Elområden
        </Link>
        <Link href="/#rekommendationer" className="hover:text-white transition-colors">
          Prognos
        </Link>
        <Link href="/#om-oss" className="hover:text-white transition-colors">
          Om oss
        </Link>
      </div>
    </nav>
  );
}
