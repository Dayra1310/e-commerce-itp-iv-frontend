# ShopITP - Frontend

## Qué es

Frontend de ShopITP, e-commerce de tableros y madera. Es **HTML/CSS/JS puro** (sin frameworks), servido con **Live Server** de VS Code.

## Requisitos

- **VS Code** con la extensión **Live Server** instalada
- El backend corriendo en `http://localhost:3001`

## Cómo iniciar

```bash
# 1. Abrir la carpeta frontend/ en VS Code
code frontend/

# 2. Click derecho en src/page/catalogo.html → "Open with Live Server"
#    (o cualquiera de las páginas .html)

# 3. Se abre en http://localhost:5500/src/page/catalogo.html
```

> **Importante**: Si Live Server abre en puerto 5501, está bien también. El backend acepta ambos.

## Estructura de archivos

```
frontend/
├── src/
│   ├── page/               ← Páginas HTML
│   │   ├── catalogo.html   ← Catálogo de productos (NUESTRO)
│   │   ├── perfil.html     ← Perfil de usuario (NUESTRO)
│   │
│   └── logica/             ← JavaScript
│       ├── catalogo.js     ← Lógica del catálogo (NUESTRO)
│       ├── perfil.js       ← Lógica del perfil (NUESTRO)
│
└── public/
    └── css/                ← Estilos
        ├── catalogo.css    ← Estilos del catálogo (NUESTRO)
        ├── perfil.css      ← Estilos del perfil (NUESTRO)
        └── auth.css        ← Estilos del Auth (NUESTRO)
``` 

## Cómo funciona la conexión con el backend

### configuracion-api.js

Este archivo crea `window.clienteApi` que usan TODOS los módulos. Hace 3 cosas:

1. Busca la URL del backend en este orden:
   - Meta tag `<meta name="api-base-url">` del HTML
   - `localStorage` clave `ECOMMERCE_API_BASE_URL`
   - Auto-detecta: mismo hostname, puerto 3001

2. Expone estas funciones:
   ```js
   window.clienteApi.solicitarJson(ruta, opciones)  // fetch con credentials: "include"
   window.clienteApi.construirUrl(ruta)              // URL completa
   window.clienteApi.construirUrlImagen(nombre)      // URL de imagen en /uploads/
   window.clienteApi.baseUrl                          // "http://localhost:3001"
   ```

3. Siempre envía `credentials: "include"` para que las cookies JWT funcionen

### Rutas relativas

Todas las rutas entre páginas usan `../` (relativas):
```html
<link rel="stylesheet" href="../../public/css/perfil.css">
<script src="../logica/perfil.js"></script>
<a href="catalogo.html">
```

## Páginas (nuestro módulo)

### Catálogo (`catalogo.html`)

- Lista productos desde `GET /catalog/products`
- Filtra por categoría desde `GET /catalog/products/categoria/:id`
- Busca productos con query param
- Filtra por rango de precios
- Ordena por nombre, precio, etc.
- Modal de detalle al hacer click en un producto
- Botón de carrito (redirige a carrito.html)

### Perfil (`perfil.html`)

- Muestra datos del usuario desde `GET /client/profile`
- Si no hay sesión, muestra pantalla "Iniciar Sesión"
- Editar nombre y teléfono con `PUT /client/profile`
- Cambiar contraseña con `PUT /client/password`
- Toggle modo oscuro/claro
- Cerrar sesión
- Acciones rápidas: ir al catálogo, ir al carrito

## Tema oscuro/claro

- Se guarda en `localStorage` clave `shopitp_theme`
- Se activa con `document.body.classList.add('dark')`
- Las variables CSS están en `tema.css` y `styles.css`
- NO modificar esos archivos, usar las variables que ya existen:
  ```css
  color: var(--text-primary);
  background: var(--card-bg);
  /* Versión dark: */
  body.dark .mi-elemento { color: var(--dark-text-primary); }
  ```



## Datos de prueba (MySQL)

Usuarios en la base de datos `ecommerce_tableros_02`:

| Email | Password | Rol |
|-------|----------|-----|
| edwin@gmail.com | (preguntar al equipo) | Admin |
| sebas@gmail.com | (preguntar al equipo) | Admin |
| ana@gmail.com | (preguntar al equipo) | Cliente |
| daira@gmail.com | (preguntar al equipo) | Admin |

> Las contraseñas están hasheadas con bcrypt. Preguntar al equipo cuáles son.

## Troubleshooting

### "No se encontró window.clienteApi"
- Verificar que `configuracion-api.js` se carga ANTES que los otros scripts
- Verificar el orden en el HTML:
  ```html
  <script src="../logica/configuracion-api.js"></script>
  <script src="../logica/perfil.js"></script>
  ```

### El perfil muestra "invitado" o datos vacíos
- Verificar que el backend esté corriendo en puerto 3001
- Verificar que el usuario haya iniciado sesión antes (cookie `access_token`)
- Probar: `GET http://localhost:3001/client/profile` con la cookie

### CORS error
- Verificar que Live Server abra en puerto 5500 o 5501
- Si abre en otro puerto, pedir al compañero que lo agregue en `index.js`

### CSS no carga
- Verificar las rutas relativas `../../public/css/`
- Verificar que el archivo CSS exista en la carpeta correcta
