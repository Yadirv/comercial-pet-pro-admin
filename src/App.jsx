import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import PdfModal from './components/PdfModal';
import OrdersForm from './components/OrdersForm';
import ClientOrderForm from './components/ClientOrderForm';
import InventoryForm from './components/InventoryForm';
import PedidosExpress from './components/PedidosExpress';
import { ShieldHalf, Users, UserPlus, LogOut, ShoppingCart, PackagePlus, GitMerge, Zap } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('directory');
  const [editingClient, setEditingClient] = useState(null);
  const [pdfClient, setPdfClient] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setActiveTab('new');
  };

  const handleOpenPdf = (client) => {
    setPdfClient(client);
  };

  if (!session) {
    return <Auth onLogin={setSession} />;
  }

  return (
    <div className="bg-slate-50 min-h-screen p-2 md:p-8">
      <div className="w-full max-w-[1600px] mx-auto bg-white rounded-t-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center text-white gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <ShieldHalf size={40} className="hidden sm:block" />
            <div>
              <h1 className="text-xl md:text-2xl font-black">Panel de Administración B2B</h1>
              <p className="text-indigo-100 text-xs md:text-sm mt-1">Gestión de Clientes y Exportación de Catálogos</p>
            </div>
          </div>
          <div>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-xl transition-colors text-sm font-bold border border-indigo-500">
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full px-2 sm:px-6 bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap">
          <button 
            onClick={() => { setActiveTab('directory'); setEditingClient(null); }} 
            className={`w-full sm:w-auto justify-center px-4 py-3 sm:py-4 flex items-center gap-2 transition-colors text-sm sm:text-base border-b-2 font-medium ${activeTab === 'directory' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            <Users size={18} /> Directorio de Clientes
          </button>
          <button 
            onClick={() => { setActiveTab('new'); setEditingClient(null); }} 
            className={`w-full sm:w-auto justify-center px-4 py-3 sm:py-4 flex items-center gap-2 transition-colors text-sm sm:text-base border-b-2 font-medium ${activeTab === 'new' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            <UserPlus size={18} /> {editingClient ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
          </button>
          <button 
            onClick={() => { setActiveTab('orders'); setEditingClient(null); }} 
            className={`w-full sm:w-auto justify-center px-4 py-3 sm:py-4 flex items-center gap-2 transition-colors text-sm sm:text-base border-b-2 font-medium ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            <ShoppingCart size={18} /> Pedidos B2B
          </button>
          <button 
            onClick={() => { setActiveTab('clientOrder'); setEditingClient(null); }} 
            className={`w-full sm:w-auto justify-center px-4 py-3 sm:py-4 flex items-center gap-2 transition-colors text-sm sm:text-base border-b-2 font-medium ${activeTab === 'clientOrder' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            <GitMerge size={18} /> Cliente + Pedido
          </button>
          <button 
            onClick={() => { setActiveTab('inventory'); setEditingClient(null); }} 
            className={`w-full sm:w-auto justify-center px-4 py-3 sm:py-4 flex items-center gap-2 transition-colors text-sm sm:text-base border-b-2 font-medium ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
          >
            <PackagePlus size={18} /> Ingreso Inventarios
          </button>
          <button 
            onClick={() => { setActiveTab('pedidosExpress'); setEditingClient(null); }} 
            className={`w-full sm:w-auto justify-center px-4 py-3 sm:py-4 flex items-center gap-2 transition-colors text-sm sm:text-base border-b-2 font-medium ${activeTab === 'pedidosExpress' ? 'border-amber-500 text-amber-600 font-bold' : 'border-transparent text-slate-500 hover:text-amber-600'}`}
          >
            <Zap size={18} /> Pedidos Express
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto bg-white rounded-b-3xl shadow-sm border border-slate-200 border-t-0 p-4 sm:p-8 min-h-[500px]">
        {activeTab === 'directory' && (
          <ClientList 
            onEdit={handleEdit} 
            onOpenPdf={handleOpenPdf} 
          />
        )}
        
        {activeTab === 'new' && (
          <ClientForm 
            clientToEdit={editingClient} 
            onSuccess={() => { setActiveTab('directory'); setEditingClient(null); }} 
          />
        )}

        {activeTab === 'orders' && (
          <OrdersForm />
        )}

        {activeTab === 'clientOrder' && (
          <ClientOrderForm />
        )}

        {activeTab === 'inventory' && (
          <InventoryForm />
        )}

        {activeTab === 'pedidosExpress' && (
          <PedidosExpress />
        )}
      </div>

      {pdfClient && (
        <PdfModal 
          client={pdfClient} 
          onClose={() => setPdfClient(null)} 
        />
      )}
    </div>
  );
}

export default App;
