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
          is_ak: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          normalized_name?: string;
          avatar_url?: string | null;
          is_ak?: boolean;
          is_archived?: boolean;
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
        };
        Insert: {
          id?: string;
          name?: string | null;
          start_date: string;
          started_at?: string;
          ends_at: string;
          status?: EventStatus;
          closed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          player_id: string;
          event_id: string;
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
          player_id: string;
          event_id: string;
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
          player_id: string;
          display_name: string;
          winning_time_hundredths: number;
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
          event_id: string;
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
    };
    Functions: {
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
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      attempt_status: AttemptStatus;
      attempt_source: AttemptSource;
      event_status: EventStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}
