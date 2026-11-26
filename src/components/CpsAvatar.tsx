import { motion } from 'motion/react';
import { TiltCard } from './MotionHelpers';

interface CpsAvatarProps {
  src: string;
  alt: string;
  badgeText?: string;
}

export function CpsAvatar({ src, alt, badgeText = 'PruthviFx' }: CpsAvatarProps) {
  return (
    <TiltCard
      maxTilt={8}
      className="relative mx-auto flex flex-col items-center justify-center select-none"
    >
      <div
        aria-hidden="true"
        className="about-aura pointer-events-none absolute -inset-8 rounded-full opacity-75"
      />

      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="float-soft group relative h-60 w-60 rounded-full border-2 border-white/80 bg-card p-1 shadow-[0_0_55px_-10px_rgba(155,107,255,0.5)] transition-shadow duration-300 hover:shadow-[0_0_70px_-8px_rgba(56,232,214,0.55)] sm:h-72 sm:w-72 lg:h-80 lg:w-80"
      >
        <div className="h-full w-full overflow-hidden rounded-full">
          <img
            src={src}
            alt={alt}
            width={320}
            height={320}
            draggable={false}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>
      </motion.div>

      {/* Tilted PruthviFx badge overlapping the bottom edge */}
      <motion.div
        whileHover={{ scale: 1.06, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 20 }}
        className="-mt-5 z-10 inline-flex -rotate-3 items-center justify-center rounded-xl border border-white/25 bg-[#1b1726]/95 px-5 py-2 font-display text-sm font-bold tracking-wide text-white shadow-xl backdrop-blur-md"
      >
        {badgeText}
      </motion.div>
    </TiltCard>
  );
}
