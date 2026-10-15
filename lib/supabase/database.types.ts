export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string;
          restaurant_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          restaurant_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          restaurant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action"];
          created_at: string;
          id: number;
          moderator_id: string | null;
          reason: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["moderation_target"];
        };
        ComputedFields: never;
        Insert: {
          action: Database["public"]["Enums"]["moderation_action"];
          created_at?: string;
          id?: never;
          moderator_id?: string | null;
          reason?: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["moderation_target"];
        };
        Update: {
          action?: Database["public"]["Enums"]["moderation_action"];
          created_at?: string;
          id?: never;
          moderator_id?: string | null;
          reason?: string | null;
          target_id?: string;
          target_type?: Database["public"]["Enums"]["moderation_target"];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_categories: {
        Row: {
          id: number;
          label: string;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          id?: never;
          label: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          id?: never;
          label?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      restaurant_reports: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string | null;
          status: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reason?: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id?: string;
          target_type?: Database["public"]["Enums"]["report_target"];
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_reviews: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          price_paid: number | null;
          restaurant_id: string;
          seat_type: Database["public"]["Enums"]["seat_type"];
          solo_comfort: number;
          solo_order_available: boolean | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
          user_id: string;
          visited_at: string;
          wait_minutes: number | null;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          price_paid?: number | null;
          restaurant_id: string;
          seat_type: Database["public"]["Enums"]["seat_type"];
          solo_comfort: number;
          solo_order_available?: boolean | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id?: string;
          visited_at: string;
          wait_minutes?: number | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          price_paid?: number | null;
          restaurant_id?: string;
          seat_type?: Database["public"]["Enums"]["seat_type"];
          solo_comfort?: number;
          solo_order_available?: boolean | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id?: string;
          visited_at?: string;
          wait_minutes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_reviews_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          address: string;
          category_id: number;
          created_at: string;
          created_by: string | null;
          id: string;
          location: unknown;
          name: string;
          source_type: Database["public"]["Enums"]["restaurant_source"];
          status: Database["public"]["Enums"]["restaurant_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          category_id: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location: unknown;
          name: string;
          source_type?: Database["public"]["Enums"]["restaurant_source"];
          status?: Database["public"]["Enums"]["restaurant_status"];
          updated_at?: string;
        };
        Update: {
          address?: string;
          category_id?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location?: unknown;
          name?: string;
          source_type?: Database["public"]["Enums"]["restaurant_source"];
          status?: Database["public"]["Enums"]["restaurant_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurants_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      review_tags: {
        Row: {
          review_id: string;
          tag_id: number;
        };
        ComputedFields: never;
        Insert: {
          review_id: string;
          tag_id: number;
        };
        Update: {
          review_id?: string;
          tag_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "review_tags_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: number;
          kind: Database["public"]["Enums"]["tag_kind"];
          label: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          id?: never;
          kind: Database["public"]["Enums"]["tag_kind"];
          label: string;
          slug: string;
        };
        Update: {
          id?: never;
          kind?: Database["public"]["Enums"]["tag_kind"];
          label?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      moderation_action:
        | "approve"
        | "reject"
        | "archive"
        | "remove"
        | "restore"
        | "resolve"
        | "dismiss";
      moderation_target: "restaurant" | "review" | "report";
      report_reason:
        | "incorrect_info"
        | "closed"
        | "duplicate"
        | "inappropriate"
        | "spam"
        | "other";
      report_status: "open" | "resolved" | "dismissed";
      report_target: "restaurant" | "review";
      restaurant_source: "user_submitted" | "admin_entered";
      restaurant_status: "pending" | "approved" | "rejected" | "archived";
      review_status: "pending" | "approved" | "rejected" | "removed";
      seat_type:
        "counter" | "single_table" | "shared_table" | "booth" | "other";
      tag_kind: "seating" | "ordering" | "speed" | "atmosphere";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      moderation_action: [
        "approve",
        "reject",
        "archive",
        "remove",
        "restore",
        "resolve",
        "dismiss",
      ],
      moderation_target: ["restaurant", "review", "report"],
      report_reason: [
        "incorrect_info",
        "closed",
        "duplicate",
        "inappropriate",
        "spam",
        "other",
      ],
      report_status: ["open", "resolved", "dismissed"],
      report_target: ["restaurant", "review"],
      restaurant_source: ["user_submitted", "admin_entered"],
      restaurant_status: ["pending", "approved", "rejected", "archived"],
      review_status: ["pending", "approved", "rejected", "removed"],
      seat_type: ["counter", "single_table", "shared_table", "booth", "other"],
      tag_kind: ["seating", "ordering", "speed", "atmosphere"],
    },
  },
} as const;
