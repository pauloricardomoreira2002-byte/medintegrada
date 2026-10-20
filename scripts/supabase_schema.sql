-- =====================================================================
-- MEDINTEGRADA - ESQUEMA DE BANCO DE DADOS POSTGRESQL (SUPABASE)
-- Plataforma Médica UCT20: Autenticação, Simulados, Resumos e Métricas
-- =====================================================================

-- 1. Desabilitar restrições antigas se existirem para permitir atualização limpa
DROP TABLE IF EXISTS public.question_answers CASCADE;
DROP TABLE IF EXISTS public.exam_progress CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.shared_exams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP VIEW IF EXISTS public.admin_student_rankings CASCADE;

-- =====================================================================
-- 2. TABELA DE PERFIS DE USUÁRIOS (Admin e Estudantes)
-- Armazena nome, login, senha e status de ativação
-- =====================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 3. TABELA DE PROGRESSO GERAL DO SIMULADO (Por Usuário e Prova)
-- =====================================================================
CREATE TABLE public.exam_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL REFERENCES public.profiles(username) ON UPDATE CASCADE ON DELETE CASCADE,
    exam_id TEXT NOT NULL,
    folder TEXT NOT NULL DEFAULT 'UCT20 CAB' CHECK (folder IN ('UCT20 CAB', 'UCT20 Tutoria')),
    current_index INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    total_answered INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (username, exam_id)
);

-- =====================================================================
-- 4. TABELA DE RESPOSTAS DETALHADAS DAS QUESTÕES
-- Armazena gabarito marcado, acerto, alternativas riscadas e grifos
-- =====================================================================
CREATE TABLE public.question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL REFERENCES public.profiles(username) ON UPDATE CASCADE ON DELETE CASCADE,
    exam_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_option CHAR(1),
    is_correct BOOLEAN NOT NULL DEFAULT false,
    confirmed BOOLEAN NOT NULL DEFAULT false,
    strikes TEXT[] DEFAULT '{}',
    highlights TEXT,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (username, exam_id, question_id)
);

-- =====================================================================
-- 5. TABELA DE PREFERÊNCIAS INDIVIDUAIS DE ESTUDO
-- (Tema, tamanho de fonte no leitor e cor de grifo ativa)
-- =====================================================================
CREATE TABLE public.user_preferences (
    username TEXT PRIMARY KEY REFERENCES public.profiles(username) ON UPDATE CASCADE ON DELETE CASCADE,
    highlighter_enabled BOOLEAN NOT NULL DEFAULT true,
    highlighter_color TEXT NOT NULL DEFAULT 'yellow' CHECK (highlighter_color IN ('yellow', 'green')),
    theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
    font_scale NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 6. TABELA DE SIMULADOS COMPARTILHADOS (BANCO DE PROVAS NA NUVEM)
-- Permite que novas provas importadas fiquem disponíveis para a turma
-- =====================================================================
CREATE TABLE public.shared_exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    badge TEXT NOT NULL DEFAULT 'ENAMED / Residência Médica',
    theme TEXT NOT NULL DEFAULT 'Clínica Médica',
    folder TEXT NOT NULL DEFAULT 'UCT20 CAB' CHECK (folder IN ('UCT20 CAB', 'UCT20 Tutoria')),
    questions JSONB NOT NULL,
    created_by TEXT REFERENCES public.profiles(username) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- 7. VIEW DE ESTATÍSTICAS PEDAGÓGICAS PARA O ADMINISTRADOR (DR. PAULO)
-- =====================================================================
CREATE OR REPLACE VIEW public.admin_student_rankings AS
SELECT 
    p.id AS user_id,
    p.name AS student_name,
    p.username,
    ep.exam_id,
    ep.folder,
    ep.total_answered,
    ep.score,
    ROUND((ep.score::numeric / NULLIF(ep.total_answered, 0)) * 100, 1) AS accuracy_percentage,
    ep.updated_at AS last_activity
FROM public.profiles p
JOIN public.exam_progress ep ON p.username = ep.username
ORDER BY accuracy_percentage DESC;

-- =====================================================================
-- 8. CONTAS PADRÃO DE FÁBRICA (Admin e Aluno de Demonstração)
-- =====================================================================
INSERT INTO public.profiles (name, username, password, role, active)
VALUES 
    ('Dr. Paulo (Administrador)', 'admin', 'admin123', 'admin', true),
    ('Estudante UCT20', 'aluno', 'aluno123', 'student', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.user_preferences (username, highlighter_enabled, highlighter_color, theme)
VALUES 
    ('admin', true, 'yellow', 'dark'),
    ('aluno', true, 'yellow', 'dark')
ON CONFLICT (username) DO NOTHING;

-- =====================================================================
-- 9. PERMISSÕES COMPLETAS E HABILITAÇÃO DO POSTGREST
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_exams ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para API Pública (Anon & Authenticated)
CREATE POLICY "Permitir leitura de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de perfis" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de perfis" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de perfis" ON public.profiles FOR DELETE USING (true);

CREATE POLICY "Permitir acesso ao progresso" ON public.exam_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso as respostas" ON public.question_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso as preferencias" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso aos simulados" ON public.shared_exams FOR ALL USING (true) WITH CHECK (true);

-- Concessão de privilégios para PostgREST
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Recarregar cache de esquema do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';
