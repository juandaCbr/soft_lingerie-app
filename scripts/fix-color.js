import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixColor() {
  console.log('Buscando color Vino Tinto...');
  const { data, error } = await supabase
    .from('colores')
    .select('*')
    .ilike('nombre', '%vino tinto%');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    for (const color of data) {
      console.log(`Corrigiendo ${color.nombre} (ID: ${color.id}) de ${color.hex} a #6B1324`);
      const { error: upError } = await supabase
        .from('colores')
        .update({ hex: '#6B1324' })
        .eq('id', color.id);
      
      if (upError) console.error('Error:', upError.message);
      else console.log('Actualizado con éxito.');
    }
  } else {
    console.log('No se encontró el color.');
  }
}

fixColor();
