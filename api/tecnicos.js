const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();

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

module.exports = app;
