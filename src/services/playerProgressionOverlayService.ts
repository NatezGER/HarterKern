import { getSupabase } from "@/lib/supabase";
import type { TimelineOverlaySeries, TimelinePoint } from "@/components/progression/ProgressionTimeline";
import type { OverlayPlayerOption } from "@/components/progression/PlayerOverlaySelector";
import { resolvePlayerAvatar } from "@/services/mappers";

type OverlayRow = { source_id: string; player_id: string; display_name: string; avatar_url: string | null; time_hundredths: number; achieved_at: string; achieved_date: string; event_id: string | null; source_label: string; source_type: string; previous_best_hundredths: number | null; improvement_hundredths: number | null; duration_days: number; is_current: boolean };
const cache = new Map<string, TimelineOverlaySeries[]>();

export async function loadPlayerProgressionOverlays(playerIds: string[], seasonYear?: number) {
  if (!playerIds.length) return [];
  const orderedIds = [...new Set(playerIds)];
  const ids = [...orderedIds].sort();
  const key = `${seasonYear ?? "all"}:${ids.join(",")}`;
  const cached = cache.get(key); if (cached) return orderSeries(cached, orderedIds);
  const result = await getSupabase().rpc("get_player_progressions", { p_player_ids: ids, p_season_year: seasonYear ?? null });
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as OverlayRow[];
  const series = ids.map((id) => {
    const own = rows.filter((row) => row.player_id === id);
    return { id, label: own[0]?.display_name ?? id, points: own.map(mapRow) };
  });
  cache.set(key, series); return orderSeries(series, orderedIds);
}

function orderSeries(series: TimelineOverlaySeries[], ids: string[]) {
  const byId = new Map(series.map((item) => [item.id, item]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

const AVATAR_STORAGE_PREFIX = "/storage/v1/object/public/player-avatars/";

export function resolveProgressionAvatar(value: string | null) {
  if (!value?.startsWith(AVATAR_STORAGE_PREFIX)) return value;
  return resolvePlayerAvatar(decodeURIComponent(value.slice(AVATAR_STORAGE_PREFIX.length)), null);
}

function mapRow(row: OverlayRow): TimelinePoint { return { id: row.source_id, playerId: row.player_id, playerName: row.display_name, avatarUrl: resolveProgressionAvatar(row.avatar_url), timeHundredths: row.time_hundredths, achievedAt: row.achieved_at, achievedDate: row.achieved_date, eventId: row.event_id, sourceLabel: row.source_label, improvementHundredths: row.improvement_hundredths, durationDays: row.duration_days, isCurrent: row.is_current, hasExactTime: row.source_type === "attempt" }; }

export function buildEventPlayerProgressions(attempts: Array<{ id: string; playerId: string | null; name: string; avatarUrl: string | null; isGuest: boolean; isAk: boolean; isDnf: boolean; timeHundredths: number | null; submittedAt: string; attemptNumber: number }>, selectedIds: string[]): TimelineOverlaySeries[] {
  return selectedIds.map((playerId) => {
    let best = Infinity;
    const qualified = attempts.filter((attempt) => attempt.playerId === playerId && !attempt.isGuest && !attempt.isAk && !attempt.isDnf && attempt.timeHundredths != null).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
    const points: TimelinePoint[] = [];
    for (const attempt of qualified) if (attempt.timeHundredths! < best) { const previous = best; best = attempt.timeHundredths!; points.push({ id: attempt.id, playerId, playerName: attempt.name, avatarUrl: attempt.avatarUrl, timeHundredths: best, achievedAt: attempt.submittedAt, achievedDate: attempt.submittedAt.slice(0, 10), eventId: null, sourceLabel: "Event-PB", improvementHundredths: Number.isFinite(previous) ? previous - best : null, durationDays: 0, attemptNumber: attempt.attemptNumber, isCurrent: false, hasExactTime: true }); }
    return { id: playerId, label: qualified[0]?.name ?? playerId, points };
  });
}

export function regularPlayerOptions(players: Array<{ id: string; name: string; avatarUrl?: string | null; isAk?: boolean; isArchived?: boolean }>, excluded: string[] = []): OverlayPlayerOption[] { return players.filter((player) => !player.isAk && !player.isArchived && !excluded.includes(player.id)).map((player) => ({ id: player.id, name: player.name, avatarUrl: player.avatarUrl })); }
