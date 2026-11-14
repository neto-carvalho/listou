-- Migration: Initial Schema para Listou
-- Todas as tabelas com Row Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Qualquer usuário autenticado pode ver perfis
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- RLS: Usuário só pode atualizar seu próprio perfil
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- RLS: Perfil é criado automaticamente via trigger
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- LISTS
-- ============================================================================
CREATE TABLE public.lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    currency TEXT NOT NULL DEFAULT 'BRL',
    is_inbox BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT lists_currency_check CHECK (currency IN ('BRL', 'USD', 'EUR'))
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- RLS: Usuário vê suas listas ou listas que é membro
CREATE POLICY "lists_select_own_or_member"
    ON public.lists FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.list_members
                WHERE list_id = lists.id
                AND user_id = auth.uid()
                AND deleted_at IS NULL
            )
        )
    );

-- RLS: Usuário pode criar suas próprias listas
CREATE POLICY "lists_insert_own"
    ON public.lists FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- RLS: Apenas o dono pode atualizar a lista
CREATE POLICY "lists_update_owner"
    ON public.lists FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (owner_id = auth.uid());

-- RLS: Apenas o dono pode deletar (soft delete)
CREATE POLICY "lists_delete_owner"
    ON public.lists FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- ============================================================================
-- LIST_MEMBERS
-- ============================================================================
CREATE TABLE public.list_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT list_members_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    CONSTRAINT list_members_unique UNIQUE (list_id, user_id)
);

ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;

-- RLS: Membros da lista podem ver outros membros
CREATE POLICY "list_members_select_members"
    ON public.list_members FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.lists
                WHERE id = list_members.list_id
                AND owner_id = auth.uid()
            )
        )
    );

-- RLS: Sistema insere ao aceitar convite
CREATE POLICY "list_members_insert_system"
    ON public.list_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- RLS: Apenas o dono pode atualizar roles
CREATE POLICY "list_members_update_owner"
    ON public.list_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE id = list_members.list_id
            AND owner_id = auth.uid()
        )
    );

-- ============================================================================
-- INVITES
-- ============================================================================
CREATE TABLE public.invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor',
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INTEGER,
    use_count INTEGER NOT NULL DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT invites_role_check CHECK (role IN ('editor', 'viewer'))
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS: Apenas o dono vê convites
CREATE POLICY "invites_select_owner"
    ON public.invites FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE id = invites.list_id
            AND owner_id = auth.uid()
        )
    );

-- RLS: Apenas o dono pode criar convites
CREATE POLICY "invites_insert_owner"
    ON public.invites FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE id = list_id
            AND owner_id = auth.uid()
        )
    );

-- RLS: Apenas o dono pode revogar
CREATE POLICY "invites_update_owner"
    ON public.invites FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE id = invites.list_id
            AND owner_id = auth.uid()
        )
    );

-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS: Todos podem ler categorias
CREATE POLICY "categories_select_all"
    ON public.categories FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Seed de categorias padrão
INSERT INTO public.categories (slug, name, is_system) VALUES
    ('alimentos', 'Alimentos', true),
    ('bebidas', 'Bebidas', true),
    ('limpeza', 'Limpeza', true),
    ('higiene', 'Higiene e Beleza', true),
    ('utensilios', 'Utensílios', true),
    ('eletronicos', 'Eletrônicos', true),
    ('vestuario', 'Vestuário', true),
    ('outros', 'Outros', true);

-- ============================================================================
-- ITEMS
-- ============================================================================
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    url TEXT,
    kind TEXT NOT NULL DEFAULT 'daily',
    status TEXT NOT NULL DEFAULT 'open',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    quantity NUMERIC,
    unit TEXT,
    estimated_price NUMERIC,
    priority TEXT NOT NULL DEFAULT 'medium',
    target_date DATE,
    purchased_at TIMESTAMPTZ,
    purchased_price NUMERIC,
    recurrence_id UUID,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    field_clocks JSONB DEFAULT '{}',
    
    CONSTRAINT items_kind_check CHECK (kind IN ('daily', 'later', 'planned', 'goal')),
    CONSTRAINT items_status_check CHECK (status IN ('open', 'purchased', 'cancelled')),
    CONSTRAINT items_priority_check CHECK (priority IN ('low', 'medium', 'high'))
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- RLS: Usuário vê itens de suas listas
CREATE POLICY "items_select_member"
    ON public.items FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM public.lists
            WHERE id = items.list_id
            AND deleted_at IS NULL
            AND (
                owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.list_members
                    WHERE list_id = lists.id
                    AND user_id = auth.uid()
                    AND deleted_at IS NULL
                )
            )
        )
    );

-- RLS: Editor ou superior pode inserir
CREATE POLICY "items_insert_editor"
    ON public.items FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.lists l
            LEFT JOIN public.list_members lm ON lm.list_id = l.id AND lm.user_id = auth.uid()
            WHERE l.id = list_id
            AND (
                l.owner_id = auth.uid() OR
                (lm.role IN ('admin', 'editor') AND lm.deleted_at IS NULL)
            )
        )
    );

-- RLS: Editor ou superior pode atualizar
CREATE POLICY "items_update_editor"
    ON public.items FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lists l
            LEFT JOIN public.list_members lm ON lm.list_id = l.id AND lm.user_id = auth.uid()
            WHERE l.id = items.list_id
            AND (
                l.owner_id = auth.uid() OR
                (lm.role IN ('admin', 'editor') AND lm.deleted_at IS NULL)
            )
        )
    );

-- ============================================================================
-- RECURRENCES
-- ============================================================================
CREATE TABLE public.recurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE UNIQUE,
    frequency TEXT NOT NULL,
    interval INTEGER,
    weekday INTEGER,
    next_due_at DATE NOT NULL,
    last_completed_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT recurrences_frequency_check CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'custom')),
    CONSTRAINT recurrences_weekday_check CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6))
);

ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;

-- RLS: Mesmas permissões dos items
CREATE POLICY "recurrences_select_member"
    ON public.recurrences FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            JOIN public.lists l ON l.id = i.list_id
            WHERE i.id = recurrences.item_id
            AND l.deleted_at IS NULL
            AND (
                l.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.list_members lm
                    WHERE lm.list_id = l.id
                    AND lm.user_id = auth.uid()
                    AND lm.deleted_at IS NULL
                )
            )
        )
    );

-- ============================================================================
-- GOALS
-- ============================================================================
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE UNIQUE,
    target_amount NUMERIC NOT NULL,
    monthly_contribution NUMERIC,
    target_date DATE,
    reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    reminder_day INTEGER,
    track_price BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT goals_reminder_day_check CHECK (reminder_day IS NULL OR (reminder_day >= 1 AND reminder_day <= 28))
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS: Membros podem ver
CREATE POLICY "goals_select_member"
    ON public.goals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            JOIN public.lists l ON l.id = i.list_id
            WHERE i.id = goals.item_id
            AND (
                l.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.list_members lm
                    WHERE lm.list_id = l.id
                    AND lm.user_id = auth.uid()
                    AND lm.deleted_at IS NULL
                )
            )
        )
    );

-- RLS: Apenas owner e admin podem editar configurações da meta
CREATE POLICY "goals_update_owner_admin"
    ON public.goals FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            JOIN public.lists l ON l.id = i.list_id
            LEFT JOIN public.list_members lm ON lm.list_id = l.id AND lm.user_id = auth.uid()
            WHERE i.id = goals.item_id
            AND (
                l.owner_id = auth.uid() OR
                (lm.role = 'admin' AND lm.deleted_at IS NULL)
            )
        )
    );

-- ============================================================================
-- GOAL_CONTRIBUTIONS
-- ============================================================================
CREATE TABLE public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    note TEXT,
    contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS: Membros podem ver aportes
CREATE POLICY "goal_contributions_select_member"
    ON public.goal_contributions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            JOIN public.items i ON i.id = g.item_id
            JOIN public.lists l ON l.id = i.list_id
            WHERE g.id = goal_contributions.goal_id
            AND (
                l.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.list_members lm
                    WHERE lm.list_id = l.id
                    AND lm.user_id = auth.uid()
                    AND lm.deleted_at IS NULL
                )
            )
        )
    );

-- RLS: Apenas owner e admin podem registrar aportes
CREATE POLICY "goal_contributions_insert_owner_admin"
    ON public.goal_contributions FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.goals g
            JOIN public.items i ON i.id = g.item_id
            JOIN public.lists l ON l.id = i.list_id
            LEFT JOIN public.list_members lm ON lm.list_id = l.id AND lm.user_id = auth.uid()
            WHERE g.id = goal_id
            AND (
                l.owner_id = auth.uid() OR
                (lm.role = 'admin' AND lm.deleted_at IS NULL)
            )
        )
    );

-- ============================================================================
-- PRICE_HISTORY
-- ============================================================================
CREATE TABLE public.price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    source TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT price_history_source_check CHECK (source IN ('manual', 'purchase'))
);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS: Membros podem ver histórico
CREATE POLICY "price_history_select_member"
    ON public.price_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            JOIN public.lists l ON l.id = i.list_id
            WHERE i.id = price_history.item_id
            AND (
                l.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.list_members lm
                    WHERE lm.list_id = l.id
                    AND lm.user_id = auth.uid()
                    AND lm.deleted_at IS NULL
                )
            )
        )
    );

-- ============================================================================
-- CATEGORY_MAPPINGS
-- ============================================================================
CREATE TABLE public.category_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    normalized_name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'dictionary',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT category_mappings_source_check CHECK (source IN ('dictionary', 'user', 'llm')),
    CONSTRAINT category_mappings_unique UNIQUE (user_id, normalized_name)
);

ALTER TABLE public.category_mappings ENABLE ROW LEVEL SECURITY;

-- RLS: Usuário vê seus próprios mappings
CREATE POLICY "category_mappings_select_own"
    ON public.category_mappings FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "category_mappings_insert_own"
    ON public.category_mappings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "category_mappings_update_own"
    ON public.category_mappings FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER lists_updated_at BEFORE UPDATE ON public.lists
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER list_members_updated_at BEFORE UPDATE ON public.list_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER invites_updated_at BEFORE UPDATE ON public.invites
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER items_updated_at BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER recurrences_updated_at BEFORE UPDATE ON public.recurrences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER goal_contributions_updated_at BEFORE UPDATE ON public.goal_contributions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER category_mappings_updated_at BEFORE UPDATE ON public.category_mappings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX idx_lists_owner_id ON public.lists(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lists_is_inbox ON public.lists(owner_id, is_inbox) WHERE deleted_at IS NULL AND is_inbox = true;

CREATE INDEX idx_list_members_list_id ON public.list_members(list_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_list_members_user_id ON public.list_members(user_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_items_list_id ON public.items(list_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_kind ON public.items(kind) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_status ON public.items(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_category_id ON public.items(category_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_invites_token_hash ON public.invites(token_hash) WHERE revoked_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_invites_list_id ON public.invites(list_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_goal_contributions_goal_id ON public.goal_contributions(goal_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_price_history_item_id ON public.price_history(item_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_category_mappings_user_normalized ON public.category_mappings(user_id, normalized_name) WHERE deleted_at IS NULL;
