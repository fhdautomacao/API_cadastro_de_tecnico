const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configurar headers de segurança
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Configurar conexão com PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configurar cliente Supabase para autenticação
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Inicializar banco de dados (executar script SQL manualmente no Supabase)
// As tabelas devem ser criadas usando o script database.sql no painel do Supabase

// Endpoint para verificar se técnico pode usar chatbot
app.get('/api/verificar-tecnico/:telefone', async (req, res) => {
  const { telefone } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM tecnicos WHERE telefone = $1 AND ativo = true',
      [telefone]
    );
    
    if (result.rows.length > 0) {
      const tecnico = result.rows[0];
      res.status(200).json({ 
        autorizado: true, 
        tecnico: { 
          nome: tecnico.nome, 
          telefone: tecnico.telefone
        },
        message: `✅ Acesso liberado! Olá ${tecnico.nome}, você está autorizado a usar o chatbot.`,
        status: 200
      });
    } else {
      res.status(205).json({ 
        autorizado: false, 
        message: '❌ Acesso negado! Seu número não está cadastrado ou está inativo no sistema. Entre em contato com o administrador.',
        status: 205
      });
    }
  } catch (err) {
    console.error('Erro ao verificar técnico:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: '⚠️ Erro temporário no sistema. Tente novamente em alguns instantes.',
      status: 500
    });
  }
});

// CRUD de técnicos (protegido com autenticação)
// Listar todos os técnicos
app.get('/api/tecnicos', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tecnicos ORDER BY data_criacao DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar técnicos:', err);
    res.status(500).json({ error: 'Erro ao buscar técnicos' });
  }
});

// Buscar técnico por ID
app.get('/api/tecnicos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM tecnicos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Técnico não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar técnico:', err);
    res.status(500).json({ error: 'Erro ao buscar técnico' });
  }
});

// Criar novo técnico
app.post('/api/tecnicos', authenticateToken, async (req, res) => {
  const { nome, telefone } = req.body;
  
  if (!nome || !telefone) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO tecnicos (nome, telefone) VALUES ($1, $2) RETURNING *',
      [nome, telefone]
    );
    
    res.status(201).json({ 
      ...result.rows[0], 
      message: 'Técnico criado com sucesso' 
    });
  } catch (err) {
    console.error('Erro ao criar técnico:', err);
    if (err.code === '23505') { // Unique violation
      if (err.constraint === 'tecnicos_telefone_key') {
        return res.status(409).json({ error: 'Telefone já cadastrado' });
      }
    }
    res.status(500).json({ error: 'Erro ao criar técnico' });
  }
});

// Atualizar técnico
app.put('/api/tecnicos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, ativo } = req.body;
  
  if (!nome || !telefone) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE tecnicos SET nome = $1, telefone = $2, ativo = $3 WHERE id = $4 RETURNING *',
      [nome, telefone, ativo !== undefined ? ativo : true, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Técnico não encontrado' });
    }
    
    res.json({ message: 'Técnico atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar técnico:', err);
    if (err.code === '23505') { // Unique violation
      if (err.constraint === 'tecnicos_telefone_key') {
        return res.status(409).json({ error: 'Telefone já cadastrado' });
      }
    }
    res.status(500).json({ error: 'Erro ao atualizar técnico' });
  }
});

// Deletar técnico
app.delete('/api/tecnicos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM tecnicos WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Técnico não encontrado' });
    }
    
    res.json({ message: 'Técnico deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar técnico:', err);
    res.status(500).json({ error: 'Erro ao deletar técnico' });
  }
});

// Endpoint para listar roles disponíveis (hardcoded)
app.get('/api/roles', (req, res) => {
  const roles = [
    { nome: 'admin', descricao: 'Administrador do sistema - acesso total' },
    { nome: 'tecnico', descricao: 'Técnico autorizado - acesso ao chatbot' },
    { nome: 'supervisor', descricao: 'Supervisor de técnicos - pode gerenciar técnicos' }
  ];
  res.json(roles);
});

// Endpoints de autenticação
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    res.json({
      user: data.user,
      session: data.session,
      message: 'Login realizado com sucesso'
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (err) {
    console.error('Erro no logout:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// A Vercel serve os arquivos estáticos do frontend

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Conexão com banco de dados fechada.');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao fechar conexão:', err);
    process.exit(1);
  }
});
