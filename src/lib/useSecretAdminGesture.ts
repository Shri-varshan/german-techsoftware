import { useRef } from 'react';

/**
 * Secret gesture handler to open Executive Admin Portal.
 * Triggers on:
 * 1. Long-press: Hold for 2 seconds
 * 2. Multi-tap: 3 quick taps within 1.2 seconds
 */
export function useSecretAdminGesture() {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const launchAdmin = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {
      // Haptics optional
    }
    window.location.href = '/admin';
  };

  const handleStart = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      launchAdmin();
    }, 2000);
  };

  const handleEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleClick = () => {
    tapCountRef.current += 1;
    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      launchAdmin();
      return;
    }

    tapResetTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1200);
  };

  return {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchCancel: handleEnd,
    onClick: handleClick,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: {
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      WebkitTouchCallout: 'none' as const,
    },
  };
}
