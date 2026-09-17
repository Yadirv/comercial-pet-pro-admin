import React, { useState, useEffect } from 'react';
import registerExpressOrder from '../services/pedidosExpressService';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle, Zap, Search } from 'lucide-react';

export default function PedidosExpress() {
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    document_id: '',
    phone: '',
    quantity: '1'
  });
  
  const [productoSearch, setProductoSearch] = useState('');
  const [productoResultados, setProductoResultados] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errores, setErrores] = useState({});

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

  const validate = () => {
    const errors = {};
    if (!formData.business_name.trim()) errors.business_name = 'El nombre del negocio es obligatorio.';
    if (!formData.document_id.trim()) errors.document_id = 'El C.C o NIT es obligatorio.';
    if (!formData.phone.trim()) errors.phone = 'El celular es obligatorio.';
    else if (!/^\d{7,15}$/.test(formData.phone.trim())) errors.phone = 'Debe contener solo dígitos (mín. 7).';
    if (!selectedProducto) errors.product = 'Por favor busca y selecciona el producto de la lista desplegable.';
    if (!formData.quantity || Number(formData.quantity) < 1) errors.quantity = 'Debe ser un número positivo mayor a 0.';
    setErrores(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setErrores(prev => ({ ...prev, [field]: '' }));
  };

  const resetForm = () => {
    setFormData({ business_name: '', contact_name: '', document_id: '', phone: '', quantity: '1' });
    setProductoSearch('');
    setSelectedProducto(null);
    setMessage(null);
    setErrores({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const { business_name, contact_name, document_id, phone, quantity } = formData;
      const qty = Number(quantity);

      const unifiedData = {
        negocio: business_name,
        contacto: contact_name,
        nit: document_id,
        celular: phone,
        producto: selectedProducto,
        cantidad: qty
      };

      const result = await registerExpressOrder(unifiedData);

      setMessage({
        type: 'success',
        text: `Pedido #${String(result.orderId).slice(0, 8)} registrado para ${business_name}.`
      });
      setTimeout(resetForm, 2500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center gap-2">
        <Zap className="text-amber-500" size={24} />
        Pedido Express
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Negocio</label>
            <input type="text" value={formData.business_name} onChange={handleChange('business_name')}
              className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${errores.business_name ? 'border-rose-400' : 'border-slate-200'}`}
              placeholder="Ej. Veterinaria San Roque" />
            {errores.business_name && <p className="text-xs text-rose-500 mt-1">{errores.business_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Contacto</label>
            <input type="text" value={formData.contact_name} onChange={handleChange('contact_name')}
              className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${errores.contact_name ? 'border-rose-400' : 'border-slate-200'}`}
              placeholder="Ej. Juan Pérez" />
            {errores.contact_name && <p className="text-xs text-rose-500 mt-1">{errores.contact_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">C.C o NIT</label>
            <input type="text" value={formData.document_id} onChange={handleChange('document_id')}
              className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${errores.document_id ? 'border-rose-400' : 'border-slate-200'}`}
              placeholder="Número de identificación" />
            {errores.document_id && <p className="text-xs text-rose-500 mt-1">{errores.document_id}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Celular</label>
            <input type="tel" value={formData.phone} onChange={handleChange('phone')}
              className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${errores.phone ? 'border-rose-400' : 'border-slate-200'}`}
              placeholder="Solo números" />
            {errores.phone && <p className="text-xs text-rose-500 mt-1">{errores.phone}</p>}
          </div>
          
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Producto</label>
            <div className="relative">
              <input
                type="text"
                value={productoSearch}
                onChange={(e) => {
                  setProductoSearch(e.target.value);
                  setShowDropdown(true);
                  setSelectedProducto(null);
                  setErrores(prev => ({ ...prev, product: '' }));
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar producto por nombre..."
                className={`w-full pl-10 pr-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${errores.product ? 'border-rose-400' : 'border-slate-200'}`}
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              {isSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-amber-500" size={18} />}
            </div>

            {showDropdown && productoResultados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {productoResultados.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProducto(prod)}
                    className="px-4 py-2 hover:bg-amber-50 cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <p className="font-medium text-slate-800">{prod.producto}</p>
                    <p className="text-xs text-slate-500">Ref: {prod.ref} | Stock actual: {prod.inventario_b2c}</p>
                  </div>
                ))}
              </div>
            )}
            {errores.product && <p className="text-xs text-rose-500 mt-1">{errores.product}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad</label>
            <input type="number" min="1" value={formData.quantity} onChange={handleChange('quantity')}
              className={`w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${errores.quantity ? 'border-rose-400' : 'border-slate-200'}`} />
            {errores.quantity && <p className="text-xs text-rose-500 mt-1">{errores.quantity}</p>}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-colors">
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
          {isSubmitting ? 'Registrando...' : 'Registrar Pedido Express'}
        </button>
      </form>
    </div>
  );
}
