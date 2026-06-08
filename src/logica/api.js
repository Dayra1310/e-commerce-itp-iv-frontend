/* ============================================
   ShopITP - Módulo Catalogo y Clientes
   API Client & Shared JS

   CONECTADO AL BACKEND REAL (start.js + catalogoClientes.js)
   Backend devuelve: { ok: true, productos: [...] } etc.
   Este archivo traduce al formato que usa catalogo.js
   ============================================ */

var API_BASE_URL = (window.location.origin === 'http://localhost:3001') ? '' : 'http://localhost:3001';

// ---- CONFIG ----
var LOGIN_PAGE = 'login.html';
var AUTH_TOKEN_KEY = 'auth_token';
var AUTH_USER_KEY = 'auth_user';
var THEME_KEY = 'shopitp_theme';

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

// ---- Auth Helpers ----
function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getUser() {
  var data = localStorage.getItem(AUTH_USER_KEY);
  return data ? JSON.parse(data) : null;
}

function saveUser(userData) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
}

function isLoggedIn() {
  return !!getUser();
}

function goToLogin() {
  window.location.href = LOGIN_PAGE;
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  // Tambien cerrar sesion en el backend
  fetch(API_BASE_URL + '/logout', {
    method: 'POST',
    credentials: 'include'
  }).catch(function() {});
  goToLogin();
}

// ---- Navbar (async - intenta cargar perfil del API si no hay datos locales) ----
async function updateNavbar() {
  var user = getUser();
  var actionsEl = document.getElementById('navbar-actions');
  if (!actionsEl) return;

  // Si no hay usuario en localStorage, intentar obtenerlo del API
  if (!user) {
    // Primero intentar /client/profile (nuestro modulo, mas datos)
    try {
      var res = await apiRequest('/client/profile');
      if (res.ok && res.nombre) {
        user = {
          name: res.nombre,
          nombre: res.nombre,
          email: res.email || '',
          telefono: res.telefono || '',
          rol: res.rol || '',
          imagen: res.imagen || '',
          fechaRegistro: res.fechaRegistro || res.fecha_registro || ''
        };
        saveUser(user);
      }
    } catch(e) {
      // Si /client/profile falla, intentar /perfil (de index.js, siempre disponible)
      try {
        var res2 = await apiRequest('/perfil');
        if (res2.ok && res2.nombre) {
          user = {
            name: res2.nombre,
            nombre: res2.nombre,
            email: res2.email || '',
            rol: res2.rol || '',
            imagen: res2.imagen || ''
          };
          saveUser(user);
        }
      } catch(e2) {
        // No esta logueado, no hay problema
      }
    }
  }

  var cart = getCartItems();
  var cartTotal = cart.reduce(function(sum, item) { return sum + (item.quantity || 0); }, 0);

  var cartBtn = '<a href="carrito.html" class="btn btn-ghost btn-sm" style="gap:0.375rem;position:relative;">' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' +
    '<span>Carrito</span>' +
    (cartTotal > 0 ? '<span style="position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:0.625rem;font-weight:700;color:#fff;background:var(--accent-blue);border-radius:9999px;padding:0 4px;">' + (cartTotal > 99 ? '99+' : cartTotal) + '</span>' : '') +
  '</a>';

  if (user) {
    var displayName = user.name || user.nombre || 'Usuario';
    actionsEl.innerHTML =
      cartBtn +
      '<a href="perfil.html" class="btn btn-ghost btn-sm" style="gap:0.375rem;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        displayName +
      '</a>' +
      '<button onclick="logout()" class="btn btn-outline btn-sm">Salir</button>';
  } else {
    actionsEl.innerHTML =
      cartBtn +
      '<a href="' + LOGIN_PAGE + '" class="btn btn-ghost btn-sm">Ingresar</a>' +
      '<a href="registro.html" class="btn btn-primary btn-sm">Registrarse</a>';
  }
}

// ---- Cart Helpers ----
function getCartItems() {
  try {
    return JSON.parse(localStorage.getItem('shopitp_cart') || '[]');
  } catch(e) { return []; }
}

function saveCartItems(cart) {
  localStorage.setItem('shopitp_cart', JSON.stringify(cart));
}

// ---- Theme Helpers ----
function initTheme() {
  var saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') {
    document.body.classList.add('dark');
  } else if (saved === 'light') {
    document.body.classList.remove('dark');
  } else {
    // Detectar preferencia del sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark');
    }
  }
  updateThemeToggleUI();
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  var isDark = document.body.classList.contains('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeToggleUI();
}

function isDarkMode() {
  return document.body.classList.contains('dark');
}

function updateThemeToggleUI() {
  var isDark = document.body.classList.contains('dark');
  var toggles = document.querySelectorAll('.theme-toggle-input');
  toggles.forEach(function(t) { t.checked = isDark; });
}

// ---- API Base Request ----
async function apiRequest(endpoint, options) {
  options = options || {};

  var headers = {
    'Content-Type': 'application/json'
  };
  if (options.headers) {
    for (var h in options.headers) {
      headers[h] = options.headers[h];
    }
  }

  var url = API_BASE_URL + endpoint;
  console.log('[API] ' + (options.method || 'GET') + ' ' + url);

  var response;
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body || undefined,
      credentials: 'include'
    });
  } catch (fetchError) {
    console.error('[API] Error de red:', fetchError.message);
    throw new Error('No se pudo conectar al servidor. Verifica que el backend este corriendo.');
  }

  var data;
  try {
    data = await response.json();
  } catch(e) {
    throw new Error('Respuesta invalida del servidor');
  }

  console.log('[API] Respuesta:', data);

  if (!response.ok) {
    var errorMessage = data.message || data.error || ('Error ' + response.status);
    throw new Error(errorMessage);
  }

  return data;
}

// ---- Catalog API ----
var catalogApi = {
  getProducts: async function(categoryId) {
    if (categoryId) {
      var res = await apiRequest('/catalog/products/categoria/' + categoryId);
      return { success: res.ok, data: (res.productos || []).map(normalizeProduct) };
    } else {
      var res = await apiRequest('/catalog/products');
      return { success: res.ok, data: (res.productos || []).map(normalizeProduct) };
    }
  },

  getProductById: async function(id) {
    var res = await apiRequest('/catalog/products/' + id);
    return { success: res.ok, data: res.producto ? normalizeProduct(res.producto) : null };
  },

  getCategories: async function() {
    var res = await apiRequest('/catalog/categories');
    return { success: res.ok, data: (res.categorias || []).map(normalizeCategory) };
  }
};

// ---- Normalizers (snake_case de MySQL → camelCase para el frontend) ----
function normalizeProduct(raw) {
  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion !== undefined ? raw.descripcion : null,
    precio: raw.precio,
    sku: raw.sku !== undefined ? raw.sku : null,
    stock: raw.stock !== undefined ? raw.stock : null,
    peso: raw.peso !== undefined ? raw.peso : null,
    tamano: raw.tamano !== undefined ? raw.tamano : null,
    estado: raw.estado !== undefined ? raw.estado : null,
    imagen: raw.imagen_url !== undefined ? raw.imagen_url : (raw.imagen !== undefined ? raw.imagen : null),
    categoriaId: raw.categoria_id !== undefined ? raw.categoria_id : (raw.categoriaId !== undefined ? raw.categoriaId : null),
    categoriaNombre: raw.categoria_nombre !== undefined ? raw.categoria_nombre : (raw.categoriaNombre !== undefined ? raw.categoriaNombre : null)
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

// ---- Client API ----
var clientApi = {
  getProfile: async function() {
    var res = await apiRequest('/client/profile');
    // Backend devuelve: { ok, nombre, email, telefono, rol, imagen, fechaRegistro }
    return {
      success: res.ok,
      data: {
        nombre: res.nombre || '',
        email: res.email || '',
        telefono: res.telefono || '',
        rol: res.rol || '',
        imagen: res.imagen || '',
        fechaRegistro: res.fechaRegistro || res.fecha_registro || ''
      }
    };
  },

  updateProfile: async function(data) {
    return await apiRequest('/client/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  changePassword: async function(data) {
    return await apiRequest('/client/password', {
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
  initTheme();
  updateNavbar();
});
