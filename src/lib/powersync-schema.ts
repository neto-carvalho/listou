/**
 * PowerSync Schema - Define quais tabelas sincronizar localmente
 * Apenas tabelas necessárias para uso offline
 */

import { column, Schema, Table } from '@powersync/react-native';

// Schema das tabelas locais
const profiles = new Table({
  id: column.text,
  display_name: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const lists = new Table({
  id: column.text,
  owner_id: column.text,
  name: column.text,
  description: column.text,
  currency: column.text,
  is_inbox: column.integer, // boolean como 0/1
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const list_members = new Table({
  id: column.text,
  list_id: column.text,
  user_id: column.text,
  role: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const items = new Table({
  id: column.text,
  list_id: column.text,
  created_by: column.text,
  title: column.text,
  notes: column.text,
  url: column.text,
  kind: column.text,
  status: column.text,
  category_id: column.text,
  quantity: column.real,
  unit: column.text,
  estimated_price: column.real,
  priority: column.text,
  target_date: column.text,
  purchased_at: column.text,
  purchased_price: column.real,
  recurrence_id: column.text,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  field_clocks: column.text, // JSON serializado
});

const recurrences = new Table({
  id: column.text,
  item_id: column.text,
  frequency: column.text,
  interval: column.integer,
  weekday: column.integer,
  next_due_at: column.text,
  last_completed_at: column.text,
  is_active: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const goals = new Table({
  id: column.text,
  item_id: column.text,
  target_amount: column.real,
  monthly_contribution: column.real,
  target_date: column.text,
  reminder_enabled: column.integer,
  reminder_day: column.integer,
  track_price: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const goal_contributions = new Table({
  id: column.text,
  goal_id: column.text,
  user_id: column.text,
  amount: column.real,
  note: column.text,
  contributed_at: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const categories = new Table({
  id: column.text,
  slug: column.text,
  name: column.text,
  is_system: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const category_mappings = new Table({
  id: column.text,
  user_id: column.text,
  normalized_name: column.text,
  category_id: column.text,
  source: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const price_history = new Table({
  id: column.text,
  item_id: column.text,
  price: column.real,
  currency: column.text,
  source: column.text,
  observed_at: column.text,
  created_by: column.text,
  created_at: column.text,
  deleted_at: column.text,
});

// Invites não sincronizam localmente - apenas no servidor
// São acessados apenas quando há rede para aceitar

export const AppSchema = new Schema({
  profiles,
  lists,
  list_members,
  items,
  recurrences,
  goals,
  goal_contributions,
  categories,
  category_mappings,
  price_history,
});

export type Database = (typeof AppSchema)['types'];
