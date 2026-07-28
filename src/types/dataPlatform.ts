export type EventParticipantsTable = {
  Row: {
    id: string;
    event_id: string;
    player_id: string;
    joined_at: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    event_id: string;
    player_id: string;
    joined_at?: string;
  };
  Update: never;
  Relationships: [];
};

export type DataPlatformFunctions = {
  sync_upsert_player: {
    Args: {
      p_display_name: string;
      p_is_ak?: boolean;
      p_legacy_source_id?: string | null;
    };
    Returns: string;
  };
  sync_start_event: {
    Args: {
      p_name: string | null;
      p_start_date: string;
      p_participant_ids: string[];
      p_started_at?: string | null;
      p_ends_at?: string | null;
      p_legacy_source_id?: string | null;
    };
    Returns: string;
  };
  sync_import_closed_event: {
    Args: {
      p_name: string | null;
      p_start_date: string;
      p_started_at: string;
      p_ends_at: string;
      p_ended_at: string | null;
      p_end_reason: string | null;
      p_participant_ids: string[];
      p_legacy_source_id: string;
    };
    Returns: string;
  };
  sync_create_attempt: {
    Args: {
      p_id: string;
      p_player_id: string;
      p_event_id: string | null;
      p_time_hundredths: number | null;
      p_is_dnf: boolean;
      p_is_ak: boolean;
      p_submitted_at: string;
      p_event_name?: string | null;
      p_legacy_source_id?: string | null;
    };
    Returns: string;
  };
  sync_update_attempt: {
    Args: {
      p_attempt_id: string;
      p_player_id: string;
      p_time_hundredths: number | null;
      p_is_dnf: boolean;
      p_is_ak: boolean;
      p_submitted_at: string;
      p_event_name?: string | null;
    };
    Returns: undefined;
  };
  sync_delete_attempt: {
    Args: { p_attempt_id: string };
    Returns: undefined;
  };
  sync_update_player: {
    Args: {
      p_player_id: string;
      p_display_name: string;
      p_is_ak: boolean;
      p_avatar_url: string | null;
    };
    Returns: undefined;
  };
  sync_update_event: {
    Args: { p_event_id: string; p_name: string | null; p_start_date: string };
    Returns: undefined;
  };
  sync_close_event: {
    Args: { p_event_id: string; p_reason?: string };
    Returns: string;
  };
  sync_close_expired_events: {
    Args: Record<never, never>;
    Returns: number;
  };
};
