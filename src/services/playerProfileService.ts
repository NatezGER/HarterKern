import {
  getPlayerAttemptNumbers,
  getPlayerBadges,
  getPlayerBingo,
  getPlayerEventHistory,
  getPlayerPrestige,
  getPlayerProfileCore,
  getPlayerProgression,
  getPlayerTrophies,
} from "@/services/historyProfileService";
import type {
  AttemptNumberPoint,
  CompactBadge,
  PlayerBingo,
  PlayerEventSummary,
  PlayerProfileCore,
  PlayerProfilePrestige,
  PlayerProfileProgression,
  TrophyAward,
} from "@/types/historyProfiles";
import type { DataGroup } from "@/services/dataGroupService";

export type PlayerProfileSection =
  | "core"
  | "badges"
  | "trophies"
  | "prestige"
  | "progression"
  | "attempt-numbers"
  | "events"
  | "bingo";

export interface PlayerProfileSectionData {
  core: PlayerProfileCore | null;
  badges: CompactBadge[];
  trophies: TrophyAward[];
  prestige: PlayerProfilePrestige;
  progression: PlayerProfileProgression;
  "attempt-numbers": AttemptNumberPoint[];
  events: PlayerEventSummary[];
  bingo: PlayerBingo;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; expiresAt: number }>();
const inFlight = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();

const loaders: {
  [Section in PlayerProfileSection]: (
    playerId: string,
  ) => Promise<PlayerProfileSectionData[Section]>;
} = {
  core: getPlayerProfileCore,
  badges: getPlayerBadges,
  trophies: getPlayerTrophies,
  prestige: (playerId) => getPlayerPrestige(playerId, 0),
  progression: getPlayerProgression,
  "attempt-numbers": getPlayerAttemptNumbers,
  events: getPlayerEventHistory,
  bingo: getPlayerBingo,
};

function loadSection<Section extends PlayerProfileSection>(
  section: Section,
  playerId: string,
): Promise<PlayerProfileSectionData[Section]> {
  if (section === "prestige") {
    return loadPlayerProfileSection("badges", playerId)
      .then((badges) => getPlayerPrestige(playerId, badges.length)) as
      Promise<PlayerProfileSectionData[Section]>;
  }
  return loaders[section](playerId);
}

function cacheKey(section: PlayerProfileSection, playerId: string) {
  return `${section}:${playerId}`;
}

export function loadPlayerProfileSection<Section extends PlayerProfileSection>(
  section: Section,
  playerId: string,
  options: { force?: boolean } = {},
): Promise<PlayerProfileSectionData[Section]> {
  const key = cacheKey(section, playerId);
  if (options.force) cache.delete(key);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value as PlayerProfileSectionData[Section]);
  }
  if (cached) cache.delete(key);
  const running = inFlight.get(key);
  if (running) return running as Promise<PlayerProfileSectionData[Section]>;

  const generation = generations.get(key) ?? 0;
  const request = loadSection(section, playerId)
    .then((value) => {
      if ((generations.get(key) ?? 0) === generation) {
        cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      }
      return value;
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

export function invalidatePlayerProfileSections(
  sections: PlayerProfileSection[],
  playerId?: string,
) {
  const keys = new Set([...cache.keys(), ...inFlight.keys()]);
  for (const key of keys) {
    const [section, cachedPlayerId] = key.split(":");
    if (sections.includes(section as PlayerProfileSection) &&
      (playerId == null || playerId === cachedPlayerId)) {
      cache.delete(key);
      inFlight.delete(key);
      generations.set(key, (generations.get(key) ?? 0) + 1);
    }
  }
}

const sectionByGroup: Partial<Record<DataGroup, PlayerProfileSection>> = {
  "profile-core": "core",
  "profile-badges": "badges",
  "profile-trophies": "trophies",
  "profile-prestige": "prestige",
  "profile-progression": "progression",
  "profile-attempt-numbers": "attempt-numbers",
  "profile-events": "events",
  bingo: "bingo",
};

export function profileSectionsForDataGroups(groups: DataGroup[]) {
  return groups.flatMap((group) => sectionByGroup[group] ? [sectionByGroup[group]] : [])
    .filter((section, index, all): section is PlayerProfileSection =>
      section != null && all.indexOf(section) === index);
}

export function clearPlayerProfileCache() {
  cache.clear();
  inFlight.clear();
  generations.clear();
}
