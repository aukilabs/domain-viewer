/**
 * useInterval Hook — Polling Helper
 *
 * A simple setInterval hook used by the Spark renderer components
 * for periodic scene updates and distance culling checks.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval delay in milliseconds, or null to pause
 */
import { useEffect, useRef } from 'react';

const useInterval = (callback: Function, delay?: number | null) => {
  const savedCallback = useRef<Function>(() => {});

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(() => savedCallback.current(), delay || 0);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [delay]);
};

export default useInterval;
