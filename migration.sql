-- Script para recriar completamente o banco de dados
-- Execute este script para limpar e recriar tudo do zero

-- Dropar todas as tabelas e dependências
DROP TABLE IF EXISTS tecnicos CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Dropar funções se existirem
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Criar tabela de técnicos do zero
CREATE TABLE tecnicos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar RLS (Row Level Security) na tabela tecnicos
ALTER TABLE tecnicos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Permitir acesso público para verificação" ON tecnicos
    FOR SELECT USING (true);

CREATE POLICY "Permitir CRUD com autenticação" ON tecnicos
    FOR ALL USING (auth.role() = 'authenticated');

-- Criar índices para melhor performance
CREATE INDEX idx_tecnicos_telefone ON tecnicos(telefone);
CREATE INDEX idx_tecnicos_ativo ON tecnicos(ativo);

-- Criar função para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar data_atualizacao automaticamente
CREATE TRIGGER update_tecnicos_updated_at 
    BEFORE UPDATE ON tecnicos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir técnicos de exemplo
INSERT INTO tecnicos (nome, telefone) VALUES 
('João Silva', '11999999999'),
('Maria Santos', '11888888888'),
('Pedro Oliveira', '11777777777');
