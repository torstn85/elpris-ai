'use client';

declare global {
  interface Window {
    Cookiebot?: { renew: () => void };
  }
}

export default function CookiebotRenewButton() {
  return (
    <button
      onClick={() => window.Cookiebot?.renew()}
      className="text-xs text-[#8fafc9] hover:text-[#00E5FF] transition-colors bg-transparent border-0 p-0 cursor-pointer text-left"
    >
      Hantera cookies
    </button>
  );
}
