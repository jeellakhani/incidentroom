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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string
          id: string
          ok: boolean
          provider: string
          task: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ok: boolean
          provider: string
          task: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ok?: boolean
          provider?: string
          task?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          incident_id: string | null
          incident_ref: string | null
          object: string
          team_id: string
          verb: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          incident_ref?: string | null
          object: string
          team_id: string
          verb: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          incident_id?: string | null
          incident_ref?: string | null
          object?: string
          team_id?: string
          verb?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_actions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          due_label: string | null
          id: string
          incident_id: string
          owner_id: string
          priority: Database["public"]["Enums"]["action_priority"]
          status: Database["public"]["Enums"]["action_status"]
          team_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_label?: string | null
          id?: string
          incident_id: string
          owner_id: string
          priority?: Database["public"]["Enums"]["action_priority"]
          status?: Database["public"]["Enums"]["action_status"]
          team_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_label?: string | null
          id?: string
          incident_id?: string
          owner_id?: string
          priority?: Database["public"]["Enums"]["action_priority"]
          status?: Database["public"]["Enums"]["action_status"]
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_actions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          incident_id: string
          kind: Database["public"]["Enums"]["event_kind"]
          note: string | null
          team_id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          incident_id: string
          kind: Database["public"]["Enums"]["event_kind"]
          note?: string | null
          team_id: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          incident_id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          note?: string | null
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          commander_id: string | null
          comms_id: string | null
          created_at: string
          created_by: string
          current_at: string
          current_by: string | null
          current_text: string
          id: string
          impact: string
          is_sample: boolean
          observer_id: string | null
          ref: string
          resolution: string | null
          resolved_at: string | null
          root_cause: string | null
          sev: number
          started_at: string
          status: Database["public"]["Enums"]["incident_status"]
          summary: string | null
          systems: string[]
          team_id: string
          team_label: string
          tech_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          commander_id?: string | null
          comms_id?: string | null
          created_at?: string
          created_by?: string
          current_at?: string
          current_by?: string | null
          current_text?: string
          id?: string
          impact?: string
          is_sample?: boolean
          observer_id?: string | null
          ref?: string
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          sev: number
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          summary?: string | null
          systems?: string[]
          team_id: string
          team_label?: string
          tech_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          commander_id?: string | null
          comms_id?: string | null
          created_at?: string
          created_by?: string
          current_at?: string
          current_by?: string | null
          current_text?: string
          id?: string
          impact?: string
          is_sample?: boolean
          observer_id?: string | null
          ref?: string
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          sev?: number
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          summary?: string | null
          systems?: string[]
          team_id?: string
          team_label?: string
          tech_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["notif_category"]
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          category: Database["public"]["Enums"]["notif_category"]
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["notif_category"]
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string
          id: string
          title?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_team_member: {
        Args: {
          _email: string
          _role: Database["public"]["Enums"]["team_role"]
          _team: string
        }
        Returns: undefined
      }
      can_edit_team: {
        Args: { _team: string; _user: string }
        Returns: boolean
      }
      clear_sample_incidents: { Args: { _team: string }; Returns: undefined }
      is_team_member: {
        Args: { _team: string; _user: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { _team: string; _user: string }
        Returns: boolean
      }
      load_sample_incidents: { Args: { _team: string }; Returns: undefined }
      remove_team_member: {
        Args: { _team: string; _user: string }
        Returns: undefined
      }
      shares_team: { Args: { _a: string; _b: string }; Returns: boolean }
    }
    Enums: {
      action_priority: "critical" | "high" | "medium" | "low"
      action_status: "pending" | "in_progress" | "done"
      event_kind: "update" | "decision" | "system" | "status" | "people"
      incident_status:
        | "detected"
        | "investigating"
        | "mitigating"
        | "monitoring"
        | "resolved"
      notif_category: "mentions" | "assignments" | "updates" | "system"
      team_role: "owner" | "responder" | "viewer"
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
    Enums: {
      action_priority: ["critical", "high", "medium", "low"],
      action_status: ["pending", "in_progress", "done"],
      event_kind: ["update", "decision", "system", "status", "people"],
      incident_status: [
        "detected",
        "investigating",
        "mitigating",
        "monitoring",
        "resolved",
      ],
      notif_category: ["mentions", "assignments", "updates", "system"],
      team_role: ["owner", "responder", "viewer"],
    },
  },
} as const
