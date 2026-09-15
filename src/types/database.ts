export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: string | null
          athlete_id: string
          average_hr: number | null
          average_pace: number | null
          created_at: string | null
          distance_meters: number | null
          duration_seconds: number | null
          external_activity_id: string | null
          id: string
          source: string | null
        }
        Insert: {
          activity_date: string
          activity_type?: string | null
          athlete_id: string
          average_hr?: number | null
          average_pace?: number | null
          created_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          external_activity_id?: string | null
          id?: string
          source?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string | null
          athlete_id?: string
          average_hr?: number | null
          average_pace?: number | null
          created_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          external_activity_id?: string | null
          id?: string
          source?: string | null
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
          created_at: string | null
          id: string
          training_claim_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          id?: string
          training_claim_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          id?: string
          training_claim_id?: string
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
            foreignKeyName: "claim_activities_training_claim_id_fkey"
            columns: ["training_claim_id"]
            isOneToOne: false
            referencedRelation: "training_claims"
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
      training_claims: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          notes: string | null
          prescription_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          prescription_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          prescription_id?: string
          status?: string | null
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_training_import: {
        Args: { p_preview_id: string }
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
      has_role: { Args: { p_role_code: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const

