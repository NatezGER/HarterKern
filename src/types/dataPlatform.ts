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

export type EventGuestsTable = {
  Row: {
    id: string;
    event_id: string;
    display_name: string;
    normalized_name: string;
    joined_at: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    event_id: string;
    display_name: string;
    joined_at?: string;
  };
  Update: {
    display_name?: string;
  };
  Relationships: [];
};

export interface EventParticipantPayload {
  clientId: string;
  id?: string;
  name: string;
  kind: "permanent" | "guest";
}

export type HistoricalAttemptsTable = {
  Row: {
    id: string;
    player_id: string | null;
    display_name: string;
    attempt_date: string;
    time_hundredths: number;
    historical_label: string | null;
    is_guest: boolean;
    out_of_competition: boolean;
    sort_order: number;
    source: "public" | "admin";
    legacy_source_id: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    player_id?: string | null;
    display_name: string;
    attempt_date: string;
    time_hundredths: number;
    historical_label?: string | null;
    is_guest?: boolean;
    out_of_competition?: boolean;
    sort_order?: number;
    source?: "public" | "admin";
    legacy_source_id?: string | null;
    deleted_at?: string | null;
  };
  Update: Partial<HistoricalAttemptsTable["Insert"]>;
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
  sync_start_event_v2: {
    Args: {
      p_name: string | null;
      p_start_date: string;
      p_participants: EventParticipantPayload[];
      p_started_at?: string | null;
      p_ends_at?: string | null;
      p_legacy_source_id?: string | null;
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
  sync_import_closed_event_v2: {
    Args: {
      p_name: string | null;
      p_start_date: string;
      p_started_at: string;
      p_ends_at: string;
      p_ended_at: string | null;
      p_end_reason: string | null;
      p_participant_ids: string[];
      p_guests: EventParticipantPayload[];
      p_legacy_source_id: string;
    };
    Returns: {
      eventId: string;
      participants: Array<{
        clientId: string;
        participantId: string;
        kind: "guest";
      }>;
    };
  };
  sync_add_existing_event_player: {
    Args: { p_event_id: string; p_player_id: string };
    Returns: string;
  };
  sync_create_event_player: {
    Args: { p_event_id: string; p_display_name: string };
    Returns: string;
  };
  sync_add_event_guest: {
    Args: { p_event_id: string; p_display_name: string };
    Returns: string;
  };
  sync_create_event_attempt: {
    Args: {
      p_id: string;
      p_event_id: string;
      p_participant_id: string;
      p_participant_kind: string;
      p_time_hundredths: number | null;
      p_is_dnf: boolean;
      p_submitted_at: string;
    };
    Returns: string;
  };
  sync_update_event_attempt: {
    Args: {
      p_attempt_id: string;
      p_participant_id: string;
      p_participant_kind: string;
      p_time_hundredths: number | null;
      p_is_dnf: boolean;
      p_submitted_at: string;
    };
    Returns: undefined;
  };
  sync_create_historical_attempt: {
    Args: {
      p_player_id: string | null;
      p_guest_name: string | null;
      p_attempt_date: string;
      p_time_hundredths: number;
      p_historical_label?: string | null;
    };
    Returns: string;
  };
  sync_update_historical_attempt: {
    Args: {
      p_attempt_id: string;
      p_player_id: string | null;
      p_guest_name: string | null;
      p_attempt_date: string;
      p_time_hundredths: number;
      p_historical_label?: string | null;
    };
    Returns: undefined;
  };
  sync_delete_historical_attempt: {
    Args: { p_attempt_id: string };
    Returns: undefined;
  };
};
