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

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  if (!api) {
    console.error('[Catalogo] No se encontro window.clienteApi. Revisa que configuracion-api.js cargue antes.');
    return;
  }

  await loadUserInfo();
  await loadCategories();
  await loadProducts();
  setupSearch();
  setupPriceSlider();
  setupPriceInputs();
  setupNavbarScroll();
  createHeroParticles();
  updateCartCount();
  initTheme();
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

  var savedUser = localStorage.getItem('shopitp_user');
  if (savedUser) {
    try {
      var user = JSON.parse(savedUser);
      renderNavbar(user);
      return;
    } catch(e) {}
  }

  try {
    var perfil = await api.solicitarJson('/perfil');
    if (perfil && perfil.ok) {
      var user = {
        nombre: perfil.nombre || 'Usuario',
        rol: perfil.rol || '',
        imagen: perfil.imagen || ''
      };
      localStorage.setItem('shopitp_user', JSON.stringify(user));
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
      localStorage.setItem('shopitp_user', JSON.stringify(user));
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
    if (user.imagen && user.imagen !== 'default.jpg' && user.imagen !== '') {
      var imgUrl = api.construirUrlImagen ? api.construirUrlImagen(user.imagen) : (api.baseUrl + '/uploads/' + encodeURIComponent(user.imagen));
      avatarHtml = '<img src="' + imgUrl + '" alt="' + displayName + '" class="cat-nav-avatar" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="cat-nav-avatar-fallback" style="display:none;">' + initial + '</div>';
    } else {
      avatarHtml = '<div class="cat-nav-avatar-fallback">' + initial + '</div>';
    }

    actionsEl.innerHTML =
      avatarHtml +
      '<span class="cat-nav-user">' + displayName + '</span>' +
      '<a href="perfil.html" class="cat-btn cat-btn-ghost cat-btn-sm">Mi Perfil</a>' +
      '<button onclick="logout()" class="cat-btn cat-btn-outline cat-btn-sm">Salir</button>';
  } else {
    actionsEl.innerHTML =
      '<a href="login.html" class="cat-btn cat-btn-ghost cat-btn-sm">Ingresar</a>' +
      '<a href="registro.html" class="cat-btn cat-btn-primary cat-btn-sm">Registrarse</a>';
  }
}

function logout() {
  localStorage.removeItem('shopitp_user');
  localStorage.removeItem('shopitp_cart');
  try {
    api.solicitarJson('/logout', { method: 'POST' }).catch(function(){});
  } catch(e) {}
  window.location.href = 'login.html';
}

// ---- Theme ----
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

  // Animate the cart button
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
  var statStock = document.getElementById('stat-stock');
  var statAvgPrice = document.getElementById('stat-avg-price');
  var statPriceRange = document.getElementById('stat-price-range');

  var displayProducts = getFilteredProducts();

  if (statProducts) statProducts.textContent = displayProducts.length;
  if (statCategories) statCategories.textContent = allCategories.length;
  if (statStock) statStock.textContent = displayProducts.reduce(function(sum, p) { return sum + (parseInt(p.stock) || 0); }, 0);

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

// ---- Price Filter ----
function setupPriceSlider() {
  var slider = document.getElementById('price-slider');
  if (!slider) return;

  slider.addEventListener('input', function() {
    var val = parseInt(this.value) || maxPrice;
    var pct = ((val - parseInt(this.min)) / (parseInt(this.max) - parseInt(this.min))) * 100;
    this.style.setProperty('--range-pct', pct + '%');

    var maxInput = document.getElementById('price-max');
    if (maxInput) maxInput.value = val;

    updatePriceDisplay();
  });

  slider.addEventListener('change', function() {
    applyPriceFilter();
  });
}

function setupPriceInputs() {
  var minInput = document.getElementById('price-min');
  var maxInput = document.getElementById('price-max');

  if (minInput) {
    minInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') applyPriceFilter();
    });
  }
  if (maxInput) {
    maxInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') applyPriceFilter();
    });
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

  // Sync slider
  if (slider) {
    slider.value = priceLimitMax === Infinity ? slider.max : Math.min(priceLimitMax, parseInt(slider.max));
    var pct = ((parseInt(slider.value) - parseInt(slider.min)) / (parseInt(slider.max) - parseInt(slider.min))) * 100;
    slider.style.setProperty('--range-pct', pct + '%');
  }

  updatePriceDisplay();
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

  // Show skeleton without changing grid dimensions
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

  // Remove loading state and reset min-height
  grid.classList.remove('cat-loading');
  setTimeout(function() { grid.style.minHeight = ''; }, 400);
}

function getFilteredProducts() {
  return allProducts.filter(function(p) {
    // Search filter
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      var matchSearch = p.nombre.toLowerCase().includes(q)
        || (p.descripcion && p.descripcion.toLowerCase().includes(q))
        || (p.sku && p.sku.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }
    // Price filter
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
    case 'stock-desc':
      sorted.sort(function(a, b) { return (parseInt(b.stock) || 0) - (parseInt(a.stock) || 0); });
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
    var stockClass = stock === 0 ? 'out' : stock <= 5 ? 'low' : '';
    var stockText = stock === 0 ? 'Agotado' : stock <= 5 ? 'Solo ' + stock + '!' : stock + ' disponibles';
    var delay = Math.min(index * 0.04, 0.4);
    var price = parseFloat(product.precio) || 0;

    if (currentView === 'list') {
      return '<div class="cat-product-card" style="animation-delay:' + delay + 's" onclick="openProductDetail(' + product.id + ')">' +
        '<div class="cat-card-image">' +
          '<span class="cat-card-img-placeholder">&#129716;</span>' +
          (product.estado === 'activo' ? '<span class="cat-badge cat-badge-available">Disponible</span>' : '') +
          (stock > 0 ? '<span class="cat-badge-stock ' + stockClass + '">' + stockText + '</span>' : '') +
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
            '<span class="cat-card-stock-text ' + stockClass + '">' + stockText + '</span>' +
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
        '<span class="cat-card-img-placeholder">&#129716;</span>' +
        (product.estado === 'activo' ? '<span class="cat-badge cat-badge-available">Disponible</span>' : '') +
        (stock > 0 ? '<span class="cat-badge-stock ' + stockClass + '">' + stockText + '</span>' : '') +
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
        '<span class="cat-card-stock-text ' + stockClass + '">' + stockText + '</span>' +
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

  // Show loading state
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
    // Fallback: use allProducts data
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
  var stockClass = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'ok';
  var stockText = stock === 0 ? 'Agotado' : stock <= 5 ? 'Solo ' + stock + ' unidades' : stock + ' disponibles';
  var stockIcon = stock === 0 ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    : stock <= 5 ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

  body.innerHTML =
    '<div class="cat-modal-grid">' +
      '<div class="cat-modal-image">' +
        '<span class="cat-modal-img-placeholder">&#129716;</span>' +
      '</div>' +
      '<div class="cat-modal-info">' +
        (product.categoria_nombre ? '<span class="cat-card-category cat-modal-category">' + product.categoria_nombre + '</span>' : '') +
        '<h2 class="cat-modal-title">' + product.nombre + '</h2>' +
        (product.descripcion ? '<p class="cat-modal-desc">' + product.descripcion + '</p>' : '<p class="cat-modal-desc cat-modal-desc-empty">Sin descripci&oacute;n disponible</p>') +
        '<div class="cat-modal-price-row">' +
          '<span class="cat-modal-price">' + formatPrice(product.precio) + '</span>' +
          '<span class="cat-modal-stock ' + stockClass + '">' + stockIcon + ' ' + stockText + '</span>' +
        '</div>' +
        '<div class="cat-modal-details">' +
          (product.sku ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg><span><strong>SKU:</strong> ' + product.sku + '</span></div>' : '') +
          (product.categoria_nombre ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span><strong>Categor&iacute;a:</strong> ' + product.categoria_nombre + '</span></div>' : '') +
          '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span><strong>Stock:</strong> ' + stock + ' unidades</span></div>' +
          (product.estado ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg><span><strong>Estado:</strong> ' + (product.estado === 'activo' ? 'Disponible' : product.estado) + '</span></div>' : '') +
          (product.fecha_creacion ? '<div class="cat-modal-detail-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span><strong>Fecha:</strong> ' + formatDate(product.fecha_creacion) + '</span></div>' : '') +
        '</div>' +
        '<div class="cat-modal-actions">' +
          (stock > 0 ? '<button class="cat-btn cat-btn-primary cat-btn-lg" onclick="addToCartFromCatalog(' + product.id + ')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Agregar al Carrito</button>' : '<button class="cat-btn cat-btn-outline cat-btn-lg" disabled>Producto Agotado</button>') +
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

// Close modal on Escape
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

// ---- Format Price ----
function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(parseFloat(price));
}

// ---- Format Date ----
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
