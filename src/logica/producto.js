/* ============================================
   Producto - JavaScript
   ============================================ */

let product = null;
let categories = [];
let quantity = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    showNotFound();
    return;
  }

  await loadCategories();
  await loadProduct(productId);
});

async function loadCategories() {
  try {
    const res = await catalogApi.getCategories();
    if (res.success && res.data) categories = res.data;
  } catch (e) {
    console.error('Error cargando categorías:', e);
  }
}

async function loadProduct(id) {
  try {
    const res = await catalogApi.getProductById(id);
    if (res.success && res.data) {
      product = res.data;
      renderProduct();
    } else {
      showNotFound();
    }
  } catch (e) {
    showNotFound();
  }
}

function renderProduct() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('product-content').style.display = 'block';

  // Breadcrumb
  const categoryName = product.categoriaId
    ? categories.find(c => c.id === product.categoriaId)?.nombre
    : null;

  document.getElementById('breadcrumb').innerHTML = `
    <a href="catalogo.html">Inicio</a>
    <span class="breadcrumb-sep">/</span>
    <a href="catalogo.html">Catálogo</a>
    ${categoryName ? `<span class="breadcrumb-sep">/</span><a href="catalogo.html?category=${product.categoriaId}">${categoryName}</a>` : ''}
    <span class="breadcrumb-sep">/</span>
    <span class="breadcrumb-current">${product.nombre}</span>
  `;

  // Category badge
  if (categoryName) {
    document.getElementById('product-category-badge').innerHTML = `<span class="badge badge-outline" style="margin-bottom:0.5rem;">${categoryName}</span>`;
  }

  // Basic info
  document.getElementById('product-name').textContent = product.nombre;
  document.getElementById('product-price').textContent = formatPrice(product.precio);

  if (product.sku) {
    document.getElementById('product-sku').textContent = `SKU: ${product.sku}`;
  } else {
    document.getElementById('product-sku').style.display = 'none';
  }

  // Description
  if (product.descripcion) {
    document.getElementById('product-description').textContent = product.descripcion;
  } else {
    document.getElementById('product-description-section').style.display = 'none';
  }

  // Image
  var imageContainer = document.querySelector('.product-image-container');
  if (imageContainer && product.imagen) {
    imageContainer.innerHTML = '<div id="product-badge-area"></div>' +
      '<img src="' + product.imagen + '" alt="' + product.nombre + '" class="product-image-real" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
      '<div class="card-image-fallback" style="display:none;">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="product-image-placeholder"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>' +
      '</div>';
  }

  // Badge
  if (product.estado === 'activo') {
    document.getElementById('product-badge-area').innerHTML = `<span class="badge badge-secondary" style="position:absolute;left:1rem;top:1rem;">Disponible</span>`;
  }

  // Details
  const details = [];
  if (product.stock !== null) {
    details.push({ label: 'Stock disponible', value: product.stock > 0 ? product.stock : 'Agotado' });
  }
  if (product.peso) {
    details.push({ label: 'Peso', value: `${product.peso} kg` });
  }
  if (product.tamano) {
    details.push({ label: 'Tamaño', value: product.tamano });
  }

  if (details.length > 0) {
    document.getElementById('product-details').innerHTML = details.map(d => `
      <div class="info-item">
        <div>
          <div class="info-item-label">${d.label}</div>
          <div class="info-item-value">${d.value}</div>
        </div>
      </div>
    `).join('');
  }

  // Cart button
  if (product.stock === 0) {
    document.getElementById('add-to-cart-btn').disabled = true;
    document.getElementById('add-to-cart-btn').innerHTML = 'Producto Agotado';
  }

  // Title
  document.title = `${product.nombre} - ShopITP`;
}

function changeQuantity(delta) {
  const maxStock = product?.stock || 99;
  quantity = Math.max(1, Math.min(maxStock, quantity + delta));
  document.getElementById('quantity-value').textContent = quantity;
}

function addToCart() {
  // Navigate to cart page (other module)
  showToast('Producto agregado al carrito', 'success');
  // In a real app, this would add to cart state
  // window.location.href = 'carrito.html';
}

function showNotFound() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('not-found').style.display = 'block';
}
