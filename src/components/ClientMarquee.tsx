import { ArrowUpRight } from 'lucide-react';
import type { ClientItem } from '../data/portfolio';
import { LazyImage } from './MotionHelpers';

interface MarqueeRowProps {
  clients: ClientItem[];
  direction: 'left' | 'right';
}

function MarqueeRow({ clients, direction }: MarqueeRowProps) {
  // Duplicate items twice for a seamless 50% CSS loop
  const looped = [...clients, ...clients];

  return (
    <div className="client-marquee-wrap relative w-full overflow-hidden py-2">
      <div
        className={`client-marquee-track flex w-max gap-4 ${
          direction === 'right' ? 'marquee-to-right' : 'marquee-to-left'
        }`}
      >
        {looped.map((client, idx) => (
          <a
            key={`${client.id}-${idx}`}
            href={client.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-hover-sound="true"
            className="card-hover-shine group relative flex shrink-0 items-center gap-3.5 rounded-2xl border border-white/[0.09] bg-card/80 px-4 py-3 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/65 hover:bg-card hover:shadow-glow"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 transition-all duration-300 group-hover:scale-105 group-hover:ring-primary">
              <LazyImage
                src={client.avatar}
                alt={`${client.name} channel logo`}
                width={48}
                height={48}
                className="h-full w-full rounded-full object-cover"
              />
            </div>

            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <strong className="font-display text-base font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary whitespace-nowrap">
                  {client.name}
                </strong>
                <ArrowUpRight
                  className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:opacity-100"
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                {client.subs}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function ClientMarquee({
  rowOne,
  rowTwo,
}: {
  rowOne: ClientItem[];
  rowTwo: ClientItem[];
}) {
  return (
    <div className="mt-12 flex flex-col gap-3">
      <MarqueeRow clients={rowOne} direction="left" />
      <MarqueeRow clients={rowTwo} direction="right" />
    </div>
  );
}
