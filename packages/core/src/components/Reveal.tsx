'use client';
/**
 * Reveal — animate children in on first scroll into view. Progressive
 * enhancement: content is fully visible if JS never runs, so it is SEO- and
 * a11y-safe. Respects prefers-reduced-motion.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
}: {
  children: ReactNode;
  as?: 'div' | 'section' | 'li' | 'article';
  delay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal={shown ? 'in' : 'out'}
      style={{
        transition: 'opacity 600ms var(--ease-reveal, ease), transform 600ms var(--ease-reveal, ease)',
        transitionDelay: `${delay}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(16px)',
      }}
    >
      {children}
    </Tag>
  );
}
