import { useEffect, useState } from "react";
import { getBadgeMaterialLabel } from "@/lib/badgePresentation";
import { getAdminBadgeCatalog } from "@/services/adminBadgeCatalogService";
import type { AdminBadgeCatalogEntry } from "@/services/adminBadgeCatalogService";
import { formatDate } from "@/utils/format";

const categoryLabels: Record<string, string> = {
  attempts: "Versuche", bingo: "Bingo", consolation: "Trostpreis", dnf: "DNF",
  favorite_time: "Lieblingszeit", flawless: "Fehlerfrei", glitch: "Glitch",
  performance: "Leistung", podium: "Podium", podiums: "Podien", precision: "Präzision",
  streak: "Serie", sub3_streak: "Sub-3-Serie", win_streak: "Siegesserie", wins: "Siege",
};

export function AdminBadgeCatalog() {
  const [entries, setEntries] = useState<AdminBadgeCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void getAdminBadgeCatalog().then((nextEntries) => {
      if (active) setEntries(nextEntries);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Badge-Katalog konnte nicht geladen werden.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <section className="panel mt-12 p-5 sm:p-8" aria-labelledby="admin-badge-catalog-title">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Administration</p>
    <h2 id="admin-badge-catalog-title" className="display-title mt-1 text-3xl">Badge-Katalog</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">Zentrale Definitionen und tatsächliche Vergaben zur Kontrolle. Nicht erreichte und inaktive Definitionen bleiben sichtbar.</p>
    {loading && <p className="mt-6 text-sm text-white/45">Badge-Katalog wird geladen…</p>}
    {error && <p className="mt-6 text-sm text-red-300" role="alert">{error}</p>}
    {!loading && !error && <div className="mt-6 grid gap-3 xl:grid-cols-2">
      {entries.map((entry) => {
        const material = getBadgeMaterialLabel(entry);
        const requirement = entry.requirement?.trim() || entry.description;
        return <article key={entry.badgeKey} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-display text-lg font-black uppercase">{entry.name}</h3><p className="mt-1 text-xs text-white/40">{entry.badgeKey}</p></div>
            <span className={entry.achievements.length > 0 ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200" : "rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/45"}>{entry.achievements.length > 0 ? `${entry.achievements.length}× erreicht` : "Nicht erreicht"}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
            <div><dt className="text-white/35">Kategorie</dt><dd className="mt-0.5 font-semibold">{categoryLabels[entry.category] ?? entry.category}</dd></div>
            <div><dt className="text-white/35">Material</dt><dd className="mt-0.5 font-semibold">{material}</dd></div>
            <div><dt className="text-white/35">Schwelle</dt><dd className="mt-0.5 font-semibold">{entry.threshold ?? "—"}</dd></div>
            <div><dt className="text-white/35">Geltung</dt><dd className="mt-0.5 font-semibold">{entry.scopeType}</dd></div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-white/70">{requirement}</p>
          {entry.description !== requirement && <p className="mt-1 text-xs leading-5 text-white/40">{entry.description}</p>}
          <p className="mt-3 text-[11px] text-white/30">{entry.badgeKind === "tiered" ? `Familie: ${entry.familyKey ?? "—"}` : "Einzel-Badge"}{entry.isSecret ? " · geheim" : ""}{!entry.isActive ? " · inaktiv" : ""}</p>
          {entry.achievements.length > 0 && <details className="mt-4 border-t border-white/10 pt-3"><summary className="cursor-pointer text-xs font-bold text-gold-300">Erreichungen anzeigen</summary><ul className="mt-2 space-y-1 text-xs text-white/55">{entry.achievements.map((achievement) => <li key={achievement.awardKey}>{achievement.playerName} · {formatDate(achievement.awardedAt.slice(0, 10))}</li>)}</ul></details>}
        </article>;
      })}
    </div>}
  </section>;
}
