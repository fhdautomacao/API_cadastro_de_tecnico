const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

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
const authenticateToken = async (token) => {
  if (!token) {
    return { error: 'Token de acesso requerido', status: 401 };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { error: 'Token inválido', status: 403 };
    }

    return { user };
  } catch (err) {
    return { error: 'Token inválido', status: 403 };
  }
};

// Função principal da API
module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Configurar headers de segurança
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, url } = req;
  const path = url.replace('/api', '');

  try {
    // Verificar técnico (público)
    if (method === 'GET' && path.startsWith('/verificar-tecnico/')) {
      const telefone = path.split('/')[2];
      
      const result = await pool.query(
        'SELECT * FROM tecnicos WHERE telefone = $1 AND ativo = true',
        [telefone]
      );
      
      if (result.rows.length > 0) {
        const tecnico = result.rows[0];
        return res.status(200).json({ 
          autorizado: true, 
          tecnico: { 
            nome: tecnico.nome, 
            telefone: tecnico.telefone
          },
          message: `✅ Acesso liberado! Olá ${tecnico.nome}, você está autorizado a usar o chatbot.`,
          status: 200
        });
      } else {
        return res.status(205).json({ 
          autorizado: false, 
          message: '❌ Acesso negado! Seu número não está cadastrado ou está inativo no sistema. Entre em contato com o administrador.',
          status: 205
        });
      }
    }

    // Autenticação (público)
    if (method === 'POST' && path === '/auth/login') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      
      return res.json({
        user: data.user,
        session: data.session,
        message: 'Login realizado com sucesso'
      });
    }

    if (method === 'POST' && path === '/auth/logout') {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return res.status(500).json({ error: 'Erro ao fazer logout' });
      }
      
      return res.json({ message: 'Logout realizado com sucesso' });
    }

    // Rotas protegidas - verificar autenticação
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const auth = await authenticateToken(token);
    
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (method === 'GET' && path === '/auth/me') {
      return res.json({ user: auth.user });
    }

    // CRUD de técnicos
    if (path === '/tecnicos') {
      if (method === 'GET') {
        const result = await pool.query('SELECT * FROM tecnicos ORDER BY data_criacao DESC');
        return res.json(result.rows);
      }
      
      if (method === 'POST') {
        const { nome, telefone } = req.body;
        
        if (!nome || !telefone) {
          return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
        }
        
        const result = await pool.query(
          'INSERT INTO tecnicos (nome, telefone) VALUES ($1, $2) RETURNING *',
          [nome, telefone]
        );
        
        return res.status(201).json({ 
          ...result.rows[0], 
          message: 'Técnico criado com sucesso' 
        });
      }
    }

    if (path.startsWith('/tecnicos/')) {
      const id = path.split('/')[2];
      
      if (method === 'GET') {
        const result = await pool.query('SELECT * FROM tecnicos WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Técnico não encontrado' });
        }
        
        return res.json(result.rows[0]);
      }
      
      if (method === 'PUT') {
        const { nome, telefone, ativo } = req.body;
        
        if (!nome || !telefone) {
          return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
        }
        
        const result = await pool.query(
          'UPDATE tecnicos SET nome = $1, telefone = $2, ativo = $3 WHERE id = $4 RETURNING *',
          [nome, telefone, ativo !== undefined ? ativo : true, id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Técnico não encontrado' });
        }
        
        return res.json({ message: 'Técnico atualizado com sucesso' });
      }
      
      if (method === 'DELETE') {
        const result = await pool.query('DELETE FROM tecnicos WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Técnico não encontrado' });
        }
        
        return res.json({ message: 'Técnico deletado com sucesso' });
      }
    }

    // Roles (público)
    if (method === 'GET' && path === '/roles') {
      const roles = [
        { nome: 'admin', descricao: 'Administrador do sistema - acesso total' },
        { nome: 'tecnico', descricao: 'Técnico autorizado - acesso ao chatbot' },
        { nome: 'supervisor', descricao: 'Supervisor de técnicos - pode gerenciar técnicos' }
      ];
      return res.json(roles);
    }

    // Rota não encontrada
    return res.status(404).json({ error: 'Rota não encontrada' });

  } catch (err) {
    console.error('Erro na API:', err);
    
    // Tratar erros específicos do banco
    if (err.code === '23505') { // Unique violation
      if (err.constraint === 'tecnicos_telefone_key') {
        return res.status(409).json({ error: 'Telefone já cadastrado' });
      }
    }
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro temporário no sistema. Tente novamente em alguns instantes.'
    });
  }
};