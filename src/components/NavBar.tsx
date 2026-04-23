'use client';

import { useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '/elpris-idag', label: 'Elpris idag' },
  { href: '/elpris-imorgon', label: 'Elpris imorgon' },
  { href: '/elomrade', label: 'Elområden' },
  { href: '/guider', label: 'Guider' },
  { href: '/#rekommendationer', label: 'Prognos' },
  { href: '/#om-oss', label: 'Om oss' },
];

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-[#1E4976] relative">
      <div className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-extrabold text-xl tracking-tight text-white">
          elpris<span className="text-[#00E5FF]">.ai</span>
        </Link>

        {/* Desktop menu — oförändrad styling */}
        <div className="hidden md:flex items-center gap-4 text-sm text-[#8fafc9]">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-white transition-colors">
              {label}
            </Link>
          ))}
          {/* Chatbot-knapp — desktop */}
          <Link
            href="/#chat"
            className="flex items-center rounded-full bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-sm px-4 py-2 shadow-md shadow-[#22C55E]/30 transition-colors duration-150"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
            ⚡ Chatbot
          </Link>
        </div>

        {/* Mobil: Chatbot-knapp + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/#chat"
            className="flex items-center rounded-full bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-xs px-3 py-1.5 shadow-md shadow-[#22C55E]/30 transition-colors duration-150"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5" />
            ⚡ Chatbot
          </Link>
          <button
            className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Stäng meny' : 'Öppna meny'}
            aria-expanded={open}
          >
            {open ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobil dropdown */}
      {open && (
        <>
          {/* Backdrop stänger vid klick utanför */}
          <div
            className="fixed inset-0 z-10 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="md:hidden absolute top-full left-0 right-0 z-20 bg-slate-950 border-b border-[#1E4976]">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center px-6 h-12 text-sm text-[#8fafc9] hover:text-white hover:bg-slate-900 transition-colors border-b border-slate-800 last:border-0"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
