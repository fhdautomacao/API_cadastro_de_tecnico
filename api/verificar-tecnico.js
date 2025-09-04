const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configurar conexão com PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

module.exports = app;
