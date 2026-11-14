/**
 * Tela Inicial (Home)
 * Mostra: Listas, Mais tarde, Metas
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePowerSync } from '@/hooks/usePowerSync';

interface ListSummary {
  id: string;
  name: string;
  isInbox: boolean;
  openItemsCount: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { db, syncStatus } = usePowerSync();
  const router = useRouter();

  const [lists, setLists] = useState<ListSummary[]>([]);
  const [laterItemsCount, setLaterItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?.id, syncStatus.lastSyncedAt]);

  const loadData = async () => {
    if (!user?.id || !db) return;

    try {
      setLoading(true);

      // Buscar listas do usuário (exceto Mais tarde)
      const listsResult = await db.getAll(`
        SELECT 
          l.id,
          l.name,
          l.is_inbox as isInbox,
          COUNT(CASE WHEN i.status = 'open' THEN 1 END) as openItemsCount
        FROM lists l
        LEFT JOIN items i ON i.list_id = l.id AND i.deleted_at IS NULL
        WHERE l.deleted_at IS NULL
          AND l.is_inbox = 0
          AND (
            l.owner_id = ?
            OR EXISTS (
              SELECT 1 FROM list_members lm
              WHERE lm.list_id = l.id
                AND lm.user_id = ?
                AND lm.deleted_at IS NULL
            )
          )
        GROUP BY l.id, l.name, l.is_inbox
        ORDER BY l.created_at DESC
      `, [user.id, user.id]);

      setLists(listsResult as ListSummary[]);

      // Buscar items do "Mais tarde" (inbox pessoal)
      const laterResult = await db.getOne(`
        SELECT COUNT(*) as count
        FROM items i
        JOIN lists l ON l.id = i.list_id
        WHERE l.owner_id = ?
          AND l.is_inbox = 1
          AND i.status = 'open'
          AND i.deleted_at IS NULL
          AND l.deleted_at IS NULL
      `, [user.id]);

      setLaterItemsCount((laterResult as any)?.count ?? 0);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.user_metadata?.display_name || 'Usuário';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header com saudação */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {displayName}</Text>
            <View style={styles.syncStatus}>
              <View
                style={[
                  styles.syncDot,
                  syncStatus.connected ? styles.syncDotConnected : styles.syncDotDisconnected,
                ]}
              />
              <Text style={styles.syncText}>
                {syncStatus.connected ? 'Tudo sincronizado' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0B6E63" style={styles.loading} />
        ) : (
          <>
            {/* Listas */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cart-outline" size={20} color="#0B6E63" />
                <Text style={styles.sectionTitle}>Listas</Text>
              </View>

              {lists.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma lista ainda</Text>
              ) : (
                lists.map((list) => (
                  <TouchableOpacity
                    key={list.id}
                    style={styles.card}
                    onPress={() => router.push(`/(main)/lists/${list.id}`)}
                  >
                    <View style={styles.cardIcon}>
                      <Ionicons name="cart" size={20} color="#0B6E63" />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{list.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        {list.openItemsCount} {list.openItemsCount === 1 ? 'item' : 'itens'}
                      </Text>
                    </View>
                    {list.openItemsCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{list.openItemsCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Mais tarde */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bookmark-outline" size={20} color="#C45C26" />
                <Text style={styles.sectionTitle}>Mais tarde</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Só seu, para o que ainda não tem lista
              </Text>

              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push('/(main)/later')}
              >
                <View style={[styles.cardIcon, { backgroundColor: '#F3E3D6' }]}>
                  <Ionicons name="bookmark" size={20} color="#C45C26" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Ver itens</Text>
                  <Text style={styles.cardSubtitle}>
                    {laterItemsCount} {laterItemsCount === 1 ? 'item' : 'itens'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Metas - TODO: Implementar query de metas */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flag-outline" size={20} color="#C45C26" />
                <Text style={styles.sectionTitle}>Metas</Text>
              </View>
              <Text style={styles.emptyText}>Nenhuma meta ainda</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* FABs */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fabSecondary}>
          <Ionicons name="mic-outline" size={24} color="#1A1714" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fabPrimary}
          onPress={() => router.push('/(main)/lists/new')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1714',
    marginBottom: 4,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncDotConnected: {
    backgroundColor: '#1F7A4D',
  },
  syncDotDisconnected: {
    backgroundColor: '#B42318',
  },
  syncText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
  },
  loading: {
    marginTop: 48,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1714',
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0DAD2',
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D8F3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1A1714',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
  },
  badge: {
    backgroundColor: '#D8F3EE',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#0B6E63',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    fontStyle: 'italic',
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0DAD2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fabPrimary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0B6E63',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
