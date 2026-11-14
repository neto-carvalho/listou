/**
 * Serviço de Voz (MVP - stub com interfaces claras)
 * Voz funciona apenas online no MVP
 * Offline: oferece digitação
 */

export interface VoiceTranscriptionResult {
  text: string;
  confidence: number;
}

export interface VoiceIntentResult {
  action: 'add_item' | 'mark_purchased' | 'create_list' | 'unknown';
  itemName?: string;
  listName?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

/**
 * Verifica se voz está habilitada e há conexão
 */
export function isVoiceAvailable(): boolean {
  const enabled = process.env.EXPO_PUBLIC_VOICE_ENABLED === 'true';
  // TODO: Verificar conectividade de rede
  return enabled;
}

/**
 * Transcreve áudio para texto
 * Requer conexão com API de transcrição
 */
export async function transcribeAudio(
  audioBlob: Blob
): Promise<VoiceTranscriptionResult> {
  const apiUrl = process.env.EXPO_PUBLIC_VOICE_API_URL;

  if (!apiUrl) {
    throw new Error('Voice API not configured');
  }

  // TODO: Implementar chamada real à API de transcrição
  // Por enquanto, retorna erro
  throw new Error('Voice transcription not yet implemented');

  // Exemplo de implementação futura:
  /*
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_VOICE_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Transcription failed');
  }

  const data = await response.json();
  
  return {
    text: data.text,
    confidence: data.confidence,
  };
  */
}

/**
 * Extrai intenção do texto transcrito
 * Usa LLM para entender o comando e extrair dados estruturados
 */
export async function parseIntent(
  text: string,
  userLists: string[]
): Promise<VoiceIntentResult> {
  const llmUrl = process.env.EXPO_PUBLIC_LLM_API_URL;

  if (!llmUrl) {
    throw new Error('LLM API not configured');
  }

  // TODO: Implementar chamada real ao LLM
  // Por enquanto, retorna erro
  throw new Error('Intent parsing not yet implemented');

  // Exemplo de implementação futura:
  /*
  const response = await fetch(llmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_LLM_API_KEY}`,
    },
    body: JSON.stringify({
      text,
      userLists,
      schema: {
        action: ['add_item', 'mark_purchased', 'create_list', 'unknown'],
        itemName: 'string',
        listName: 'string',
        quantity: 'number',
        unit: 'string',
        notes: 'string',
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Intent parsing failed');
  }

  return await response.json();
  */
}

/**
 * Workflow completo de voz: gravar → transcrever → entender → executar
 * Usado quando o usuário segura o microfone
 */
export async function processVoiceCommand(
  audioBlob: Blob,
  userLists: string[]
): Promise<VoiceIntentResult> {
  // 1. Transcrever áudio
  const transcription = await transcribeAudio(audioBlob);

  // 2. Extrair intenção
  const intent = await parseIntent(transcription.text, userLists);

  return intent;
}

/**
 * Mensagem para quando voz não está disponível (offline)
 */
export function getOfflineVoiceMessage(): string {
  return 'A voz volta quando você se conectar. Quer digitar?';
}
