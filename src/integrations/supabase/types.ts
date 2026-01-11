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
      arrival_notification_settings: {
        Row: {
          created_at: string
          id: string
          notify_on_friend_arrival: boolean | null
          notify_on_friend_departure: boolean | null
          notify_only_same_event: boolean | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_on_friend_arrival?: boolean | null
          notify_on_friend_departure?: boolean | null
          notify_only_same_event?: boolean | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_on_friend_arrival?: boolean | null
          notify_on_friend_departure?: boolean | null
          notify_only_same_event?: boolean | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_notification_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notification_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notification_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notification_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      barhop_stops: {
        Row: {
          address: string | null
          arrived_at: string | null
          created_at: string | null
          departed_at: string | null
          eta: string | null
          event_id: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          stop_order: number
        }
        Insert: {
          address?: string | null
          arrived_at?: string | null
          created_at?: string | null
          departed_at?: string | null
          eta?: string | null
          event_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          stop_order: number
        }
        Update: {
          address?: string | null
          arrived_at?: string | null
          created_at?: string | null
          departed_at?: string | null
          eta?: string | null
          event_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "barhop_stops_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string | null
          profile_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string | null
          profile_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          is_group: boolean | null
          linked_event_id: string | null
          name: string | null
          squad_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_group?: boolean | null
          linked_event_id?: string | null
          name?: string | null
          squad_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_group?: boolean | null
          linked_event_id?: string | null
          name?: string | null
          squad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          arrived_at: string | null
          arrived_home: boolean | null
          current_lat: number | null
          current_lng: number | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          destination_shared_with: string[] | null
          destination_visibility: string | null
          event_id: string
          going_home_at: string | null
          id: string
          is_dd: boolean | null
          joined_at: string | null
          last_location_update: string | null
          profile_id: string
          share_location: boolean | null
          status: string | null
        }
        Insert: {
          arrived_at?: string | null
          arrived_home?: boolean | null
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          destination_shared_with?: string[] | null
          destination_visibility?: string | null
          event_id: string
          going_home_at?: string | null
          id?: string
          is_dd?: boolean | null
          joined_at?: string | null
          last_location_update?: string | null
          profile_id: string
          share_location?: boolean | null
          status?: string | null
        }
        Update: {
          arrived_at?: string | null
          arrived_home?: boolean | null
          current_lat?: number | null
          current_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          destination_shared_with?: string[] | null
          destination_visibility?: string | null
          event_id?: string
          going_home_at?: string | null
          id?: string
          is_dd?: boolean | null
          joined_at?: string | null
          last_location_update?: string | null
          profile_id?: string
          share_location?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cohosts: {
        Row: {
          added_at: string | null
          added_by: string | null
          event_id: string
          id: string
          profile_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          event_id: string
          id?: string
          profile_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          event_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cohosts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohosts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      event_dd_requests: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          requested_by_profile_id: string
          requested_profile_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          requested_by_profile_id: string
          requested_profile_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          requested_by_profile_id?: string
          requested_profile_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_dd_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_profile_id_fkey"
            columns: ["requested_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_profile_id_fkey"
            columns: ["requested_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_profile_id_fkey"
            columns: ["requested_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_dd_requests_requested_profile_id_fkey"
            columns: ["requested_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invites: {
        Row: {
          event_id: string
          id: string
          invited_at: string
          invited_by: string
          invited_profile_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          event_id: string
          id?: string
          invited_at?: string
          invited_by: string
          invited_profile_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          event_id?: string
          id?: string
          invited_at?: string
          invited_by?: string
          invited_profile_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          end_time: string | null
          event_type: string
          id: string
          image_url: string | null
          invite_code: string | null
          is_barhop: boolean | null
          is_quick_rally: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          max_attendees: number | null
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          invite_code?: string | null
          is_barhop?: boolean | null
          is_quick_rally?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          max_attendees?: number | null
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          invite_code?: string | null
          is_barhop?: boolean | null
          is_quick_rally?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          max_attendees?: number | null
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_history: {
        Row: {
          id: string
          invite_count: number
          invited_name: string | null
          invited_phone: string | null
          invited_profile_id: string | null
          inviter_id: string
          last_invited_at: string
        }
        Insert: {
          id?: string
          invite_count?: number
          invited_name?: string | null
          invited_phone?: string | null
          invited_profile_id?: string | null
          inviter_id: string
          last_invited_at?: string
        }
        Update: {
          id?: string
          invite_count?: number
          invited_name?: string | null
          invited_phone?: string | null
          invited_profile_id?: string | null
          inviter_id?: string
          last_invited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_history_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_history_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_history_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_history_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_history_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_history_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_history_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_history_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          message_type: string | null
          sender_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message_type?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          arrival_confirmations: boolean
          bar_hop_transitions: boolean
          created_at: string
          event_updates: boolean
          going_home_alerts: boolean
          id: string
          profile_id: string
          ride_offers: boolean
          ride_requests: boolean
          squad_invites: boolean
          updated_at: string
        }
        Insert: {
          arrival_confirmations?: boolean
          bar_hop_transitions?: boolean
          created_at?: string
          event_updates?: boolean
          going_home_alerts?: boolean
          id?: string
          profile_id: string
          ride_offers?: boolean
          ride_requests?: boolean
          squad_invites?: boolean
          updated_at?: string
        }
        Update: {
          arrival_confirmations?: boolean
          bar_hop_transitions?: boolean
          created_at?: string
          event_updates?: boolean
          going_home_alerts?: boolean
          id?: string
          profile_id?: string
          ride_offers?: boolean
          ride_requests?: boolean
          squad_invites?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          profile_id: string
          read: boolean | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          profile_id: string
          read?: boolean | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          profile_id?: string
          read?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_contacts: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone_number: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_invites: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          display_name: string | null
          event_id: string
          id: string
          invite_code: string
          invited_at: string
          invited_by: string
          phone_number: string
          status: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          display_name?: string | null
          event_id: string
          id?: string
          invite_code?: string
          invited_at?: string
          invited_by: string
          phone_number: string
          status?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          display_name?: string | null
          event_id?: string
          id?: string
          invite_code?: string
          invited_at?: string
          invited_by?: string
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_invites_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access_logs: {
        Row: {
          access_context: string | null
          accessed_fields: string[] | null
          accessed_profile_id: string
          accessor_profile_id: string | null
          accessor_user_id: string
          connection_type: Database["public"]["Enums"]["connection_type"]
          created_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          access_context?: string | null
          accessed_fields?: string[] | null
          accessed_profile_id: string
          accessor_profile_id?: string | null
          accessor_user_id: string
          connection_type: Database["public"]["Enums"]["connection_type"]
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          access_context?: string | null
          accessed_fields?: string[] | null
          accessed_profile_id?: string
          accessor_profile_id?: string | null
          accessor_user_id?: string
          connection_type?: Database["public"]["Enums"]["connection_type"]
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          display_name: string | null
          home_address: string | null
          id: string
          last_location_update: string | null
          location_sharing_enabled: boolean | null
          phone: string | null
          reward_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          display_name?: string | null
          home_address?: string | null
          id?: string
          last_location_update?: string | null
          location_sharing_enabled?: boolean | null
          phone?: string | null
          reward_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          display_name?: string | null
          home_address?: string | null
          id?: string
          last_location_update?: string | null
          location_sharing_enabled?: boolean | null
          phone?: string | null
          reward_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_passengers: {
        Row: {
          id: string
          passenger_id: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string | null
          requested_at: string | null
          ride_id: string
          status: string | null
        }
        Insert: {
          id?: string
          passenger_id: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          requested_at?: string | null
          ride_id: string
          status?: string | null
        }
        Update: {
          id?: string
          passenger_id?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          requested_at?: string | null
          ride_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_passengers_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_passengers_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          available_seats: number | null
          created_at: string | null
          departure_time: string | null
          destination: string | null
          destination_lat: number | null
          destination_lng: number | null
          driver_id: string
          event_id: string | null
          id: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          available_seats?: number | null
          created_at?: string | null
          departure_time?: string | null
          destination?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          driver_id: string
          event_id?: string | null
          id?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          available_seats?: number | null
          created_at?: string | null
          departure_time?: string | null
          destination?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          driver_id?: string
          event_id?: string | null
          id?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_locations: {
        Row: {
          address: string
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          lat: number
          lng: number
          name: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          lat: number
          lng: number
          name: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          lat?: number
          lng?: number
          name?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_locations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_invites: {
        Row: {
          contact_value: string
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          invite_type: string
          invited_by: string
          squad_id: string
          status: string
        }
        Insert: {
          contact_value: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invite_type: string
          invited_by: string
          squad_id: string
          status?: string
        }
        Update: {
          contact_value?: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invite_type?: string
          invited_by?: string
          squad_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_invites_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          added_at: string | null
          id: string
          profile_id: string
          squad_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          profile_id: string
          squad_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          profile_id?: string
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          symbol: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          symbol?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          symbol?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_beacons: {
        Row: {
          beacon_uuid: string
          created_at: string
          floor: number | null
          id: string
          is_active: boolean | null
          lat: number
          lng: number
          major: number | null
          minor: number | null
          name: string
          tx_power: number | null
          updated_at: string
          venue_id: string
          zone_name: string | null
        }
        Insert: {
          beacon_uuid: string
          created_at?: string
          floor?: number | null
          id?: string
          is_active?: boolean | null
          lat: number
          lng: number
          major?: number | null
          minor?: number | null
          name: string
          tx_power?: number | null
          updated_at?: string
          venue_id: string
          zone_name?: string | null
        }
        Update: {
          beacon_uuid?: string
          created_at?: string
          floor?: number | null
          id?: string
          is_active?: boolean | null
          lat?: number
          lng?: number
          major?: number | null
          minor?: number | null
          name?: string
          tx_power?: number | null
          updated_at?: string
          venue_id?: string
          zone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_beacons_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_presence: {
        Row: {
          beacon_id: string | null
          entered_at: string
          event_id: string | null
          exited_at: string | null
          floor: number | null
          id: string
          last_seen_at: string
          profile_id: string
          venue_id: string
        }
        Insert: {
          beacon_id?: string | null
          entered_at?: string
          event_id?: string | null
          exited_at?: string | null
          floor?: number | null
          id?: string
          last_seen_at?: string
          profile_id: string
          venue_id: string
        }
        Update: {
          beacon_id?: string | null
          entered_at?: string
          event_id?: string | null
          exited_at?: string | null
          floor?: number | null
          id?: string
          last_seen_at?: string
          profile_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_presence_beacon_id_fkey"
            columns: ["beacon_id"]
            isOneToOne: false
            referencedRelation: "venue_beacons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_presence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_presence_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_presence_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          floor_count: number | null
          id: string
          image_url: string | null
          lat: number
          lng: number
          name: string
          updated_at: string
          venue_type: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          floor_count?: number | null
          id?: string
          image_url?: string | null
          lat: number
          lng: number
          name: string
          updated_at?: string
          venue_type?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          floor_count?: number | null
          id?: string
          image_url?: string | null
          lat?: number
          lng?: number
          name?: string
          updated_at?: string
          venue_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          reward_points: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          reward_points?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          reward_points?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      safe_event_attendees: {
        Row: {
          arrived_at: string | null
          arrived_home: boolean | null
          current_lat: number | null
          current_lng: number | null
          destination_name: string | null
          destination_visibility: string | null
          event_id: string | null
          going_home_at: string | null
          id: string | null
          joined_at: string | null
          last_location_update: string | null
          profile_id: string | null
          share_location: boolean | null
          status: string | null
        }
        Insert: {
          arrived_at?: string | null
          arrived_home?: boolean | null
          current_lat?: never
          current_lng?: never
          destination_name?: never
          destination_visibility?: string | null
          event_id?: string | null
          going_home_at?: string | null
          id?: string | null
          joined_at?: string | null
          last_location_update?: never
          profile_id?: string | null
          share_location?: boolean | null
          status?: string | null
        }
        Update: {
          arrived_at?: string | null
          arrived_home?: boolean | null
          current_lat?: never
          current_lng?: never
          destination_name?: never
          destination_visibility?: string | null
          event_id?: string | null
          going_home_at?: string | null
          id?: string | null
          joined_at?: string | null
          last_location_update?: never
          profile_id?: string | null
          share_location?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles_with_connection"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_profiles: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          reward_points: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          reward_points?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          reward_points?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      safe_profiles_with_connection: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          connection_type: Database["public"]["Enums"]["connection_type"] | null
          created_at: string | null
          display_name: string | null
          id: string | null
          reward_points: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          connection_type?: never
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          reward_points?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          connection_type?: never
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          reward_points?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_see_destination: {
        Args: {
          attendee_event_id: string
          attendee_profile_id: string
          viewer_user_id: string
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_max_count: number
          p_profile_id: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      claim_phone_invites: {
        Args: { p_phone: string; p_profile_id: string }
        Returns: {
          claimed_at: string | null
          claimed_by: string | null
          display_name: string | null
          event_id: string
          id: string
          invite_code: string
          invited_at: string
          invited_by: string
          phone_number: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "phone_invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_old_access_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      generate_secure_invite_code: { Args: never; Returns: string }
      get_connection_type: {
        Args: { target_profile_id: string }
        Returns: Database["public"]["Enums"]["connection_type"]
      }
      get_event_attendees_safe: {
        Args: { p_event_id: string }
        Returns: {
          arrived_at: string
          arrived_home: boolean
          avatar_url: string
          current_lat: number
          current_lng: number
          destination_name: string
          destination_visibility: string
          display_name: string
          event_id: string
          going_home_at: string
          id: string
          joined_at: string
          last_location_update: string
          profile_id: string
          share_location: boolean
          status: string
        }[]
      }
      get_event_preview_by_invite_code: {
        Args: { invite_code_param: string }
        Returns: {
          attendee_count: number
          creator_avatar_url: string
          creator_display_name: string
          creator_id: string
          description: string
          id: string
          invite_code: string
          is_barhop: boolean
          is_quick_rally: boolean
          location_name: string
          start_time: string
          title: string
        }[]
      }
      get_profile_access_summary: {
        Args: { p_days?: number; p_profile_id: string }
        Returns: {
          access_by_type: Json
          recent_accessors: Json
          total_accesses: number
          unique_accessors: number
        }[]
      }
      is_connected_to_profile: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      is_connected_via_event: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      is_connected_via_squad: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      is_event_host_or_cohost: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      is_event_member: { Args: { p_event_id: string }; Returns: boolean }
      log_profile_access: {
        Args: { p_accessed_fields?: string[]; p_accessed_profile_id: string }
        Returns: undefined
      }
      record_rate_limit: {
        Args: { p_action_type: string; p_profile_id: string }
        Returns: undefined
      }
    }
    Enums: {
      connection_type: "event" | "squad" | "self" | "none"
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
      connection_type: ["event", "squad", "self", "none"],
    },
  },
} as const
