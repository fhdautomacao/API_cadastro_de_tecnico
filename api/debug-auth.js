const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // LOG DETALHADO DOS HEADERS
  console.log('=== DEBUG AUTH ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Authorization header:', req.headers['authorization']);
  console.log('Authorization header (lowercase):', req.headers['Authorization']);

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('Auth header found:', !!authHeader);
  console.log('Token extracted:', !!token);
  console.log('Token length:', token?.length || 0);

  if (!token) {
    return res.json({
      hasToken: false,
      message: 'Nenhum token fornecido'
    });
  }

  try {
    // Verificar o usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    // Tentar uma operação no banco para testar as políticas
    const { data: testData, error: dbError } = await supabase
      .from('tecnicos')
      .select('count(*)')
      .limit(1);

    return res.json({
      hasToken: true,
      tokenLength: token.length,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role
      } : null,
      userError: userError?.message || null,
      dbTest: {
        success: !dbError,
        error: dbError?.message || null,
        data: testData
      },
      supabaseContext: {
        url: process.env.SUPABASE_URL?.substring(0, 30) + '...',
        keyType: 'anon'
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Erro no debug',
      message: err.message
    });
  }
};
