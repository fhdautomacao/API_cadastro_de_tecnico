module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.json({
    message: 'Teste de variáveis de ambiente',
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
    supabaseUrlLength: process.env.SUPABASE_URL?.length || 0,
    supabaseKeyLength: process.env.SUPABASE_ANON_KEY?.length || 0,
    supabaseUrlStart: process.env.SUPABASE_URL?.substring(0, 20) || 'não configurada',
    nodeEnv: process.env.NODE_ENV || 'não definido'
  });
};
