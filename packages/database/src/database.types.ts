export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      games: {
        Row: {
          code: string
          created_at: string
          host_player_id: string | null
          id: string
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          host_player_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          host_player_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_host_player_fk"
            columns: ["host_player_id"]
            isOneToOne: false
            referencedRelation: "game_totals"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "games_host_player_fk"
            columns: ["host_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar: string | null
          color: string | null
          game_id: string
          id: string
          joined_at: string
          name: string
          seat_order: number | null
          status: Database["public"]["Enums"]["player_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          color?: string | null
          game_id: string
          id?: string
          joined_at?: string
          name: string
          seat_order?: number | null
          status?: Database["public"]["Enums"]["player_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          color?: string | null
          game_id?: string
          id?: string
          joined_at?: string
          name?: string
          seat_order?: number | null
          status?: Database["public"]["Enums"]["player_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "game_totals"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      round_scores: {
        Row: {
          busted: boolean
          flip7_bonus: boolean
          id: string
          player_id: string
          round_id: string
          score: number
          submitted_at: string
        }
        Insert: {
          busted?: boolean
          flip7_bonus?: boolean
          id?: string
          player_id: string
          round_id: string
          score: number
          submitted_at?: string
        }
        Update: {
          busted?: boolean
          flip7_bonus?: boolean
          id?: string
          player_id?: string
          round_id?: string
          score?: number
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "game_totals"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "round_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          ended_at: string | null
          game_id: string
          id: string
          round_index: number
          started_at: string
        }
        Insert: {
          ended_at?: string | null
          game_id: string
          id?: string
          round_index: number
          started_at?: string
        }
        Update: {
          ended_at?: string | null
          game_id?: string
          id?: string
          round_index?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "game_totals"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      game_totals: {
        Row: {
          game_id: string | null
          name: string | null
          player_id: string | null
          rounds_submitted: number | null
          status: Database["public"]["Enums"]["player_status"] | null
          total_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_advance_round: { Args: { p_game_id: string }; Returns: boolean }
      cleanup_inactive_games: { Args: never; Returns: undefined }
      create_game: {
        Args: { p_avatar?: string; p_color?: string; p_name: string }
        Returns: {
          code: string
          game_id: string
          player_id: string
        }[]
      }
      create_rematch_game: {
        Args: { p_game_id: string }
        Returns: {
          code: string
          game_id: string
        }[]
      }
      create_round: {
        Args: { p_game_id: string }
        Returns: {
          round_id: string
          round_index: number
        }[]
      }
      generate_game_code: { Args: never; Returns: string }
      get_current_round: {
        Args: { p_game_id: string }
        Returns: {
          round_id: string
          round_index: number
        }[]
      }
      get_game_by_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          id: string
          status: Database["public"]["Enums"]["game_status"]
        }[]
      }
      get_game_totals: {
        Args: { p_game_id: string }
        Returns: {
          name: string
          player_id: string
          rounds_submitted: number
          status: Database["public"]["Enums"]["player_status"]
          total_score: number
        }[]
      }
      is_game_host: { Args: { p_game_id: string }; Returns: boolean }
      is_game_member: { Args: { p_game_id: string }; Returns: boolean }
      join_game: {
        Args: {
          p_avatar?: string
          p_code: string
          p_color?: string
          p_name: string
        }
        Returns: {
          game_id: string
          player_id: string
        }[]
      }
      missing_submissions: { Args: { p_game_id: string }; Returns: number }
      set_player_name: {
        Args: { p_name: string; p_player_id: string }
        Returns: undefined
      }
      start_game: { Args: { p_game_id: string }; Returns: undefined }
      submit_score: {
        Args: { p_flip7_bonus?: boolean; p_round_id: string; p_score: number }
        Returns: undefined
      }
    }
    Enums: {
      game_status: "lobby" | "active" | "finished"
      player_status: "active" | "busted" | "frozen" | "stayed" | "left"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      game_status: ["lobby", "active", "finished"],
      player_status: ["active", "busted", "frozen", "stayed", "left"],
    },
  },
} as const
