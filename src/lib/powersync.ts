/**
 * PowerSync Configuration - Offline-first sync
 * Sincronização entre SQLite local e Supabase Postgres
 */

import { PowerSyncDatabase } from '@powersync/react-native';
import { SupabaseConnector } from './powersync-connector';
import { supabase } from './supabase';
import { AppSchema } from './powersync-schema';

// Singleton da instância do PowerSync
let powerSyncInstance: PowerSyncDatabase | null = null;

export const getPowerSync = (): PowerSyncDatabase => {
  if (!powerSyncInstance) {
    const powerSyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL;

    if (!powerSyncUrl) {
      throw new Error(
        'Missing PowerSync URL. ' +
        'Please configure EXPO_PUBLIC_POWERSYNC_URL in your .env file.'
      );
    }

    // Criar connector para Supabase
    const connector = new SupabaseConnector(supabase);

    // Criar instância do PowerSync
    powerSyncInstance = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'listou.db',
      },
    });

    // Conectar ao PowerSync
    powerSyncInstance.connect(connector);
  }

  return powerSyncInstance;
};

export const powerSync = getPowerSync();
