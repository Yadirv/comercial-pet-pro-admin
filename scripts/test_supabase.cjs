const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://qkzhopjfrlyvqfievcfi.supabase.co', 'sb_publishable_B8kxChkEQRWA32IFAWNLXA_viGXj1Yo');

async function run() {
  const { data, error } = await supabase
    .from('petpro_productos')
    .select('*')
    .limit(10);
  
  if (error) console.error("Error fetching limit 10:", error);
  else console.log("Sample rows:", JSON.stringify(data, null, 2));

  const { data: data2, error: error2 } = await supabase
    .from('petpro_productos')
    .select('*')
    .eq('ref', '2845');

  if (error2) console.error("Error fetching ref 2845:", error2);
  else console.log("Rows for ref 2845:", JSON.stringify(data2, null, 2));
}

run();
