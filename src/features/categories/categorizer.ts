/**
 * Categorizador inteligente de itens
 * 1. Dicionário offline (pt-BR)
 * 2. Mapeamentos do usuário (correções aprendidas)
 * 3. LLM online como fallback
 */

import dictionaryData from '@/../assets/dictionaries/categories-pt-BR.json';

type CategorySlug = keyof typeof dictionaryData;

export interface CategorizationResult {
  categorySlug: CategorySlug | 'outros';
  source: 'dictionary' | 'user' | 'llm' | 'default';
  confidence: number; // 0-1
}

/**
 * Normaliza o nome do item para busca
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

/**
 * Busca no dicionário offline
 */
function searchInDictionary(normalizedName: string): CategorySlug | null {
  for (const [category, keywords] of Object.entries(dictionaryData)) {
    if (category === 'outros') continue;

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeItemName(keyword);
      
      // Busca exata
      if (normalizedName === normalizedKeyword) {
        return category as CategorySlug;
      }

      // Busca parcial (contém a palavra-chave)
      if (normalizedName.includes(normalizedKeyword) || 
          normalizedKeyword.includes(normalizedName)) {
        return category as CategorySlug;
      }
    }
  }

  return null;
}

/**
 * Busca em mapeamentos do usuário (correções aprendidas)
 */
export async function searchInUserMappings(
  userId: string,
  normalizedName: string,
  db: any // PowerSync database instance
): Promise<string | null> {
  try {
    const result = await db.execute(
      `SELECT category_id FROM category_mappings 
       WHERE user_id = ? AND normalized_name = ? AND deleted_at IS NULL
       LIMIT 1`,
      [userId, normalizedName]
    );

    if (result.rows?.length > 0) {
      return result.rows.item(0).category_id;
    }

    return null;
  } catch (error) {
    console.error('Error searching user mappings:', error);
    return null;
  }
}

/**
 * Categoriza usando LLM (apenas quando online)
 */
export async function categorizWithLLM(
  itemName: string
): Promise<{ categorySlug: CategorySlug; confidence: number } | null> {
  const llmEnabled = process.env.EXPO_PUBLIC_LLM_API_URL;
  
  if (!llmEnabled) {
    return null;
  }

  try {
    // TODO: Implementar chamada real ao LLM quando configurado
    // Por enquanto, retorna null para forçar uso do fallback
    console.warn('LLM categorization not yet implemented');
    return null;
  } catch (error) {
    console.error('Error in LLM categorization:', error);
    return null;
  }
}

/**
 * Busca o ID da categoria pelo slug
 */
export async function getCategoryIdBySlug(
  slug: string,
  db: any
): Promise<string | null> {
  try {
    const result = await db.execute(
      `SELECT id FROM categories 
       WHERE slug = ? AND deleted_at IS NULL
       LIMIT 1`,
      [slug]
    );

    if (result.rows?.length > 0) {
      return result.rows.item(0).id;
    }

    return null;
  } catch (error) {
    console.error('Error getting category by slug:', error);
    return null;
  }
}

/**
 * Salva um mapeamento aprendido pelo usuário
 */
export async function saveUserMapping(
  userId: string,
  normalizedName: string,
  categoryId: string,
  source: 'user' | 'llm',
  db: any
): Promise<void> {
  try {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO category_mappings 
       (id, user_id, normalized_name, category_id, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(user_id, normalized_name) 
       DO UPDATE SET category_id = ?, source = ?, updated_at = datetime('now')`,
      [id, userId, normalizedName, categoryId, source, categoryId, source]
    );
  } catch (error) {
    console.error('Error saving user mapping:', error);
  }
}

/**
 * Categoriza um item seguindo a ordem de prioridade:
 * 1. Mapeamentos do usuário (correções)
 * 2. Dicionário offline
 * 3. LLM online (se disponível)
 * 4. Categoria "Outros"
 */
export async function categorizeItem(
  itemName: string,
  userId: string,
  db: any,
  options: {
    allowLLM?: boolean;
    saveLLMMapping?: boolean;
  } = {}
): Promise<CategorizationResult> {
  const { allowLLM = true, saveLLMMapping = true } = options;
  const normalizedName = normalizeItemName(itemName);

  // 1. Buscar em mapeamentos do usuário
  const userMappingCategoryId = await searchInUserMappings(
    userId,
    normalizedName,
    db
  );

  if (userMappingCategoryId) {
    return {
      categorySlug: 'outros', // Will be resolved to actual slug by caller
      source: 'user',
      confidence: 1.0,
    };
  }

  // 2. Buscar no dicionário offline
  const dictionaryCategory = searchInDictionary(normalizedName);
  
  if (dictionaryCategory) {
    // Salvar no mapeamento do usuário para futuras buscas serem mais rápidas
    const categoryId = await getCategoryIdBySlug(dictionaryCategory, db);
    if (categoryId) {
      await saveUserMapping(userId, normalizedName, categoryId, 'user', db);
    }

    return {
      categorySlug: dictionaryCategory,
      source: 'dictionary',
      confidence: 0.9,
    };
  }

  // 3. Buscar usando LLM (apenas se online e habilitado)
  if (allowLLM) {
    const llmResult = await categorizWithLLM(itemName);
    
    if (llmResult) {
      // Salvar mapeamento LLM se solicitado
      if (saveLLMMapping) {
        const categoryId = await getCategoryIdBySlug(llmResult.categorySlug, db);
        if (categoryId) {
          await saveUserMapping(userId, normalizedName, categoryId, 'llm', db);
        }
      }

      return {
        categorySlug: llmResult.categorySlug,
        source: 'llm',
        confidence: llmResult.confidence,
      };
    }
  }

  // 4. Fallback para "Outros"
  return {
    categorySlug: 'outros',
    source: 'default',
    confidence: 0.5,
  };
}
