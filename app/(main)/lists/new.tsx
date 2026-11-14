/**
 * Tela de Nova Lista
 * Moeda obrigatória (padrão BRL)
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePowerSync } from '@/hooks/usePowerSync';

const CURRENCIES = [
  { code: 'BRL', name: 'Real (BRL)', symbol: 'R$' },
  { code: 'USD', name: 'Dólar (USD)', symbol: '$' },
  { code: 'EUR', name: 'Euro (EUR)', symbol: '€' },
];

export default function NewListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { db } = usePowerSync();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para a lista');
      return;
    }

    if (!user?.id) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setLoading(true);

    try {
      const listId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Inserir lista no banco local
      await db.execute(
        `INSERT INTO lists 
         (id, owner_id, name, description, currency, is_inbox, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [listId, user.id, name.trim(), description.trim() || null, currency, now, now]
      );

      // Inserir owner como membro
      const memberId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO list_members 
         (id, list_id, user_id, role, created_at, updated_at)
         VALUES (?, ?, ?, 'owner', ?, ?)`,
        [memberId, listId, user.id, now, now]
      );

      Alert.alert('Sucesso', 'Lista criada!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating list:', error);
      Alert.alert('Erro', 'Não foi possível criar a lista');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nome <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Mercado da semana"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Moeda <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>
            Já vem preenchido com real. Você pode trocar agora ou depois, nas configurações da lista.
          </Text>
          
          <View style={styles.currencyOptions}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyOption,
                  currency === curr.code && styles.currencyOptionSelected,
                ]}
                onPress={() => setCurrency(curr.code)}
              >
                <Text
                  style={[
                    styles.currencyText,
                    currency === curr.code && styles.currencyTextSelected,
                  ]}
                >
                  {curr.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Para que serve esta lista"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Criando...' : 'Criar lista'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    padding: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1A1714',
    marginBottom: 8,
  },
  required: {
    color: '#B42318',
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#5C564F',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0DAD2',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1714',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  currencyOptions: {
    gap: 8,
  },
  currencyOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0DAD2',
    borderRadius: 12,
    padding: 14,
  },
  currencyOptionSelected: {
    borderColor: '#0B6E63',
    backgroundColor: '#D8F3EE',
  },
  currencyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1714',
  },
  currencyTextSelected: {
    fontFamily: 'Inter-SemiBold',
    color: '#0B6E63',
  },
  button: {
    backgroundColor: '#0B6E63',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#5C564F',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
