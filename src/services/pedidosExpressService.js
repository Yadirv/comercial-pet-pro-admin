import { supabase } from '../lib/supabase';

export async function getOrCreateClient({ negocio, contacto, nit, celular }) {
  const { data: existing, error: searchError } = await supabase
    .from('clientes_b2b')
    .select('*')
    .eq('cc_nit', nit)
    .maybeSingle();

  if (searchError) throw new Error(`Error al buscar cliente: ${searchError.message}`);

  if (existing) {
    return { client: existing, action: 'reused' };
  }

  const { data: newClient, error: insertError } = await supabase
    .from('clientes_b2b')
    .insert({ negocio, contacto, cc_nit: nit, celular })
    .select()
    .single();

  if (insertError) throw new Error(`Error al crear cliente: ${insertError.message}`);
  return { client: newClient, action: 'created' };
}

export async function createOrder({ producto, cantidad }, clientId) {
  const { data, error } = await supabase
    .from('petpro_pedidos')
    .insert([{
      cc_nit: clientId,
      cantidad: Number(cantidad),
      estado: 'express',
      detalles_json: {
        producto_id: producto.id,
        producto: producto.producto,
        ref: producto.ref
      }
    }])
    .select('id')
    .single();

  if (error) throw new Error(`Error al registrar pedido: ${error.message}`);
  return { order: data };
}

export async function registerExpressOrder(unifiedData) {
  const { negocio, contacto, nit, celular, producto, cantidad } = unifiedData;

  const { client, action: clientAction } = await getOrCreateClient({ negocio, contacto, nit, celular });
  const clientId = client.cc_nit || client.id;

  const ref = producto?.ref;
  if (!ref) throw new Error('Producto inválido: sin referencia');

  const { data: stockData, error: stockError } = await supabase
    .from('petpro_productos')
    .select('inventario_b2c')
    .eq('ref', ref)
    .single();

  if (stockError) throw new Error(`Error al consultar stock: ${stockError.message}`);

  const stockDisponible = parseInt(stockData.inventario_b2c) || 0;
  if (stockDisponible < Number(cantidad)) {
    throw new Error(`Stock insuficiente. Disponible: ${stockDisponible}, solicitado: ${cantidad}`);
  }

  const { order } = await createOrder({ producto, cantidad }, clientId);

  const nuevoStock = Math.max(0, stockDisponible - Number(cantidad));
  const { error: updateError } = await supabase
    .from('petpro_productos')
    .update({ inventario_b2c: nuevoStock })
    .eq('ref', ref);

  if (updateError) {
    console.warn('Pedido express creado pero no se pudo descontar stock:', updateError.message);
  }

  return {
    success: true,
    clientId,
    orderId: order.id,
    clientAction
  };
}

// DUMMY EXPORTS PARA EVITAR QUE FALLE EL BUILD EN VERCEL POR CULPA DE PedidosExpress.jsx
export async function upsertClient() {
  throw new Error("Función obsoleta. Usa registerExpressOrder o el componente ClientOrderForm.");
}

export default registerExpressOrder;
