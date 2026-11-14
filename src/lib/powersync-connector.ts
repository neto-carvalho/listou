/**
 * PowerSync Connector para Supabase
 * Gerencia autenticação e upload de mudanças locais
 */

import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConnector implements PowerSyncBackendConnector {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await this.client.auth.getSession();

    if (error || !session) {
      throw new Error('No active session');
    }

    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    // Pegar mudanças pendentes do banco local
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      // Processar cada operação CRUD
      for (const op of transaction.crud) {
        await this.processCrudEntry(op);
      }

      // Marcar transação como completa
      await transaction.complete();
    } catch (error) {
      console.error('Error uploading data:', error);
      throw error;
    }
  }

  private async processCrudEntry(entry: CrudEntry): Promise<void> {
    const { op, table, id, data } = entry;

    switch (op) {
      case UpdateType.PUT:
        // Insert ou Update
        await this.client.from(table).upsert({
          id,
          ...data,
        });
        break;

      case UpdateType.PATCH:
        // Update parcial
        await this.client.from(table).update(data).eq('id', id);
        break;

      case UpdateType.DELETE:
        // Soft delete - atualizar deleted_at
        await this.client
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        break;
    }
  }
}
