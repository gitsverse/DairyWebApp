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
      customers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          default_milk_qty: number | null;
          custom_milk_rate: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          default_milk_qty?: number | null;
          custom_milk_rate?: number | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: number;
          name: string;
          default_rate: number;
          unit: "liter" | "kg";
        };
        Insert: {
          id?: number;
          name: string;
          default_rate: number;
          unit: "liter" | "kg";
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          customer_id: string;
          product_id: number;
          date: string;
          shift: "morning" | "evening";
          quantity: number;
          price_per_unit: number;
          total_amount: number;
        };
        Insert: {
          id?: string;
          customer_id: string;
          product_id: number;
          date: string;
          shift: "morning" | "evening";
          quantity: number;
          price_per_unit: number;
        };
        Update: Partial<Database["public"]["Tables"]["entries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "entries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          customer_id: string;
          type: "advance" | "payment" | "adjustment" | "due";
          amount: number;
          payment_mode: "cash" | "online" | "upi";
          date: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          type: "advance" | "payment" | "adjustment" | "due";
          amount: number;
          payment_mode: "cash" | "online" | "upi";
          date?: string;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      dairy_profile: {
        Row: {
          id: number;
          dairy_name: string;
          tagline: string | null;
          address: string | null;
          phone: string | null;
          gst: string | null;
          logo_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          dairy_name?: string;
          tagline?: string | null;
          address?: string | null;
          phone?: string | null;
          gst?: string | null;
          logo_url?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["dairy_profile"]["Insert"]>;
        Relationships: [];
      };
      bill_shares: {
        Row: {
          id: string;
          customer_id: string;
          period_start: string;
          period_end: string;
          storage_path: string;
          created_at: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          period_start: string;
          period_end: string;
          storage_path: string;
          created_at?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["bill_shares"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "bill_shares_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_top_customers: {
        Args: {
          p_start: string;
          p_end: string;
        };
        Returns: {
          customer_id: string;
          name: string;
          balance: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
