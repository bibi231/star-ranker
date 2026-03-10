import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(
        () => window.innerWidth < breakpoint
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e) => setIsMobile(e.matches);

        // Add event listener
        if (mq.addEventListener) {
            mq.addEventListener('change', handler);
        } else {
            // Fallback for older browsers
            mq.addListener(handler);
        }

        return () => {
            if (mq.removeEventListener) {
                mq.removeEventListener('change', handler);
            } else {
                // Fallback for older browsers
                mq.removeListener(handler);
            }
        };
    }, [breakpoint]);

    return isMobile;
}
