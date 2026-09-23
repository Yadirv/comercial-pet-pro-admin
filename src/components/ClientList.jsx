import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, RotateCcw, Pen, Trash2, FileText, Loader2, AlertTriangle } from 'lucide-react';

export default function ClientList({ onEdit, onOpenPdf }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('clientes_b2b').select('*').order('negocio', { ascending: true });
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (client) => {
    if (!window.confirm(`¿Estás seguro que deseas ELIMINAR al cliente ${client.negocio}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      const { error } = await supabase.from('clientes_b2b').delete().eq('cc_nit', client.cc_nit);
      if (error) throw error;
      fetchClients();
    } catch (err) {
      alert('Error al intentar eliminar: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <Loader2 className="animate-spin mx-auto mb-4" size={40} />
        <p className="font-bold">Cargando clientes desde Supabase...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-rose-500">
        <AlertTriangle className="mx-auto mb-4" size={40} />
        <p className="font-bold">Error al cargar clientes: {error}</p>
        <button onClick={fetchClients} className="mt-4 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-bold text-sm transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="text-indigo-500" size={24} /> Listado de Clientes
        </h2>
        <button onClick={fetchClients} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors w-full sm:w-auto justify-center">
          <RotateCcw size={16} /> Refrescar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
          <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Negocio</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">C.C / NIT</th>
              <th className="px-4 py-3">Celular</th>
              <th className="px-4 py-3">Canales Habilitados</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400">No hay clientes registrados.</td></tr>
            ) : (
              clients.map((client) => (
                <tr key={client.cc_nit} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{client.negocio}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{client.contacto}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{client.cc_nit}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{client.celular}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {client.canales ? (
                      client.canales.split(',').map((c, i) => (
                        <span key={i} className="inline-block bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded mr-1">
                          {c.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="inline-block bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded">SIN CANAL</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    <button onClick={() => onEdit(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Pen size={18} /></button>
                    <button onClick={() => handleDelete(client)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18} /></button>
                    <button onClick={() => onOpenPdf(client)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Exportar Catálogo PDF"><FileText size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
