import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '../data/portfolio';

const EASE = [0.16, 1, 0.3, 1] as const;

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduced = useReducedMotion();

  return (
    <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 text-left">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div
            key={faq.id}
            data-state={isOpen ? 'open' : 'closed'}
            className={`faq-card rounded-xl border border-border bg-card/85 px-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow ${
              isOpen ? 'border-primary/60 bg-primary/[0.06]' : ''
            }`}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${faq.id}`}
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className={`flex w-full cursor-pointer items-center justify-between gap-5 py-5 text-left text-[15px] font-medium transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isOpen ? 'text-primary' : 'text-foreground'
              }`}
            >
              <span>{faq.question}</span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180 text-primary' : 'text-muted-foreground'
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-panel-${faq.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.36, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 pr-5 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
