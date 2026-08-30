import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAwardAssetUrl } from "@/hooks/useAwardAssets";
import { cn } from "@/lib/cn";

export function AwardAssetImage({ assetId, alt, className, fallback }: {
  assetId: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const url = useAwardAssetUrl(assetId);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => setFailedUrl(null), [url]);
  if (!url || failedUrl === url) return <>{fallback}</>;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("size-full object-contain", className)}
      onError={() => setFailedUrl(url)}
    />
  );
}
