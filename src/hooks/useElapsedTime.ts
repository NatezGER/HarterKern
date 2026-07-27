import { useEffect, useState } from "react";

export function formatElapsed(startedAt: string, endedAt?: string) {
  const elapsed = Math.max(
    0,
    new Date(endedAt ?? Date.now()).getTime() - new Date(startedAt).getTime(),
  );
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} Std.`;
}

export function useElapsedTime(startedAt: string, endedAt?: string) {
  const [value, setValue] = useState(() => formatElapsed(startedAt, endedAt));
  useEffect(() => {
    setValue(formatElapsed(startedAt, endedAt));
    if (endedAt) return;
    const interval = window.setInterval(
      () => setValue(formatElapsed(startedAt)),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, [endedAt, startedAt]);
  return value;
}
