import { useEffect, useState } from "react";
import { formatBadgeTime, getBadgeMaterialLabel } from "@/lib/badgePresentation";
import { getAdminBadgeCatalog } from "@/services/adminBadgeCatalogService";
import type { AdminBadgeCatalog as AdminBadgeCatalogData, AdminBadgeCatalogEntry } from "@/services/adminBadgeCatalogService";
import type { AdminBadgeFamily, AdminBadgeFamilyProgress } from "@/services/adminBadgeCatalogService";
import { formatDate } from "@/utils/format";
import { PrestigeBadgeEmblem } from "@/components/common/PrestigeBadgeEmblem";

const categoryLabels: Record<string, string> = {
  attempts: "Versuche", bingo: "Bingo", consolation: "Trostpreis", dnf: "DNF",
  event_attempts: "Event-Versuche", rapid_fire: "Sperrfeuer", teamwork: "Teamwork",
  favorite_time: "Lieblingszeit", flawless: "Fehlerfrei", glitch: "Glitch",
  performance: "Leistung", podium: "Podium", podiums: "Podien", precision: "Präzision", rivalry: "Rivalität",
  streak: "Serie", sub3_streak: "Sub-3-Serie", win_streak: "Siegesserie", wins: "Siege",
};

const stageStyles = {
  bronze: "border-orange-700/35 bg-orange-800/[0.07]",
  silver: "border-slate-300/25 bg-slate-300/[0.06]",
  gold: "border-gold-400/30 bg-gold-400/[0.07]",
  diamond: "border-cyan-300/30 bg-cyan-300/[0.07]",
};

function progressLabel(entry: AdminBadgeCatalogEntry, progress?: number | null, timeHundredths?: number | null) {
  if (entry.category === "favorite_time" && progress != null && timeHundredths != null) return `${progress}× ${formatBadgeTime(timeHundredths)}`;
  if (progress == null) return null;
  if (entry.category === "attempts") return `${progress} gültige Versuche`;
  if (entry.category === "event_attempts") return `${progress} gültige Event-Versuche`;
  if (entry.category === "rapid_fire") return `${progress} in 60 Minuten`;
  if (entry.category === "teamwork") return `${progress} Teamwork-Events`;
  if (entry.category === "wins") return `${progress} Siege`;
  if (entry.category === "events") return `${progress} Events`;
  if (entry.category === "podiums") return `${progress} Podien`;
  if (entry.category === "bingo") return `${progress} BINGO-Linien`;
  return `${progress}`;
}

function AchievementList({ entry, emptyLabel = "Noch niemand" }: { entry: AdminBadgeCatalogEntry; emptyLabel?: string }) {
  if (entry.achievements.length === 0) return <p className="mt-3 text-xs text-white/35">{emptyLabel}</p>;
  return <ul className="mt-3 space-y-1 text-xs text-white/60">{entry.achievements.map((achievement) => { const progress = progressLabel(entry, achievement.progress, achievement.timeHundredths); return <li key={achievement.awardKey}>{achievement.playerName}{progress ? ` · ${progress}` : ""} <span className="text-white/30">· {formatDate(achievement.awardedAt.slice(0, 10))}</span></li>; })}</ul>;
}

function FamilyProgress({ family, progress }: { family: AdminBadgeFamily; progress: AdminBadgeFamilyProgress }) {
  const highestAchievedIndex = family.stages.reduce((highest, stage, index) =>
    stage.achievements.some(({ playerId }) => playerId === progress.playerId) ? index : highest, -1);
  const next = family.stages[highestAchievedIndex + 1] ?? null;
  const current = family.category === "favorite_time" && progress.timeHundredths != null
    ? `${progress.currentProgress}× ${formatBadgeTime(progress.timeHundredths)}` : String(progress.currentProgress);
  const remaining = next?.threshold == null ? null : family.category === "performance"
    ? Math.max(0, progress.currentProgress - next.threshold + 1)
    : Math.max(0, next.threshold - progress.currentProgress);
  return <li className="rounded-lg bg-white/[0.035] px-3 py-2">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><strong className="text-sm">{progress.playerName}</strong><span className="text-xs tabular-nums text-white/65">Aktuell: {current}{next?.threshold != null ? ` / ${next.threshold}` : ""}</span></div>
    <p className="mt-1 text-xs text-white/40">{next ? `${remaining ?? "—"} bis ${getBadgeMaterialLabel(next)}` : "Diamond erreicht · keine weitere Stufe"}</p>
  </li>;
}

export function AdminBadgeCatalogContent({ catalog }: { catalog: AdminBadgeCatalogData }) {
  return <div className="mt-6 space-y-10">
    {catalog.families.length > 0 && <section aria-labelledby="admin-badge-families-title">
      <h3 id="admin-badge-families-title" className="display-title text-2xl">Badge-Familien</h3>
      <div className="mt-4 space-y-5">{catalog.families.map((family) => <article key={family.familyKey} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <h4 className="font-display text-xl font-black uppercase">{family.name}</h4>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/40">{categoryLabels[family.category] ?? family.category}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">{family.description}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{family.stages.map((stage) => <section key={stage.badgeKey} className={`min-w-0 overflow-hidden rounded-xl border p-4 ${stageStyles[stage.tier as keyof typeof stageStyles]}`}>
          <div className="flex min-w-0 items-start gap-3"><PrestigeBadgeEmblem badge={stage} size="sm" /><div className="min-w-0 flex-1"><h5 className="font-display text-lg font-black uppercase">{getBadgeMaterialLabel(stage)}</h5><span className="text-xs font-bold text-white/45">Schwelle {stage.threshold ?? "—"}</span></div></div>
          <p className="mt-2 text-xs leading-5 text-white/55">{stage.requirement?.trim() || stage.description}</p>
          <div className="mt-4 border-t border-white/10 pt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Freigeschaltet von</p><AchievementList entry={stage} /></div>
        </section>)}</div>
        {(family.progress?.length ?? 0) > 0 && <details className="mt-4 rounded-xl border border-white/[0.07] bg-black/15 p-3"><summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-white/55">Aktueller Fortschritt · {family.progress!.length} Spieler</summary><ul className="mt-3 grid gap-2 sm:grid-cols-2">{family.progress!.map((progress) => <FamilyProgress key={progress.playerId} family={family} progress={progress} />)}</ul></details>}
      </article>)}</div>
    </section>}
    {catalog.singles.length > 0 && <section aria-labelledby="admin-single-badges-title">
      <h3 id="admin-single-badges-title" className="display-title text-2xl">Einzel- &amp; Sonderbadges</h3>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">{catalog.singles.map((entry) => {
        const requirement = entry.requirement?.trim() || entry.description;
        const variantClass = entry.designVariant === "positive_special" ? "border-emerald-300/30 bg-emerald-300/[0.07]" : entry.designVariant === "consolation" ? "border-amber-700/30 bg-amber-900/[0.08]" : "border-white/10 bg-black/20";
        return <article key={entry.badgeKey} className={`rounded-2xl border p-4 ${variantClass}`}>
          <div className="flex min-w-0 flex-wrap items-start gap-3"><PrestigeBadgeEmblem badge={entry} size="sm" /><div className="min-w-0 flex-1"><h4 className="font-display text-lg font-black uppercase">{entry.name}</h4><p className="mt-1 break-all text-xs text-white/40">{entry.badgeKey}</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/55">{getBadgeMaterialLabel(entry)}</span></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3"><div><dt className="text-white/35">Kategorie</dt><dd className="mt-0.5 font-semibold">{categoryLabels[entry.category] ?? entry.category}</dd></div><div><dt className="text-white/35">Schwelle</dt><dd className="mt-0.5 font-semibold">{entry.threshold ?? "—"}</dd></div><div><dt className="text-white/35">Geltung</dt><dd className="mt-0.5 font-semibold">{entry.scopeType}</dd></div></dl>
          <p className="mt-4 text-sm leading-6 text-white/70">{requirement}</p>
          <AchievementList entry={entry} />
        </article>;
      })}</div>
    </section>}
  </div>;
}

export function AdminBadgeCatalog() {
  const [catalog, setCatalog] = useState<AdminBadgeCatalogData>({ families: [], singles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void getAdminBadgeCatalog().then((nextCatalog) => {
      if (active) setCatalog(nextCatalog);
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
    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">Aktive Badge-Familien, Sonderbadges und tatsächliche Vergaben zur Kontrolle.</p>
    {loading && <p className="mt-6 text-sm text-white/45">Badge-Katalog wird geladen…</p>}
    {error && <p className="mt-6 text-sm text-red-300" role="alert">{error}</p>}
    {!loading && !error && <AdminBadgeCatalogContent catalog={catalog} />}
  </section>;
}
