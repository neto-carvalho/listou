/**
 * Tela do Mais tarde
 * Bloco pessoal para guardar itens que ainda não têm lista
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePowerSync } from '@/hooks/usePowerSync';
import { createItem, deleteItem } from '@/features/items/items-service';

interface LaterItem {
  id: string;
  title: string;
  priority: string;
  notes: string | null;
  url: string | null;
  estimatedPrice: number | null;
}

const PRIORITIES = [
  { value: 'high', label: 'Alta', color: '#C45C26' },
  { value: 'medium', label: 'Média', color: '#5C564F' },
  { value: 'low', label: 'Baixa', color: '#B7B0A7' },
];

export default function LaterScreen() {
  const { user } = useAuth();
  const { db, syncStatus } = usePowerSync();
  const router = useRouter();

  const [items, setItems] = useState<LaterItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [inboxListId, setInboxListId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.id, syncStatus.lastSyncedAt]);

  const loadData = async () => {
    if (!user?.id || !db) return;

    try {
      setLoading(true);

      // Buscar ou criar lista "Mais tarde" (inbox pessoal)
      let inboxResult = await db.getOne(
        `SELECT id FROM lists 
         WHERE owner_id = ? AND is_inbox = 1 AND deleted_at IS NULL`,
        [user.id]
      );

      if (!inboxResult) {
        // Criar lista inbox
        const listId = crypto.randomUUID();
        const now = new Date().toISOString();

        await db.execute(
          `INSERT INTO lists 
           (id, owner_id, name, description, currency, is_inbox, created_at, updated_at)
           VALUES (?, ?, 'Mais tarde', 'Itens pessoais para depois', 'BRL', 1, ?, ?)`,
          [listId, user.id, now, now]
        );

        // Criar membro owner
        const memberId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO list_members 
           (id, list_id, user_id, role, created_at, updated_at)
           VALUES (?, ?, ?, 'owner', ?, ?)`,
          [memberId, listId, user.id, now, now]
        );

        inboxResult = { id: listId };
      }

      setInboxListId(inboxResult.id);

      // Buscar itens do Mais tarde
      const itemsResult = await db.getAll(
        `SELECT 
           id, 
           title, 
           priority, 
           notes, 
           url, 
           estimated_price as estimatedPrice
         FROM items
         WHERE list_id = ?
           AND kind = 'later'
           AND status = 'open'
           AND deleted_at IS NULL
         ORDER BY 
           CASE priority 
             WHEN 'high' THEN 1 
             WHEN 'medium' THEN 2 
             ELSE 3 
           END,
           created_at DESC`,
        [inboxResult.id]
      );

      setItems(itemsResult as LaterItem[]);
    } catch (error) {
      console.error('Error loading later items:', error);
      Alert.alert('Erro', 'Não foi possível carregar os itens');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || !user?.id || !inboxListId) return;

    setAdding(true);

    try {
      await createItem(
        {
          listId: inboxListId,
          userId: user.id,
          title: newItemText.trim(),
          kind: 'later',
          priority: 'medium',
        },
        db
      );

      setNewItemText('');
      await loadData();
    } catch (error: any) {
      console.error('Error adding later item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Remover item',
      'Tem certeza que deseja remover este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(itemId, db);
              await loadData();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Erro', 'Não foi possível remover o item');
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority)?.color || '#5C564F';
  };

  const getPriorityLabel = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority)?.label || 'Média';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#C45C26" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.description}>
          Só seu, para o que ainda não tem lista
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhum item ainda. Adicione algo que você quer comprar depois.
          </Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#B42318" />
                </TouchableOpacity>
              </View>

              {item.notes && (
                <Text style={styles.cardNotes}>{item.notes}</Text>
              )}

              {item.url && (
                <View style={styles.cardMeta}>
                  <Ionicons name="link-outline" size={16} color="#0B6E63" />
                  <Text style={styles.cardMetaText} numberOfLines={1}>
                    Link salvo
                  </Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text
                  style={[
                    styles.priorityBadge,
                    { color: getPriorityColor(item.priority) },
                  ]}
                >
                  {getPriorityLabel(item.priority).toUpperCase()}
                </Text>

                {item.estimatedPrice && (
                  <Text style={styles.priceText}>
                    ~ R$ {item.estimatedPrice.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Input de adicionar item */}
      <View style={styles.addItemContainer}>
        <TextInput
          style={styles.addItemInput}
          placeholder="Adicionar ao Mais tarde"
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0DAD2',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0DAD2',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1A1714',
    marginRight: 12,
  },
  cardNotes: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardMetaText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#0B6E63',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  priceText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#5C564F',
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
    backgroundColor: '#C45C26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
});
