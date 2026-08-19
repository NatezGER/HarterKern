import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PrestigeBadgeEmblem } from "@/components/common/PrestigeBadgeEmblem";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { getBadgeMaterialLabel } from "@/lib/badgePresentation";
import { nextBadgeRaritySelection } from "@/lib/badgeRaritySelection";
import { cn } from "@/lib/cn";
import type { BadgeRarity } from "@/types";

export function BadgeRarityGrid({ badges }: { badges: BadgeRarity[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  return <BadgeRarityContent
    badges={badges}
    selectedKey={selectedKey}
    onSelect={(key) => setSelectedKey((current) => nextBadgeRaritySelection(current, key))}
  />;
}

export function BadgeRarityContent({
  badges,
  selectedKey,
  onSelect,
}: {
  badges: BadgeRarity[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const selected = badges.find(({ key }) => key === selectedKey) ?? null;
  return <div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {badges.map((badge) => {
        const expanded = badge.key === selected?.key;
        return <button
          key={badge.key}
          type="button"
          aria-expanded={expanded}
          aria-controls={`badge-rarity-detail-${badge.key}`}
          onClick={() => onSelect(badge.key)}
          className={cn(
            "panel flex min-w-0 items-center gap-2 p-3 text-left transition hover:border-gold-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:gap-4 sm:p-4",
            expanded && "border-gold-400/45 bg-gold-400/[0.06]",
          )}
        >
          <PrestigeBadgeEmblem badge={{ badgeKey: badge.key, tier: badge.tier, name: badge.name, designVariant: badge.designVariant }} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-gold-300 sm:text-[9px] sm:tracking-[0.18em]">{getBadgeMaterialLabel(badge)}</span>
            <span className="mt-1 block break-words font-display text-sm font-black uppercase sm:text-lg">{badge.name}</span>
            <span className="mt-2 block font-display text-xl font-black sm:text-2xl">{badge.percent == null ? "—" : `${badge.percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`}</span>
            <span className="mt-1 block text-[9px] text-white/35 sm:text-[10px]">{badge.recipients} von {badge.playerCount} Spielern</span>
          </span>
          <ChevronDown className={cn("hidden size-4 shrink-0 text-white/35 transition-transform sm:block", expanded && "rotate-180")} />
        </button>;
      })}
    </div>
    {selected && <section id={`badge-rarity-detail-${selected.key}`} className="panel mt-3 p-4 sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <PrestigeBadgeEmblem badge={{ badgeKey: selected.key, tier: selected.tier, name: selected.name, designVariant: selected.designVariant }} size="sm" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gold-300">{getBadgeMaterialLabel(selected)}</p>
          <h3 className="font-display text-xl font-black uppercase">{selected.name}</h3>
          <p className="text-xs text-white/40">{selected.percent == null ? "Keine Quote verfügbar" : `${selected.percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`} · {selected.recipients} von {selected.playerCount} Spielern</p>
        </div>
      </div>
      {selected.recipientsList.length > 0 ? <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {selected.recipientsList.map((recipient) => <li key={recipient.playerId}>
          <Link to={`/player/${recipient.playerId}`} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition hover:border-gold-400/30 hover:bg-gold-400/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
            <ProfileAvatar id={recipient.playerId} name={recipient.playerName} url={recipient.avatarUrl} className="size-9" />
            <span className="min-w-0 truncate text-sm font-bold text-white/75">{recipient.playerName}</span>
          </Link>
        </li>)}
      </ul> : <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-sm text-white/40">Noch kein dauerhafter Spieler besitzt dieses Badge.</p>}
    </section>}
  </div>;
}
