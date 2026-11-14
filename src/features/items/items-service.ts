/**
 * Serviço de Itens
 * CRUD e lógica de negócio para itens de compra
 */

import { ItemKind, ItemStatus, Priority } from '@/types/database.types';
import { categorizeItem } from '../categories/categorizer';

export interface CreateItemInput {
  listId: string;
  userId: string;
  title: string;
  notes?: string;
  url?: string;
  kind?: ItemKind;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  priority?: Priority;
  targetDate?: string;
}

export interface UpdateItemInput {
  title?: string;
  notes?: string;
  url?: string;
  kind?: ItemKind;
  status?: ItemStatus;
  categoryId?: string;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  priority?: Priority;
  targetDate?: string;
  purchasedPrice?: number;
}

/**
 * Cria um novo item
 */
export async function createItem(
  input: CreateItemInput,
  db: any
): Promise<string> {
  const {
    listId,
    userId,
    title,
    notes,
    url,
    kind = 'daily',
    quantity,
    unit,
    estimatedPrice,
    priority = 'medium',
    targetDate,
  } = input;

  const itemId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Categorizar automaticamente
  const categorization = await categorizeItem(title, userId, db);
  const categoryId = categorization.categorySlug !== 'outros'
    ? await getCategoryIdBySlug(categorization.categorySlug, db)
    : await getCategoryIdBySlug('outros', db);

  // Inserir item
  await db.execute(
    `INSERT INTO items 
     (id, list_id, created_by, title, notes, url, kind, status, 
      category_id, quantity, unit, estimated_price, priority, 
      target_date, sort_order, created_at, updated_at, field_clocks)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, 0, ?, ?, '{}')`,
    [
      itemId,
      listId,
      userId,
      title,
      notes || null,
      url || null,
      kind,
      categoryId,
      quantity || null,
      unit || null,
      estimatedPrice || null,
      priority,
      targetDate || null,
      now,
      now,
    ]
  );

  return itemId;
}

/**
 * Atualiza um item
 */
export async function updateItem(
  itemId: string,
  updates: UpdateItemInput,
  db: any
): Promise<void> {
  const setClauses: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      // Converter camelCase para snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${snakeKey} = ?`);
      values.push(value);
    }
  });

  if (setClauses.length === 0) return;

  setClauses.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(itemId);

  await db.execute(
    `UPDATE items SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Marca item como comprado
 */
export async function markAsPurchased(
  itemId: string,
  purchasedPrice?: number,
  db?: any
): Promise<void> {
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE items 
     SET status = 'purchased', 
         purchased_at = ?,
         purchased_price = ?,
         updated_at = ?
     WHERE id = ?`,
    [now, purchasedPrice || null, now, itemId]
  );

  // Se tem preço, salvar no histórico
  if (purchasedPrice) {
    const historyId = crypto.randomUUID();
    const item = await db.getOne('SELECT list_id, created_by FROM items WHERE id = ?', [itemId]);
    const list = await db.getOne('SELECT currency FROM lists WHERE id = ?', [item.list_id]);

    await db.execute(
      `INSERT INTO price_history 
       (id, item_id, price, currency, source, observed_at, created_by, created_at)
       VALUES (?, ?, ?, ?, 'purchase', ?, ?, ?)`,
      [historyId, itemId, purchasedPrice, list.currency, now, item.created_by, now]
    );
  }
}

/**
 * Marca item como não comprado (desfazer)
 */
export async function markAsOpen(itemId: string, db: any): Promise<void> {
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE items 
     SET status = 'open', 
         purchased_at = NULL,
         purchased_price = NULL,
         updated_at = ?
     WHERE id = ?`,
    [now, itemId]
  );
}

/**
 * Deleta item (soft delete)
 */
export async function deleteItem(itemId: string, db: any): Promise<void> {
  const now = new Date().toISOString();

  await db.execute(
    'UPDATE items SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, itemId]
  );
}

/**
 * Move item para outra lista
 */
export async function moveItemToList(
  itemId: string,
  targetListId: string,
  db: any
): Promise<void> {
  const now = new Date().toISOString();

  await db.execute(
    'UPDATE items SET list_id = ?, updated_at = ? WHERE id = ?',
    [targetListId, now, itemId]
  );
}

/**
 * Muda o tipo do item (preserva dados)
 */
export async function changeItemKind(
  itemId: string,
  newKind: ItemKind,
  db: any
): Promise<void> {
  const now = new Date().toISOString();

  await db.execute(
    'UPDATE items SET kind = ?, updated_at = ? WHERE id = ?',
    [newKind, now, itemId]
  );
}

/**
 * Busca ID da categoria pelo slug
 */
async function getCategoryIdBySlug(slug: string, db: any): Promise<string | null> {
  const result = await db.getOne(
    'SELECT id FROM categories WHERE slug = ? AND deleted_at IS NULL',
    [slug]
  );
  return result?.id || null;
}
