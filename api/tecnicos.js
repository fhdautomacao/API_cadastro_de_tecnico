const { createClient } = require('@supabase/supabase-js');

// Configurar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware de autenticação
const authenticateToken = async (token) => {
  console.log('=== AUTHENTICATE TOKEN ===');
  console.log('Token recebido:', !!token);
  console.log('Token length:', token?.length || 0);
  
  if (!token) {
    console.log('Erro: Token não fornecido');
    return { error: 'Token de acesso requerido', status: 401 };
  }

  try {
    console.log('Chamando supabase.auth.getUser...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('Resposta do Supabase:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      error: error?.message 
    });
    
    if (error || !user) {
      console.log('Erro na validação do token:', error?.message || 'Usuário não encontrado');
      return { error: 'Token inválido', status: 403 };
    }

    console.log('Autenticação bem-sucedida para:', user.email);
    return { user };
  } catch (err) {
    console.log('Erro na autenticação (catch):', err.message);
    return { error: 'Token inválido', status: 403 };
  }
};

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse JSON body
  if ((req.method === 'POST' || req.method === 'PUT') && !req.body) {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    try {
      req.body = JSON.parse(body);
    } catch {
      req.body = {};
    }
  }

  try {
    const { method, url } = req;

    if (method === 'GET') {
      // GET público - sem autenticação necessária
      console.log('Buscando técnicos (acesso público)...');
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
      console.log('=== POST TECNICOS ===');
      console.log('Headers recebidos:', JSON.stringify(req.headers, null, 2));
      
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      console.log('Auth header:', !!authHeader);
      console.log('Token extraído:', !!token);
      console.log('Token length:', token?.length || 0);
      
      const auth = await authenticateToken(token);
      
      console.log('Resultado auth:', { error: auth.error, hasUser: !!auth.user });
      
      if (auth.error) {
        console.log('Erro de autenticação:', auth.error);
        return res.status(auth.status).json({ error: auth.error, debug: { hasToken: !!token, authHeader: !!authHeader } });
      }

      console.log('Criando técnico...');
      const { nome, telefone } = req.body;
      console.log('Dados recebidos:', { nome, telefone });
      
      if (!nome || !telefone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
      }
      
      const { data: tecnico, error } = await supabase
        .from('tecnicos')
        .insert([{ nome, telefone }])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar técnico:', error);
        if (error.code === '23505') {
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

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (err) {
    console.error('Erro na API:', err);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro temporário no sistema. Tente novamente em alguns instantes.'
    });
  }
};
