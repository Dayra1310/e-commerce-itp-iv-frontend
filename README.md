<<<<<<< HEAD
# Sistema de Ventas de Tableros e-commerce itp IV
=======
# Sistema de Ventas de Tableros Corp
>>>>>>> 92bc2ef (conecte front con el back de edwin)

Aplicación web de e-commerce para gestión de productos y ventas. Incluye dashboard, autenticación JWT y gestión de productos.

## Requisitos

- **Node.js:** 24.14.0
- **MySQL:** 8.0+
- **Backend:** Puerto 4200
- **Frontend:** Puerto 5500 (Live Server)

## Instalación

```bash
# 1. Backend
cd e-commerce-itp-iv-backend
npm install

# 2. Frontend
cd e-commerce-itp-iv-frontend
npm install
```

## Configuración

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=prueba

PORT=4200
JWT_SECRET=tu-secret-key
JWT_EXPIRES_IN=7d
```

## Ejecución

```bash
# Terminal 1 - Backend
cd e-commerce-itp-iv-backend
npm run dev

# Terminal 2 - Frontend
# Abrir con Live Server: src/page/login.html
```

## Endpoints del Backend

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Iniciar sesión | No |
| POST | `/auth/register` | Registrar usuario | No |
| GET | `/api/productos` | Listar productos | Sí |
| GET | `/api/productos/search?q=` | Buscar productos | Sí |
| GET | `/api/dashboard` | Datos del dashboard | Sí |
| GET | `/api/verificar` | Verificar token | Sí |
| GET | `/api/sesiones` | Sesiones activas | Sí |
| POST | `/api/cerrar-sesion` | Cerrar sesión | Sí |
| GET | `/health` | Health check | No |


## Estructura del Proyecto

```
src/
├── page/          # Páginas HTML
│   ├── login.html
│   ├── dashboard.html
│   └── productos.html
├── css/           # Estilos CSS
├── img/           # Imágenes
└── logica/        # JavaScript del frontend
    ├── login-front.js   # Auth y API calls
    ├── api.js           # Cliente API
    ├── dashboard.js     # Lógica del dashboard
    └── productos.js     # Lógica de productos
```

## Funcionalidades

<<<<<<< HEAD
* Dashboard con información (obvio de ejemplo)
* Inicio de sesión básico
* Cierre de sesión

## Tecnologías utilizadas

* HTML5
* CSS
* JavaScript (typescript no quiso ejecutarse sin compilar(js no me haria esto))

## Estructura del proyecto
```
Dentro de src estan todos los archivos
src/css
src/js
src/img (imagen de ejemplo)
src/page/index.html
```
## versiones de node
24.14.0
## Estado del proyecto

En desarrollo, aun estoy aprendiendo a usar git :D

## Notas
odio a todos
## Autor
* zexter27
=======
- [x] Login/Logout con JWT
- [x] Dashboard con métricas
- [x] Gestión de productos
- [x] Tema oscuro
- [x] Sesiones múltiples
- [ ] Ventas
- [ ] Inventario
- [ ] Clientes

## Autor

zexter27
>>>>>>> 92bc2ef (conecte front con el back de edwin)
