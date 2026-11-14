/**
 * Database Types - Listou
 * Tipos TypeScript gerados a partir do schema do Supabase
 */

export type Currency = 'BRL' | 'USD' | 'EUR';

export type ItemKind = 'daily' | 'later' | 'planned' | 'goal';

export type ItemStatus = 'open' | 'purchased' | 'cancelled';

export type Priority = 'low' | 'medium' | 'high';

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type CategorySource = 'dictionary' | 'user' | 'llm';

export interface Profile {
  id: string; // UUID, igual a auth.users.id
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string; // UUID, gerado no cliente
  owner_id: string; // UUID
  name: string;
  description: string | null;
  currency: Currency;
  is_inbox: boolean; // Mais tarde pessoal
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Invite {
  id: string;
  list_id: string;
  created_by: string;
  role: 'editor' | 'viewer'; // Admin é concedido depois
  token_hash: string;
  expires_at: string;
  max_uses: number | null; // null = vários usos
  use_count: number;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Item {
  id: string;
  list_id: string;
  created_by: string;
  title: string;
  notes: string | null;
  url: string | null;
  kind: ItemKind;
  status: ItemStatus;
  category_id: string | null;
  quantity: number | null;
  unit: string | null;
  estimated_price: number | null;
  priority: Priority;
  target_date: string | null; // date
  purchased_at: string | null;
  purchased_price: number | null;
  recurrence_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  field_clocks: Record<string, number> | null; // Para resolução de conflitos
}

export interface Recurrence {
  id: string;
  item_id: string;
  frequency: RecurrenceFrequency;
  interval: number | null;
  weekday: number | null; // 0-6, domingo = 0
  next_due_at: string; // date
  last_completed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Goal {
  id: string;
  item_id: string;
  target_amount: number;
  monthly_contribution: number | null;
  target_date: string | null; // date
  reminder_enabled: boolean;
  reminder_day: number | null; // 1-28
  track_price: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  note: string | null;
  contributed_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PriceHistory {
  id: string;
  item_id: string;
  price: number;
  currency: Currency;
  source: 'manual' | 'purchase';
  observed_at: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CategoryMapping {
  id: string;
  user_id: string;
  normalized_name: string;
  category_id: string;
  source: CategorySource;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Database com todas as tabelas
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      lists: {
        Row: List;
        Insert: Omit<List, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<List, 'id' | 'created_at'>>;
      };
      list_members: {
        Row: ListMember;
        Insert: Omit<ListMember, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ListMember, 'id' | 'created_at'>>;
      };
      invites: {
        Row: Invite;
        Insert: Omit<Invite, 'created_at' | 'updated_at' | 'use_count'>;
        Update: Partial<Omit<Invite, 'id' | 'created_at'>>;
      };
      items: {
        Row: Item;
        Insert: Omit<Item, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Item, 'id' | 'created_at'>>;
      };
      recurrences: {
        Row: Recurrence;
        Insert: Omit<Recurrence, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Recurrence, 'id' | 'created_at'>>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Goal, 'id' | 'created_at'>>;
      };
      goal_contributions: {
        Row: GoalContribution;
        Insert: Omit<GoalContribution, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GoalContribution, 'id' | 'created_at'>>;
      };
      price_history: {
        Row: PriceHistory;
        Insert: Omit<PriceHistory, 'created_at'>;
        Update: Partial<Omit<PriceHistory, 'id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      category_mappings: {
        Row: CategoryMapping;
        Insert: Omit<CategoryMapping, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CategoryMapping, 'id' | 'created_at'>>;
      };
    };
  };
}
