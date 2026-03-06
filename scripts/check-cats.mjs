import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategorias() {
  const { data, error } = await supabase.from('categorias').select('*');
  if (error) {
    console.error('Error querying categorias:', error.message);
    const { data: pData, error: pError } = await supabase.from('productos').select('categoria').limit(100);
    if (!pError) {
      const distinctCats = [...new Set(pData.map(p => p.categoria))];
      console.log('Distinct categories in productos table:', distinctCats);
    }
  } else {
    console.log('Categorias table content:', data);
  }
}

checkCategorias();
