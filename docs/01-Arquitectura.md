bueno# Arquitectura de Avance Fiscal

# Objetivo

Avance Fiscal es un sistema de gestión comercial y facturación electrónica desarrollado para pequeñas y medianas empresas de Argentina.

El objetivo del sistema es centralizar la administración de clientes, proveedores, artículos, compras, ventas, cuentas corrientes y facturación electrónica ARCA en una única plataforma web.

---

# Arquitectura General

La aplicación está compuesta por tres capas principales.

Frontend

- React
- Vite
- Material UI

Backend

- Node.js
- Express

Base de Datos

- PostgreSQL administrado mediante Supabase.

---

# Frontend

El frontend es una Single Page Application (SPA) desarrollada con React.

Su función es brindar la interfaz de usuario, validar datos y comunicarse con el backend y con Supabase.

Principales módulos:

- Dashboard
- Facturación
- Clientes
- Proveedores
- Compras
- Artículos
- Familias
- Usuarios
- Empresas
- Configuración

---

# Backend

El backend está desarrollado con Node.js y Express.

Se encarga de:

- Facturación electrónica ARCA.
- Autorización de comprobantes.
- Generación de CAE.
- Integración con certificados digitales.
- Envío de correos electrónicos.
- Administración de usuarios.
- Lógica de negocio sensible.

---

# Base de Datos

La información del sistema se almacena en PostgreSQL mediante Supabase.

Entre las principales tablas se encuentran:

- empresas
- usuarios
- usuario_empresa
- clientes
- proveedores
- artículos
- familias
- facturas
- detalle_factura
- compras
- detalle_compras
- pagos_clientes
- pagos_proveedores

---

# Autenticación

La autenticación es administrada mediante Supabase Auth.

Características:

- Inicio de sesión mediante correo electrónico.
- Recuperación de contraseña.
- Cambio de contraseña.
- Gestión segura de usuarios.
- Tokens JWT administrados por Supabase.

---

# Storage

Supabase Storage almacena:

- Logos de empresas.
- Certificados digitales (.crt).
- Claves privadas (.key).

---

# Facturación Electrónica

La integración con ARCA permite:

- Facturas.
- Notas de Crédito.
- Remitos.
- Presupuestos.

El backend administra la comunicación con los servicios web oficiales y registra la información fiscal correspondiente.

---

# Infraestructura

Frontend

- Vercel

Backend

- Railway

Base de Datos

- Supabase

Emails

- Resend

Dominio

- avancefiscal.com.ar

---

# Estado del Proyecto

Versión estable:

v1.0.0

Estado:

Producción
