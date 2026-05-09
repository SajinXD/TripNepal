export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'tourist' | 'guide' | 'admin';
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          nationality: string | null;
          country: string | null;
          bio: string | null;
          gender: string | null;
          preferred_language: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'tourist' | 'guide' | 'admin';
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          nationality?: string | null;
          country?: string | null;
          bio?: string | null;
          gender?: string | null;
          preferred_language?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'tourist' | 'guide' | 'admin';
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          nationality?: string | null;
          country?: string | null;
          bio?: string | null;
          gender?: string | null;
          preferred_language?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      destinations: {
        Row: {
          id: string;
          name: string;
          location_district: string;
          image_url: string | null;
          description: string | null;
          best_season: string | null;
          elevation_m: number | null;
          difficulty: string | null;
          lat: number | null;
          lng: number | null;
          is_featured: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['destinations']['Row']>;
        Update: Partial<Database['public']['Tables']['destinations']['Row']>;
      };
      guide_profiles: {
        Row: {
          id: string;
          is_online: boolean;
          is_verified: boolean;
          average_rating: number;
          bio_long: string | null;
          languages_spoken: string[];
          specializations: string[];
          service_areas: string[];
          daily_rate_npr: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['guide_profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['guide_profiles']['Row']>;
      };
      bookings: {
        Row: {
          id: string;
          tourist_id: string;
          guide_id: string;
          status: string;
          start_date: string | null;
          end_date: string | null;
          traveler_count: number;
          total_price_npr: number | null;
          special_notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['bookings']['Row']>;
        Update: Partial<Database['public']['Tables']['bookings']['Row']>;
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['chat_messages']['Row']>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>;
      };
      trip_plans: {
        Row: {
          id: string;
          tourist_id: string;
          title: string | null;
          status: string;
          itinerary: any;
          total_days: number;
          estimated_total_cost_npr: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trip_plans']['Row']>;
        Update: Partial<Database['public']['Tables']['trip_plans']['Row']>;
      };
      kyc_verifications: {
        Row: {
          id: string;
          guide_id: string;
          status: string;
          citizenship_number: string | null;
          license_number: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['kyc_verifications']['Row']>;
        Update: Partial<Database['public']['Tables']['kyc_verifications']['Row']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      guide_dashboard_stats: {
        Args: { p_guide_id: string };
        Returns: {
          today_earnings_npr: number;
          week_earnings_npr: number;
          pending_requests: number;
          completed_trips: number;
          avg_rating: number;
          total_reviews: number;
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
