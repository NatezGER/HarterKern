import { useState } from "react";
import { Beer } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
export function BeerBottle({ path }: { path: string | null }) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  return <span className="flex h-20 w-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] sm:h-24 sm:w-14" aria-hidden="true">
    {path && failedPath !== path
      ? <img src={getSupabase().storage.from("beer-brand-images").getPublicUrl(path).data.publicUrl}
          alt="" loading="lazy" className="h-full w-full object-contain" onError={() => setFailedPath(path)} />
      : <Beer className="size-6 text-gold-300/50" />}
  </span>;
}
