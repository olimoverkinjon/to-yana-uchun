/**
 * Generated from supabase/migrations/*.sql — do not hand-edit.
 * Regenerate with: npm run db:types
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          ip_address: unknown;
          metadata: Json;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          event_id: string | null;
          file_name: string;
          file_size: number | null;
          gift_id: string | null;
          id: string;
          mime_type: string | null;
          storage_bucket: string;
          storage_path: string;
          updated_at: string;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          file_name: string;
          file_size?: number | null;
          gift_id?: string | null;
          id?: string;
          mime_type?: string | null;
          storage_bucket?: string;
          storage_path: string;
          updated_at?: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          event_id?: string | null;
          file_name?: string;
          file_size?: number | null;
          gift_id?: string | null;
          id?: string;
          mime_type?: string | null;
          storage_bucket?: string;
          storage_path?: string;
          updated_at?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "event_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_gift_id_fkey";
            columns: ["gift_id"];
            isOneToOne: false;
            referencedRelation: "gifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          browser: string | null;
          changed_by: string | null;
          created_at: string;
          id: string;
          ip_address: unknown;
          new_data: Json | null;
          old_data: Json | null;
          os: string | null;
          reason: string | null;
          record_id: string;
          table_name: string;
          telegram_user_id: number | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          browser?: string | null;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          new_data?: Json | null;
          old_data?: Json | null;
          os?: string | null;
          reason?: string | null;
          record_id: string;
          table_name: string;
          telegram_user_id?: number | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          browser?: string | null;
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          new_data?: Json | null;
          old_data?: Json | null;
          os?: string | null;
          reason?: string | null;
          record_id?: string;
          table_name?: string;
          telegram_user_id?: number | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      currencies: {
        Row: {
          code: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          symbol: string | null;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          symbol?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          symbol?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          bride_name: string | null;
          cover_image: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          event_date: string | null;
          event_year: number;
          groom_name: string | null;
          id: string;
          location: string | null;
          search_vector: unknown;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          bride_name?: string | null;
          cover_image?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          event_date?: string | null;
          event_year: number;
          groom_name?: string | null;
          id?: string;
          location?: string | null;
          search_vector?: unknown;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          bride_name?: string | null;
          cover_image?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          event_date?: string | null;
          event_year?: number;
          groom_name?: string | null;
          id?: string;
          location?: string | null;
          search_vector?: unknown;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_types: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          icon: string | null;
          id: string;
          is_system: boolean;
          name: string;
          requires_amount: boolean;
          requires_currency: boolean;
          requires_weight: boolean;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          icon?: string | null;
          id?: string;
          is_system?: boolean;
          name: string;
          requires_amount?: boolean;
          requires_currency?: boolean;
          requires_weight?: boolean;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          icon?: string | null;
          id?: string;
          is_system?: boolean;
          name?: string;
          requires_amount?: boolean;
          requires_currency?: boolean;
          requires_weight?: boolean;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_types_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      gifts: {
        Row: {
          amount: number | null;
          created_at: string;
          created_by: string;
          currency_id: string | null;
          deleted_at: string | null;
          description: string | null;
          event_id: string;
          gift_date: string;
          gift_type_id: string;
          giver_name: string;
          id: string;
          notes: string | null;
          search_vector: unknown;
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
          weight: number | null;
        };
        Insert: {
          amount?: number | null;
          created_at?: string;
          created_by: string;
          currency_id?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          event_id: string;
          gift_date?: string;
          gift_type_id: string;
          giver_name: string;
          id?: string;
          notes?: string | null;
          search_vector?: unknown;
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          weight?: number | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          created_by?: string;
          currency_id?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          event_id?: string;
          gift_date?: string;
          gift_type_id?: string;
          giver_name?: string;
          id?: string;
          notes?: string | null;
          search_vector?: unknown;
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "gifts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_currency_id_fkey";
            columns: ["currency_id"];
            isOneToOne: false;
            referencedRelation: "currencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_currency_id_fkey";
            columns: ["currency_id"];
            isOneToOne: false;
            referencedRelation: "event_cash_totals";
            referencedColumns: ["currency_id"];
          },
          {
            foreignKeyName: "gifts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "event_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_gift_type_id_fkey";
            columns: ["gift_type_id"];
            isOneToOne: false;
            referencedRelation: "event_gift_type_totals";
            referencedColumns: ["gift_type_id"];
          },
          {
            foreignKeyName: "gifts_gift_type_id_fkey";
            columns: ["gift_type_id"];
            isOneToOne: false;
            referencedRelation: "gift_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          first_name: string;
          id: string;
          is_premium: boolean;
          language_code: string | null;
          last_name: string | null;
          last_seen_at: string | null;
          photo_url: string | null;
          telegram_id: number;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          first_name: string;
          id?: string;
          is_premium?: boolean;
          language_code?: string | null;
          last_name?: string | null;
          last_seen_at?: string | null;
          photo_url?: string | null;
          telegram_id: number;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          first_name?: string;
          id?: string;
          is_premium?: boolean;
          language_code?: string | null;
          last_name?: string | null;
          last_seen_at?: string | null;
          photo_url?: string | null;
          telegram_id?: number;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          granted_by: string | null;
          id: string;
          role_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      dashboard_stats: {
        Row: {
          cash_totals: Json | null;
          total_events: number | null;
          total_gifts: number | null;
          total_guests: number | null;
        };
        Relationships: [];
      };
      event_cash_totals: {
        Row: {
          currency_code: string | null;
          currency_id: string | null;
          currency_symbol: string | null;
          event_id: string | null;
          gift_count: number | null;
          total_amount: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "gifts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "event_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_gift_type_totals: {
        Row: {
          event_id: string | null;
          gift_count: number | null;
          gift_type_id: string | null;
          gift_type_name: string | null;
          gift_type_slug: string | null;
          total_weight: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "gifts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "event_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gifts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_summaries: {
        Row: {
          bride_name: string | null;
          cover_image: string | null;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          event_date: string | null;
          event_year: number | null;
          gift_count: number | null;
          groom_name: string | null;
          id: string | null;
          location: string | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recent_activity: {
        Row: {
          action: string | null;
          changed_by: string | null;
          changed_by_first_name: string | null;
          changed_by_last_name: string | null;
          changed_by_username: string | null;
          created_at: string | null;
          id: string | null;
          reason: string | null;
          record_id: string | null;
          table_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      create_event: {
        Args: {
          p_bride_name?: string;
          p_browser?: string;
          p_cover_image?: string;
          p_description?: string;
          p_event_date?: string;
          p_event_year: number;
          p_groom_name?: string;
          p_ip_address?: string;
          p_location?: string;
          p_os?: string;
          p_reason?: string;
          p_status?: string;
          p_title: string;
          p_user_agent?: string;
        };
        Returns: {
          bride_name: string | null;
          cover_image: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          event_date: string | null;
          event_year: number;
          groom_name: string | null;
          id: string;
          location: string | null;
          search_vector: unknown;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "events";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_gift: {
        Args: {
          p_amount?: number;
          p_browser?: string;
          p_currency_id?: string;
          p_description?: string;
          p_event_id: string;
          p_gift_date?: string;
          p_gift_type_id: string;
          p_giver_name: string;
          p_ip_address?: string;
          p_notes?: string;
          p_os?: string;
          p_reason?: string;
          p_unit?: string;
          p_user_agent?: string;
          p_weight?: number;
        };
        Returns: {
          amount: number | null;
          created_at: string;
          created_by: string;
          currency_id: string | null;
          deleted_at: string | null;
          description: string | null;
          event_id: string;
          gift_date: string;
          gift_type_id: string;
          giver_name: string;
          id: string;
          notes: string | null;
          search_vector: unknown;
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
          weight: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "gifts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      has_role: { Args: { p_role_name: string }; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
      is_viewer_or_above: { Args: never; Returns: boolean };
      my_permissions: {
        Args: never;
        Returns: {
          is_super_admin: boolean;
          is_viewer_or_above: boolean;
          roles: string[];
        }[];
      };
      restore_event: {
        Args: {
          p_browser?: string;
          p_id: string;
          p_ip_address?: string;
          p_os?: string;
          p_reason?: string;
          p_user_agent?: string;
        };
        Returns: {
          bride_name: string | null;
          cover_image: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          event_date: string | null;
          event_year: number;
          groom_name: string | null;
          id: string;
          location: string | null;
          search_vector: unknown;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "events";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      restore_gift: {
        Args: {
          p_browser?: string;
          p_id: string;
          p_ip_address?: string;
          p_os?: string;
          p_reason?: string;
          p_user_agent?: string;
        };
        Returns: {
          amount: number | null;
          created_at: string;
          created_by: string;
          currency_id: string | null;
          deleted_at: string | null;
          description: string | null;
          event_id: string;
          gift_date: string;
          gift_type_id: string;
          giver_name: string;
          id: string;
          notes: string | null;
          search_vector: unknown;
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
          weight: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "gifts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_event_status: {
        Args: {
          p_browser?: string;
          p_id: string;
          p_ip_address?: string;
          p_os?: string;
          p_reason?: string;
          p_status: string;
          p_user_agent?: string;
        };
        Returns: {
          bride_name: string | null;
          cover_image: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          event_date: string | null;
          event_year: number;
          groom_name: string | null;
          id: string;
          location: string | null;
          search_vector: unknown;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "events";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_request_context: {
        Args: {
          p_browser?: string;
          p_ip_address?: unknown;
          p_os?: string;
          p_reason?: string;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
      set_request_context_from_text: {
        Args: {
          p_browser?: string;
          p_ip_address?: string;
          p_os?: string;
          p_reason?: string;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
      soft_delete_event: {
        Args: {
          p_browser?: string;
          p_id: string;
          p_ip_address?: string;
          p_os?: string;
          p_reason?: string;
          p_user_agent?: string;
        };
        Returns: {
          bride_name: string | null;
          cover_image: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          event_date: string | null;
          event_year: number;
          groom_name: string | null;
          id: string;
          location: string | null;
          search_vector: unknown;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "events";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      soft_delete_gift: {
        Args: {
          p_browser?: string;
          p_id: string;
          p_ip_address?: string;
          p_os?: string;
          p_reason?: string;
          p_user_agent?: string;
        };
        Returns: {
          amount: number | null;
          created_at: string;
          created_by: string;
          currency_id: string | null;
          deleted_at: string | null;
          description: string | null;
          event_id: string;
          gift_date: string;
          gift_type_id: string;
          giver_name: string;
          id: string;
          notes: string | null;
          search_vector: unknown;
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
          weight: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "gifts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      touch_profile_last_seen: {
        Args: { p_profile_id: string };
        Returns: undefined;
      };
      update_event: {
        Args: {
          p_bride_name: string;
          p_browser?: string;
          p_cover_image: string;
          p_description: string;
          p_event_date: string;
          p_event_year: number;
          p_groom_name: string;
          p_id: string;
          p_ip_address?: string;
          p_location: string;
          p_os?: string;
          p_reason?: string;
          p_status: string;
          p_title: string;
          p_user_agent?: string;
        };
        Returns: {
          bride_name: string | null;
          cover_image: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          event_date: string | null;
          event_year: number;
          groom_name: string | null;
          id: string;
          location: string | null;
          search_vector: unknown;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "events";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_gift: {
        Args: {
          p_amount: number;
          p_browser?: string;
          p_currency_id: string;
          p_description: string;
          p_gift_date: string;
          p_gift_type_id: string;
          p_giver_name: string;
          p_id: string;
          p_ip_address?: string;
          p_notes: string;
          p_os?: string;
          p_reason?: string;
          p_unit: string;
          p_user_agent?: string;
          p_weight: number;
        };
        Returns: {
          amount: number | null;
          created_at: string;
          created_by: string;
          currency_id: string | null;
          deleted_at: string | null;
          description: string | null;
          event_id: string;
          gift_date: string;
          gift_type_id: string;
          giver_name: string;
          id: string;
          notes: string | null;
          search_vector: unknown;
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
          weight: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "gifts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_telegram_profile: {
        Args: {
          p_first_name: string;
          p_is_premium: boolean;
          p_language_code: string;
          p_last_name: string;
          p_photo_url: string;
          p_telegram_id: number;
          p_username: string;
        };
        Returns: {
          created_at: string;
          deleted_at: string | null;
          first_name: string;
          id: string;
          is_premium: boolean;
          language_code: string | null;
          last_name: string | null;
          last_seen_at: string | null;
          photo_url: string | null;
          telegram_id: number;
          updated_at: string;
          username: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {},
  },
} as const;
