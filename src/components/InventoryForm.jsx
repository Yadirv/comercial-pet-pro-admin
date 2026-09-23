import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Plus, Save, Trash2, Loader2, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { findProductsByName, findProductsByRef, processInventoryUpdate } from '../services/inventoryService';

export default function InventoryForm() {
  const [tempInventory, setTempInventory] = useState([]);
  
  // Manual Input State
  const [ref, setRef] = useState('');
  const [producto, setProducto] = useState('');
  const [cantidad, setCantidad] = useState(0);
  const [destacado, setDestacado] = useState('Bajo');
  const [activoB2c, setActivoB2c] = useState(true);

  const [isSearchingProducto, setIsSearchingProducto] = useState(false);
  const [isSearchingRef, setIsSearchingRef] = useState(false);
  const [productoResultados, setProductoResultados] = useState([]);
  const [refResultados, setRefResultados] = useState([]);
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);
  const [showRefDropdown, setShowRefDropdown] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const searchProductos = async () => {
      if (producto.length < 2) {
        setProductoResultados([]);
        return;
      }
      setIsSearchingProducto(true);
      try {
        const { data, error } = await findProductsByName(producto);
        if (!error) setProductoResultados(data || []);
      } catch (error) {
        console.error(error);
      } finally { setIsSearchingProducto(false); }
    };
    const debounce = setTimeout(searchProductos, 300);
    return () => clearTimeout(debounce);
  }, [producto]);

  useEffect(() => {
    const searchRefs = async () => {
      if (ref.length < 2) {
        setRefResultados([]);
        return;
      }
      setIsSearchingRef(true);
      try {
        const { data, error } = await findProductsByRef(ref);
        if (!error) setRefResultados(data || []);
      } catch (error) {
        console.error(error);
      } finally { setIsSearchingRef(false); }
    };
    const debounce = setTimeout(searchRefs, 300);
    return () => clearTimeout(debounce);
  }, [ref]);

  const handleSelectSugerencia = (prod) => {
    setRef(prod.ref || '');
    setProducto(prod.producto || '');
    setShowRefDropdown(false);
    setShowProductoDropdown(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/^\uFEFF/, ''),
      complete: (results) => {
        const data = results.data.map((row, index) => ({
          id: `csv-${Date.now()}-${index}`,
          ref: row.ref ? String(row.ref).trim() : '',
          producto: row.producto ? String(row.producto).trim() : '',
          cantidad: Number(row.cantidad || row.inventario_b2c || 0),
          destacado: (row.producto_destacado || row.destacado || 'Bajo').trim(),
          activo_b2c: row.activo_b2c !== undefined ? String(row.activo_b2c).trim().toLowerCase() === 'true' : true
        })).filter(row => row.ref || row.producto);
        
        setTempInventory(prev => [...prev, ...data]);
      },
      error: (error) => {
        setMessage({ type: 'error', text: `Error al procesar CSV: ${error.message}` });
      }
    });
    e.target.value = null;
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if ((!ref && !producto) || cantidad === '') {
      setMessage({ type: 'error', text: 'Ingresa al menos la Ref o Nombre, y la cantidad.' });
      return;
    }
    
    setTempInventory(prev => [
      ...prev,
      { id: `manual-${Date.now()}`, ref, producto, cantidad: Number(cantidad), destacado, activo_b2c: activoB2c }
    ]);
    
    setRef('');
    setProducto('');
    setCantidad(0);
    setDestacado('Bajo');
    setActivoB2c(true);
    setMessage(null);
  };

  const handleRemoveItem = (id) => {
    setTempInventory(prev => prev.filter(item => item.id !== id));
  };

  const handleProcessInventory = async () => {
    if (tempInventory.length === 0) return;
    
    setIsProcessing(true);
    setMessage(null);
    
    try {
      const { successCount, errorCount } = await processInventoryUpdate(tempInventory);

      setMessage({ 
        type: errorCount > 0 ? 'warning' : 'success', 
        text: `Proceso completado. ${successCount} actualizados, ${errorCount} errores/no encontrados.` 
      });
      
      if (errorCount === 0) {
        setTempInventory([]);
      }
    } catch (error) {
      console.error('Error in processInventory:', error);
      setMessage({ type: 'error', text: 'Error inesperado durante el procesamiento.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Ingreso de Inventarios (B2C)</h2>

      {message && (
        <div className={`p-4 mb-6 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
          message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p>{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Upload size={18} /> Cargar Archivo CSV
            </h3>
            <p className="text-sm text-slate-500 mb-3">El archivo debe contener cabeceras: <code>ref</code>, <code>producto</code>, <code>cantidad</code>, opcionalmente <code>producto_destacado</code> (Alto, Medio, Bajo)</p>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-sm text-slate-400 font-medium">O Ingreso Manual</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <form onSubmit={handleManualAdd} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Referencia (Ref)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={ref}
                  onChange={(e) => {
                    setRef(e.target.value);
                    setShowRefDropdown(true);
                  }}
                  onFocus={() => setShowRefDropdown(true)}
                  placeholder="Ej. PROD-001"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                {isSearchingRef && <Loader2 className="absolute right-3 top-2.5 animate-spin text-indigo-500" size={18} />}
              </div>
              {showRefDropdown && refResultados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {refResultados.map(prod => (
                    <div key={prod.id} onClick={() => handleSelectSugerencia(prod)} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100">
                      <p className="font-medium text-slate-800">{prod.ref}</p>
                      <p className="text-xs text-slate-500">{prod.producto} | Stock actual: {prod.inventario_b2c}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Producto</label>
              <div className="relative">
                <input 
                  type="text"
                  value={producto}
                  onChange={(e) => {
                    setProducto(e.target.value);
                    setShowProductoDropdown(true);
                  }}
                  onFocus={() => setShowProductoDropdown(true)}
                  placeholder="Buscar por nombre..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                {isSearchingProducto && <Loader2 className="absolute right-3 top-2.5 animate-spin text-indigo-500" size={18} />}
              </div>
              {showProductoDropdown && productoResultados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {productoResultados.map(prod => (
                    <div key={prod.id} onClick={() => handleSelectSugerencia(prod)} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100">
                      <p className="font-medium text-slate-800">{prod.producto}</p>
                      <p className="text-xs text-slate-500">Ref: {prod.ref} | Stock actual: {prod.inventario_b2c}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad a sumar/asignar</label>
                <input 
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Destacado (B2C)</label>
                <select 
                  value={destacado}
                  onChange={(e) => setDestacado(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  <option value="Alto">Alto</option>
                  <option value="Medio">Medio</option>
                  <option value="Bajo">Bajo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Público en Ecommerce?</label>
                <select 
                  value={activoB2c ? 'true' : 'false'}
                  onChange={(e) => setActivoB2c(e.target.value === 'true')}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  <option value="true">Sí (Activo)</option>
                  <option value="false">No (Oculto)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 py-2 px-4 rounded-xl font-bold transition-colors"
            >
              <Plus size={18} /> Agregar a Lista
            </button>
          </form>
        </div>

        <div className="flex flex-col">
          <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">Lista por Inyectar ({tempInventory.length})</h3>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto max-h-[400px]">
              {tempInventory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Lista vacía. Añade productos o sube un CSV.
                </div>
              ) : (
                <ul className="space-y-2">
                  {tempInventory.map((item) => (
                    <li key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <div className="text-sm">
                        <p className="font-medium text-slate-800">{item.producto || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500">
                          Ref: {item.ref || 'N/A'} | Cant: <span className="font-bold text-indigo-600">+{item.cantidad}</span> | 
                          Destacado: <span className="font-bold text-amber-500">{item.destacado}</span> | 
                          Público: <span className={`font-bold ${item.activo_b2c ? 'text-emerald-500' : 'text-red-500'}`}>{item.activo_b2c ? 'Sí' : 'No'}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              <button
                onClick={handleProcessInventory}
                disabled={tempInventory.length === 0 || isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-bold transition-colors"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Procesar e Inyectar en BD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
