# Sistema de Gerenciamento de Técnicos para Chatbot

Este projeto fornece uma API e interface web para gerenciar técnicos autorizados a usar um chatbot.

## Funcionalidades

- ✅ CRUD completo de técnicos (Criar, Ler, Atualizar, Deletar)
- ✅ Endpoint para verificar se técnico está autorizado (retorna 200 ou 205)
- ✅ Interface web moderna para gerenciamento
- ✅ Banco de dados SQLite integrado
- ✅ Sistema de roles
- ✅ Pronto para deploy na Vercel

## Estrutura do Projeto

```
├── server.js              # Servidor Node.js/Express
├── database.sql           # Script SQL para criar tabelas
├── package.json           # Dependências do backend
├── vercel.json           # Configuração para Vercel
├── frontend/             # Aplicação React
│   ├── src/
│   │   ├── App.js        # Componente principal
│   │   ├── index.js      # Ponto de entrada
│   │   └── index.css     # Estilos
│   └── package.json      # Dependências do frontend
└── README.md
```

## Endpoints da API

### Verificar Técnico (para o chatbot)
```
GET /api/verificar-tecnico/:telefone
```
- **200**: Técnico autorizado
- **205**: Técnico não autorizado

### CRUD de Técnicos
```
GET    /api/tecnicos          # Listar todos
GET    /api/tecnicos/:id      # Buscar por ID
POST   /api/tecnicos          # Criar novo
PUT    /api/tecnicos/:id      # Atualizar
DELETE /api/tecnicos/:id      # Deletar
```

### Roles
```
GET    /api/roles             # Listar roles disponíveis (hardcoded)
```

## Configuração do Supabase

1. **Criar projeto no Supabase:**
   - Acesse [supabase.com](https://supabase.com)
   - Crie um novo projeto
   - Anote a URL de conexão do banco

2. **Executar script SQL:**
   - No painel do Supabase, vá em "SQL Editor"
   - Execute o conteúdo do arquivo `database.sql`
   - Isso criará as tabelas e dados iniciais

3. **Configurar variáveis de ambiente:**
   - Copie `env.example` para `.env`
   - Configure a `DATABASE_URL` com sua conexão do Supabase
   - Configure `SUPABASE_URL` e `SUPABASE_ANON_KEY` do seu projeto
   - Configure `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY` para o frontend

## Instalação e Execução Local

1. **Instalar dependências do backend:**
```bash
npm install
```

2. **Instalar dependências do frontend:**
```bash
cd frontend
npm install
cd ..
```

3. **Configurar variáveis de ambiente:**
```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Executar o servidor:**
```bash
npm start
```

5. **Executar o frontend (em outro terminal):**
```bash
cd frontend
npm start
```

## Deploy na Vercel

1. **Instalar Vercel CLI:**
```bash
npm i -g vercel
```

2. **Fazer login:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel
```

4. **Configurar variáveis de ambiente:**
```bash
vercel env add DATABASE_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add NODE_ENV
vercel env add REACT_APP_API_URL
vercel env add REACT_APP_SUPABASE_URL
vercel env add REACT_APP_SUPABASE_ANON_KEY
```

## Uso do Sistema

### Para o Chatbot
O chatbot deve fazer uma requisição GET para:
```
https://seu-dominio.vercel.app/api/verificar-tecnico/11999999999
```

**Resposta 200 (Autorizado):**
```json
{
  "autorizado": true,
  "tecnico": {
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "message": "✅ Acesso liberado! Olá João Silva, você está autorizado a usar o chatbot.",
  "status": 200
}
```

**Resposta 205 (Não Autorizado):**
```json
{
  "autorizado": false,
  "message": "❌ Acesso negado! Seu número não está cadastrado ou está inativo no sistema. Entre em contato com o administrador.",
  "status": 205
}
```

**Resposta 500 (Erro do Servidor):**
```json
{
  "error": "Erro interno do servidor",
  "message": "⚠️ Erro temporário no sistema. Tente novamente em alguns instantes.",
  "status": 500
}
```

### Interface Web
Acesse a interface web para gerenciar técnicos:
- **Login obrigatório** com Supabase Auth
- Adicionar novos técnicos
- Editar informações existentes
- Ativar/desativar técnicos
- Deletar técnicos
- Verificar autorização por telefone

**Nota:** É necessário criar usuários no painel do Supabase (Authentication → Users) para acessar a interface.

## Banco de Dados

O sistema usa PostgreSQL (Supabase) com as seguintes tabelas:

### Técnicos
- `id`: ID único
- `nome`: Nome do técnico
- `telefone`: Número de telefone (único)
- `ativo`: Status ativo/inativo
- `data_criacao`: Data de criação
- `data_atualizacao`: Data da última atualização

### Configuração de Acesso
- A chave de acesso (`anonkey`) é gerenciada via variável de ambiente `CHATBOT_ANON_KEY`
- Todos os técnicos ativos têm acesso ao chatbot
- Sistema simplificado sem roles específicas

## Tecnologias Utilizadas

- **Backend**: Node.js, Express, PostgreSQL
- **Banco de Dados**: Supabase (PostgreSQL)
- **Frontend**: React, Axios
- **Deploy**: Vercel
- **Estilo**: CSS puro com design responsivo
