/**
 * useAnimatedNumber Hook
 * Smoothly animates number changes with easing
 */

import { useEffect, useRef, useState } from 'react';

export function useAnimatedNumber(target, duration = 600) {
  const [displayed, setDisplayed] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;

    if (diff === 0) return;

    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);

      setDisplayed(Math.round(start + diff * eased));

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return displayed;
}
