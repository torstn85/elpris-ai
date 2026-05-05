// Återanvändbar FAQ-accordion. Native <details>/<summary> — ingen klient-JS krävs.
// Stylingen speglar /elpris-idag/[stad]/page.tsx för konsistens.

export interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3 not-prose">
      {items.map((faq) => (
        <details
          key={faq.question}
          className="bg-[#0F3460] border border-[#1E4976] rounded-2xl px-5 py-4 group"
        >
          <summary className="font-semibold text-white cursor-pointer list-none flex items-center justify-between gap-3">
            <span>{faq.question}</span>
            <span className="text-[#00E5FF] text-xl leading-none transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-base text-[#8fafc9] leading-relaxed">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
