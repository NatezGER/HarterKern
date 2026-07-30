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
  };
  Insert: {
    badge_key: string;
    category: string;
    tier: BadgeTier;
    name: string;
    description: string;
    threshold?: number | null;
    sort_order?: number;
  };
  Update: Partial<BadgeDefinitionsTable["Insert"]>;
  Relationships: [];
};

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
  };
  Relationships: [];
};
