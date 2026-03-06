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

async function fixColor() {
  console.log('Buscando color Vino Tinto...');
  
  // Buscamos el color por nombre (insensible a mayúsculas/minúsculas)
  const { data, error } = await supabase
    .from('colores')
    .select('*')
    .ilike('nombre', '%vino tinto%');

  if (error) {
    console.error('Error buscando el color:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No se encontró el color "Vino Tinto".');
    return;
  }

  for (const color of data) {
    console.log(`Corrigiendo color: ${color.nombre} (ID: ${color.id}, Hex actual: ${color.hex})`);
    
    // #6B1324 es un borgoña profundo que no tiende a morado
    const { error: updateError } = await supabase
      .from('colores')
      .update({ hex: '#6B1324' })
      .eq('id', color.id);

    if (updateError) {
      console.error(`Error actualizando el color ${color.id}:`, updateError.message);
    } else {
      console.log(`¡Color ${color.id} actualizado con éxito a #6B1324!`);
    }
  }
}

fixColor();
