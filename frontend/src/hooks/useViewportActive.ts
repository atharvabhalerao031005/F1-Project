// frontend/src/hooks/useViewportActive.ts
import { useEffect, useState, RefObject } from 'react';

export function useViewportActive(ref: RefObject<Element | null>, rootMargin = '150px'): boolean {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isActive;
}
