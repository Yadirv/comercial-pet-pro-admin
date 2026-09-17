# PROMPT MAESTRO: Implementación de Pestaña "Pedidos Express"

## 📋 PROBLEMA A RESOLVER

El usuario solicita crear una **nueva pestaña "Pedidos Express"** que fusione de forma **simplificada** los campos de dos pestañas existentes:

| Pestaña Original | Campos Actuales | **Campos a Conservar en "Pedidos Express"** |
|------------------|-----------------|---------------------------------------------|
| **Crear Nuevo Cliente** (`ClientForm.jsx`) | Negocio, Contacto, C.C/NIT, Celular, **Correo**, **Canales (C1-C4)** | ✅ **Negocio, Contacto, C.C/NIT, Celular**<br>❌ Eliminar: Correo, Canales C1-C4 |
| **Pedidos B2B** (`OrdersForm.jsx`) | Cliente (select), **Dirección, Ciudad, Contacto, Email, Celular**, Producto, Cantidad | ✅ **Producto, Cantidad**<br>❌ Eliminar: Selector cliente, Dirección, Ciudad, Contacto, Email, Celular |

**Objetivo:** Un formulario **mínimo y rápido** (4 campos cliente + 2 campos pedido = 6 campos totales) que en **UN SOLO SUBMIT**:
1. Cree/actualice cliente en `clientes_b2b` (solo 4 campos + canales por defecto)
2. Cree pedido en `petpro_pedidos` (con producto + cantidad)
3. Descuente inventario en `petpro_productos` (heredar lógica de `OrdersForm`/`ClientOrderForm`)

---

## 🧠 ANÁLISIS DE LA ARQUITECTURA ACTUAL

### Tablas Supabase Involucradas
| Tabla | Propósito | Usada por |
|-------|-----------|-----------|
| `clientes_b2b` | Clientes B2B (PK: `cc_nit`) | `ClientForm`, `ClientOrderForm`, `OrdersForm` (read) |
| `petpro_pedidos` | Pedidos B2B (FK: `cc_nit`) | `OrdersForm`, `ClientOrderForm` |
| `petpro_productos` | Inventario B2C (stock) | `OrdersForm`, `ClientOrderForm`, `InventoryForm` |

### Lógica de Inserción Existente (Reutilizar)

**1. ClientForm.jsx:62-118** → `handleSubmit`
- Crea usuario en Supabase Auth (si nuevo) usando `supabaseAdmin`
- `upsert` en `clientes_b2b` con: `negocio, contacto, cc_nit, celular, correo, canales`
- **Para Pedidos Express**: Eliminar `correo` y `canales` (usar valor por defecto o `null`)

**2. OrdersForm.jsx:100-179** → `handleSubmit`
- Inserta en `petpro_pedidos`: `cc_nit, cantidad, direccion_b2b, ciudad, estado, detalles_json`
- Actualiza `petpro_productos.inventario_b2c` (descuenta stock)
- **Para Pedidos Express**: Eliminar `direccion_b2b`, `ciudad` (usar defaults o `null`)

**3. ClientOrderForm.jsx:134-234** → `handleSubmit` (REFERENCIA IDEAL)
- **Ya hace exactamente lo que se pide**: Un solo submit → crea cliente + crea pedido + descuenta stock
- **Diferencia**: Tiene TODOS los campos. Pedidos Express = versión minimalista de este componente.

---

## 🎯 ESTRATEGIA LÓGICA DE SOLUCIÓN

### OPCIÓN RECOMENDADA: Crear componente `ExpressOrderForm.jsx` basado en `ClientOrderForm.jsx`

**Por qué NO modificar componentes existentes:**
- `ClientForm.jsx` → Usado en pestaña "Crear/Editar Cliente" (necesita correo + canales)
- `OrdersForm.jsx` → Usado en pestaña "Pedidos B2B" (necesita selector cliente + dirección)
- `ClientOrderForm.jsx` → Usado en pestaña "Cliente + Pedido" (necesita TODOS los campos)
- **Pedidos Express = NUEVO CASO DE USO** → Nuevo componente = Cero riesgo de regresión

### PASOS DE IMPLEMENTACIÓN

#### 1. Crear `src/components/ExpressOrderForm.jsx`
**Estructura del estado (6 campos + producto):**
```javascript
const [formData, setFormData] = useState({
  negocio: '',      // Nombre del Negocio
  contacto: '',     // Nombre del Contacto
  cc_nit: '',       // C.C o NIT
  celular: ''       // Celular
});
const [productoSearch, setProductoSearch] = useState('');
const [selectedProducto, setSelectedProducto] = useState(null);
const [cantidad, setCantidad] = useState(1);
```

**Lógica `handleSubmit` (fusionar ClientOrderForm:134-234 + simplificar):**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  // Validaciones mínimas: 4 campos cliente + producto + cantidad > 0
  
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    // 1. UPSERT CLIENTE (solo 4 campos + canales default)
    const clientPayload = {
      negocio: formData.negocio,
      contacto: formData.contacto,
      cc_nit: formData.cc_nit,
      celular: formData.celular,
      correo: null,           // ← NUEVO: null en lugar de requerido
      canales: 'C1',          // ← NUEVO: default 'C1' o string vacío
      direccion: null,
      ciudad: null
    };
    await supabase.from('clientes_b2b').upsert(clientPayload);
    
    // 2. INSERT PEDIDO (simplificado)
    await supabase.from('petpro_pedidos').insert([{
      cc_nit: formData.cc_nit,
      cantidad: Number(cantidad),
      direccion_b2b: 'Express - Sin dirección',  // default
      ciudad: 'Sin ciudad',                        // default
      estado: 'Pendiente',
      detalles_json: {
        producto_id: selectedProducto.id,
        producto: selectedProducto.producto,
        negocio: formData.negocio,
        user_id: userData.user?.id,
        tipo: 'express'  // ← marcador para reportes
      }
    }]);
    
    // 3. DESCONTAR INVENTARIO (copiar lógica OrdersForm:152-165)
    const stockActual = parseInt(selectedProducto.inventario_b2c) || 0;
    const nuevoStock = Math.max(0, stockActual - Number(cantidad));
    await supabase
      .from('petpro_productos')
      .update({ inventario_b2c: nuevoStock })
      .eq('ref', selectedProducto.ref || selectedProducto.id);
    
    // Success + reset form
  } catch (err) { /* error handling */ }
};
```

#### 2. Registrar pestaña en `App.jsx`
```javascript
// Import
import ExpressOrderForm from './components/ExpressOrderForm';

// State
const [activeTab, setActiveTab] = useState('directory');
// Agregar 'express' como tab válido

// Tab bar (línea ~78-95)
<button 
  onClick={() => { setActiveTab('express'); setEditingClient(null); }}
  className={activeTab === 'express' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-indigo-600'}
>
  <Zap size={18} /> Pedidos Express
</button>

// Render (línea ~114-125)
{activeTab === 'express' && <ExpressOrderForm />}
```

#### 3. Importar icono `Zap` en `App.jsx`
```javascript
import { ..., Zap } from 'lucide-react';
```

---

## ⚠️ PUNTOS CRÍTICOS A CONSIDERAR

### 1. **Supabase Auth (creación de usuario)**
- `ClientForm` y `ClientOrderForm` usan `supabaseAdmin.auth.admin.createUser()` con `email` y `password=cc_nit`
- **Pedidos Express NO TIENE EMAIL** → **NO crear usuario en Auth** (solo upsert en `clientes_b2b`)
- Si el cliente ya existe, `upsert` actualiza; si no, crea sin auth (cliente "express" sin acceso a portal)

### 2. **Campos NOT NULL en `clientes_b2b`**
Verificar esquema Supabase. Si `correo` o `canales` son `NOT NULL`:
- `correo`: usar `'express@pedido.local'` o `''` (string vacío)
- `canales`: usar `'C1'` (default) o `''`

### 3. **Campos requeridos en `petpro_pedidos`**
Verificar si `direccion_b2b` y `ciudad` son `NOT NULL`. Usar defaults:
```javascript
direccion_b2b: 'Pedidos Express - Sin dirección',
ciudad: 'Sin especificar'
```

### 4. **Búsqueda de Producto**
Reutilizar lógica de `ClientOrderForm` (líneas 102-132): debounce 300ms, búsqueda `ilike` en `petpro_productos`, dropdown con stock visible.

### 5. **Feedback Visual**
- Loading state en botón (`isSubmitting`)
- Toast/Message: éxito (verde) / error (rojo)
- Auto-reset form a los 1.5s tras éxito (como `ClientForm`)

---

## 📦 ARCHIVOS A MODIFICAR/CREAR

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| **CREAR** | `src/components/ExpressOrderForm.jsx` | Componente principal (6 campos + búsqueda producto) |
| **MODIFICAR** | `src/App.jsx` | Importar componente, agregar tab "Pedidos Express", icono `Zap` |
| **VERIFICAR** | `src/lib/supabase.js` | Confirmar export de `supabase` y `supabaseAdmin` (ya existe) |

---

## ✅ CRITERIOS DE ACEPTACIÓN

1. [ ] Nueva pestaña **"Pedidos Express"** visible en barra de tabs (icono ⚡ Zap)
2. [ ] Formulario muestra **exactamente 6 inputs**:
   - Nombre del Negocio (requerido)
   - Nombre del Contacto (requerido)
   - C.C o NIT (requerido, numérico)
   - Celular (requerido, numérico)
   - Producto (búsqueda autocomplete, requerido)
   - Cantidad (number, min=1, requerido)
3. [ ] **NO muestra**: Correo, Canales C1-C4, Dirección, Ciudad, Selector de cliente existente
4. [ ] Al submit:
   - Upsert en `clientes_b2b` con 4 campos + defaults
   - Insert en `petpro_pedidos` con producto + cantidad + defaults
   - Update `petpro_productos.inventario_b2c` (descuenta stock)
5. [ ] Feedback visual: loading, éxito, error
6. [ ] Form se limpia tras éxito
7. [ ] No rompe pestañas existentes: "Directorio", "Crear Cliente", "Pedidos B2B", "Cliente+Pedido", "Inventarios"
8. [ ] Lint + TypeCheck pasan (`npm run lint` / `npm run typecheck`)

---

## 🧪 TESTING MANUAL RECOMENDADO

1. **Crear pedido express nuevo cliente**: Llenar 6 campos → Submit → Verificar en Supabase: `clientes_b2b` (nuevo row), `petpro_pedidos` (nuevo row), `petpro_productos` (stock - cantidad)
2. **Crear pedido express cliente existente**: Usar mismo C.C/NIT → Submit → Verificar `clientes_b2b` hace **upsert** (no duplicado), pedido creado
3. **Validaciones**: Submit sin campos → error. Cantidad 0 → error. Producto no seleccionado → error.
4. **Stock insuficiente**: Pedir más de stock → Verificar que stock no va negativo (Math.max(0, ...))
5. **Regresión**: Navegar a otras pestañas, confirmar que funcionan igual que antes.