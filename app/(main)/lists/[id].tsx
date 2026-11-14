/**
 * Tela de Detalhe da Lista
 * Mostra itens com categorias, permite adicionar/marcar/filtrar
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePowerSync } from '@/hooks/usePowerSync';
import { createItem, markAsPurchased, markAsOpen } from '@/features/items/items-service';

interface ListItem {
  id: string;
  title: string;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  quantity: number | null;
  unit: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { db, syncStatus } = usePowerSync();
  const router = useRouter();

  const [list, setList] = useState<any>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, syncStatus.lastSyncedAt]);

  const loadData = async () => {
    if (!id || !db) return;

    try {
      setLoading(true);

      // Buscar lista
      const listResult = await db.getOne(
        'SELECT * FROM lists WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      setList(listResult);

      // Buscar categorias
      const categoriesResult = await db.getAll(
        'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name'
      );
      setCategories(categoriesResult as Category[]);

      // Buscar itens
      await loadItems();
    } catch (error) {
      console.error('Error loading list:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!id || !db) return;

    try {
      let query = `
        SELECT 
          i.id,
          i.title,
          i.status,
          i.category_id as categoryId,
          c.name as categoryName,
          i.quantity,
          i.unit
        FROM items i
        LEFT JOIN categories c ON c.id = i.category_id
        WHERE i.list_id = ?
          AND i.deleted_at IS NULL
      `;

      const params: any[] = [id];

      if (selectedCategory) {
        query += ' AND i.category_id = ?';
        params.push(selectedCategory);
      }

      query += ' ORDER BY i.status, c.name, i.title';

      const itemsResult = await db.getAll(query, params);
      setItems(itemsResult as ListItem[]);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || !user?.id) return;

    setAdding(true);

    try {
      await createItem(
        {
          listId: id!,
          userId: user.id,
          title: newItemText.trim(),
          kind: 'daily',
        },
        db
      );

      setNewItemText('');
      await loadItems();
    } catch (error: any) {
      console.error('Error adding item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleItem = async (item: ListItem) => {
    try {
      if (item.status === 'open') {
        await markAsPurchased(item.id, undefined, db);
      } else {
        await markAsOpen(item.id, db);
      }
      await loadItems();
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const openItems = items.filter((i) => i.status === 'open');
  const purchasedItems = items.filter((i) => i.status === 'purchased');

  // Agrupar itens abertos por categoria
  const groupedItems = openItems.reduce((acc, item) => {
    const category = item.categoryName || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ListItem[]>);

  const renderItem = (item: ListItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.item}
      onPress={() => handleToggleItem(item)}
    >
      <View
        style={[
          styles.checkbox,
          item.status === 'purchased' && styles.checkboxChecked,
        ]}
      >
        {item.status === 'purchased' && (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        )}
      </View>
      <Text
        style={[
          styles.itemText,
          item.status === 'purchased' && styles.itemTextChecked,
        ]}
      >
        {item.title}
      </Text>
      {item.quantity && (
        <Text style={styles.quantityText}>
          {item.quantity} {item.unit || ''}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0B6E63" />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Lista não encontrada</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com info da lista */}
      <View style={styles.listHeader}>
        <Text style={styles.listName}>{list.name}</Text>
        {list.description && (
          <Text style={styles.listDescription}>{list.description}</Text>
        )}
      </View>

      {/* Filtros de categoria */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={() => {
            setSelectedCategory(null);
            loadItems();
          }}
        >
          <Text
            style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}
          >
            Todas
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => {
              setSelectedCategory(cat.id);
              loadItems();
            }}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.id && styles.categoryChipTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de itens */}
      <ScrollView style={styles.itemsScroll} contentContainerStyle={styles.itemsContent}>
        {selectedCategory ? (
          // Modo filtrado: lista simples
          <>
            {openItems.length === 0 && (
              <Text style={styles.emptyText}>Nenhum item nesta categoria</Text>
            )}
            {openItems.map(renderItem)}
          </>
        ) : (
          // Modo agrupado por categoria
          <>
            {Object.keys(groupedItems).length === 0 && (
              <Text style={styles.emptyText}>Nenhum item ainda</Text>
            )}
            {Object.entries(groupedItems)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, categoryItems]) => (
                <View key={category} style={styles.categoryGroup}>
                  <Text style={styles.categoryHeader}>{category}</Text>
                  {categoryItems.map(renderItem)}
                </View>
              ))}
          </>
        )}

        {/* Itens comprados */}
        {purchasedItems.length > 0 && (
          <View style={styles.purchasedSection}>
            <Text style={styles.purchasedHeader}>Comprados</Text>
            {purchasedItems.map(renderItem)}
          </View>
        )}
      </ScrollView>

      {/* Input de adicionar item */}
      <View style={styles.addItemContainer}>
        <TextInput
          style={styles.addItemInput}
          placeholder="Adicionar item"
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, adding && styles.addButtonDisabled]}
          onPress={handleAddItem}
          disabled={adding || !newItemText.trim()}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="add" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {!syncStatus.connected && (
          <TouchableOpacity style={styles.micButtonDisabled}>
            <Ionicons name="mic-outline" size={20} color="#B7B0A7" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F3EE',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0DAD2',
  },
  listName: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1714',
  },
  listDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    marginTop: 4,
  },
  categoriesScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E0DAD2',
  },
  categoriesContent: {
    padding: 12,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#ECE7E0',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipActive: {
    backgroundColor: '#0B6E63',
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#5C564F',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  itemsScroll: {
    flex: 1,
  },
  itemsContent: {
    padding: 16,
  },
  categoryGroup: {
    marginBottom: 20,
  },
  categoryHeader: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#5C564F',
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0DAD2',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5C564F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1F7A4D',
    borderColor: '#1F7A4D',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1714',
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#5C564F',
  },
  quantityText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
  },
  purchasedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0DAD2',
  },
  purchasedHeader: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#5C564F',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#B42318',
  },
  addItemContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0DAD2',
    backgroundColor: '#FFFFFF',
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#F6F3EE',
    borderWidth: 1,
    borderColor: '#E0DAD2',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1714',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0B6E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  micButtonDisabled: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ECE7E0',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
});
