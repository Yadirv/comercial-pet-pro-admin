import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Save, Loader2, CheckCircle2, Edit2, X } from 'lucide-react';

export default function OrdersForm() {
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [clienteData, setClienteData] = useState(null);
  
  const [productoSearch, setProductoSearch] = useState('');
  const [productoResultados, setProductoResultados] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [cantidad, setCantidad] = useState(1);
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [contacto, setContacto] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  const [editClientMode, setEditClientMode] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes_b2b')
        .select('*')
        .order('negocio', { ascending: true });
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const handleClienteChange = (e) => {
    const clientId = e.target.value;
    setSelectedCliente(clientId);
    const client = clientes.find(c => String(c.cc_nit) === String(clientId));
    if (client) {
      setClienteData(client);
      setDireccion(client.direccion || '');
      setCiudad(client.ciudad || '');
      setContacto(client.contacto || '');
      setCorreo(client.correo || '');
      setCelular(client.celular || '');
      setEditClientMode(false);
    } else {
      setClienteData(null);
      setDireccion('');
      setCiudad('');
      setContacto('');
      setCorreo('');
      setCelular('');
      setEditClientMode(false);
    }
  };

  useEffect(() => {
    const searchProductos = async () => {
      if (productoSearch.length < 2) {
        setProductoResultados([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('petpro_productos')
          .select('*')
          .ilike('producto', `%${productoSearch}%`)
          .limit(10);
        
        if (error) throw error;
        setProductoResultados(data || []);
      } catch (error) {
        console.error('Error searching productos:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProductos, 300);
    return () => clearTimeout(debounce);
  }, [productoSearch]);

  const handleSelectProducto = (prod) => {
    setSelectedProducto(prod);
    setProductoSearch(prod.producto);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clienteData) {
      setMessage({ type: 'error', text: 'Por favor selecciona un cliente.' });
      return;
    }
    if (!selectedProducto) {
      setMessage({ type: 'error', text: 'Por favor busca y selecciona el producto de la lista desplegable.' });
      return;
    }
    if (cantidad <= 0) {
      setMessage({ type: 'error', text: 'La cantidad debe ser mayor a cero.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      // Acción 1: Actualizar cliente si el operador modificó los datos
      if (editClientMode) {
        const { error: updateError } = await supabase
          .from('clientes_b2b')
          .update({
            contacto,
            correo,
            celular,
            direccion,
            ciudad
          })
          .eq('cc_nit', clienteData.cc_nit);
        
        if (updateError) throw updateError;
        
        // Actualizar el estado local para reflejar los cambios
        setClientes(prev => prev.map(c => c.cc_nit === clienteData.cc_nit ? { ...c, contacto, correo, celular, direccion, ciudad } : c));
        setClienteData(prev => ({ ...prev, contacto, correo, celular, direccion, ciudad }));
      }
      
      // Acción 2: Registrar el pedido
      const { error } = await supabase
        .from('petpro_pedidos')
        .insert([{
          cc_nit: clienteData.cc_nit, // Asumiendo que renombraremos cc_nit_clientes_b2b a cc_nit
          cantidad: Number(cantidad),
          direccion_b2b: direccion,
          ciudad: ciudad,
          estado: 'Pendiente',
          detalles_json: {
            producto_id: selectedProducto.id,
            producto: selectedProducto.producto,
            negocio: clienteData.negocio,
            user_id: userData.user?.id
          }
        }]);

      if (error) throw error;
      
      // Acción 3: Descontar inventario
      const stockActual = parseInt(selectedProducto.inventario_b2c) || 0;
      const cantRestar = Number(cantidad) || 0;
      const nuevoStock = Math.max(0, stockActual - cantRestar);
      
      const { error: updateError } = await supabase
        .from('petpro_productos')
        .update({ inventario_b2c: nuevoStock })
        .eq('ref', selectedProducto.ref || selectedProducto.id);
        
      if (updateError) {
        console.warn(`No se pudo actualizar el stock del producto ${selectedProducto.ref}`, updateError);
        // Opcional: mostrar advertencia al usuario, aunque el pedido ya se guardó
      }
      
      setMessage({ type: 'success', text: 'Pedido registrado exitosamente.' });
      
      // Reset form partially
      setProductoSearch('');
      setSelectedProducto(null);
      setCantidad(1);
    } catch (error) {
      console.error('Error submitting order:', error);
      setMessage({ type: 'error', text: `Error al registrar pedido: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Registrar Nuevo Pedido B2B</h2>
      
      {message && (
        <div className={`p-4 mb-6 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' && <CheckCircle2 size={20} />}
          <p>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente B2B (Negocio)</label>
          <select 
            value={selectedCliente}
            onChange={handleClienteChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            required
          >
            <option value="">-- Seleccionar Cliente --</option>
            {clientes.map(c => (
              <option key={c.cc_nit} value={c.cc_nit}>{c.negocio}</option>
            ))}
          </select>
        </div>

        {clienteData && (
          <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 relative">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-indigo-900">Datos del Cliente</h3>
              <button 
                type="button"
                onClick={() => setEditClientMode(!editClientMode)}
                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1 bg-white px-2 py-1 rounded border border-indigo-200"
              >
                {editClientMode ? <><X size={14} /> Cancelar Edición</> : <><Edit2 size={14} /> Editar Datos</>}
              </button>
            </div>
            
            {editClientMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Contacto</label>
                  <input type="text" value={contacto} onChange={e => setContacto(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Email</label>
                  <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Celular</label>
                  <input type="text" value={celular} onChange={e => setCelular(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Dirección (Entrega)</label>
                  <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Ciudad</label>
                  <input type="text" value={ciudad} onChange={e => setCiudad(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" required />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-indigo-800"><strong>Contacto:</strong> {clienteData.contacto}</p>
                <p className="text-sm text-indigo-800"><strong>Email:</strong> {clienteData.correo} | <strong>Celular:</strong> {clienteData.celular}</p>
                <p className="text-sm text-indigo-800"><strong>Dirección:</strong> {clienteData.direccion || 'N/A'} | <strong>Ciudad:</strong> {clienteData.ciudad || 'N/A'}</p>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Producto</label>
          <div className="relative">
            <input 
              type="text"
              value={productoSearch}
              onChange={(e) => {
                setProductoSearch(e.target.value);
                setShowDropdown(true);
                setSelectedProducto(null);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscar producto por nombre..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              required
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            {isSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-indigo-500" size={18} />}
          </div>
          
          {showDropdown && productoResultados.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {productoResultados.map(prod => (
                <div 
                  key={prod.id}
                  onClick={() => handleSelectProducto(prod)}
                  className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <p className="font-medium text-slate-800">{prod.producto}</p>
                  <p className="text-xs text-slate-500">Ref: {prod.ref} | Stock actual: {prod.inventario_b2c}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad</label>
            <input 
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSubmitting || !selectedProducto}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-bold transition-colors"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Confirmar Pedido
          </button>
        </div>
      </form>
    </div>
  );
}
