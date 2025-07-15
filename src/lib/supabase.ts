import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database types
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          contact_email: string;
          phone?: string;
          address?: string;
          subscription_plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      vehicles: {
        Row: {
          id: string;
          organization_id: string;
          vin: string;
          plate_number: string;
          make: string;
          model: string;
          year: number;
          color?: string;
          fuel_type: string;
          assigned_driver_id?: string;
          gps_device_id?: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      location_updates: {
        Row: {
          id: string;
          vehicle_id: string;
          latitude: number;
          longitude: number;
          speed: number;
          heading: number;
          timestamp: string;
          address?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['location_updates']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['location_updates']['Insert']>;
      };
      drivers: {
        Row: {
          id: string;
          organization_id: string;
          first_name: string;
          last_name: string;
          email?: string;
          phone?: string;
          license_number: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['drivers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id?: string;
          alert_type: string;
          severity: string;
          title: string;
          message: string;
          acknowledged: boolean;
          resolved: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
    };
  };
}