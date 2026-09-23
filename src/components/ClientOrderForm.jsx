import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Save, Loader2, CheckCircle2, XCircle, UserPlus, ShoppingCart } from 'lucide-react';

export default function ClientOrderForm({ onSuccess }) {
  const [clientes, setClientes] = useState([]);
  const [isNewClient, setIsNewClient] = useState(true);

  const [formData, setFormData] = useState({
    negocio: '',
    contacto: '',
    cc_nit: '',
    celular: '',
    correo: '',
    cliente_direccion: '',
    cliente_ciudad: '',
    pedido_direccion: '',
    pedido_ciudad: ''
  });
  const [channels, setChannels] = useState({
    C1: false, C2: false, C3: false, C4: false
  });
  const [selectedCliente, setSelectedCliente] = useState('');

  const [productoSearch, setProductoSearch] = useState('');
  const [productoResultados, setProductoResultados] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [ciudadResultados, setCiudadResultados] = useState([]);
  const [isSearchingCiudad, setIsSearchingCiudad] = useState(false);
  const [showCiudadDropdown, setShowCiudadDropdown] = useState(false);

  const [cantidad, setCantidad] = useState(1);

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

  const clearForm = () => {
    setFormData({ 
      negocio: '', contacto: '', cc_nit: '', celular: '', correo: '', 
      cliente_direccion: '', cliente_ciudad: '', 
      pedido_direccion: '', pedido_ciudad: '' 
    });
    setChannels({ C1: false, C2: false, C3: false, C4: false });
    setSelectedCliente('');
    setProductoSearch('');
    setSelectedProducto(null);
    setCantidad(1);
    setMessage(null);
  };

  const handleSelectExisting = (e) => {
    const clientId = e.target.value;
    setSelectedCliente(clientId);
    if (clientId) {
      const client = clientes.find(c => String(c.cc_nit) === String(clientId));
      if (client) {
        setFormData(prev => ({
          ...prev,
          negocio: client.negocio || '',
          contacto: client.contacto || '',
          cc_nit: client.cc_nit || '',
          celular: client.celular || '',
          correo: client.correo || '',
          cliente_direccion: client.direccion || '',
          cliente_ciudad: client.ciudad || ''
        }));
        const activeChannels = client.canales ? client.canales.split(',').map(c => c.trim()) : [];
        setChannels({
          C1: activeChannels.includes('C1'),
          C2: activeChannels.includes('C2'),
          C3: activeChannels.includes('C3'),
          C4: activeChannels.includes('C4')
        });
        setIsNewClient(false);
      }
    } else {
      clearForm();
      setIsNewClient(true);
    }
  };

  const handleChannelChange = (e) => {
    const { name, checked } = e.target;
    if (name === 'ALL') {
      setChannels({ C1: checked, C2: checked, C3: checked, C4: checked });
    } else {
      setChannels(prev => ({ ...prev, [name]: checked }));
    }
  };

  const isAllChecked = channels.C1 && channels.C2 && channels.C3 && channels.C4;

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

  useEffect(() => {
    const searchCiudades = async () => {
      if (formData.pedido_ciudad.length < 2) {
        setCiudadResultados([]);
        return;
      }
      setIsSearchingCiudad(true);
      try {
        const { data, error } = await supabase
          .from('cod_ciudades')
          .select('Ciudad')
          .ilike('Ciudad', `%${formData.pedido_ciudad}%`)
          .limit(10);
        if (error) throw error;
        // Eliminar duplicados si los hay
        const unicas = [];
        const vistas = new Set();
        (data || []).forEach(item => {
          if (!vistas.has(item.Ciudad)) {
            vistas.add(item.Ciudad);
            unicas.push(item);
          }
        });
        setCiudadResultados(unicas);
      } catch (error) {
        console.error('Error searching ciudades:', error);
      } finally {
        setIsSearchingCiudad(false);
      }
    };

    const debounce = setTimeout(searchCiudades, 300);
    return () => clearTimeout(debounce);
  }, [formData.pedido_ciudad]);

  const handleSelectProducto = (prod) => {
    setSelectedProducto(prod);
    setProductoSearch(prod.producto);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.cc_nit.length > 12 || formData.celular.length > 12) {
      setMessage({ type: 'error', text: 'El CC/NIT y Celular no deben superar los 12 dígitos.' });
      return;
    }

    const selectedChannels = Object.keys(channels).filter(k => channels[k]);
    if (selectedChannels.length === 0) {
      setMessage({ type: 'error', text: 'Debes seleccionar al menos un canal de venta.' });
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

    if (!window.confirm("¿Estás seguro de registrar este cliente y pedido?")) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const clientPayload = {
        negocio: formData.negocio,
        contacto: formData.contacto,
        cc_nit: formData.cc_nit,
        celular: formData.celular,
        correo: formData.correo,
        canales: selectedChannels.join(','),
        direccion: formData.cliente_direccion,
        ciudad: formData.cliente_ciudad
      };

      const { error: clientError } = await supabase.from('clientes_b2b').upsert(clientPayload);
      if (clientError) throw clientError;

      const { error: orderError } = await supabase
        .from('petpro_pedidos')
        .insert([{
          cc_nit: formData.cc_nit,
          cantidad: Number(cantidad),
          direccion_b2b: formData.pedido_direccion,
          ciudad: formData.pedido_ciudad,
          estado: 'Pendiente',
          detalles_json: {
            producto_id: selectedProducto.id,
            producto: selectedProducto.producto,
            negocio: formData.negocio,
            user_id: userData.user?.id
          }
        }]);

      if (orderError) throw orderError;

      const stockActual = parseInt(selectedProducto.inventario_b2c) || 0;
      const cantRestar = Number(cantidad) || 0;
      const nuevoStock = Math.max(0, stockActual - cantRestar);

      const { error: updateError } = await supabase
        .from('petpro_productos')
        .update({ inventario_b2c: nuevoStock })
        .eq('ref', selectedProducto.ref || selectedProducto.id);

      if (updateError) {
        console.warn(`No se pudo actualizar el stock del producto ${selectedProducto.ref}`, updateError);
      }

      setMessage({ type: 'success', text: 'Cliente y pedido registrados exitosamente.' });

      setTimeout(() => {
        clearForm();
        fetchClientes();
        setIsNewClient(true);
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center gap-2">
        <UserPlus className="text-indigo-500" size={24} />
        <ShoppingCart className="text-indigo-500" size={24} />
        Nuevo Cliente & Pedido B2B
      </h2>

      {message && (
        <div className={`p-4 mb-6 rounded-xl flex items-center justify-center gap-2 text-sm font-bold ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="bg-indigo-50/40 p-5 rounded-xl border border-indigo-100">
          <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <UserPlus size={18} /> Datos del Cliente
          </h3>

          {clientes.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ¿Cliente existente? <span className="text-xs text-slate-400 font-normal">(seleccionar para editar)</span>
              </label>
              <select
                value={selectedCliente}
                onChange={handleSelectExisting}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="">-- Nuevo Cliente --</option>
                {clientes.map(c => (
                  <option key={c.cc_nit} value={c.cc_nit}>{c.negocio} - {c.contacto}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Negocio</label>
              <input type="text" required value={formData.negocio}
                onChange={e => setFormData({...formData, negocio: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Ej. Veterinaria San Roque" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Contacto</label>
              <input type="text" required value={formData.contacto}
                onChange={e => setFormData({...formData, contacto: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">C.C o NIT</label>
              <input type="number" required value={formData.cc_nit}
                onChange={e => setFormData({...formData, cc_nit: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Sólo números" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Celular</label>
              <input type="number" required value={formData.celular}
                onChange={e => setFormData({...formData, celular: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Sólo números" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input type="email" required value={formData.correo}
                onChange={e => setFormData({...formData, correo: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Ej. contacto@sanroque.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección Registrada (Opcional)</label>
              <input type="text" value={formData.cliente_direccion}
                onChange={e => setFormData({...formData, cliente_direccion: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Sede principal" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ciudad Registrada (Opcional)</label>
              <input type="text" value={formData.cliente_ciudad}
                onChange={e => setFormData({...formData, cliente_ciudad: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Ej. Bogotá" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Canales de Venta Habilitados</label>
            <label className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all mb-3 ${
              isAllChecked ? 'border-emerald-500 bg-emerald-100' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
            }`}>
              <input type="checkbox" name="ALL" checked={isAllChecked} onChange={handleChannelChange} className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm font-black text-emerald-700">✅ Todos los Canales (C1, C2, C3, C4)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'C1', label: '🏪 Petshop' },
                { id: 'C2', label: '🐾 Peluquerías Pet' },
                { id: 'C3', label: '🏥 Veterinarias' },
                { id: 'C4', label: '🏬 Otros Comercios' }
              ].map(ch => (
                <label key={ch.id} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  channels[ch.id] ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                }`}>
                  <input type="checkbox" name={ch.id} checked={channels[ch.id]} onChange={handleChannelChange} className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700">{ch.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-emerald-50/40 p-5 rounded-xl border border-emerald-100">
          <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <ShoppingCart size={18} /> Datos del Pedido
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección de Entrega</label>
              <input type="text" value={formData.pedido_direccion}
                onChange={e => setFormData({...formData, pedido_direccion: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                placeholder="Cra 45 #23-12" required />
            </div>
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ciudad de Entrega</label>
              <div className="relative">
                <input type="text" value={formData.pedido_ciudad}
                  onChange={e => {
                    setFormData({...formData, pedido_ciudad: e.target.value});
                    setShowCiudadDropdown(true);
                  }}
                  onFocus={() => setShowCiudadDropdown(true)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  placeholder="Ej. Medellín" required />
                {isSearchingCiudad && <Loader2 className="absolute right-3 top-2.5 animate-spin text-emerald-500" size={18} />}
              </div>

              {showCiudadDropdown && ciudadResultados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {ciudadResultados.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setFormData({...formData, pedido_ciudad: item.Ciudad});
                        setShowCiudadDropdown(false);
                      }}
                      className="px-4 py-2 hover:bg-emerald-50 cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <p className="font-medium text-slate-800">{item.Ciudad}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative mt-4">
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
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                required
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              {isSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-emerald-500" size={18} />}
            </div>

            {showDropdown && productoResultados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {productoResultados.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProducto(prod)}
                    className="px-4 py-2 hover:bg-emerald-50 cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <p className="font-medium text-slate-800">{prod.producto}</p>
                    <p className="text-xs text-slate-500">Ref: {prod.ref} | Stock actual: {prod.inventario_b2c}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad</label>
            <input type="number" min="1" value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              required />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-colors">
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {isNewClient ? 'Registrar Cliente y Pedido' : 'Actualizar Cliente y Registrar Pedido'}
        </button>
      </form>
    </div>
  );
}
