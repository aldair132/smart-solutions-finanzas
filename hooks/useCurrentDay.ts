"use client";

import { useEffect, useState } from "react";
import { getBusinessDay } from "@/lib/businessDate";

export function useCurrentDay() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function updateDay() {
      const now = new Date();
      const day = getBusinessDay(now);
      const nextMidnight = Date.parse(`${day}T00:00:00-05:00`) + 86_400_000;
      clearTimeout(timer);
      setToday(day);
      timer = setTimeout(updateDay, nextMidnight - now.getTime());
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") updateDay();
    }

    timer = setTimeout(updateDay, 0);
    window.addEventListener("focus", updateDay);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", updateDay);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return today;
}
