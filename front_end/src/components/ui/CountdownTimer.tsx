"use client";

import { useState, useEffect, useRef } from "react";

interface CountdownTimerProps {
  validUntil: string;
  onExpire?: () => void;
  className?: string;
}

export default function CountdownTimer({ validUntil, onExpire, className = "" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const targetRef = useRef<Date | null>(null);

  useEffect(() => {
    targetRef.current = new Date(validUntil);
  }, [validUntil]);

  useEffect(() => {
    const update = () => {
      if (!targetRef.current) return;
      const diff = targetRef.current.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        onExpire?.();
        return;
      }
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [onExpire]);

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isUrgent = remaining < 5 * 60 * 1000;

  const formatTime = (m: number, s: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <span className={`font-mono tabular-nums ${isUrgent ? "text-red-500 animate-pulse" : ""} ${className}`}>
      {formatTime(minutes, seconds)}
    </span>
  );
}
