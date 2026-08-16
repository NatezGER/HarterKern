import { ImagePlus, LoaderCircle, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PodiumMedal } from "@/components/common/PodiumMedal";
import { PrestigeBadgeEmblem } from "@/components/common/PrestigeBadgeEmblem";
import { Button } from "@/components/ui/button";
import { useAwardAssets } from "@/hooks/useAwardAssets";
import {
  badgeAssetId,
  groupBadgeDefinitions,
  medalAssetId,
  trophyAssetId,
} from "@/lib/awardAssets";
import type {
  AwardAssetType,
  BadgeAssetDefinition,
  MedalRank,
  TrophyAssetDefinition,
} from "@/lib/awardAssets";
import type { TrophyTier } from "@/types/pr8";
import {
  getBadgeAssetDefinitions,
  getTrophyAssetDefinitions,
} from "@/services/awardAssetService";
import { removeAwardAsset, uploadAwardAsset } from "@/services/mediaService";

const selectClass = "h-11 min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 text-sm";
const medalOptions = [
  { rank: 1 as const, label: "Gold / Platz 1" },
  { rank: 2 as const, label: "Silber / Platz 2" },
  { rank: 3 as const, label: "Bronze / Platz 3" },
];

export function AwardAssetManagement() {
  const { mapping, refresh } = useAwardAssets();
  const [type, setType] = useState<AwardAssetType>("medal");
  const [rank, setRank] = useState<MedalRank>(1);
  const [badges, setBadges] = useState<BadgeAssetDefinition[]>([]);
  const [trophies, setTrophies] = useState<TrophyAssetDefinition[]>([]);
  const [familyKey, setFamilyKey] = useState("");
  const [badgeKey, setBadgeKey] = useState("");
  const [trophyCompetitionKey, setTrophyCompetitionKey] = useState("");
  const [trophyYear, setTrophyYear] = useState(0);
  const [trophyTier, setTrophyTier] = useState<TrophyTier>("gold");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const badgeFamilies = useMemo(() => groupBadgeDefinitions(badges), [badges]);
  const family = badgeFamilies.find(({ key }) => key === familyKey) ?? badgeFamilies[0];
  const badge = family?.variants.find(({ badgeKey: key }) => key === badgeKey)
    ?? family?.variants[0];
  const trophyCompetitions = useMemo(() => {
    const unique = new Map<string, TrophyAssetDefinition>();
    for (const item of trophies) unique.set(`${item.competitionType}:${item.competitionId}`, item);
    return [...unique.entries()].map(([key, item]) => ({ key, ...item }));
  }, [trophies]);
  const trophyCompetition = trophyCompetitions.find(({ key }) => key === trophyCompetitionKey)
    ?? trophyCompetitions[0];
  const trophyYears = [...new Set(trophies
    .filter((item) => `${item.competitionType}:${item.competitionId}` === trophyCompetition?.key)
    .map(({ year }) => year))].sort((a, b) => b - a);
  const selectedTrophyYear = trophyYears.includes(trophyYear) ? trophyYear : trophyYears[0];
  const trophyTiers = trophies.filter((item) =>
    `${item.competitionType}:${item.competitionId}` === trophyCompetition?.key
    && item.year === selectedTrophyYear);
  const trophy = trophyTiers.find((item) => item.tier === trophyTier) ?? trophyTiers[0];
  const assetId = type === "medal" ? medalAssetId(rank)
    : type === "badge" && badge ? badgeAssetId(badge.badgeKey)
      : type === "trophy" && trophy ? trophyAssetId(trophy) : "";
  const customUrl = assetId ? mapping[assetId] : null;

  useEffect(() => {
    let active = true;
    void Promise.all([getBadgeAssetDefinitions(), getTrophyAssetDefinitions()])
      .then(([nextBadges, nextTrophies]) => {
        if (!active) return;
        setBadges(nextBadges);
        setTrophies(nextTrophies);
      })
      .catch((error) => active && setMessage(error instanceof Error
        ? error.message : "Award-Auswahl konnte nicht geladen werden."));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (family && family.key !== familyKey) setFamilyKey(family.key);
    if (badge && badge.badgeKey !== badgeKey) setBadgeKey(badge.badgeKey);
  }, [badge, badgeKey, family, familyKey]);
  useEffect(() => {
    if (trophyCompetition && trophyCompetition.key !== trophyCompetitionKey) {
      setTrophyCompetitionKey(trophyCompetition.key);
    }
    if (selectedTrophyYear && selectedTrophyYear !== trophyYear) setTrophyYear(selectedTrophyYear);
    if (trophy && trophy.tier !== trophyTier) setTrophyTier(trophy.tier);
  }, [selectedTrophyYear, trophy, trophyCompetition, trophyCompetitionKey, trophyTier, trophyYear]);

  const upload = async (file?: File) => {
    if (!file || !assetId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await uploadAwardAsset(assetId, file);
      await refresh();
      setMessage("Custom-Grafik gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!assetId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await removeAwardAsset(assetId);
      await refresh();
      setMessage("Custom-Grafik entfernt. Das generische Fallback ist wieder aktiv.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Entfernen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <h3 className="display-title text-2xl">Award-Grafiken</h3>
      <p className="mt-2 text-xs leading-5 text-white/50">
        Empfohlen: 1024 × 1024 px · PNG oder WebP · transparenter Hintergrund · max. 2 MB
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <select value={type} onChange={(event) => setType(event.target.value as AwardAssetType)} className={selectClass} aria-label="Award-Art">
          <option value="medal">Medaille</option>
          <option value="badge">Badge</option>
          <option value="trophy">Trophäe</option>
        </select>
        {type === "medal" && (
          <select value={rank} onChange={(event) => setRank(Number(event.target.value) as MedalRank)} className={selectClass} aria-label="Medaillenvariante">
            {medalOptions.map((option) => <option key={option.rank} value={option.rank}>{option.label}</option>)}
          </select>
        )}
        {type === "badge" && <>
          <select value={family?.key ?? ""} onChange={(event) => { setFamilyKey(event.target.value); setBadgeKey(""); }} className={selectClass} aria-label="Badge-Familie">
            {badgeFamilies.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <select value={badge?.badgeKey ?? ""} onChange={(event) => setBadgeKey(event.target.value)} className={selectClass} aria-label="Badge-Tier">
            {family?.variants.map((variant) => <option key={variant.badgeKey} value={variant.badgeKey}>{variant.tier === "special" ? "Special" : variant.tier}</option>)}
          </select>
        </>}
        {type === "trophy" && <>
          <select value={trophyCompetition?.key ?? ""} onChange={(event) => { setTrophyCompetitionKey(event.target.value); setTrophyYear(0); }} className={selectClass} aria-label="Trophäen-Wettbewerb">
            {trophyCompetitions.map((item) => <option key={item.key} value={item.key}>{item.competitionName}</option>)}
          </select>
          <select value={selectedTrophyYear ?? ""} onChange={(event) => setTrophyYear(Number(event.target.value))} className={selectClass} aria-label="Trophäen-Edition">
            {trophyYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={trophy?.tier ?? ""} onChange={(event) => setTrophyTier(event.target.value as TrophyTier)} className={selectClass} aria-label="Trophäen-Platzierung">
            {trophyTiers.map((item) => <option key={item.tier} value={item.tier}>{item.tier}</option>)}
          </select>
        </>}
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-white/[0.03] p-4 sm:flex-row sm:items-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-2">
          {customUrl ? <img src={customUrl} alt="Aktuelle Custom-Grafik" className="size-full object-contain" />
            : type === "medal" ? <PodiumMedal rank={rank} size="lg" />
              : type === "badge" && badge ? <PrestigeBadgeEmblem badge={{ badgeKey: badge.badgeKey, tier: badge.tier, name: badge.name }} size="md" />
                : <Trophy className="size-14 text-gold-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{customUrl ? "Custom" : "Generisches Fallback"}</p>
          <p className="mt-1 truncate text-xs text-white/35">{assetId || "Keine vorhandene Variante verfügbar"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <label className={busy || !assetId ? "pointer-events-none opacity-50" : "cursor-pointer"}>
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                Bild wählen
                <input className="sr-only" type="file" accept="image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void upload(file); }} />
              </label>
            </Button>
            {customUrl && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}><Trash2 className="size-4" /> Custom-Grafik entfernen</Button>}
          </div>
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-xs text-white/45">{message}</p>
    </section>
  );
}
