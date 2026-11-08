import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
const sizes = {
  small: "h-20 w-12 sm:h-24 sm:w-14",
  podium: "h-32 w-full sm:h-56",
  detail: "h-52 w-full max-w-48 sm:h-64",
};
export function BeerBottle({ path, size = "small" }: { path: string | null; size?: keyof typeof sizes }) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  return <span className={"flex shrink-0 items-center justify-center rounded-lg bg-white/[0.03] "+sizes[size]} aria-hidden="true">
    {path && failedPath !== path
      ? <img src={getSupabase().storage.from("beer-brand-images").getPublicUrl(path).data.publicUrl}
          alt="" loading={size === "podium" ? "eager" : "lazy"} className="h-full w-full object-contain" onError={() => setFailedPath(path)} />
      : <svg viewBox="0 0 48 100" className="h-3/4 w-1/2 max-w-16 text-gold-300/40" fill="none">
          <path d="M19 5h10v25c0 8 9 10 9 20v40c0 4-3 6-6 6H16c-3 0-6-2-6-6V50c0-10 9-12 9-20Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="2" />
          <path d="M18 5h12M17 55h14v22H17Z" stroke="currentColor" strokeWidth="2" />
        </svg>}
  </span>;
}
