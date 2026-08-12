import type {
  DataPlatformFunctions,
  EventGuestsTable,
  EventParticipantsTable,
  HistoricalAttemptsTable,
} from "@/types/dataPlatform";
import type {
  BadgeDefinitionsTable,
  BadgeTier,
  EventPhotosTable,
  EventPodiumView,
  PlayerAttemptNumberStatisticsView,
  PlayerBadgeAwardsView,
  PlayerPbProgressionView,
  PublicPlayerBadgesView,
  EventAttemptDetailsView,
  EventParticipantStatisticsView,
  PlayerEventHistoryView,
  WorldRecordHistoryView,
  PlayerPbHistoryView,
  EventAttemptNumberStatisticsView,
  VisiblePlayerBadgesView,
  PlayerPrestigeStatisticsView,
} from "@/types/pr7Foundation";
import type {
  LeagueTimeStatisticsView,
  LeagueTimeThresholdStatisticsView,
  MostWantedEndingView,
  MostWantedProgressView,
  PlayerBingoFieldView,
  PlayerBingoHitView,
  PlayerBingoLineView,
  PlayerBingoStatisticsView,
  PlayerTrophyView,
} from "@/types/pr8";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type AttemptStatus = "pending" | "approved" | "rejected";
type AttemptSource = "public" | "admin";
type EventStatus = "active" | "closed";

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          display_name: string;
          normalized_name: string;
          avatar_url: string | null;
          avatar_path: string | null;
          is_ak: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
          legacy_source_id: string | null;
        };
        Insert: {
          id?: string;
          display_name: string;
          normalized_name?: string;
          avatar_url?: string | null;
          avatar_path?: string | null;
          is_ak?: boolean;
          is_archived?: boolean;
          legacy_source_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string | null;
          start_date: string;
          started_at: string;
          ends_at: string;
          status: EventStatus;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
          end_reason: string | null;
          winner_player_id: string | null;
          winner_guest_id: string | null;
          legacy_source_id: string | null;
          description: string | null;
          is_important: boolean;
          awards_trophies: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          start_date: string;
          started_at?: string;
          ends_at: string;
          status?: EventStatus;
          closed_at?: string | null;
          end_reason?: string | null;
          winner_player_id?: string | null;
          winner_guest_id?: string | null;
          legacy_source_id?: string | null;
          description?: string | null;
          is_important?: boolean;
          awards_trophies?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          player_id: string | null;
          guest_id: string | null;
          event_id: string | null;
          event_name: string | null;
          is_ak: boolean;
          legacy_source_id: string | null;
          status: AttemptStatus;
          time_hundredths: number | null;
          is_dnf: boolean;
          submitted_at: string;
          edited_at: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          deleted_at: string | null;
          source: AttemptSource;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id?: string | null;
          guest_id?: string | null;
          event_id?: string | null;
          event_name?: string | null;
          is_ak?: boolean;
          legacy_source_id?: string | null;
          status?: AttemptStatus;
          time_hundredths?: number | null;
          is_dnf?: boolean;
          submitted_at?: string;
          source?: AttemptSource;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["attempts"]["Insert"]> & {
          edited_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      event_participants: EventParticipantsTable;
      event_guests: EventGuestsTable;
      historical_attempts: HistoricalAttemptsTable;
      event_photos: EventPhotosTable;
      badge_definitions: BadgeDefinitionsTable;
      admin_roles: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string };
        Update: never;
        Relationships: [];
      };
      rate_limit_entries: {
        Row: { id: string; client_hash: string; created_at: string };
        Insert: { client_hash: string };
        Update: never;
        Relationships: [];
      };
      merge_history: {
        Row: {
          id: string;
          source_player_id: string;
          target_player_id: string;
          merged_by: string;
          merged_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      public_hall_of_fame: {
        Row: {
          player_id: string;
          display_name: string;
          avatar_url: string | null;
          personal_best_hundredths: number;
          rank: number;
          record_date: string;
        };
        Relationships: [];
      };
      player_statistics: {
        Row: {
          player_id: string;
          personal_best_hundredths: number | null;
          approved_attempts: number;
          valid_attempts: number;
          dnf_count: number;
          average_hundredths: number | null;
          event_wins: number;
          event_participations: number;
          second_places: number;
          third_places: number;
        };
        Relationships: [];
      };
      event_statistics: {
        Row: {
          event_id: string;
          participant_count: number;
          valid_attempts: number;
          dnf_count: number;
          fastest_hundredths: number | null;
          average_hundredths: number | null;
        };
        Relationships: [];
      };
      event_winners: {
        Row: {
          event_id: string;
          player_id: string | null;
          guest_id: string | null;
          display_name: string;
          is_guest: boolean;
          winning_time_hundredths: number;
        };
        Relationships: [];
      };
      event_podium: EventPodiumView;
      player_badge_awards: PlayerBadgeAwardsView;
      player_attempt_number_statistics: PlayerAttemptNumberStatisticsView;
      player_pb_progression: PlayerPbProgressionView;
      public_player_badges: PublicPlayerBadgesView;
      event_attempt_details: EventAttemptDetailsView;
      event_participant_statistics: EventParticipantStatisticsView;
      player_event_history: PlayerEventHistoryView;
      world_record_history: WorldRecordHistoryView;
      player_pb_history: PlayerPbHistoryView;
      event_attempt_number_statistics: EventAttemptNumberStatisticsView;
      visible_player_badges: VisiblePlayerBadgesView;
      event_badge_unlocks: VisiblePlayerBadgesView;
      player_prestige_statistics: PlayerPrestigeStatisticsView;
      prestige_activity_feed: {
        Row: {
          activity_id: string;
          activity_type: "world_record" | "personal_best" | "badge" | "group_milestone";
          occurred_at: string;
          player_id: string | null;
          display_name: string | null;
          avatar_url: string | null;
          avatar_path: string | null;
          event_id: string | null;
          event_name: string | null;
          title: string;
          description: string;
          time_hundredths: number | null;
          badge_key: string | null;
          tier: BadgeTier | null;
          priority: number;
        };
        Relationships: [];
      };
      group_milestone_progress: {
        Row: {
          milestone_key: string;
          threshold: number;
          name: string;
          description: string;
          sort_order: number;
          current_count: number;
          achieved: boolean;
          source_attempt_id: string | null;
          source_player_id: string | null;
          source_player_name: string | null;
          source_event_id: string | null;
          source_event_name: string | null;
          achieved_at: string | null;
        };
        Relationships: [];
      };
      badge_rarity_statistics: {
        Row: {
          badge_key: string;
          name: string;
          tier: BadgeTier;
          tier_rank: number;
          sort_order: number;
          recipient_count: number;
          regular_player_count: number;
          rarity_percent: number | null;
        };
        Relationships: [];
      };
      player_trophies: PlayerTrophyView;
      most_wanted_endings: MostWantedEndingView;
      most_wanted_progress: MostWantedProgressView;
      player_bingo_hits: PlayerBingoHitView;
      player_bingo_fields: PlayerBingoFieldView;
      player_bingo_lines: PlayerBingoLineView;
      player_bingo_statistics: PlayerBingoStatisticsView;
      league_time_statistics: LeagueTimeStatisticsView;
      league_time_threshold_statistics: LeagueTimeThresholdStatisticsView;
      most_wanted_activity_feed: {
        Row: {
          activity_id: string;
          activity_type: "most_wanted_first" | "group_milestone";
          occurred_at: string;
          player_id: string | null;
          display_name: string | null;
          avatar_url: string | null;
          avatar_path: string | null;
          event_id: string | null;
          event_name: string | null;
          title: string;
          description: string;
          time_hundredths: number | null;
          badge_key: null;
          tier: null;
          priority: number;
        };
        Relationships: [];
      };
      world_record_progression: {
        Row: {
          attempt_id: string;
          player_id: string;
          display_name: string;
          time_hundredths: number;
          achieved_at: string;
          event_id: string | null;
          historical_label: string | null;
          source_type: "attempt" | "historical_attempt";
          source_priority: number;
          source_order: number;
        };
        Relationships: [];
      };
      global_statistics: {
        Row: {
          regular_players: number;
          event_count: number;
          approved_attempts: number;
          valid_attempts: number;
          dnf_count: number;
          world_record_hundredths: number | null;
          average_hundredths: number | null;
        };
        Relationships: [];
      };
      season_player_statistics: {
        Row: Database["public"]["Views"]["player_statistics"]["Row"] & {
          season_year: number;
        };
        Relationships: [];
      };
      season_hall_of_fame: {
        Row: Database["public"]["Views"]["public_hall_of_fame"]["Row"] & {
          season_year: number;
          avatar_path: string | null;
        };
        Relationships: [];
      };
      season_global_statistics: {
        Row: Database["public"]["Views"]["global_statistics"]["Row"] & {
          season_year: number;
        };
        Relationships: [];
      };
    };
    Functions: DataPlatformFunctions & {
      get_player_season_profile: {
        Args: { p_player_id: string; p_season_year: number };
        Returns: Array<{
          player_id: string;
          personal_best_hundredths: number | null;
          season_rank: number | null;
          average_hundredths: number | null;
          event_participations: number;
          event_wins: number;
          second_places: number;
          third_places: number;
          valid_attempts: number;
          dnf_count: number;
        }>;
      };
      get_visible_player_badges: {
        Args: { p_player_id: string };
        Returns: VisiblePlayerBadgesView["Row"][];
      };
      get_player_profile_prestige: {
        Args: { p_player_id: string };
        Returns: Array<{
          player_id: string;
          pb_count: number;
          largest_pb_improvement_hundredths: number | null;
          average_pb_improvement_hundredths: number | null;
          world_record_count: number;
          world_record_days: number;
          longest_world_record_days: number;
        }>;
      };
      submit_public_attempt: {
        Args: {
          p_client_identifier: string;
          p_player_id?: string | null;
          p_player_name?: string | null;
          p_time_hundredths?: number | null;
          p_is_dnf: boolean;
        };
        Returns: Json;
      };
      admin_start_event: {
        Args: { p_name?: string | null; p_started_at?: string | null };
        Returns: string;
      };
      admin_close_event: { Args: { p_event_id: string }; Returns: undefined };
      admin_merge_players: {
        Args: { p_source_player_id: string; p_target_player_id: string };
        Returns: undefined;
      };
      admin_soft_delete_event: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      admin_restore_event: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      admin_prepare_event_purge: {
        Args: { p_event_id: string };
        Returns: Array<{ photo_path: string }>;
      };
      admin_finalize_event_purge: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      is_admin: { Args: never; Returns: boolean };
      admin_set_player_avatar: {
        Args: { p_player_id: string; p_storage_path: string };
        Returns: string | null;
      };
      admin_clear_player_avatar: {
        Args: { p_player_id: string };
        Returns: string | null;
      };
      admin_register_event_photo: {
        Args: {
          p_event_id: string;
          p_storage_path: string;
          p_mime_type: string;
          p_size_bytes: number;
          p_caption?: string | null;
        };
        Returns: string;
      };
      admin_remove_event_photo: {
        Args: { p_photo_id: string };
        Returns: string;
      };
      admin_update_event_details: {
        Args: {
          p_event_id: string;
          p_name: string;
          p_description: string;
          p_is_important: boolean;
        };
        Returns: undefined;
      };
      sync_start_event_v3: {
        Args: {
          p_name: string | null;
          p_start_date: string;
          p_participants: import("@/types/dataPlatform").EventParticipantPayload[];
          p_started_at?: string | null;
          p_ends_at?: string | null;
          p_legacy_source_id?: string | null;
          p_awards_trophies?: boolean;
        };
        Returns: {
          eventId: string;
          participants: Array<{
            clientId: string;
            participantId: string;
            kind: "permanent" | "guest";
          }>;
        };
      };
      sync_update_event_v2: {
        Args: {
          p_event_id: string;
          p_name: string | null;
          p_start_date: string;
          p_awards_trophies: boolean;
        };
        Returns: undefined;
      };
    };
    Enums: {
      attempt_status: AttemptStatus;
      attempt_source: AttemptSource;
      event_status: EventStatus;
      badge_tier: BadgeTier;
    };
    CompositeTypes: Record<never, never>;
  };
}
