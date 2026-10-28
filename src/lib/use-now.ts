"use client";

import { useEffect, useState } from "react";
import { serverNow } from "./live-store";

/** The current time (corrected to the server's clock, so every phone shows the same match minute), refreshed every `ms` milliseconds. */
export function useNow(ms: number): Date {
  const [now, setNow] = useState<Date>(() => serverNow());
  useEffect(() => {
    setNow(serverNow());
    const timer = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}
