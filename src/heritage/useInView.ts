import { useEffect, useRef, useState } from 'react';

/**
 * Small intersection-observer hook for scroll-triggered fade-ins.
 *
 * Returns `{ ref, inView }`. Attach `ref` to the element you want to
 * watch, then drive opacity/translate from `inView`. We "latch" — once
 * something has been seen, it stays revealed even if it scrolls out
 * again. That matches magazine-style reveals: scroll up should not
 * un-fade.
 *
 * Tunable via `rootMargin`. Default trims 10% off the bottom so things
 * fade in slightly before they reach the viewport center.
 */
export function useInView<T extends HTMLElement = HTMLElement>(
  rootMargin: string = '0px 0px -10% 0px',
): { ref: React.RefObject<T>; inView: boolean } {
  // `useRef<T>(null)` returns RefObject<T>, the shape JSX `ref` expects.
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // Fall back to instantly visible (e.g. SSR or unsupported browsers).
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
