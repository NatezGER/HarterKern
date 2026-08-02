export type TrophyTier = "gold" | "silver" | "bronze";

export interface PlayerTrophyView {
  Row: {
    trophy_key: string;
    competition_type: "event" | "season";
    scope_type: "all_time" | "season" | "event";
    competition_id: string;
    season_key: string | null;
    competition_name: string;
    competition_year: number;
    event_date: string;
    placement: 1 | 2 | 3;
    trophy_tier: TrophyTier;
    player_id: string | null;
    guest_id: string | null;
    display_name: string;
    avatar_url: string | null;
    avatar_path: string | null;
    is_guest: boolean;
    best_time_hundredths: number;
    awarded_at: string;
  };
  Relationships: [];
}

export interface MostWantedEndingView {
  Row: {
    ending: number;
    ending_label: string;
    first_source_id: string | null;
    first_player_id: string | null;
    first_guest_id: string | null;
    first_display_name: string | null;
    first_avatar_url: string | null;
    first_avatar_path: string | null;
    first_is_guest: boolean;
    first_time_hundredths: number | null;
    first_occurred_at: string | null;
    first_occurred_date: string | null;
    first_has_exact_time: boolean;
    first_event_id: string | null;
    first_source_type: "attempt" | "historical_attempt" | null;
    source_label: string | null;
    hit_count: number;
    participant_count: number;
    achieved: boolean;
  };
  Relationships: [];
}

export interface MostWantedProgressView {
  Row: {
    reached_count: number;
    total_count: number;
    progress_percent: number;
    open_endings: number[] | null;
    most_common_ending: number | null;
    most_common_hit_count: number;
    rarest_achieved_endings: number[] | null;
  };
  Relationships: [];
}

export interface LeagueTimeStatisticsView {
  Row: {
    total_valid_times: number;
    most_common_time_hundredths: number | null;
    most_common_time_hits: number;
    most_common_time_participants: number;
    smooth_time_count: number;
    most_common_smooth_time_hundredths: number | null;
    most_common_smooth_time_hits: number;
    top_smooth_player_id: string | null;
    top_smooth_player_name: string | null;
    top_smooth_player_avatar_url: string | null;
    top_smooth_player_avatar_path: string | null;
    top_smooth_player_hits: number;
    latest_smooth_source_id: string | null;
    latest_smooth_player_id: string | null;
    latest_smooth_player_name: string | null;
    latest_smooth_time_hundredths: number | null;
    latest_smooth_occurred_at: string | null;
    latest_smooth_occurred_date: string | null;
    latest_smooth_has_exact_time: boolean | null;
  };
  Relationships: [];
}

export interface LeagueTimeThresholdStatisticsView {
  Row: {
    threshold_seconds: number;
    threshold_hundredths: number;
    attempt_count: number;
    total_count: number;
    percentage: number;
  };
  Relationships: [];
}
