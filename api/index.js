const { createClient } = require('@supabase/supabase-js');

// Configurar cliente Supabase (para autenticação e banco de dados)
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

    return { user, token };
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

  // Parse JSON body para requests POST/PUT
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body && req.headers['content-type']?.includes('application/json')) {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      await new Promise(resolve => {
        req.on('end', () => {
          try {
            req.body = JSON.parse(body);
          } catch (e) {
            req.body = {};
          }
          resolve();
        });
      });
    }
  }

  const { method, url } = req;
  const path = url.replace('/api', '');

  try {
    // Verificar técnico (público)
    if (method === 'GET' && path.startsWith('/verificar-tecnico/')) {
      const telefone = path.split('/')[2];
      
      const { data: tecnicos, error } = await supabase
        .from('tecnicos')
        .select('*')
        .eq('telefone', telefone)
        .eq('ativo', true);
      
      if (error) {
        console.error('Erro ao verificar técnico:', error);
        return res.status(500).json({ 
          error: 'Erro interno do servidor',
          message: '⚠️ Erro temporário no sistema. Tente novamente em alguns instantes.',
          status: 500
        });
      }
      
      if (tecnicos && tecnicos.length > 0) {
        const tecnico = tecnicos[0];
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

    // Rota protegida específica - /auth/me
    if (method === 'GET' && path === '/auth/me') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      const auth = await authenticateToken(token);
      
      if (auth.error) {
        return res.status(auth.status).json({ error: auth.error });
      }

      return res.json({ user: auth.user });
    }

    // CRUD de técnicos
    if (path === '/tecnicos') {
      if (method === 'GET') {
        console.log('Buscando técnicos...');
        const { data: tecnicos, error } = await supabase
          .from('tecnicos')
          .select('*')
          .order('data_criacao', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar técnicos:', error);
          return res.status(500).json({ error: 'Erro ao buscar técnicos' });
        }
        
        console.log('Técnicos encontrados:', tecnicos?.length || 0);
        return res.json(tecnicos || []);
      }
      
      if (method === 'POST') {
        // Verificar autenticação para POST
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const auth = await authenticateToken(token);
        
        if (auth.error) {
          return res.status(auth.status).json({ error: auth.error });
        }

        console.log('Criando técnico...');
        const { nome, telefone } = req.body;
        console.log('Dados recebidos:', { nome, telefone });
        
        if (!nome || !telefone) {
          return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
        }
        
        // Criar cliente autenticado para o INSERT
        const supabaseWithAuth = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                Authorization: `Bearer ${auth.token}`
              }
            }
          }
        );

        const { data: tecnico, error } = await supabaseWithAuth
          .from('tecnicos')
          .insert([{ nome, telefone }])
          .select()
          .single();
        
        if (error) {
          console.error('Erro ao criar técnico:', error);
          if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Telefone já cadastrado' });
          }
          return res.status(500).json({ error: 'Erro ao criar técnico' });
        }
        
        console.log('Técnico criado:', tecnico);
        return res.status(201).json({ 
          ...tecnico, 
          message: 'Técnico criado com sucesso' 
        });
      }
    }

    if (path.startsWith('/tecnicos/')) {
      const id = path.split('/')[2];
      
      if (method === 'GET') {
        // GET público - buscar técnico por ID sem autenticação
        console.log('Buscando técnico por ID (acesso público):', id);
        const { data: tecnico, error } = await supabase
          .from('tecnicos')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error || !tecnico) {
          return res.status(404).json({ error: 'Técnico não encontrado' });
        }
        
        return res.json(tecnico);
      }
      
      if (method === 'PUT') {
        // Verificar autenticação para PUT
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const auth = await authenticateToken(token);
        
        if (auth.error) {
          return res.status(auth.status).json({ error: auth.error });
        }

        const { nome, telefone, ativo } = req.body;
        
        if (!nome || !telefone) {
          return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
        }
        
        // Criar cliente autenticado para o UPDATE
        const supabaseWithAuth = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                Authorization: `Bearer ${auth.token}`
              }
            }
          }
        );

        const { data: tecnico, error } = await supabaseWithAuth
          .from('tecnicos')
          .update({ nome, telefone, ativo: ativo !== undefined ? ativo : true })
          .eq('id', id)
          .select()
          .single();
        
        if (error || !tecnico) {
          console.error('Erro ao atualizar técnico:', error);
          if (error?.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Telefone já cadastrado' });
          }
          return res.status(404).json({ error: 'Técnico não encontrado' });
        }
        
        return res.json({ message: 'Técnico atualizado com sucesso' });
      }
      
      if (method === 'DELETE') {
        // Verificar autenticação para DELETE
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const auth = await authenticateToken(token);
        
        if (auth.error) {
          return res.status(auth.status).json({ error: auth.error });
        }

        console.log('=== DELETE TÉCNICO ===');
        console.log('URL completa:', req.url);
        console.log('Path extraído:', path);
        console.log('ID extraído:', id);
        console.log('Tipo do ID:', typeof id);
        
        // Primeiro, verificar se o técnico existe
        const { data: existingTecnico, error: findError } = await supabase
          .from('tecnicos')
          .select('*')
          .eq('id', id)
          .single();
          
        console.log('Técnico encontrado:', existingTecnico);
        console.log('Erro na busca:', findError);
        
        if (findError || !existingTecnico) {
          console.log('Técnico não encontrado para deleção');
          return res.status(404).json({ error: 'Técnico não encontrado' });
        }

        // Criar cliente autenticado para o DELETE
        const supabaseWithAuth = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                Authorization: `Bearer ${auth.token}`
              }
            }
          }
        );

        console.log('Deletando técnico ID:', id);
        
        const { data, error, count } = await supabaseWithAuth
          .from('tecnicos')
          .delete()
          .eq('id', id)
          .select();
        
        if (error) {
          console.error('Erro ao deletar técnico:', error);
          return res.status(500).json({ error: 'Erro ao deletar técnico' });
        }
        
        console.log('Resultado do delete:', { data, count });
        
        if (!data || data.length === 0) {
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