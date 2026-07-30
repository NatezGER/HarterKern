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
  };
  Insert: {
    id?: string;
    event_id: string;
    storage_path: string;
    caption?: string | null;
    sort_order?: number;
    created_by: string;
  };
  Update: {
    caption?: string | null;
    sort_order?: number;
  };
  Relationships: [];
};

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
