import { useEffect, useRef, useState, useCallback } from "react";

// Calls onTimeout after `timeoutMs` of no reset() calls, and also exposes
// a live secondsLeft count (ticking down once per second) so the UI can
// show a countdown badge. Calling reset() restarts BOTH the timeout and
// the visible countdown back to the full duration.
export function useInactivityTimer(timeoutMs, onTimeout) {
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(timeoutMs / 1000));

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setSecondsLeft(Math.floor(timeoutMs / 1000));

    timerRef.current = setTimeout(onTimeout, timeoutMs);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
  }, [timeoutMs, onTimeout]);

  useEffect(() => {
    reset();
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [reset]);

  return { reset, secondsLeft };
}