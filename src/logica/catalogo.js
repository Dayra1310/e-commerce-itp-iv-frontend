/* ============================================
   Catalogo - JavaScript
   Usa window.clienteApi del configuracion-api.js
   ============================================ */

let allProducts = [];
let allCategories = [];
let selectedCategory = null;
let searchQuery = '';
let currentView = 'grid';
let currentSort = 'default';
let maxPrice = 1000000;
let priceLimitMin = 0;
let priceLimitMax = Infinity;

const api = window.clienteApi;

// ---- Product Image Mapping ----
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

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  if (!api) {
    console.error('[Catalogo] No se encontro window.clienteApi. Revisa que configuracion-api.js cargue antes.');
    return;
  }

  initTheme(); // Apply dark mode to body (inline script in <head> handles FOUC on <html>)
  await loadUserInfo();
  await loadCategories();
  await loadProducts();
  setupSearch();
  setupPriceSlider();
  setupPriceInputs();
  setupNavbarScroll();
  createHeroParticles();
  updateCartCount();
});

// ---- Navbar scroll effect ----
function setupNavbarScroll() {
  var navbar = document.getElementById('cat-navbar');
  if (!navbar) return;
  window.addEventListener('scroll', function() {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// ---- Hero particles ----
function createHeroParticles() {
  var container = document.getElementById('hero-particles');
  if (!container) return;
  for (var i = 0; i < 30; i++) {
    var particle = document.createElement('div');
    particle.className = 'cat-hero-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (4 + Math.random() * 6) + 's';
    particle.style.animationDelay = Math.random() * 5 + 's';
    var size = (2 + Math.random() * 5);
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.opacity = (0.2 + Math.random() * 0.5);
    container.appendChild(particle);
  }
}

// ---- Auth: Obtener info del usuario logueado ----
async function loadUserInfo() {
  var actionsEl = document.getElementById('navbar-actions');
  if (!actionsEl) return;

  try {
    var perfil = await api.solicitarJson('/perfil');
    if (perfil && perfil.ok) {
      var user = {
        nombre: perfil.nombre || 'Usuario',
        rol: perfil.rol || '',
        imagen: perfil.imagen || ''
      };
      renderNavbar(user);
      return;
    }
  } catch(e) {}

  try {
    var perfil2 = await api.solicitarJson('/client/profile');
    if (perfil2 && perfil2.ok) {
      var user = {
        nombre: perfil2.nombre || 'Usuario',
        email: perfil2.email || '',
        telefono: perfil2.telefono || '',
        rol: perfil2.rol || '',
        imagen: perfil2.imagen || '',
        fechaRegistro: perfil2.fechaRegistro || ''
      };
      renderNavbar(user);
      return;
    }
  } catch(e) {}

  renderNavbar(null);
}

function renderNavbar(user) {
  var actionsEl = document.getElementById('navbar-actions');
  if (!actionsEl) return;

  if (user) {
    var displayName = user.nombre || user.name || 'Usuario';
    var initial = displayName.charAt(0).toUpperCase();

    var avatarHtml = '';
    var valorImagen = String(user.imagen || '').trim();
    var tieneImagen = valorImagen && valorImagen.toLowerCase() !== 'null' && valorImagen.toLowerCase() !== 'undefined';
    if (tieneImagen) {
      var imgUrl = api.construirUrlImagen ? api.construirUrlImagen(valorImagen) : (api.baseUrl + '/uploads/' + encodeURIComponent(valorImagen));
      avatarHtml = '<img src="' + imgUrl + '" alt="' + displayName + '" class="cat-nav-avatar" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="cat-nav-avatar-fallback" style="display:none;">' + initial + '</div>';
    } else {
      avatarHtml = '<div class="cat-nav-avatar-fallback">' + initial + '</div>';
    }

    actionsEl.innerHTML =
      '<div class="cat-user-menu-wrap">' +
        avatarHtml +
        '<button class="cat-nav-user-btn" onclick="toggleUserMenu()">' + escapeHtmlSimple(displayName) +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cat-user-chevron"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</button>' +
        '<div class="cat-user-dropdown" id="user-dropdown">' +
          '<a href="perfil.html" class="cat-dropdown-item">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            'Mi Perfil' +
          '</a>' +
          '<a href="perfil.html" class="cat-dropdown-item">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
            'Configuracion' +
          '</a>' +
          '<div class="cat-dropdown-divider"></div>' +
          '<button onclick="logout()" class="cat-dropdown-item cat-dropdown-item-danger">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
            'Cerrar Sesion' +
          '</button>' +
        '</div>' +
      '</div>';
  } else {
    actionsEl.innerHTML =
      '<a href="login.html" class="cat-btn cat-btn-ghost cat-btn-sm">Ingresar</a>' +
      '<a href="registro.html" class="cat-btn cat-btn-primary cat-btn-sm">Registrarse</a>';
  }
}

// ---- User dropdown menu ----
function toggleUserMenu() {
  var dropdown = document.getElementById('user-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('cat-dropdown-open');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  var dropdown = document.getElementById('user-dropdown');
  var wrap = document.querySelector('.cat-user-menu-wrap');
  if (dropdown && wrap && !wrap.contains(e.target)) {
    dropdown.classList.remove('cat-dropdown-open');
  }
});

function escapeHtmlSimple(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('shopitp_user');
  try {
    api.solicitarJson('/logout', { method: 'POST' }).catch(function(){});
  } catch(e) {}
  window.location.href = 'login.html';
}

// ---- Theme (apply to body.dark as original CSS expects) ----
function initTheme() {
  var saved = localStorage.getItem('shopitp_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
  } else if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
  }
}

// ---- Cart ----
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('shopitp_cart') || '[]');
  } catch(e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem('shopitp_cart', JSON.stringify(cart));
  updateCartCount();
}

function addToCartFromCatalog(productId) {
  var product = allProducts.find(function(p) { return p.id === productId; });
  if (!product) return;

  var cart = getCart();
  var existing = cart.find(function(item) { return item.id === productId; });

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      quantity: 1
    });
  }

  saveCart(cart);

  var cartBtns = document.querySelectorAll('[data-cart-btn="' + productId + '"]');
  cartBtns.forEach(function(btn) {
    btn.classList.add('cat-cart-added');
    setTimeout(function() { btn.classList.remove('cat-cart-added'); }, 600);
  });

  if (typeof Swal !== 'undefined') {
    var toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: function(toast) {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    toast.fire({
      icon: 'success',
      title: product.nombre + ' agregado al carrito'
    });
  }
}

function updateCartCount() {
  var cart = getCart();
  var total = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);

  var navBadge = document.getElementById('nav-cart-badge');
  if (navBadge) {
    if (total > 0) {
      navBadge.textContent = total > 99 ? '99+' : total;
      navBadge.style.display = 'inline-flex';
    } else {
      navBadge.style.display = 'none';
    }
  }

  var floatingBadge = document.getElementById('floating-cart-badge');
  if (floatingBadge) {
    if (total > 0) {
      floatingBadge.textContent = total > 99 ? '99+' : total;
      floatingBadge.style.display = 'flex';
    } else {
      floatingBadge.style.display = 'none';
    }
  }
}

// ---- Load Categories ----
async function loadCategories() {
  try {
    var res = await api.solicitarJson('/catalog/categories');
    if (res.ok && res.categorias) {
      allCategories = res.categorias;
      renderCategories();
    }
  } catch(e) {
    console.error('[Catalogo] Error cargando categorias:', e);
  }
}

function renderCategories() {
  var list = document.getElementById('categories-list');
  var clearBtn = document.getElementById('clear-cat-btn');
  if (!list) return;

  var html = '<button class="cat-sidebar-item ' + (!selectedCategory ? 'active' : '') + '" onclick="selectCategory(null)">' +
    '<span class="cat-sidebar-item-inner">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' +
    'Todas</span>' +
    '<span class="cat-cat-count">' + (allProducts.length || '') + '</span>' +
  '</button>';

  allCategories.forEach(function(cat) {
    var isActive = selectedCategory === String(cat.id);
    var catProducts = allProducts.filter(function(p) { return String(p.categoria_id) === String(cat.id); });
    html += '<button class="cat-sidebar-item ' + (isActive ? 'active' : '') + '" onclick="selectCategory(\'' + cat.id + '\')">' +
      '<span class="cat-sidebar-item-inner">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
      cat.nombre + '</span>' +
      '<span class="cat-cat-count">' + (catProducts.length || '') + '</span>' +
    '</button>';
  });

  list.innerHTML = html;
  if (clearBtn) clearBtn.style.display = selectedCategory ? 'block' : 'none';
  updateSidebarStats();
}

function updateSidebarStats() {
  var statProducts = document.getElementById('stat-products');
  var statCategories = document.getElementById('stat-categories');
  var statAvailable = document.getElementById('stat-available');
  var statAvgPrice = document.getElementById('stat-avg-price');
  var statPriceRange = document.getElementById('stat-price-range');

  var displayProducts = getFilteredProducts();

  if (statProducts) statProducts.textContent = displayProducts.length;
  if (statCategories) statCategories.textContent = allCategories.length;
  if (statAvailable) {
    var availableCount = displayProducts.filter(function(p) { return parseInt(p.stock) > 0; }).length;
    statAvailable.textContent = availableCount + ' de ' + displayProducts.length;
  }

  if (displayProducts.length > 0) {
    var prices = displayProducts.map(function(p) { return parseFloat(p.precio) || 0; });
    var avg = prices.reduce(function(s, p) { return s + p; }, 0) / prices.length;
    var minP = Math.min.apply(null, prices);
    var maxP = Math.max.apply(null, prices);
    if (statAvgPrice) statAvgPrice.textContent = formatPrice(avg);
    if (statPriceRange) statPriceRange.textContent = formatPrice(minP) + ' - ' + formatPrice(maxP);
  } else {
    if (statAvgPrice) statAvgPrice.textContent = '$0';
    if (statPriceRange) statPriceRange.textContent = '$0 - $0';
  }
}

function selectCategory(id) {
  selectedCategory = id;
  loadProducts();
  updateActiveFilter();

  var url = new URL(window.location);
  if (id) {
    url.searchParams.set('category', id);
  } else {
    url.searchParams.delete('category');
  }
  window.history.replaceState({}, '', url);
}

// ---- Price Filter (only on button click) ----
function setupPriceSlider() {
  var slider = document.getElementById('price-slider');
  if (!slider) return;

  // Only update the visual indicator and input, do NOT apply filter
  slider.addEventListener('input', function() {
    var val = parseInt(this.value) || maxPrice;
    var pct = ((val - parseInt(this.min)) / (parseInt(this.max) - parseInt(this.min))) * 100;
    this.style.setProperty('--range-pct', pct + '%');

    var maxInput = document.getElementById('price-max');
    if (maxInput) maxInput.value = val;

    updatePriceDisplayPreview();
  });

  // NO 'change' event that auto-applies filter
}

function setupPriceInputs() {
  var minInput = document.getElementById('price-min');
  var maxInput = document.getElementById('price-max');

  if (minInput) {
    minInput.addEventListener('input', function() {
      updatePriceDisplayPreview();
    });
    minInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') applyPriceFilter();
    });
  }
  if (maxInput) {
    maxInput.addEventListener('input', function() {
      updatePriceDisplayPreview();
      var slider = document.getElementById('price-slider');
      if (slider && maxInput.value !== '') {
        slider.value = Math.min(parseInt(maxInput.value) || 0, parseInt(slider.max));
        var pct = ((parseInt(slider.value) - parseInt(slider.min)) / (parseInt(slider.max) - parseInt(slider.min))) * 100;
        slider.style.setProperty('--range-pct', pct + '%');
      }
    });
    maxInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') applyPriceFilter();
    });
  }
}

function updatePriceDisplayPreview() {
  var display = document.getElementById('price-display');
  if (!display) return;

  var minInput = document.getElementById('price-min');
  var maxInput = document.getElementById('price-max');
  var previewMin = parseInt(minInput && minInput.value) || 0;
  var previewMax = (maxInput && maxInput.value !== '') ? parseInt(maxInput.value) : Infinity;

  if (previewMin === 0 && previewMax === Infinity) {
    display.textContent = 'Todos los precios';
    display.className = 'cat-price-info';
  } else if (previewMin === 0) {
    display.textContent = 'Hasta ' + formatPrice(previewMax);
    display.className = 'cat-price-info cat-price-info-active';
  } else if (previewMax === Infinity) {
    display.textContent = 'Desde ' + formatPrice(previewMin);
    display.className = 'cat-price-info cat-price-info-active';
  } else {
    display.textContent = formatPrice(previewMin) + ' - ' + formatPrice(previewMax);
    display.className = 'cat-price-info cat-price-info-active';
  }
}

function applyPriceFilter() {
  var minInput = document.getElementById('price-min');
  var maxInput = document.getElementById('price-max');
  var slider = document.getElementById('price-slider');

  priceLimitMin = parseInt(minInput && minInput.value) || 0;
  priceLimitMax = (maxInput && maxInput.value !== '') ? parseInt(maxInput.value) : Infinity;

  if (priceLimitMax < priceLimitMin) {
    priceLimitMax = Infinity;
    if (maxInput) maxInput.value = '';
  }

  if (slider) {
    slider.value = priceLimitMax === Infinity ? slider.max : Math.min(priceLimitMax, parseInt(slider.max));
    var pct = ((parseInt(slider.value) - parseInt(slider.min)) / (parseInt(slider.max) - parseInt(slider.min))) * 100;
    slider.style.setProperty('--range-pct', pct + '%');
  }

  updatePriceDisplay();
  updateActiveFilter();
  renderProducts();
  updateSidebarStats();
}

function updatePriceDisplay() {
  var display = document.getElementById('price-display');
  if (!display) return;

  if (priceLimitMin === 0 && priceLimitMax === Infinity) {
    display.textContent = 'Todos los precios';
    display.className = 'cat-price-info';
  } else if (priceLimitMin === 0) {
    display.textContent = 'Hasta ' + formatPrice(priceLimitMax);
    display.className = 'cat-price-info cat-price-info-active';
  } else if (priceLimitMax === Infinity) {
    display.textContent = 'Desde ' + formatPrice(priceLimitMin);
    display.className = 'cat-price-info cat-price-info-active';
  } else {
    display.textContent = formatPrice(priceLimitMin) + ' - ' + formatPrice(priceLimitMax);
    display.className = 'cat-price-info cat-price-info-active';
  }
}

function updatePriceSlider() {
  var slider = document.getElementById('price-slider');
  var minInput = document.getElementById('price-min');
  var maxInput = document.getElementById('price-max');

  if (!slider || allProducts.length === 0) return;

  var prices = allProducts.map(function(p) { return parseFloat(p.precio) || 0; });
  var minP = Math.min.apply(null, prices);
  var maxP = Math.max.apply(null, prices);
  maxPrice = Math.ceil(maxP / 10000) * 10000;
  if (maxPrice < 10000) maxPrice = 100000;

  slider.min = 0;
  slider.max = maxPrice;
  slider.value = maxPrice;
  priceLimitMin = 0;
  priceLimitMax = Infinity;

  var pct = 100;
  slider.style.setProperty('--range-pct', pct + '%');

  if (minInput) minInput.value = 0;
  if (maxInput) maxInput.value = '';

  updatePriceDisplay();
}

// ---- Load Products ----
async function loadProducts() {
  var grid = document.getElementById('products-grid');
  var emptyState = document.getElementById('empty-state');

  grid.style.minHeight = grid.offsetHeight + 'px';
  grid.classList.add('cat-loading');
  emptyState.style.display = 'none';

  try {
    var endpoint = selectedCategory ? '/catalog/products/categoria/' + selectedCategory : '/catalog/products';
    var res = await api.solicitarJson(endpoint);
    if (res.ok && res.productos) {
      allProducts = res.productos;
    } else {
      allProducts = [];
    }
  } catch(e) {
    console.error('[Catalogo] Error cargando productos:', e);
    allProducts = [];
  }

  renderCategories();
  updatePriceSlider();
  renderProducts();

  grid.classList.remove('cat-loading');
  setTimeout(function() { grid.style.minHeight = ''; }, 400);
}

function getFilteredProducts() {
  return allProducts.filter(function(p) {
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      var matchSearch = p.nombre.toLowerCase().includes(q)
        || (p.descripcion && p.descripcion.toLowerCase().includes(q))
        || (p.sku && p.sku.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }
    var price = parseFloat(p.precio) || 0;
    if (price < priceLimitMin) return false;
    if (priceLimitMax !== Infinity && price > priceLimitMax) return false;
    return true;
  });
}

function getSortedProducts(products) {
  var sorted = products.slice();
  switch (currentSort) {
    case 'name-asc':
      sorted.sort(function(a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
      break;
    case 'name-desc':
      sorted.sort(function(a, b) { return (b.nombre || '').localeCompare(a.nombre || ''); });
      break;
    case 'price-asc':
      sorted.sort(function(a, b) { return (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0); });
      break;
    case 'price-desc':
      sorted.sort(function(a, b) { return (parseFloat(b.precio) || 0) - (parseFloat(a.precio) || 0); });
      break;
    case 'newest':
      sorted.sort(function(a, b) { return (b.id || 0) - (a.id || 0); });
      break;
    default:
      break;
  }
  return sorted;
}

function renderProducts() {
  var grid = document.getElementById('products-grid');
  var emptyState = document.getElementById('empty-state');
  var emptyTitle = document.getElementById('empty-title');
  var emptyDesc = document.getElementById('empty-desc');
  var clearBtn = document.getElementById('clear-filters-btn');
  var countEl = document.getElementById('product-count');

  var filtered = getFilteredProducts();
  var sorted = getSortedProducts(filtered);

  if (countEl) {
    countEl.innerHTML = '<strong>' + sorted.length + '</strong> producto' + (sorted.length !== 1 ? 's' : '') + (selectedCategory ? ' en esta categor&iacute;a' : '');
  }

  if (sorted.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'flex';
    emptyTitle.textContent = searchQuery ? 'Sin resultados para "' + searchQuery + '"' : 'No se encontraron productos';
    emptyDesc.textContent = 'Intenta con otra b\u00fasqueda, categor\u00eda o ajusta el precio';
    clearBtn.style.display = (searchQuery || selectedCategory || priceLimitMin > 0 || priceLimitMax !== Infinity) ? 'inline-flex' : 'none';
    return;
  }

  emptyState.style.display = 'none';
  grid.className = currentView === 'list' ? 'cat-products-grid cat-list-view' : 'cat-products-grid';

  grid.innerHTML = sorted.map(function(product, index) {
    var catName = product.categoria_nombre || '';
    var stock = parseInt(product.stock) || 0;
    var isAvailable = stock > 0;
    var availabilityText = isAvailable ? 'Disponible' : 'No disponible';
    var availabilityClass = isAvailable ? 'available' : 'out';
    var delay = Math.min(index * 0.04, 0.4);

    if (currentView === 'list') {
      return '<div class="cat-product-card" style="animation-delay:' + delay + 's" onclick="openProductDetail(' + product.id + ')">' +
        '<div class="cat-card-image">' +
          '<img src="' + getProductImage(product.sku, product.categoria_id) + '" alt="' + product.nombre + '" class="cat-card-img-real" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
          '<span class="cat-card-img-placeholder" style="display:none;">&#129716;</span>' +
          '<span class="cat-badge-stock ' + availabilityClass + '">' + availabilityText + '</span>' +
        '</div>' +
        '<div class="cat-card-body">' +
          (catName ? '<span class="cat-card-category">' + catName + '</span>' : '') +
          '<h3 class="cat-card-title">' + product.nombre + '</h3>' +
          (product.descripcion ? '<p class="cat-card-desc">' + product.descripcion + '</p>' : '') +
          (product.sku ? '<span class="cat-card-sku">SKU: ' + product.sku + '</span>' : '') +
        '</div>' +
        '<div class="cat-card-footer">' +
          '<div class="cat-card-price-wrap">' +
            '<span class="cat-card-price">' + formatPrice(product.precio) + '</span>' +
            '<span class="cat-card-stock-text ' + availabilityClass + '">' + availabilityText + '</span>' +
          '</div>' +
          '<button class="cat-card-cart-btn" data-cart-btn="' + product.id + '" onclick="event.stopPropagation();addToCartFromCatalog(' + product.id + ')" title="Agregar al carrito">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
            ' Agregar</button>' +
        '</div>' +
      '</div>';
    }

    // Grid view
    return '<div class="cat-product-card" style="animation-delay:' + delay + 's" onclick="openProductDetail(' + product.id + ')">' +
      '<div class="cat-card-image">' +
        '<img src="' + getProductImage(product.sku, product.categoria_id) + '" alt="' + product.nombre + '" class="cat-card-img-real" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
        '<span class="cat-card-img-placeholder" style="display:none;">&#129716;</span>' +
        '<span class="cat-badge-stock ' + availabilityClass + '">' + availabilityText + '</span>' +
        '<button class="cat-card-cart-btn cat-card-cart-btn-float" data-cart-btn="' + product.id + '" onclick="event.stopPropagation();addToCartFromCatalog(' + product.id + ')" title="Agregar al carrito">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="cat-card-body">' +
        (catName ? '<span class="cat-card-category">' + catName + '</span>' : '') +
        '<h3 class="cat-card-title">' + product.nombre + '</h3>' +
        (product.descripcion ? '<p class="cat-card-desc">' + product.descripcion + '</p>' : '') +
      '</div>' +
      '<div class="cat-card-footer">' +
        '<span class="cat-card-price">' + formatPrice(product.precio) + '</span>' +
        '<span class="cat-card-stock-text ' + availabilityClass + '">' + availabilityText + '</span>' +
      '</div>' +
    '</div>';
  }).join('');

  updateSidebarStats();
}

// ---- Search ----
function setupSearch() {
  var input = document.getElementById('search-input');
  var debounceTimer;
  input.addEventListener('input', function(e) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      searchQuery = e.target.value.trim();
      renderProducts();
      updateSidebarStats();
    }, 300);
  });
}

// ---- Sorting ----
function applySorting() {
  var select = document.getElementById('sort-select');
  if (select) {
    currentSort = select.value;
  }
  renderProducts();
}

// ---- View Toggle ----
function setView(view) {
  currentView = view;
  document.querySelectorAll('.cat-view-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  renderProducts();
}

// ---- Product Detail Modal ----
async function openProductDetail(productId) {
  var modal = document.getElementById('product-modal');
  var body = document.getElementById('product-modal-body');
  if (!modal || !body) return;

  body.innerHTML = '<div class="cat-modal-loading"><div class="cat-spinner"></div><p>Cargando detalle...</p></div>';
  modal.style.display = 'flex';
  requestAnimationFrame(function() {
    modal.classList.add('cat-modal-visible');
  });
  document.body.style.overflow = 'hidden';

  try {
    var res = await api.solicitarJson('/catalog/products/' + productId);
    if (res.ok && res.producto) {
      renderProductDetail(res.producto);
    } else {
      body.innerHTML = '<div class="cat-modal-loading"><p>No se pudo cargar el producto</p></div>';
    }
  } catch(e) {
    console.error('[Catalogo] Error cargando detalle:', e);
    var product = allProducts.find(function(p) { return p.id === productId; });
    if (product) {
      renderProductDetail(product);
    } else {
      body.innerHTML = '<div class="cat-modal-loading"><p>Error al cargar el producto</p></div>';
    }
  }
}

function renderProductDetail(product) {
  var body = document.getElementById('product-modal-body');
  if (!body) return;

  var stock = parseInt(product.stock) || 0;
  var isAvailable = stock > 0;
  var availabilityText = isAvailable ? 'Disponible' : 'No disponible';
  var availabilityClass = isAvailable ? 'ok' : 'out';
  var availabilityIcon = isAvailable
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

  body.innerHTML =
    '<div class="cat-modal-grid">' +
      '<div class="cat-modal-image">' +
        '<img src="' + getProductImage(product.sku, product.categoria_id) + '" alt="' + product.nombre + '" class="cat-modal-img-real" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
        '<span class="cat-modal-img-placeholder" style="display:none;">&#129716;</span>' +
      '</div>' +
      '<div class="cat-modal-info">' +
        (product.categoria_nombre ? '<span class="cat-card-category cat-modal-category">' + product.categoria_nombre + '</span>' : '') +
        '<h2 class="cat-modal-title">' + product.nombre + '</h2>' +
        (product.descripcion ? '<p class="cat-modal-desc">' + product.descripcion + '</p>' : '<p class="cat-modal-desc cat-modal-desc-empty">Sin descripci&oacute;n disponible</p>') +
        '<div class="cat-modal-price-row">' +
          '<span class="cat-modal-price">' + formatPrice(product.precio) + '</span>' +
          '<span class="cat-modal-stock ' + availabilityClass + '">' + availabilityIcon + ' ' + availabilityText + '</span>' +
        '</div>' +
        '<div class="cat-modal-details">' +
          (product.sku ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg><span><strong>SKU:</strong> ' + product.sku + '</span></div>' : '') +
          (product.categoria_nombre ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span><strong>Categor&iacute;a:</strong> ' + product.categoria_nombre + '</span></div>' : '') +
          '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span><strong>Disponibilidad:</strong> ' + availabilityText + '</span></div>' +
          (product.estado ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg><span><strong>Estado:</strong> ' + (product.estado === 'activo' ? 'Activo' : product.estado) + '</span></div>' : '') +
          (product.fecha_creacion ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span><strong>Fecha:</strong> ' + formatDate(product.fecha_creacion) + '</span></div>' : '') +
        '</div>' +
        '<div class="cat-modal-actions">' +
          (isAvailable ? '<button class="cat-btn cat-btn-primary cat-btn-lg" onclick="addToCartFromCatalog(' + product.id + ')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Agregar al Carrito</button>' : '<button class="cat-btn cat-btn-outline cat-btn-lg" disabled>No Disponible</button>') +
          '<a href="carrito.html" class="cat-btn cat-btn-outline cat-btn-lg">Ver Carrito</a>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function closeProductModal() {
  var modal = document.getElementById('product-modal');
  if (!modal) return;
  modal.classList.remove('cat-modal-visible');
  setTimeout(function() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }, 250);
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeProductModal();
});

// ---- Active Filter ----
function updateActiveFilter() {
  var bar = document.getElementById('active-filters');
  if (!bar) return;

  var filters = [];

  if (selectedCategory) {
    var catName = allCategories.find(function(c) { return String(c.id) === selectedCategory; });
    filters.push('<button class="cat-active-filter" onclick="selectCategory(null)">' +
      (catName ? catName.nombre : 'Categor\u00eda') + ' \u2715</button>');
  }

  if (priceLimitMin > 0 || priceLimitMax !== Infinity) {
    var priceText = '';
    if (priceLimitMin > 0 && priceLimitMax !== Infinity) {
      priceText = formatPrice(priceLimitMin) + ' - ' + formatPrice(priceLimitMax);
    } else if (priceLimitMin > 0) {
      priceText = 'Desde ' + formatPrice(priceLimitMin);
    } else {
      priceText = 'Hasta ' + formatPrice(priceLimitMax);
    }
    filters.push('<button class="cat-active-filter" onclick="clearPriceFilter()">' + priceText + ' \u2715</button>');
  }

  if (filters.length > 0) {
    bar.style.display = 'flex';
    bar.innerHTML = filters.join('');
  } else {
    bar.style.display = 'none';
  }
}

function clearPriceFilter() {
  priceLimitMin = 0;
  priceLimitMax = Infinity;
  var minInput = document.getElementById('price-min');
  var maxInput = document.getElementById('price-max');
  var slider = document.getElementById('price-slider');
  if (minInput) minInput.value = 0;
  if (maxInput) maxInput.value = '';
  if (slider) {
    slider.value = slider.max;
    slider.style.setProperty('--range-pct', '100%');
  }
  updatePriceDisplay();
  updateActiveFilter();
  renderProducts();
  updateSidebarStats();
}

function clearFilters() {
  searchQuery = '';
  var input = document.getElementById('search-input');
  if (input) input.value = '';
  currentSort = 'default';
  var sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'default';
  selectCategory(null);
  clearPriceFilter();
  updateActiveFilter();
  renderProducts();
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(parseFloat(price));
}

function formatDate(dateStr) {
  if (!dateStr) return 'No disponible';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateStr));
  } catch(e) {
    return dateStr;
  }
}
