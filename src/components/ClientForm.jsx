import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { UserPlus, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ClientForm({ clientToEdit, onSuccess }) {
  const isEditing = !!clientToEdit;
  
  const [formData, setFormData] = useState({
    negocio: '',
    contacto: '',
    cc_nit: '',
    celular: '',
    correo: '',
    ciudad: ''
  });
  const [channels, setChannels] = useState({
    C1: false,
    C2: false,
    C3: false,
    C4: false
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  const [ciudadResultados, setCiudadResultados] = useState([]);
  const [isSearchingCiudad, setIsSearchingCiudad] = useState(false);
  const [showCiudadDropdown, setShowCiudadDropdown] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setFormData({
        negocio: clientToEdit.negocio || '',
        contacto: clientToEdit.contacto || '',
        cc_nit: clientToEdit.cc_nit || '',
        celular: clientToEdit.celular || '',
        correo: clientToEdit.correo || '',
        ciudad: clientToEdit.ciudad || ''
      });
      const activeChannels = clientToEdit.canales ? clientToEdit.canales.split(',').map(c => c.trim()) : [];
      setChannels({
        C1: activeChannels.includes('C1'),
        C2: activeChannels.includes('C2'),
        C3: activeChannels.includes('C3'),
        C4: activeChannels.includes('C4')
      });
    } else {
      clearForm();
    }
  }, [clientToEdit]);

  const clearForm = () => {
    setFormData({ negocio: '', contacto: '', cc_nit: '', celular: '', correo: '', ciudad: '' });
    setChannels({ C1: false, C2: false, C3: false, C4: false });
    setStatus(null);
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
    const searchCiudades = async () => {
      if (formData.ciudad.length < 2) {
        setCiudadResultados([]);
        return;
      }
      setIsSearchingCiudad(true);
      try {
        const { data, error } = await supabase
          .from('cod_ciudades')
          .select('Ciudad')
          .ilike('Ciudad', `%${formData.ciudad}%`)
          .limit(10);
        if (error) throw error;
        
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
  }, [formData.ciudad]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.cc_nit.length > 12 || formData.celular.length > 12) {
      setStatus({ type: 'error', message: 'El CC/NIT y Celular no deben superar los 12 dÃ­gitos.' });
      return;
    }

    const selectedChannels = Object.keys(channels).filter(k => channels[k]);
    if (selectedChannels.length === 0) {
      setStatus({ type: 'error', message: 'Debes seleccionar al menos un canal de venta.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    const payload = {
      ...formData,
      canales: selectedChannels.join(',')
    };

    try {
      // Auth creation is disabled in the frontend to avoid exposing the service_role key.
      // Si se requiere Auth, debe hacerse a través de Edge Functions.

      // 2. Guardar o actualizar en clientes_b2b
      const { error } = await supabase.from('clientes_b2b').upsert(payload);
      if (error) throw error;
      
      setStatus({ type: 'success', message: 'Operación exitosa. Directorio actualizado.' });
      if (!isEditing) {
        clearForm();
      }
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center gap-2">
        <UserPlus className="text-indigo-500" size={24} /> 
        {isEditing ? 'Editar Cliente' : 'Formulario de Registro'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Negocio</label>
          <input 
            type="text" 
            required 
            value={formData.negocio}
            onChange={e => setFormData({...formData, negocio: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
            placeholder="Ej. Veterinaria San Roque" 
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Contacto</label>
          <input 
            type="text" 
            required 
            value={formData.contacto}
            onChange={e => setFormData({...formData, contacto: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
            placeholder="Ej. Juan Pérez" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">C.C o NIT</label>
            <input 
              type="number" 
              required 
              value={formData.cc_nit}
              onChange={e => setFormData({...formData, cc_nit: e.target.value})}
              readOnly={isEditing}
              className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isEditing ? 'bg-slate-200 cursor-not-allowed text-slate-500' : 'bg-slate-50 focus:bg-white'}`} 
              placeholder="Sólo números" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Celular</label>
            <input 
              type="number" 
              required 
              value={formData.celular}
              onChange={e => setFormData({...formData, celular: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="Sólo números" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={formData.correo}
              onChange={e => setFormData({...formData, correo: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="Ej. contacto@sanroque.com" 
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad</label>
            <div className="relative">
              <input 
                type="text" 
                required 
                value={formData.ciudad}
                onChange={e => {
                  setFormData({...formData, ciudad: e.target.value});
                  setShowCiudadDropdown(true);
                }}
                onFocus={() => setShowCiudadDropdown(true)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                placeholder="Ej. Medellín" 
              />
              {isSearchingCiudad && <Loader2 className="absolute right-3 top-3 animate-spin text-indigo-500" size={18} />}
            </div>

            {showCiudadDropdown && ciudadResultados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {ciudadResultados.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setFormData({...formData, ciudad: item.Ciudad});
                      setShowCiudadDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <p className="font-medium text-slate-800">{item.Ciudad}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Canales de Venta Habilitados <span className="text-rose-500">*</span></label>
          
          <div className="mb-3">
            <label className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${isAllChecked ? 'border-emerald-500 bg-emerald-100' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}>
              <input type="checkbox" name="ALL" checked={isAllChecked} onChange={handleChannelChange} className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm font-black text-emerald-700">✅ Todos los Canales (C1, C2, C3, C4)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'C1', label: '🏪 Petshop' },
              { id: 'C2', label: '🐾 Peluquerías Pet' },
              { id: 'C3', label: '🏥 Veterinarias' },
              { id: 'C4', label: '🏬 Otros Comercios' }
            ].map(ch => (
              <label key={ch.id} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${channels[ch.id] ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'}`}>
                <input type="checkbox" name={ch.id} checked={channels[ch.id]} onChange={handleChannelChange} className="w-4 h-4 accent-indigo-600" />
                <span className="text-sm font-bold text-slate-700">{ch.label}</span>
              </label>
            ))}
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {status.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            {status.message}
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {isEditing ? 'Actualizar Cliente' : 'Registrar Cliente'}
        </button>
      </form>
    </div>
  );
}