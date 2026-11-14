# Listou

**Listou** é um aplicativo de listas de compras offline-first que organiza itens do dia a dia, metas de economia e ideias para comprar depois, tudo em um único lugar.

## 📋 Funcionalidades do MVP

✅ **Autenticação**
- Email e senha via Supabase Auth
- Sem confirmação de email (para facilitar testes)

✅ **Listas compartilháveis**
- Criar e gerenciar listas
- Moeda obrigatória (padrão: Real BRL)
- Compartilhar por link ou QR code
- Convites com validade de 7 dias e vários usos
- Papéis: Owner, Admin, Editor, Viewer

✅ **Itens inteligentes**
- 4 tipos: Mercado/Dia a dia, Mais tarde, Longo prazo, Meta
- Categorização automática (dicionário offline + correções do usuário)
- Quantidade opcional
- Agrupamento e filtro por categoria
- Recorrência simples

✅ **Mais tarde**
- Bloco pessoal para guardar ideias
- Um por pessoa, não compartilhado
- Itens podem virar metas ou ir para listas

✅ **Metas**
- Acompanhar economia para compras caras
- Aportes manuais (sem integração bancária)
- Dono pode conceder Admin para editar meta
- Barra de progresso e previsão
- Último preço visto (opcional)

✅ **Offline-first**
- SQLite local sincronizado com Supabase via PowerSync
- Funciona sem internet para listas e metas
- Voz requer conexão (fallback para digitação)

✅ **Multiplataforma**
- Android, iOS e Web do mesmo código
- React Native + Expo + Expo Router

## 🚀 Configuração

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase
- Conta no PowerSync (opcional para sync offline)
- Expo CLI (instalado automaticamente)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute as migrations em `supabase/migrations/` no SQL Editor do Supabase
3. Copie a URL do projeto e a chave anônima

### 3. Configurar PowerSync

1. Crie uma conta no [PowerSync](https://powersync.com)
2. Configure a conexão com seu Supabase
3. Copie a URL do PowerSync

### 4. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui

# PowerSync Configuration
EXPO_PUBLIC_POWERSYNC_URL=https://seu-projeto.powersync.com

# Voice Features (opcional no MVP)
EXPO_PUBLIC_VOICE_ENABLED=false
```

### 5. Rodar o app

#### Web (mais fácil para testar)

```bash
npm run web
```

#### Android

```bash
npm run android
```

Requer Android Studio e um emulador ou dispositivo conectado.

#### iOS

```bash
npm run ios
```

Requer macOS e Xcode.

#### Expo Go (celular físico)

```bash
npm start
```

Escaneie o QR code com o app Expo Go:
- [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
- [iOS](https://apps.apple.com/app/expo-go/id982107779)

## 🗂️ Estrutura do Projeto

```
/
├── app/                          # Rotas (Expo Router)
│   ├── (auth)/
│   │   └── login.tsx            # Login e cadastro
│   ├── (main)/
│   │   ├── index.tsx            # Home (listas, mais tarde, metas)
│   │   ├── later.tsx            # Mais tarde
│   │   ├── lists/
│   │   │   ├── [id].tsx         # Detalhe da lista
│   │   │   └── new.tsx          # Nova lista
│   │   └── goals/
│   │       └── [id].tsx         # Detalhe da meta
│   └── invite/
│       └── [token].tsx          # Aceitar convite
├── src/
│   ├── features/                # Lógica de negócio
│   │   ├── auth/               # Autenticação
│   │   ├── categories/         # Categorização
│   │   ├── items/              # Itens
│   │   ├── lists/              # Listas
│   │   ├── goals/              # Metas
│   │   ├── share/              # Convites
│   │   ├── sync/               # Sincronização
│   │   └── voice/              # Voz (stub no MVP)
│   ├── lib/                    # Configurações
│   │   ├── supabase.ts         # Cliente Supabase
│   │   ├── powersync.ts        # Cliente PowerSync
│   │   ├── powersync-schema.ts # Schema do PowerSync
│   │   └── powersync-connector.ts # Connector Supabase
│   ├── hooks/                  # React hooks
│   ├── components/             # Componentes reutilizáveis
│   ├── types/                  # Tipos TypeScript
│   └── utils/                  # Utilitários
├── supabase/
│   ├── migrations/             # Migrations SQL
│   └── functions/              # Edge Functions
├── assets/
│   └── dictionaries/
│       └── categories-pt-BR.json # Dicionário de categorias
└── README.md                   # Este arquivo
```

## 🧪 Testes

```bash
# Rodar testes (quando implementados)
npm test

# Rodar testes em watch mode
npm run test:watch
```

## 📱 Uso do App

### Primeiro acesso

1. Crie uma conta com email e senha
2. A tela inicial mostra suas listas, o bloco "Mais tarde" e suas metas

### Criar uma lista

1. Toque no botão `+` no canto inferior direito
2. Digite o nome (obrigatório)
3. Escolha a moeda (padrão: Real BRL)
4. Toque em "Criar lista"

### Adicionar itens

1. Abra uma lista
2. Digite o nome do item no campo inferior
3. Com internet, segure o microfone para usar voz
4. Sem internet, o microfone oferece digitar

A categoria é sugerida automaticamente.

### Compartilhar lista

1. Abra uma lista
2. Toque no ícone de compartilhar
3. Escolha "Link" ou "QR code"
4. Defina o papel (Editor ou Viewer)
5. Compartilhe o link ou mostre o QR

O dono pode promover membros a Admin depois.

### Criar meta

1. Crie um item ou use um do "Mais tarde"
2. Mude o tipo para "Meta"
3. Defina o valor alvo
4. Registre aportes tocando em "Guardei"

Apenas o dono e admins podem editar metas.

## 🗺️ Roadmap

### MVP (atual)
- ✅ Listas e itens offline
- ✅ Categorização automática
- ✅ Metas com aportes manuais
- ✅ Compartilhamento por link/QR
- ✅ Mais tarde pessoal
- 🚧 Voz online-only (stub)

### v2 (próxima)
- Fila de gravação offline (se necessário)
- Alertas de queda de preço
- Relatório de gastos
- Notificações remotas
- Login com Google e Apple
- Confirmação de email

### v3 (futuro)
- Sugestões de itens acabando
- Visão familiar de aportes
- Open Finance Brasil (pesquisa)

## 🛠️ Tecnologias

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase](https://supabase.com/) (Auth + Postgres + RLS)
- [PowerSync](https://powersync.com/) (Offline sync)
- [TypeScript](https://www.typescriptlang.org/)
- SQLite (local)

## 📄 Licença

Este projeto é privado e não possui licença open source.

## 👤 Autor

Neto

---

**Nota**: Este é um MVP. A voz funciona apenas online no momento; offline, o microfone oferece digitar. Não há integração bancária — aportes em metas são manuais.
