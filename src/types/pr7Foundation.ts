export type BadgeTier = "bronze" | "silver" | "gold" | "diamond" | "special";

type BadgeMetadata =
  | string
  | number
  | boolean
  | null
  | { [key: string]: BadgeMetadata | undefined }
  | BadgeMetadata[];

export type EventPhotosTable = {
  Row: {
    id: string;
    event_id: string;
    storage_path: string;
    caption: string | null;
    sort_order: number;
    created_by: string | null;
    created_at: string;
    mime_type: string | null;
    size_bytes: number | null;
  };
  Insert: {
    id?: string;
    event_id: string;
    storage_path: string;
    caption?: string | null;
    sort_order?: number;
    created_by: string;
    mime_type?: string | null;
    size_bytes?: number | null;
  };
  Update: {
    caption?: string | null;
    sort_order?: number;
    mime_type?: string | null;
    size_bytes?: number | null;
  };
  Relationships: [];
};

export interface EventAttemptDetailsView {
  Row: {
    attempt_id: string;
    event_id: string;
    player_id: string | null;
    guest_id: string | null;
    display_name: string;
    avatar_url: string | null;
    avatar_path: string | null;
    is_guest: boolean;
    is_ak: boolean;
    time_hundredths: number | null;
    is_dnf: boolean;
    submitted_at: string;
    attempt_number: number;
    participant_rank: number | null;
    is_personal_best: boolean;
    is_world_record: boolean;
    is_event_best: boolean;
  };
  Relationships: [];
}

export interface EventParticipantStatisticsView {
  Row: {
    event_id: string;
    player_id: string | null;
    guest_id: string | null;
    display_name: string;
    avatar_url: string | null;
    avatar_path: string | null;
    is_guest: boolean;
    is_ak: boolean;
    attempt_count: number;
    valid_attempts: number;
    dnf_count: number;
    best_time_hundredths: number | null;
    average_hundredths: number | null;
    participant_rank: number | null;
  };
  Relationships: [];
}

export interface PlayerEventHistoryView {
  Row: {
    player_id: string;
    event_id: string;
    event_name: string;
    event_date: string;
    best_time_hundredths: number | null;
    rank: number | null;
    attempt_count: number;
    valid_attempts: number;
    dnf_count: number;
  };
  Relationships: [];
}

export type BadgeDefinitionsTable = {
  Row: {
    badge_key: string;
    category: string;
    tier: BadgeTier;
    name: string;
    description: string;
    threshold: number | null;
    sort_order: number;
    created_at: string;
    family_key: string | null;
    requirement: string | null;
    is_secret: boolean;
    badge_kind: "tiered" | "single";
    design_variant: "standard" | "positive_special" | "consolation";
    scope_type: "all_time" | "season" | "event";
    is_active: boolean;
  };
  Insert: {
    badge_key: string;
    category: string;
    tier: BadgeTier;
    name: string;
    description: string;
    threshold?: number | null;
    sort_order?: number;
    family_key?: string | null;
    requirement?: string | null;
    is_secret?: boolean;
    badge_kind?: "tiered" | "single";
    design_variant?: "standard" | "positive_special" | "consolation";
    scope_type?: "all_time" | "season" | "event";
    is_active?: boolean;
  };
  Update: Partial<BadgeDefinitionsTable["Insert"]>;
  Relationships: [];
};

export interface WorldRecordHistoryView {
  Row: {
    record_id: string;
    player_id: string;
    display_name: string;
    avatar_url: string | null;
    avatar_path: string | null;
    time_hundredths: number;
    achieved_at: string;
    achieved_date: string;
    event_id: string | null;
    source_label: string;
    source_type: "attempt" | "historical_attempt";
    sequence_number: number;
    previous_record_hundredths: number | null;
    improvement_hundredths: number | null;
    period_end_date: string | null;
    duration_days: number;
    is_current: boolean;
  };
  Relationships: [];
}

export interface PlayerPbHistoryView {
  Row: {
    source_id: string;
    player_id: string;
    display_name: string;
    time_hundredths: number;
    achieved_at: string;
    achieved_date: string;
    event_id: string | null;
    source_label: string;
    source_type: "attempt" | "historical_attempt";
    sequence_number: number;
    previous_best_hundredths: number | null;
    improvement_hundredths: number | null;
    period_end_date: string | null;
    duration_days: number;
    is_current: boolean;
  };
  Relationships: [];
}

export interface EventAttemptNumberStatisticsView {
  Row: {
    event_id: string;
    attempt_number: number;
    sample_count: number;
    average_hundredths: number;
    best_hundredths: number;
    slowest_hundredths: number;
  };
  Relationships: [];
}

export interface VisiblePlayerBadgesView {
  Row: PublicPlayerBadgesView["Row"] & {
    avatar_path: string | null;
    family_key: string | null;
    requirement: string | null;
    threshold: number | null;
    sort_order: number;
    is_secret: boolean;
    source_event_name: string | null;
    source_event_date: string | null;
    tier_rank: number;
    recipient_count: number;
    regular_player_count: number;
    rarity_percent: number | null;
    source_attempt_number: number | null;
    source_time_hundredths: number | null;
    next_badge_key: string | null;
    next_badge_name: string | null;
    next_requirement: string | null;
    next_tier: BadgeTier | null;
    next_threshold: number | null;
    current_progress: number | null;
    is_special_event_badge: boolean;
    badge_kind: "tiered" | "single";
    design_variant: "standard" | "positive_special" | "consolation";
    scope_type: "all_time" | "season" | "event";
  };
  Relationships: [];
}

export interface PlayerPrestigeStatisticsView {
  Row: {
    player_id: string;
    pb_count: number;
    largest_pb_improvement_hundredths: number | null;
    average_pb_improvement_hundredths: number | null;
    world_record_count: number;
    world_record_days: number;
    longest_world_record_days: number;
    visible_badge_count: number;
  };
  Relationships: [];
}

export type EventPodiumView = {
  Row: {
    event_id: string;
    player_id: string | null;
    guest_id: string | null;
    display_name: string;
    avatar_url: string | null;
    is_guest: boolean;
    best_time_hundredths: number;
    rank: number;
  };
  Relationships: [];
};

export type PlayerBadgeAwardsView = {
  Row: {
    award_key: string;
    player_id: string;
    badge_key: string;
    source_type: string;
    source_attempt_id: string | null;
    source_historical_attempt_id: string | null;
    source_event_id: string | null;
    awarded_at: string;
    metadata: BadgeMetadata;
  };
  Relationships: [];
};

export type PlayerAttemptNumberStatisticsView = {
  Row: {
    player_id: string;
    attempt_number: number;
    attempt_count: number;
    valid_attempts: number;
    dnf_count: number;
    average_hundredths: number | null;
  };
  Relationships: [];
};

export type PlayerPbProgressionView = {
  Row: {
    source_id: string;
    player_id: string;
    display_name: string;
    time_hundredths: number;
    achieved_at: string;
    event_id: string | null;
    source_type: "attempt" | "historical_attempt";
    source_priority: number;
    source_order: number;
  };
  Relationships: [];
};

export type PublicPlayerBadgesView = {
  Row: PlayerBadgeAwardsView["Row"] & {
    display_name: string;
    avatar_url: string | null;
    category: string;
    tier: BadgeTier;
    name: string;
    description: string;
    badge_kind: "tiered" | "single";
    design_variant: "standard" | "positive_special" | "consolation";
    scope_type: "all_time" | "season" | "event";
  };
  Relationships: [];
};
