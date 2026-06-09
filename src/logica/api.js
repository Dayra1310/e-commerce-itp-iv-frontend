/* ============================================
   ShopITP - Módulo Catálogo y Clientes
   API Client & Shared JS

   IMPORTANTE:
   - La sesión NO se guarda en localStorage.
   - El backend autentica con cookie httpOnly access_token.
   - Los datos del usuario se consultan por API cuando se necesitan.

   Configuración que debes coordinar con tu compañero:
   - LOGIN_PAGE: ruta al login.

   Backend: Express + MySQL/SQLite en puerto 3001 (server.js)
   TODOS los endpoints devuelven { success, data: ... } o { error: "..." }

   Auth:
   - POST /auth/register  body: { name, email, phone, password }
   - POST /login          body: { email, password } → crea cookie httpOnly access_token

   Catalog:
   - GET  /catalog/products?category=id → { success, data: Product[] }  (campos: categoria_id, categoria_nombre)
   - GET  /catalog/products/:id        → { success, data: Product }
   - GET  /catalog/categories          → { success, data: Category[] }  (campos: categoria_padre_id)

   Client (requiere cookie httpOnly de sesión):
   - GET  /client/profile → { success, data: { id, name, email, phone, createdAt } }
   - PUT  /client/user    → { success } body: { nombre?, telefono? }
   ============================================ */

// Auto-detectar: si la pagina es servida por el backend, usar URL relativa (evita CORS)
const API_BASE_URL = (window.location.origin === 'http://localhost:3001') ? '' : 'http://localhost:3001';

// ---- CONFIG: Coordinar con el compañero de auth ----
const LOGIN_PAGE = 'login.html';
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

// ---- Toast Notifications ----
function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<span>' + message + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';
  container.appendChild(toast);

  setTimeout(function() {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

// ---- Auth Helpers con cookie httpOnly ----
function getToken() {
  // El token vive en una cookie httpOnly. JavaScript no debe leerlo ni guardarlo.
  return '';
}

function getUser() {
  // Los datos del usuario se consultan por API, no desde localStorage.
  return null;
}

function isLoggedIn() {
  // La cookie httpOnly no es visible desde JS; la validación real la hace el backend.
  return true;
}

function goToLogin() {
  window.location.href = LOGIN_PAGE;
}

async function logout() {
  try {
    await apiRequest('/logout', { method: 'POST', skipAuthRedirect: true });
  } catch (e) {}
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem('shopitp_user');
  goToLogin();
}

async function obtenerUsuarioActual() {
  try {
    var res = await apiRequest('/client/profile', { skipAuthRedirect: true });
    if (res.success && res.data) return res.data;
    if (res.ok) return res.data || res;
  } catch (e) {}
  return null;
}

async function updateNavbar() {
  var user = await obtenerUsuarioActual();
  var actionsEl = document.getElementById('navbar-actions');
  if (!actionsEl) return;

  // Cart count
  var cart = getCartItems();
  var cartTotal = cart.reduce(function(sum, item) { return sum + (item.quantity || 0); }, 0);

  if (user) {
    var displayName = user.name || user.nombre || 'Usuario';
    actionsEl.innerHTML =
      '<a href="carrito.html" class="btn btn-ghost btn-sm" style="gap:0.375rem;position:relative;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' +
        (cartTotal > 0 ? '<span style="position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:0.625rem;font-weight:700;color:#fff;background:var(--accent-blue);border-radius:9999px;padding:0 4px;">' + (cartTotal > 99 ? '99+' : cartTotal) + '</span>' : '') +
      '</a>' +
      '<a href="perfil.html" class="btn btn-ghost btn-sm" style="gap:0.375rem;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        displayName +
      '</a>' +
      '<button onclick="logout()" class="btn btn-outline btn-sm">Salir</button>';
  } else {
    actionsEl.innerHTML =
      '<a href="carrito.html" class="btn btn-ghost btn-sm" style="gap:0.375rem;position:relative;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' +
        (cartTotal > 0 ? '<span style="position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:0.625rem;font-weight:700;color:#fff;background:var(--accent-blue);border-radius:9999px;padding:0 4px;">' + (cartTotal > 99 ? '99+' : cartTotal) + '</span>' : '') +
      '</a>' +
      '<a href="' + LOGIN_PAGE + '" class="btn btn-ghost btn-sm">Ingresar</a>' +
      '<a href="registro.html" class="btn btn-primary btn-sm">Registrarse</a>';
  }
}

// ---- Cart Helpers (shared) ----
function getCartItems() {
  try {
    return JSON.parse(localStorage.getItem('shopitp_cart') || '[]');
  } catch(e) { return []; }
}

// ---- API Calls ----
// El backend Express devuelve:
//   Auth:   { success: true, data: { token, user } }  ← envuelto en {success, data}
//   Catalog/Client: { success: true, data: [...] }    ← también envuelto
// Para simplificar, authApi hace unwrap de {success, data} automáticamente.

async function apiRequest(endpoint, options) {
  options = options || {};
  var token = options.token;
  var customHeaders = options.headers;
  var skipAuthRedirect = options.skipAuthRedirect;
  var restOptions = {};
  var keysToSkip = { token: true, headers: true, skipAuthRedirect: true };

  for (var key in options) {
    if (!keysToSkip[key]) {
      restOptions[key] = options[key];
    }
  }

  var headers = {
    'Content-Type': 'application/json'
  };
  if (customHeaders) {
    for (var h in customHeaders) {
      headers[h] = customHeaders[h];
    }
  }
  // No se agrega cabecera de autenticación: el backend recibe la sesión por cookie httpOnly.

  console.log('[API] ' + (restOptions.method || 'GET') + ' ' + API_BASE_URL + endpoint);

  var response;
  try {
    response = await fetch(API_BASE_URL + endpoint, {
      method: restOptions.method || 'GET',
      headers: headers,
      body: restOptions.body || undefined,
      credentials: 'include'
    });
  } catch (fetchError) {
    console.error('[API] Error de red:', fetchError.message);
    throw new Error('Failed to fetch - El servidor no responde en ' + API_BASE_URL);
  }

  console.log('[API] Status:', response.status, response.statusText);

  if (!response.ok) {
    // Si es 401 Y no es un endpoint de auth, el token expiró - redirigir al login
    if (response.status === 401 && !skipAuthRedirect) {
      showToast('Sesión expirada. Por favor inicia sesión de nuevo.', 'error');
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem('shopitp_user');
      setTimeout(function() { goToLogin(); }, 1500);
      throw new Error('Sesión expirada');
    }

    var errorData;
    try {
      errorData = await response.json();
    } catch(e) {
      errorData = { error: 'Error de conexión con el servidor (status ' + response.status + ')' };
    }

    var errorMessage = errorData.error || errorData.message || ('Error ' + response.status);
    console.error('[API] Error:', errorMessage);
    throw new Error(errorMessage);
  }

  var data;
  try {
    data = await response.json();
  } catch(e) {
    console.error('[API] Error parseando JSON:', e);
    throw new Error('Respuesta inválida del servidor');
  }

  console.log('[API] Respuesta OK:', data);
  return data;
}

// ---- Catalog API ----
// El backend Express devuelve productos con campos snake_case:
//   categoria_id, categoria_nombre, categoria_padre_id
// Normalizamos a camelCase para que catalogo.js y producto.js funcionen sin cambios
var catalogApi = {
  getProducts: async function(categoryId) {
    var params = categoryId ? '?category=' + categoryId : '';
    var res = await apiRequest('/catalog/products' + params);
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(normalizeProduct);
    } else if (res.success && res.data) {
      res.data = normalizeProduct(res.data);
    }
    return res;
  },
  getProductById: async function(id) {
    var res = await apiRequest('/catalog/products/' + id);
    if (res.success && res.data) {
      res.data = normalizeProduct(res.data);
    }
    return res;
  },
  getCategories: async function() {
    var res = await apiRequest('/catalog/categories');
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(normalizeCategory);
    }
    return res;
  }
};

// ---- Product Image Mapping ----
// Mapea cada SKU a su imagen. Si no está, usa la de su categoría.
var PRODUCT_IMAGES = {
  'PIN-244122-18': '../../public/img/cat-1-madera.jpg',
  'CED-244122-15': '../../public/img/cat-1-cedro.jpg',
  'ROB-200100-20': '../../public/img/cat-1-roble.jpg',
  'MDF-244122-12': '../../public/img/cat-2-mdf.jpg',
  'MDF-H-244122-18': '../../public/img/cat-2-mdf-hidrofugo.jpg',
  'MDF-UL-244122-9': '../../public/img/cat-2-mdf-ultralight.jpg',
  'MEL-BB-244122-15': '../../public/img/cat-3-melamina.jpg',
  'MEL-RH-244122-18': '../../public/img/cat-3-melamina-roble.jpg',
  'MEL-NM-244122-15': '../../public/img/cat-3-melamina-negra.jpg',
  'CON-EST-244122-12': '../../public/img/cat-4-contrachapado.jpg',
  'CON-DEC-244122-6': '../../public/img/cat-4-decorativo.jpg',
  'AGL-244122-15': '../../public/img/cat-5-aglomerado.jpg',
  'AGL-MB-244122-15': '../../public/img/cat-5-aglomerado-melamina.jpg',
  'ACC-CM-22-50': '../../public/img/cat-6-cantos.jpg',
  'ACC-TA-20': '../../public/img/cat-6-tirador.jpg',
  'ACC-BC-35': '../../public/img/cat-6-bisagra.jpg'
};

var CATEGORY_IMAGES = {
  1: '../../public/img/cat-1-madera.jpg',
  2: '../../public/img/cat-2-mdf.jpg',
  3: '../../public/img/cat-3-melamina.jpg',
  4: '../../public/img/cat-4-contrachapado.jpg',
  5: '../../public/img/cat-5-aglomerado.jpg',
  6: '../../public/img/cat-6-accesorios.jpg'
};

function getProductImage(sku, categoriaId) {
  if (sku && PRODUCT_IMAGES[sku]) return PRODUCT_IMAGES[sku];
  if (categoriaId && CATEGORY_IMAGES[categoriaId]) return CATEGORY_IMAGES[categoriaId];
  return '../../public/img/cat-1-madera.jpg';
}

// ---- Normalizers (snake_case backend → camelCase frontend) ----
function normalizeProduct(raw) {
  var sku = raw.sku !== undefined ? raw.sku : null;
  var categoriaId = raw.categoria_id !== undefined ? raw.categoria_id : (raw.categoriaId !== undefined ? raw.categoriaId : null);
  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion !== undefined ? raw.descripcion : null,
    precio: raw.precio,
    sku: sku,
    stock: raw.stock !== undefined ? raw.stock : null,
    peso: raw.peso !== undefined ? raw.peso : null,
    tamano: raw.tamano !== undefined ? raw.tamano : null,
    estado: raw.estado !== undefined ? raw.estado : null,
    categoriaId: categoriaId,
    categoriaNombre: raw.categoria_nombre !== undefined ? raw.categoria_nombre : (raw.categoriaNombre !== undefined ? raw.categoriaNombre : null),
    imagen: raw.imagen || getProductImage(sku, categoriaId)
  };
}

function normalizeCategory(raw) {
  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion !== undefined ? raw.descripcion : null,
    estado: raw.estado !== undefined ? raw.estado : null,
    categoriaPadreId: raw.categoria_padre_id !== undefined ? raw.categoria_padre_id : (raw.categoriaPadreId !== undefined ? raw.categoriaPadreId : null)
  };
}

// ---- Auth API ----
// El backend crea la sesión con cookie httpOnly; no se persiste token en el frontend.
var authApi = {
  register: async function(data) {
    console.log('[Auth] Registrando:', data.email);
    var res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: true
    });
    console.log('[Auth] Register response:', res);
    if (res.success && res.data) return res.data;
    return res;
  },
  login: async function(data) {
    console.log('[Auth] Login:', data.email);
    var res = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: true
    });
    console.log('[Auth] Login response:', res);
    if (res.success && res.data) return res.data;
    return res;
  }
};

// ---- Client API ----
// El backend Express devuelve profile con campos: { id, name, email, phone, createdAt }
// pero perfil.js espera { nombre, telefono, fechaRegistro, direcciones }
// Normalizamos aquí para que los JS no necesiten cambiar
var clientApi = {
  getProfile: async function() {
    var res = await apiRequest('/client/profile');
    if (res.success && res.data) {
      var d = res.data;
      res.data = {
        id: d.id,
        nombre: d.name || d.nombre || '',
        email: d.email || '',
        telefono: d.phone || d.telefono || '',
        fechaRegistro: d.createdAt || d.created_at || d.fechaRegistro || null,
        direcciones: d.direcciones || [],
        imagen: d.imagen || d.imagen_usuario_url || 'default.jpg'
      };
    }
    return res;
  },
  updateProfile: function(data) {
    return apiRequest('/client/user', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

// ---- Format Helpers ----
function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(parseFloat(price));
}

function formatDate(dateStr) {
  if (!dateStr) return 'No disponible';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', function() {
  updateNavbar();
  // Apply dark theme from localStorage (backup for FOUC prevention)
  var saved = localStorage.getItem('shopitp_theme');
  if (saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark');
  }
});
