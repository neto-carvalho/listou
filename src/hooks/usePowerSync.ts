/**
 * Hook do PowerSync
 * Fornece acesso ao banco de dados local e estado de sincronização
 */

import { useEffect, useState } from 'react';
import { PowerSyncDatabase } from '@powersync/react-native';
import { powerSync } from '@/lib/powersync';

export interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastSyncedAt: Date | null;
}

export function usePowerSync() {
  const [db] = useState<PowerSyncDatabase>(powerSync);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    syncing: false,
    lastSyncedAt: null,
  });

  useEffect(() => {
    // Monitorar estado de conexão
    const updateStatus = () => {
      setSyncStatus({
        connected: db.connected,
        syncing: db.currentStatus?.downloading ?? false,
        lastSyncedAt: db.currentStatus?.lastSyncedAt ?? null,
      });
    };

    // Atualizar imediatamente
    updateStatus();

    // Atualizar periodicamente
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, [db]);

  return {
    db,
    syncStatus,
  };
}
