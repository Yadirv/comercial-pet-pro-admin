# 🛠️ Comercial Pet Pro Admin — Backoffice de Gestión Centralizada

> Panel de administración y backoffice dedicado en **React 19** y **Tailwind CSS v4** para la administración de clientes corporativos (`clientes_b2b`), control de inventarios (`petpro_productos`), procesamiento de pedidos (`petpro_pedidos`) y arquitectura de visibilidad multi-canal *Soft Filter*.

![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38bdf8?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-BaaS_%26_PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)

---

## 📑 Tabla de Contenidos
1. [Descripción del Backoffice](#-descripción-del-backoffice)
2. [Arquitectura de Soft-Filter Multi-Canal](#-arquitectura-de-soft-filter-multi-canal)
3. [Módulos Principales](#-módulos-principales)
4. [Stack Tecnológico](#-stack-tecnológico)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Instalación y Despliegue](#-instalación-y-despliegue)

---

## 💡 Descripción del Backoffice

Este panel centraliza la operación logística y comercial de la suite PetPro:

* **Gestión de Clientes B2B:** Registro, edición y asignación de términos comerciales a veterinarias y distribuidores en la tabla `clientes_b2b`.
* **Administración de Inventarios:** Control de existencias, precios de costo, precios de venta y márgenes de ganancia.
* **Autocompletado de Ciudades:** Validación en tiempo real conectada al catálogo oficial `cod_ciudades`.
* **Procesamiento de Pedidos:** Visualización de pedidos B2B y B2C ingresados a `petpro_pedidos`.

---

## 🛡️ Arquitectura de Soft-Filter Multi-Canal

Para evitar duplicar registros en bases de datos separadas, el sistema utiliza un catálogo central (`petpro_productos`) con una columna booleana `activo_b2c`:
* **Canal B2B (`comercial-pet-pro`):** Visualiza todo el catálogo disponible.
* **Canal B2C (`ecommerce-mascotas-colombia`):** Aplica automáticamente el filtro `activo_b2c = true`.
* **Panel Admin:** Permite activar o desactivar la visibilidad de cualquier producto en el e-commerce B2C con un solo toggle sin borrarlo de la base comercial.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React.
* **Capa de Servicios:** Arquitectura desacoplada en `src/services/` y cliente Supabase en `src/lib/`.
* **Base de Datos:** Supabase (PostgreSQL).

---

## 📂 Estructura del Proyecto

```
comercial-pet-pro-admin/
├── docs/                           # Documentación de requerimientos y guías maestras
│   └── PROMPT_MAESTRO_PEDIDOS_EXPRESS.md
├── public/
├── src/
│   ├── components/                 # Tablas de pedidos, formularios de clientes y modales
│   ├── lib/                        # Inicialización de clientes (Supabase)
│   ├── services/                   # Servicios CRUD (pedidosService, productosService, clientesService)
│   ├── App.jsx                     # Dashboard administrativo principal
│   └── main.jsx
├── scripts/                        # Scripts de prueba y verificación
├── .env.example
├── package.json
└── vite.config.js
```

---

## 💻 Instalación y Despliegue

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Iniciar en modo desarrollo
npm run dev

# 4. Compilar para producción
npm run build
```
