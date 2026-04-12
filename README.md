# Sistema de Ventas de Tableros Corp

Aplicación web de e-commerce para gestión de productos y ventas. Incluye
dashboard, autenticación con JWT y gestión de productos.

------------------------------------------------------------------------

## 🚀 Requisitos

-   **Node.js:** 24.14.0\
-   **MySQL:** 8.0+\
-   **Backend:** Puerto 4200\
-   **Frontend:** Puerto 5500 (Live Server)

------------------------------------------------------------------------

## 📦 Instalación

``` bash
# 1. Backend
cd e-commerce-itp-iv-backend
npm install

# 2. Frontend
cd e-commerce-itp-iv-frontend
npm install
```

------------------------------------------------------------------------

## ⚙️ Configuración

### Backend (.env)

``` env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=prueba

PORT=4200
JWT_SECRET=tu-secret-key
JWT_EXPIRES_IN=7d
```

------------------------------------------------------------------------

## ▶️ Ejecución

``` bash
# Terminal 1 - Backend
cd e-commerce-itp-iv-backend
npm run dev

# Terminal 2 - Frontend
# Abrir con Live Server:
src/page/login.html
```

------------------------------------------------------------------------

## 🔗 Endpoints del Backend

  Método   Ruta                         Descripción           Auth
  -------- ---------------------------- --------------------- ------
  POST     `/auth/login`                Iniciar sesión        No
  POST     `/auth/register`             Registrar usuario     No
  GET      `/api/productos`             Listar productos      Sí
  GET      `/api/productos/search?q=`   Buscar productos      Sí
  GET      `/api/dashboard`             Datos del dashboard   Sí
  GET      `/api/verificar`             Verificar token       Sí
  GET      `/api/sesiones`              Sesiones activas      Sí
  POST     `/api/cerrar-sesion`         Cerrar sesión         Sí
  GET      `/health`                    Health check          No

------------------------------------------------------------------------

## 📁 Estructura del Proyecto

    src/
    ├── page/              # Páginas HTML
    │   ├── login.html
    │   ├── dashboard.html
    │   └── productos.html
    ├── css/               # Estilos CSS
    ├── img/               # Imágenes
    └── logica/            # JavaScript del frontend
        ├── login-front.js
        ├── api.js
        ├── dashboard.js
        └── productos.js

------------------------------------------------------------------------

## ✅ Funcionalidades

-   [x] Login / Logout con JWT\
-   [x] Dashboard con métricas\
-   [x] Gestión de productos\
-   [x] Tema oscuro\
-   [x] Sesiones múltiples\
-   [ ] Ventas\
-   [ ] Inventario\
-   [ ] Clientes

------------------------------------------------------------------------

Notas adicionales:
1. yo se que edwin me va a pegar por haberle cambiado el tiempo del token (opencode no opencodio)
2. debo corregir cosas del propio css ya que no quedaron bien implementadas
------------------------------------------------------------------------

## 👤 Autor

**zexter27**
