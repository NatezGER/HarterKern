import { lazy, Suspense } from "react";

const LazyAdminBadgeCatalog = lazy(() => import("@/components/stats/AdminBadgeCatalog")
  .then(({ AdminBadgeCatalog }) => ({ default: AdminBadgeCatalog })));

export function AdminBadgeCatalogSlot({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) return null;
  return <Suspense fallback={<p className="mt-12 text-sm text-white/45">Badge-Katalog wird geladen…</p>}><LazyAdminBadgeCatalog /></Suspense>;
}
