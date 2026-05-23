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

## ✅ Funcionalidades

-   [x] Login / Logout con cookies\
-   [ ] Dashboard con métricas\
-   [] Gestión de productos\
-   [x] Tema oscuro\
-   [x] gestion de usuarios
-   [ ] Ventas\
-   [x] Inventario\
-   [ ] Clientes

------------------------------------------------------------------------


## 👤 Autor

**zexter27**
