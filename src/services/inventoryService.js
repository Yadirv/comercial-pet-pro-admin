import { supabase } from '../lib/supabase';

export const findProductsByName = async (producto) => {
  return await supabase
    .from('petpro_productos')
    .select('*')
    .ilike('producto', `%${producto}%`)
    .limit(10);
};

export const findProductsByRef = async (ref) => {
  return await supabase
    .from('petpro_productos')
    .select('*')
    .ilike('ref', `%${ref}%`)
    .limit(10);
};

export const processInventoryUpdate = async (tempInventory) => {
  let successCount = 0;
  let errorCount = 0;

  for (const item of tempInventory) {
    let query = supabase.from('petpro_productos').select('ref');
    if (item.ref) {
      query = query.eq('ref', item.ref);
    } else if (item.producto) {
      query = query.ilike('producto', `%${item.producto}%`);
    }

    const { data: existingProducts, error: selectError } = await query;

    if (selectError) {
      console.error(`Error buscando producto ${item.ref || item.producto}:`, selectError);
      errorCount++;
      continue;
    }

    if (existingProducts && existingProducts.length > 0) {
      const product = existingProducts[0];

      const { error: updateError } = await supabase
        .from('petpro_productos')
        .update({
          inventario_b2c: item.cantidad,
          producto_destacado: item.destacado,
          activo_b2c: item.activo_b2c
        })
        .eq('ref', product.ref);

      if (updateError) {
        console.error(`Error actualizando ${product.ref}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }
    } else {
      console.warn(`Producto no encontrado: ${item.ref || item.producto}`);
      errorCount++;
    }
  }
  return { successCount, errorCount };
};

export async function registrarPedidoExpress(clienteData, pedidoData) {
  try {
    const { data: clientesExistentes, error: fetchError } = await supabase
      .from('clientes_b2b')
      .select('cc_nit')
      .eq('cc_nit', clienteData.ccNit)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: `Error al buscar cliente: ${fetchError.message}` };
    }

    let clienteId;

    if (clientesExistentes) {
      clienteId = clientesExistentes.cc_nit;
    } else {
      const { data: nuevoCliente, error: insertClienteError } = await supabase
        .from('clientes_b2b')
        .insert({
          negocio: clienteData.nombreNegocio,
          contacto: clienteData.nombreContacto,
          cc_nit: clienteData.ccNit,
          celular: clienteData.celular
        })
        .select('cc_nit')
        .single();

      if (insertClienteError) {
        return { success: false, error: `Error al registrar cliente: ${insertClienteError.message}` };
      }

      clienteId = nuevoCliente.cc_nit;
    }

    const { error: insertPedidoError } = await supabase
      .from('petpro_pedidos')
      .insert({
        cc_nit: clienteId,
        cantidad: pedidoData.cantidad,
        estado: 'express',
        detalles_json: {
          producto_id: pedidoData.producto.id,
          producto: pedidoData.producto.producto,
          negocio: clienteData.nombreNegocio,
          ref: pedidoData.producto.ref
        }
      });

    if (insertPedidoError) {
      return { success: false, error: `Cliente registrado, pero el pedido falló: ${insertPedidoError.message}`, clienteCreado: true };
    }

    if (pedidoData.producto.ref) {
      const stockActual = parseInt(pedidoData.producto.inventario_b2c) || 0;
      const nuevoStock = Math.max(0, stockActual - pedidoData.cantidad);
      await supabase
        .from('petpro_productos')
        .update({ inventario_b2c: nuevoStock })
        .eq('ref', pedidoData.producto.ref);
    }

    return { success: true, clienteId };

  } catch (err) {
    return { success: false, error: `Error inesperado: ${err.message}` };
  }
}

export async function decrementStock(product, quantity) {
  const { data, error } = await supabase
    .from('inventory')
    .select('stock')
    .eq('product', product)
    .single();

  if (error) throw new Error(`Error al consultar stock: ${error.message}`);

  const currentStock = parseInt(data.stock) || 0;
  if (currentStock < quantity) {
    throw new Error(`Stock insuficiente. Disponible: ${currentStock}, solicitado: ${quantity}`);
  }

  const newStock = currentStock - quantity;
  const { error: updateError } = await supabase
    .from('inventory')
    .update({ stock: newStock })
    .eq('product', product);

  if (updateError) throw new Error(`Error al descontar stock: ${updateError.message}`);
}
