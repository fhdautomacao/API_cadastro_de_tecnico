-- Script SQL para criar tabelas do sistema de técnicos (PostgreSQL/Supabase)

-- Remover tabela roles se existir
DROP TABLE IF EXISTS roles CASCADE;

-- Criar tabela de técnicos
CREATE TABLE IF NOT EXISTS tecnicos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS (Row Level Security) na tabela tecnicos
ALTER TABLE tecnicos ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para permitir acesso público (para o chatbot)
CREATE POLICY "Permitir acesso público para verificação" ON tecnicos
    FOR SELECT USING (true);

-- Criar política RLS para permitir CRUD apenas com autenticação
CREATE POLICY "Permitir CRUD com autenticação" ON tecnicos
    FOR ALL USING (auth.role() = 'authenticated');

-- Inserir alguns técnicos de exemplo
INSERT INTO tecnicos (nome, telefone) VALUES 
('João Silva', '11999999999'),
('Maria Santos', '11888888888'),
('Pedro Oliveira', '11777777777')
ON CONFLICT (telefone) DO NOTHING;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tecnicos_telefone ON tecnicos(telefone);
CREATE INDEX IF NOT EXISTS idx_tecnicos_ativo ON tecnicos(ativo);

-- Criar trigger para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tecnicos_updated_at 
    BEFORE UPDATE ON tecnicos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sistema simplificado: apenas técnicos ativos/inativos
-- A anonkey é gerenciada via variável de ambiente CHATBOT_ANON_KEY
