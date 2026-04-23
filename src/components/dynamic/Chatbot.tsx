'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SOFT_LIMIT = 10;
const HARD_LIMIT = 20;
const MAX_CHARS = 200;

const WELCOME: Message = {
  role: 'assistant',
  content:
    'Hej! Fråga mig om elpriset. T.ex. "Är det billigt att tvätta nu?" eller "När ska jag ladda bilen?"',
};

const SCROLLBAR =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1E4976] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#2a5a8a]';

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extendedSession, setExtendedSession] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const desktopContainerRef = useRef<HTMLDivElement>(null);

  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const hardLimitReached = userMessageCount >= HARD_LIMIT;
  const softLimitReached = userMessageCount >= SOFT_LIMIT && !extendedSession;

  // Scroll whichever container is visible
  useEffect(() => {
    if (messages.length <= 1 && !isLoading) return;
    for (const ref of [mobileContainerRef, desktopContainerRef]) {
      if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Lock body scroll when mobile popup is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  async function send() {
    const text = input.trim();
    if (!text || isLoading || hardLimitReached || softLimitReached) return;

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? 'Något gick fel. Försök igen.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Kunde inte nå servern. Försök igen.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // ── Shared rendering helpers ──────────────────────────────────────────────

  function MessageBubbles() {
    return (
      <>
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#00E5FF] text-sm">⚡</span>
              </div>
              <div className="bg-[#1E4976] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#e2eaf4] max-w-xs sm:max-w-md">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#22C55E] text-xs font-bold">AI</span>
              </div>
              <div className="bg-[#0A2540] border border-[#1E4976] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-[#e2eaf4] max-w-xs sm:max-w-sm">
                {msg.content}
              </div>
            </div>
          ),
        )}
        {isLoading && (
          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#22C55E] text-xs font-bold">AI</span>
            </div>
            <div className="bg-[#0A2540] border border-[#1E4976] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-[#8fafc9] flex items-center gap-1.5">
              <span>AI tänker</span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8fafc9] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8fafc9] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8fafc9] animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
      </>
    );
  }

  function InputArea({ iosSafe = false }: { iosSafe?: boolean }) {
    return (
      <div
        className="border-t border-[#1E4976] p-4 sm:p-5 flex flex-col gap-2 flex-shrink-0"
        style={iosSafe ? { paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' } : undefined}
      >
        {hardLimitReached ? (
          <p className="text-xs text-[#8fafc9] text-center py-2">
            Du har nått maxgränsen på 20 frågor för denna session. Ladda om sidan för att börja om.
          </p>
        ) : softLimitReached ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-sm text-[#8fafc9] text-center">
              Du har ställt 10 frågor. Vill du fortsätta? Du kan ställa 10 frågor till.
            </p>
            <button
              onClick={() => setExtendedSession(true)}
              className="bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors duration-150 shadow-md shadow-[#22C55E]/20"
            >
              Fortsätt chatta
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={onKeyDown}
                placeholder="Ställ en fråga om elpriset..."
                disabled={isLoading}
                className="flex-1 bg-[#0A2540] border border-[#1E4976] focus:border-[#00E5FF]/60 outline-none rounded-xl px-4 py-3 text-base text-white placeholder-[#4a6b8a] transition-colors duration-150 disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={isLoading || !input.trim()}
                className="bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors duration-150 shadow-md shadow-[#22C55E]/20 flex-shrink-0"
              >
                Fråga
              </button>
            </div>
            <p className="text-xs text-[#4a6b8a] text-right">
              {input.length}/{MAX_CHARS}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── MOBIL: preview + fullscreen popup (md:hidden) ─────────────────── */}
      <div className="md:hidden">
        {!isMobileOpen ? (
          <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-sm text-[#8fafc9]">
              Fråga AI:n om elpriset. T.ex. &quot;Är det billigt att tvätta nu?&quot;
            </p>
            <button
              onClick={() => setIsMobileOpen(true)}
              className="bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold text-base px-6 py-4 rounded-xl transition-colors duration-150 shadow-md shadow-[#22C55E]/20 w-full"
            >
              💬 Öppna chatten
            </button>
          </div>
        ) : (
          <div className="fixed inset-0 z-50 bg-[#0A2540] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E4976] flex-shrink-0">
              <h2 className="text-base font-bold text-white">Fråga elpris.ai</h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                aria-label="Stäng chatten"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={mobileContainerRef}
              className={`flex-1 overflow-y-auto flex flex-col gap-4 p-5 ${SCROLLBAR}`}
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E4976 transparent' }}
            >
              <MessageBubbles />
            </div>

            <InputArea iosSafe />
          </div>
        )}
      </div>

      {/* ── DESKTOP: inline chat (hidden md:flex) ─────────────────────────── */}
      <div className="hidden md:flex md:flex-col bg-[#0F3460] border border-[#1E4976] rounded-2xl overflow-hidden">
        <div
          ref={desktopContainerRef}
          className={`flex flex-col gap-4 p-6 overflow-y-auto max-h-96 md:max-h-[600px] ${SCROLLBAR}`}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E4976 transparent' }}
        >
          <MessageBubbles />
        </div>
        <InputArea />
      </div>
    </>
  );
}
