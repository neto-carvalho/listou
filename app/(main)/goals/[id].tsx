/**
 * Tela de Detalhe da Meta
 * Mostra progresso, aportes, e permite registrar novos aportes (owner/admin)
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
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePowerSync } from '@/hooks/usePowerSync';

interface GoalData {
  id: string;
  itemId: string;
  itemTitle: string;
  targetAmount: number;
  monthlyContribution: number | null;
  targetDate: string | null;
  trackPrice: boolean;
  listCurrency: string;
  lastPrice: number | null;
  totalContributed: number;
}

interface Contribution {
  id: string;
  userId: string;
  userName: string;
  isAdmin: boolean;
  amount: number;
  contributedAt: string;
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { db } = usePowerSync();

  const [goal, setGoal] = useState<GoalData | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionAmount, setContributionAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || !db || !user?.id) return;

    try {
      setLoading(true);

      // Buscar meta com item e lista
      const goalResult = await db.getOne(
        `SELECT 
           g.id,
           g.item_id as itemId,
           i.title as itemTitle,
           g.target_amount as targetAmount,
           g.monthly_contribution as monthlyContribution,
           g.target_date as targetDate,
           g.track_price as trackPrice,
           l.currency as listCurrency
         FROM goals g
         JOIN items i ON i.id = g.item_id
         JOIN lists l ON l.id = i.list_id
         WHERE g.id = ? AND g.deleted_at IS NULL`,
        [id]
      );

      if (!goalResult) {
        Alert.alert('Erro', 'Meta não encontrada');
        return;
      }

      // Buscar último preço se track_price estiver ativo
      let lastPrice = null;
      if (goalResult.trackPrice) {
        const priceResult = await db.getOne(
          `SELECT price 
           FROM price_history 
           WHERE item_id = ? AND deleted_at IS NULL
           ORDER BY observed_at DESC
           LIMIT 1`,
          [goalResult.itemId]
        );
        lastPrice = priceResult?.price || null;
      }

      // Calcular total contribuído
      const totalResult = await db.getOne(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM goal_contributions
         WHERE goal_id = ? AND deleted_at IS NULL`,
        [id]
      );

      setGoal({
        ...goalResult,
        lastPrice,
        totalContributed: totalResult?.total || 0,
      });

      // Verificar se o usuário pode editar (owner ou admin)
      const memberResult = await db.getOne(
        `SELECT lm.role
         FROM list_members lm
         JOIN items i ON i.list_id = lm.list_id
         JOIN goals g ON g.item_id = i.id
         WHERE g.id = ? AND lm.user_id = ? AND lm.deleted_at IS NULL`,
        [id, user.id]
      );

      const role = memberResult?.role;
      setCanEdit(role === 'owner' || role === 'admin');

      // Buscar contribuições
      const contribsResult = await db.getAll(
        `SELECT 
           gc.id,
           gc.user_id as userId,
           p.display_name as userName,
           gc.amount,
           gc.contributed_at as contributedAt,
           lm.role
         FROM goal_contributions gc
         JOIN profiles p ON p.id = gc.user_id
         LEFT JOIN items i ON i.list_id IN (
           SELECT list_id FROM items WHERE id = (SELECT item_id FROM goals WHERE id = ?)
         )
         LEFT JOIN list_members lm ON lm.list_id = i.list_id AND lm.user_id = gc.user_id
         WHERE gc.goal_id = ? AND gc.deleted_at IS NULL
         ORDER BY gc.contributed_at DESC`,
        [id, id]
      );

      setContributions(
        (contribsResult as any[]).map((c) => ({
          ...c,
          isAdmin: c.role === 'admin',
        }))
      );
    } catch (error) {
      console.error('Error loading goal:', error);
      Alert.alert('Erro', 'Não foi possível carregar a meta');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContribution = async () => {
    const amount = parseFloat(contributionAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (!canEdit) {
      Alert.alert('Erro', 'Você não tem permissão para registrar aportes');
      return;
    }

    setAdding(true);

    try {
      const contribId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO goal_contributions
         (id, goal_id, user_id, amount, contributed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contribId, id, user!.id, amount, now, now, now]
      );

      setContributionAmount('');
      await loadData();
    } catch (error: any) {
      console.error('Error adding contribution:', error);
      Alert.alert('Erro', 'Não foi possível registrar o aporte');
    } finally {
      setAdding(false);
    }
  };

  if (loading || !goal) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#C45C26" />
      </View>
    );
  }

  const remaining = goal.targetAmount - goal.totalContributed;
  const progress = (goal.totalContributed / goal.targetAmount) * 100;

  // Calcular previsão se houver aporte mensal
  let estimatedDate = null;
  if (goal.monthlyContribution && remaining > 0) {
    const monthsRemaining = Math.ceil(remaining / goal.monthlyContribution);
    const date = new Date();
    date.setMonth(date.getMonth() + monthsRemaining);
    estimatedDate = date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="flag" size={24} color="#C45C26" />
          </View>
          <Text style={styles.title}>{goal.itemTitle}</Text>
        </View>

        {/* Progresso */}
        <View style={styles.progressCard}>
          <Text style={styles.amountText}>
            {goal.listCurrency} {goal.totalContributed.toFixed(2)}
          </Text>
          <Text style={styles.targetText}>
            de {goal.listCurrency} {goal.targetAmount.toFixed(2)}
          </Text>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
          </View>

          <Text style={styles.remainingText}>
            Faltam {goal.listCurrency} {remaining.toFixed(2)}
            {estimatedDate && ` · previsto para ${estimatedDate}`}
          </Text>
        </View>

        {/* Último preço visto */}
        {goal.trackPrice && goal.lastPrice && (
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Último preço visto</Text>
            <Text style={styles.priceValue}>
              {goal.listCurrency} {goal.lastPrice.toFixed(2)}
            </Text>
            <Text style={styles.priceNote}>
              O alvo não muda quando o preço sobe ou desce
            </Text>
          </View>
        )}

        {/* Botão Guardei (apenas owner/admin) */}
        {canEdit && (
          <View style={styles.addContributionCard}>
            <Text style={styles.addLabel}>Quanto você guardou?</Text>
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.addInput}
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={contributionAmount}
                onChangeText={setContributionAmount}
              />
              <TouchableOpacity
                style={[styles.addButton, adding && styles.addButtonDisabled]}
                onPress={handleAddContribution}
                disabled={adding}
              >
                <Text style={styles.addButtonText}>
                  {adding ? 'Salvando...' : 'Guardei'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lista de aportes */}
        <View style={styles.contributionsSection}>
          <Text style={styles.sectionTitle}>Aportes</Text>

          {contributions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum aporte ainda</Text>
          ) : (
            contributions.map((contrib) => (
              <View key={contrib.id} style={styles.contributionRow}>
                <Text style={styles.contributionUser}>
                  {contrib.userName}
                  {contrib.isAdmin && (
                    <Text style={styles.adminBadge}> · ADM</Text>
                  )}
                </Text>
                <Text style={styles.contributionAmount}>
                  {goal.listCurrency} {contrib.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3E3D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1714',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0DAD2',
    padding: 20,
    marginBottom: 16,
  },
  amountText: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1714',
  },
  targetText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    marginTop: 4,
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#ECE7E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#C45C26',
    borderRadius: 6,
  },
  remainingText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0DAD2',
    padding: 16,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1714',
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    fontStyle: 'italic',
  },
  addContributionCard: {
    backgroundColor: '#D8F3EE',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  addLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1A1714',
    marginBottom: 12,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0B6E63',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1714',
  },
  addButton: {
    backgroundColor: '#0B6E63',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  contributionsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1714',
    marginBottom: 12,
  },
  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0DAD2',
  },
  contributionUser: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1714',
  },
  adminBadge: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#C45C26',
  },
  contributionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1714',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
});
