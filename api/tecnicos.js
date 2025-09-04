const { createClient } = require('@supabase/supabase-js');

// Configurar cliente Supabase
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
