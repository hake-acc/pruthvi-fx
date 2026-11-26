import {
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { Image as ImageIcon } from 'lucide-react';

const SMOOTH_EASE = [0.16, 1, 0.3, 1] as const;

export function useInView(once = false, threshold = 0.12) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, once, threshold]);

  return [setNode, inView] as const;
}

export function Reveal({
  children,
  delay = 0,
  y = 32,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={
        reduced
          ? false
          : { opacity: 0, y, scale: 0.975 }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{
        duration: reduced ? 0 : 0.78,
        delay: reduced ? 0 : delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScrollParallax({
  children,
  offset = 26,
  className = '',
}: {
  children: ReactNode;
  offset?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const rawY = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const smoothY = useSpring(rawY, { stiffness: 140, damping: 24, mass: 0.45 });

  return (
    <motion.div
      ref={ref}
      style={reduced ? undefined : { y: smoothY }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function TiltCard({
  children,
  className = '',
  maxTilt = 8,
  hoverScale = 1,
  glare = false,
  glareClassName = 'rounded-2xl',
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  hoverScale?: number;
  glare?: boolean;
  glareClassName?: string;
}) {
  const reduced = useReducedMotion();
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const scale = useMotionValue(1);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useMotionValue(0);

  const smoothX = useSpring(rotX, { stiffness: 280, damping: 24, mass: 0.55 });
  const smoothY = useSpring(rotY, { stiffness: 280, damping: 24, mass: 0.55 });
  const smoothScale = useSpring(scale, { stiffness: 320, damping: 26 });
  const smoothGlareX = useSpring(glareX, { stiffness: 240, damping: 28 });
  const smoothGlareY = useSpring(glareY, { stiffness: 240, damping: 28 });
  const smoothGlareOpacity = useSpring(glareOpacity, { stiffness: 260, damping: 28 });

  const glareBg = useMotionTemplate`radial-gradient(280px circle at ${smoothGlareX}% ${smoothGlareY}%, rgba(168, 85, 247, 0.28), rgba(255, 255, 255, 0.1) 36%, transparent 72%)`;

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const px = nx - 0.5;
    const py = ny - 0.5;

    rotX.set(-py * maxTilt * 2);
    rotY.set(px * maxTilt * 2);
    if (hoverScale !== 1) scale.set(hoverScale);

    if (glare) {
      glareX.set(nx * 100);
      glareY.set(ny * 100);
      glareOpacity.set(1);
    }
  };

  const handleLeave = () => {
    rotX.set(0);
    rotY.set(0);
    scale.set(1);
    glareOpacity.set(0);
  };

  return (
    <motion.div
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={
        reduced
          ? undefined
          : {
              transformPerspective: 950,
              rotateX: smoothX,
              rotateY: smoothY,
              scale: smoothScale,
              transformStyle: 'preserve-3d',
            }
      }
      className={`relative will-change-transform ${className}`}
    >
      {children}
      {glare && !reduced && (
        <motion.div
          aria-hidden="true"
          style={{
            background: glareBg,
            opacity: smoothGlareOpacity,
          }}
          className={`pointer-events-none absolute inset-0 z-20 ${glareClassName}`}
        />
      )}
    </motion.div>
  );
}

export function WordReveal({
  text,
  className = '',
  start = 0,
  visible,
}: {
  text: string;
  className?: string;
  start?: number;
  visible?: boolean;
}) {
  const [ref, inView] = useInView(true);
  const words = text.split(' ');
  const isGradient =
    className.includes('studio-gradient-text') || className.includes('brand-highlight');
  const outerClass = isGradient
    ? className.replace(/\b(studio-gradient-text|brand-highlight)\b/g, '').trim()
    : className;

  return (
    <span ref={ref} className={`word-text ${outerClass}`} aria-label={text}>
      {words.map((word, idx) => (
        <span key={`${word}-${idx}`} aria-hidden="true" className="inline-block align-baseline">
          <span
            className={`word ${isGradient ? 'studio-gradient-text' : ''} ${
              (visible ?? inView) ? 'in' : ''
            }`}
            style={{ transitionDelay: `${start + Math.min(idx * 55, 450)}ms` }}
          >
            {word}
          </span>
          {idx < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

export interface HeroWord {
  word: string;
  hl?: boolean;
}

export function HeroTitle({
  ready,
  rows,
  className = '',
  align = 'center',
}: {
  ready: boolean;
  rows: HeroWord[][];
  className?: string;
  align?: 'center' | 'start';
}) {
  const reduced = useReducedMotion();
  const label = rows.map((row) => row.map((w) => w.word).join(' ')).join(' ');

  return (
    <h1
      className={`hero-title font-display mt-4 font-extrabold ${className}`}
      aria-label={label}
      style={{ perspective: 900 }}
    >
      {rows.map((row, rowIdx) => (
        <span
          key={rowIdx}
          aria-hidden="true"
          className={`flex flex-wrap gap-x-[0.25em] ${
            align === 'start' ? 'justify-center lg:justify-start' : 'justify-center'
          }`}
        >
          {row.map(({ word, hl }, wordIdx) => (
            <motion.span
              key={`${rowIdx}-${word}-${wordIdx}`}
              className={`inline-block whitespace-nowrap ${
                hl ? 'studio-gradient-text' : 'text-foreground'
              }`}
              style={{
                willChange: 'transform, opacity',
                transformOrigin: '50% 100%',
              }}
              initial={
                reduced
                  ? false
                  : { opacity: 0, y: 28 }
              }
              animate={
                ready || reduced
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 28 }
              }
              transition={{
                duration: 0.72,
                ease: SMOOTH_EASE,
                delay: 0.06 + rowIdx * 0.16 + wordIdx * 0.1,
              }}
            >
              {word}
            </motion.span>
          ))}
        </span>
      ))}
    </h1>
  );
}

export function LazyImage({
  src,
  className = '',
  alt,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-card via-muted to-background text-muted-foreground`}
        role="img"
        aria-label={alt}
      >
        <ImageIcon className="h-6 w-6 text-primary/70" />
        <span className="max-w-[85%] truncate text-xs font-medium">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={`${className} bg-muted`}
      {...rest}
    />
  );
}
