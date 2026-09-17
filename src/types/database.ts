export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          athlete_id: string
          average_hr_bpm: number | null
          created_at: string
          distance_m: number | null
          duration_sec: number | null
          elevation_gain_m: number | null
          external_activity_id: string | null
          id: string
          max_hr_bpm: number | null
          name: string
          notes: string | null
          raw_data: Json | null
          rpe: number | null
          source: string
          sport_type: string
          started_at: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          average_hr_bpm?: number | null
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          elevation_gain_m?: number | null
          external_activity_id?: string | null
          id?: string
          max_hr_bpm?: number | null
          name: string
          notes?: string | null
          raw_data?: Json | null
          rpe?: number | null
          source?: string
          sport_type: string
          started_at: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          average_hr_bpm?: number | null
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          elevation_gain_m?: number | null
          external_activity_id?: string | null
          id?: string
          max_hr_bpm?: number | null
          name?: string
          notes?: string | null
          raw_data?: Json | null
          rpe?: number | null
          source?: string
          sport_type?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_race_goals: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          notes: string | null
          race_id: string
          status: string
          target_finish_time_sec: number
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          notes?: string | null
          race_id: string
          status?: string
          target_finish_time_sec: number
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          race_id?: string
          status?: string
          target_finish_time_sec?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_race_goals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_race_goals_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_activities: {
        Row: {
          activity_id: string
          claim_id: string
          created_at: string
          id: string
        }
        Insert: {
          activity_id: string
          claim_id: string
          created_at?: string
          id?: string
        }
        Update: {
          activity_id?: string
          claim_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_activities_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "training_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_validations: {
        Row: {
          automatic_result: string
          claim_id: string
          created_at: string
          evaluated_at: string
          evaluation_source: string
          id: string
          result: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          updated_at: string
        }
        Insert: {
          automatic_result: string
          claim_id: string
          created_at?: string
          evaluated_at?: string
          evaluation_source?: string
          id?: string
          result: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          updated_at?: string
        }
        Update: {
          automatic_result?: string
          claim_id?: string
          created_at?: string
          evaluated_at?: string
          evaluation_source?: string
          id?: string
          result?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_validations_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "training_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_validations_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_components: {
        Row: {
          component_type: string
          created_at: string
          distance_per_rep_m: number | null
          id: string
          instruction: string | null
          prescription_id: string
          recovery_duration_sec: number | null
          repetitions: number | null
          sequence_order: number
          target_distance_m: number | null
          target_duration_sec: number | null
          target_pace_max_sec_per_km: number | null
          target_pace_min_sec_per_km: number | null
          updated_at: string
        }
        Insert: {
          component_type: string
          created_at?: string
          distance_per_rep_m?: number | null
          id?: string
          instruction?: string | null
          prescription_id: string
          recovery_duration_sec?: number | null
          repetitions?: number | null
          sequence_order: number
          target_distance_m?: number | null
          target_duration_sec?: number | null
          target_pace_max_sec_per_km?: number | null
          target_pace_min_sec_per_km?: number | null
          updated_at?: string
        }
        Update: {
          component_type?: string
          created_at?: string
          distance_per_rep_m?: number | null
          id?: string
          instruction?: string | null
          prescription_id?: string
          recovery_duration_sec?: number | null
          repetitions?: number | null
          sequence_order?: number
          target_distance_m?: number | null
          target_duration_sec?: number | null
          target_pace_max_sec_per_km?: number | null
          target_pace_min_sec_per_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_components_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "training_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          created_at: string
          created_by: string | null
          distance_m: number
          event_date: string
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          distance_m: number
          event_date: string
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          distance_m?: number
          event_date?: string
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      strava_connections: {
        Row: {
          access_token_ciphertext: string
          access_token_expires_at: string
          access_token_iv: string
          activity_sync_attempt_count: number
          activity_sync_cursor_at: string | null
          activity_sync_hour_started_at: string | null
          activity_sync_status: string
          athlete_id: string
          connected_at: string
          connection_status: string
          granted_scopes: string[]
          id: string
          last_successful_sync_at: string | null
          last_sync_attempt_at: string | null
          last_sync_error_code: string | null
          refresh_lock_token: string | null
          refresh_locked_until: string | null
          refresh_token_ciphertext: string
          refresh_token_iv: string
          strava_athlete_id: number
          strava_display_name: string | null
          sync_lock_token: string | null
          sync_locked_until: string | null
          token_version: number
          updated_at: string
        }
        Insert: {
          access_token_ciphertext: string
          access_token_expires_at: string
          access_token_iv: string
          activity_sync_attempt_count?: number
          activity_sync_cursor_at?: string | null
          activity_sync_hour_started_at?: string | null
          activity_sync_status?: string
          athlete_id: string
          connected_at?: string
          connection_status: string
          granted_scopes: string[]
          id?: string
          last_successful_sync_at?: string | null
          last_sync_attempt_at?: string | null
          last_sync_error_code?: string | null
          refresh_lock_token?: string | null
          refresh_locked_until?: string | null
          refresh_token_ciphertext: string
          refresh_token_iv: string
          strava_athlete_id: number
          strava_display_name?: string | null
          sync_lock_token?: string | null
          sync_locked_until?: string | null
          token_version?: number
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string
          access_token_expires_at?: string
          access_token_iv?: string
          activity_sync_attempt_count?: number
          activity_sync_cursor_at?: string | null
          activity_sync_hour_started_at?: string | null
          activity_sync_status?: string
          athlete_id?: string
          connected_at?: string
          connection_status?: string
          granted_scopes?: string[]
          id?: string
          last_successful_sync_at?: string | null
          last_sync_attempt_at?: string | null
          last_sync_error_code?: string | null
          refresh_lock_token?: string | null
          refresh_locked_until?: string | null
          refresh_token_ciphertext?: string
          refresh_token_iv?: string
          strava_athlete_id?: number
          strava_display_name?: string | null
          sync_lock_token?: string | null
          sync_locked_until?: string | null
          token_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strava_connections_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_oauth_states: {
        Row: {
          athlete_id: string
          created_at: string
          expires_at: string
          state_hash: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          expires_at: string
          state_hash: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          expires_at?: string
          state_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "strava_oauth_states_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_claims: {
        Row: {
          athlete_id: string
          athlete_note: string | null
          created_at: string
          id: string
          prescription_id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          athlete_note?: string | null
          created_at?: string
          id?: string
          prescription_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          athlete_note?: string | null
          created_at?: string
          id?: string
          prescription_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_claims_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_claims_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "training_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_import_previews: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          imported_program_id: string | null
          payload: Json
          race_goal_id: string
          source_hash: string
          template_version: number
          warnings: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          imported_program_id?: string | null
          payload: Json
          race_goal_id: string
          source_hash: string
          template_version: number
          warnings?: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          imported_program_id?: string | null
          payload?: Json
          race_goal_id?: string
          source_hash?: string
          template_version?: number
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "training_import_previews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_import_previews_imported_program_id_fkey"
            columns: ["imported_program_id"]
            isOneToOne: true
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_import_previews_race_goal_id_fkey"
            columns: ["race_goal_id"]
            isOneToOne: false
            referencedRelation: "athlete_race_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      training_prescriptions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          scheduled_date: string
          title: string
          training_menu: string
          training_week_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          scheduled_date: string
          title: string
          training_menu: string
          training_week_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          scheduled_date?: string
          title?: string
          training_menu?: string
          training_week_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_prescriptions_training_week_id_fkey"
            columns: ["training_week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          name: string
          race_goal_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          race_goal_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          race_goal_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_race_goal_id_fkey"
            columns: ["race_goal_id"]
            isOneToOne: false
            referencedRelation: "athlete_race_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      training_weeks: {
        Row: {
          created_at: string
          end_date: string
          id: string
          phase: string
          start_date: string
          training_program_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          phase: string
          start_date: string
          training_program_id: string
          updated_at?: string
          week_number: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          phase?: string
          start_date?: string
          training_program_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_weeks_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: number
          role_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_checks: {
        Row: {
          actual_text: string | null
          actual_value: number | null
          check_type: string
          created_at: string
          id: string
          message: string
          result: string
          sequence_order: number
          target_text: string | null
          target_value: number | null
          unit: string | null
          validation_id: string
        }
        Insert: {
          actual_text?: string | null
          actual_value?: number | null
          check_type: string
          created_at?: string
          id?: string
          message: string
          result: string
          sequence_order: number
          target_text?: string | null
          target_value?: number | null
          unit?: string | null
          validation_id: string
        }
        Update: {
          actual_text?: string | null
          actual_value?: number | null
          check_type?: string
          created_at?: string
          id?: string
          message?: string
          result?: string
          sequence_order?: number
          target_text?: string | null
          target_value?: number | null
          unit?: string | null
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_checks_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "claim_validations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_training_claim: {
        Args: { p_claim_id: string }
        Returns: boolean
      }
      can_review_activity_evidence: {
        Args: { p_activity_id: string }
        Returns: boolean
      }
      can_review_training_claim: {
        Args: { p_claim_id: string }
        Returns: boolean
      }
      claim_strava_activity_sync: {
        Args: {
          p_athlete_id: string
          p_lease_seconds?: number
          p_lock_token: string
        }
        Returns: {
          activity_sync_cursor_at: string
          sync_state: string
        }[]
      }
      claim_strava_token_refresh: {
        Args: {
          p_athlete_id: string
          p_lease_seconds?: number
          p_lock_token: string
          p_refresh_before: string
        }
        Returns: {
          access_token_ciphertext: string
          access_token_expires_at: string
          access_token_iv: string
          refresh_state: string
          refresh_token_ciphertext: string
          refresh_token_iv: string
          token_version: number
        }[]
      }
      complete_strava_activity_sync: {
        Args: {
          p_activities: Json
          p_athlete_id: string
          p_lock_token: string
          p_sync_started_at: string
        }
        Returns: {
          created_count: number
          locked_count: number
          unchanged_count: number
          updated_count: number
        }[]
      }
      complete_strava_token_refresh: {
        Args: {
          p_access_token_ciphertext: string
          p_access_token_expires_at: string
          p_access_token_iv: string
          p_athlete_id: string
          p_lock_token: string
          p_refresh_token_ciphertext: string
          p_refresh_token_iv: string
          p_token_version: number
        }
        Returns: boolean
      }
      confirm_training_import: {
        Args: { p_preview_id: string }
        Returns: string
      }
      consume_strava_oauth_state: {
        Args: { p_state_hash: string }
        Returns: boolean
      }
      create_strava_oauth_state: {
        Args: { p_expires_at: string; p_state_hash: string }
        Returns: undefined
      }
      create_training_claim_draft: {
        Args: {
          p_activity_ids: string[]
          p_athlete_note?: string
          p_prescription_id: string
        }
        Returns: string
      }
      create_training_prescription_with_component: {
        Args: {
          p_component_type: string
          p_description?: string
          p_distance_per_rep_m?: number
          p_instruction?: string
          p_recovery_duration_sec?: number
          p_repetitions?: number
          p_scheduled_date: string
          p_sequence_order: number
          p_target_distance_m?: number
          p_target_duration_sec?: number
          p_target_pace_max_sec_per_km?: number
          p_target_pace_min_sec_per_km?: number
          p_title: string
          p_training_menu: string
          p_training_week_id: string
        }
        Returns: string
      }
      delete_strava_connection: {
        Args: { p_athlete_id: string }
        Returns: boolean
      }
      delete_training_claim_draft: {
        Args: { p_claim_id: string }
        Returns: undefined
      }
      evaluate_training_claim_internal: {
        Args: { p_claim_id: string }
        Returns: string
      }
      fail_strava_activity_sync: {
        Args: {
          p_athlete_id: string
          p_error_code: string
          p_lock_token: string
          p_require_reauth?: boolean
          p_sync_status: string
        }
        Returns: boolean
      }
      get_strava_connection_credentials: {
        Args: { p_athlete_id: string }
        Returns: {
          access_token_ciphertext: string
          access_token_expires_at: string
          access_token_iv: string
          connection_status: string
          granted_scopes: string[]
          refresh_token_ciphertext: string
          refresh_token_iv: string
          strava_athlete_id: number
          token_version: number
        }[]
      }
      has_role: { Args: { p_role_code: string }; Returns: boolean }
      release_strava_token_refresh: {
        Args: {
          p_athlete_id: string
          p_lock_token: string
          p_token_version: number
        }
        Returns: boolean
      }
      review_training_claim: {
        Args: { p_claim_id: string; p_result: string; p_reviewer_note?: string }
        Returns: {
          automatic_result: string
          claim_id: string
          created_at: string
          evaluated_at: string
          evaluation_source: string
          id: string
          result: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "claim_validations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_active_race_goal: {
        Args: {
          p_notes?: string
          p_race_id: string
          p_target_finish_time_sec: number
        }
        Returns: {
          athlete_id: string
          created_at: string
          id: string
          notes: string | null
          race_id: string
          status: string
          target_finish_time_sec: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "athlete_race_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_training_claim: {
        Args: { p_claim_id: string }
        Returns: {
          athlete_id: string
          athlete_note: string | null
          created_at: string
          id: string
          prescription_id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "training_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_strava_connection: {
        Args: {
          p_access_token_ciphertext: string
          p_access_token_expires_at: string
          p_access_token_iv: string
          p_athlete_id: string
          p_connection_status: string
          p_granted_scopes: string[]
          p_refresh_token_ciphertext: string
          p_refresh_token_iv: string
          p_strava_athlete_id: number
          p_strava_display_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
