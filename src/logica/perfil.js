/* ============================================
   Perfil - JavaScript v3.3
   Usa window.clienteApi del configuracion-api.js
   - Fix invitado: muestra datos reales del backend
   - Edición con animaciones fluidas
   - Toast notifications
   - Conexión con /client/profile y /client/password
   - User dropdown menu on navbar (matches catalogo)
   - Dark mode: body.dark (matching original CSS selectors)
   - Profile image upload via PUT /usuario/imagen
   ============================================ */

var profile = null;
var isEditing = false;
var isPasswordOpen = false;
var api = null;

document.addEventListener('DOMContentLoaded', async function() {
  api = window.clienteApi;
  if (!api) {
    console.error('[Perfil] No se encontró window.clienteApi.');
    showError('Error de configuración. Recarga la página.');
    return;
  }

  initTheme();
  initAnimations();
  setupNavbarScroll();
  await loadProfile();
});

// ================================================
// Theme - uses body.dark to match existing CSS
// ================================================
function initTheme() {
  var saved = localStorage.getItem('shopitp_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
  } else if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark');
  }
  updateThemeToggleUI();
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  var isDark = document.body.classList.contains('dark');
  localStorage.setItem('shopitp_theme', isDark ? 'dark' : 'light');
  updateThemeToggleUI();
  showToast(isDark ? 'Modo oscuro activado' : 'Modo claro activado', 'success');
}

function updateThemeToggleUI() {
  var isDark = document.body.classList.contains('dark');
  var toggles = document.querySelectorAll('.pf-theme-toggle');
  toggles.forEach(function(t) { t.checked = isDark; });
}

// ================================================
// Navbar scroll effect (same as catalogo)
// ================================================
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

// ================================================
// Staggered Animations on Scroll/Load
// ================================================
function initAnimations() {
  var items = document.querySelectorAll('.pf-animate-in');
  if (!items.length) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        setTimeout(function() {
          el.classList.add('pf-visible');
        }, delay * 120);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.1 });

  items.forEach(function(el) {
    observer.observe(el);
  });
}

// ================================================
// Hero Particles
// ================================================
function createParticles() {
  var container = document.getElementById('hero-particles');
  if (!container) return;

  for (var i = 0; i < 12; i++) {
    var particle = document.createElement('div');
    particle.className = 'pf-hero-particle';
    particle.style.left = (Math.random() * 100) + '%';
    particle.style.top = (60 + Math.random() * 40) + '%';
    particle.style.animationDelay = (Math.random() * 3) + 's';
    particle.style.animationDuration = (2 + Math.random() * 2) + 's';
    particle.style.width = (2 + Math.random() * 4) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

// ================================================
// Load Profile
// ================================================
async function loadProfile() {
  try {
    var res = await api.solicitarJson('/client/profile');
    if (res.ok) {
      profile = normalizarPerfilRespuesta(res.data || res);

      if (esImagenDefault(profile.imagen)) {
        await completarImagenDesdePerfilPrincipal();
      }

      renderProfile();
      return;
    }
  } catch(e) {
    console.warn('[Perfil] /client/profile falló:', e.message);
  }

  try {
    var res2 = await api.solicitarJson('/perfil');
    if (res2.ok) {
      profile = normalizarPerfilRespuesta(res2.data || res2);
      renderProfile();
      return;
    }
  } catch(e2) {
    console.warn('[Perfil] /perfil fallback falló:', e2.message);
  }

  showNotLoggedIn();
}

function normalizarPerfilRespuesta(datos) {
  var origen = datos && (datos.usuario || datos.user || datos.cliente || datos.profile || datos.perfil || datos) || {};

  return {
    id: origen.id || origen.usuario_id || origen.id_usuario || '',
    nombre: origen.nombre || origen.name || origen.nombre_usuario || 'Usuario',
    email: origen.email || origen.correo || origen.correo_electronico || '',
    telefono: origen.telefono || origen.phone || origen.celular || '',
    rol: origen.rol || origen.nombre_rol || origen.role || 'Cliente',
    imagen: obtenerValorImagenPerfil(origen),
    fechaRegistro: origen.fechaRegistro || origen.fecha_registro || origen.createdAt || origen.created_at || ''
  };
}

function obtenerValorImagenPerfil(origen) {
  if (!origen) return '';

  return origen.imagen ||
    origen.imagen_usuario_url ||
    origen.url_imagen ||
    origen.foto ||
    origen.foto_perfil ||
    origen.avatar ||
    origen.avatar_url ||
    '';
}

function esImagenDefault(imagen) {
  var valor = String(imagen || '').trim().toLowerCase();
  return !valor || valor === 'null' || valor === 'undefined';
}

async function completarImagenDesdePerfilPrincipal() {
  try {
    var perfilPrincipal = await api.solicitarJson('/perfil');
    if (!perfilPrincipal || perfilPrincipal.ok === false) return;

    var imagenPerfilPrincipal = obtenerValorImagenPerfil(perfilPrincipal.data || perfilPrincipal);
    if (!esImagenDefault(imagenPerfilPrincipal)) {
      profile.imagen = imagenPerfilPrincipal;
    }
  } catch (error) {
    console.warn('[Perfil] No se pudo completar imagen desde /perfil:', error.message);
  }
}

function showNotLoggedIn() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('not-logged-state').style.display = 'block';
  document.getElementById('profile-content').style.display = 'none';
}

function obtenerUrlImagenPerfil(imagen, versionar) {
  if (esImagenDefault(imagen)) {
    return '../../public/img/avatar-default.svg';
  }

  var valorOriginal = String(imagen || '').trim();

  if (/^(https?:)?\/\//i.test(valorOriginal) || valorOriginal.startsWith('data:')) {
    return versionar ? agregarVersionUrl(valorOriginal) : valorOriginal;
  }

  var valorNormalizado = valorOriginal.replace(/\\/g, '/');
  var indiceUploads = valorNormalizado.lastIndexOf('/uploads/');
  var url = '';

  if (indiceUploads >= 0) {
    url = api.construirUrl(valorNormalizado.slice(indiceUploads));
  } else if (valorNormalizado.startsWith('/uploads/')) {
    url = api.construirUrl(valorNormalizado);
  } else if (valorNormalizado.startsWith('uploads/')) {
    url = api.construirUrl('/' + valorNormalizado);
  } else {
    var nombreArchivo = valorNormalizado.split('/').pop();
    url = api.construirUrlImagen(nombreArchivo);
  }

  return versionar ? agregarVersionUrl(url) : url;
}

function agregarVersionUrl(url) {
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();
}

function pintarAvatarPrincipal(urlImagen, inicial, nombre) {
  var avatarEl = document.getElementById('profile-avatar');
  if (!avatarEl) return;

  avatarEl.innerHTML = '';

  if (!urlImagen || urlImagen.indexOf('avatar-default.svg') >= 0) {
    avatarEl.textContent = inicial;
    return;
  }

  var imagen = document.createElement('img');
  imagen.src = urlImagen;
  imagen.alt = nombre || 'Usuario';
  imagen.loading = 'lazy';
  imagen.style.width = '100%';
  imagen.style.height = '100%';
  imagen.style.display = 'block';
  imagen.style.borderRadius = '9999px';
  imagen.style.objectFit = 'cover';
  imagen.onerror = function() {
    avatarEl.innerHTML = '';
    avatarEl.textContent = inicial;
  };

  avatarEl.appendChild(imagen);
}

// ================================================
// Render Profile
// ================================================
function renderProfile() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('not-logged-state').style.display = 'none';
  document.getElementById('profile-content').style.display = 'block';

  var name = profile.nombre || 'Usuario';
  var email = profile.email || '';
  var initial = name.charAt(0).toUpperCase();
  var imagenPerfilUrl = obtenerUrlImagenPerfil(profile.imagen, false);

  pintarAvatarPrincipal(imagenPerfilUrl, initial, name);

  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-email').textContent = email;

  var badgesEl = document.getElementById('profile-badges');
  if (badgesEl) {
    var badgesHtml = '';
    if (profile.rol) {
      badgesHtml += '<span class="pf-badge pf-badge-blue">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        escapeHtml(profile.rol) +
      '</span>';
    }
    badgesHtml += '<span class="pf-badge pf-badge-green">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
      'Verificado' +
    '</span>';
    badgesEl.innerHTML = badgesHtml;
  }

  var statRol = document.getElementById('stat-rol');
  if (statRol) statRol.textContent = profile.rol || '—';

  var statFecha = document.getElementById('stat-fecha');
  if (statFecha) statFecha.textContent = profile.fechaRegistro ? formatDate(profile.fechaRegistro) : '—';

  var infoItems = [
    {
      label: 'Nombre Completo',
      value: profile.nombre || 'No especificado',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    },
    {
      label: 'Correo Electrónico',
      value: profile.email || 'No especificado',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
    },
    {
      label: 'Teléfono',
      value: profile.telefono || 'No especificado',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
    }
  ];

  var infoContainer = document.getElementById('personal-info');
  if (infoContainer) {
    infoContainer.innerHTML = infoItems.map(function(item, i) {
      return '<div class="pf-info-item" style="animation-delay:' + (i * 0.08) + 's;">' +
        '<div class="pf-info-icon">' + item.icon + '</div>' +
        '<div class="pf-info-text">' +
          '<span class="pf-info-label">' + item.label + '</span>' +
          '<span class="pf-info-value">' + escapeHtml(item.value) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  updateNavbar(name, email, initial);
  createParticles();

  setTimeout(function() {
    initAnimations();
  }, 100);
}

function updateNavbar(name, email, initial) {
  var user = {
    nombre: name,
    email: email,
    rol: profile.rol || '',
    imagen: profile.imagen || ''
  };
  var actionsEl = document.getElementById('navbar-actions');
  if (!actionsEl) return;

  // Same dropdown as catalogo
  var avatarHtml = '';
  if (!esImagenDefault(profile.imagen)) {
    var imgUrl = obtenerUrlImagenPerfil(profile.imagen, false);
    avatarHtml = '<img src="' + imgUrl + '" alt="' + name + '" class="cat-nav-avatar" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
      '<div class="cat-nav-avatar-fallback" style="display:none;">' + initial + '</div>';
  } else {
    avatarHtml = '<div class="cat-nav-avatar-fallback">' + initial + '</div>';
  }

  actionsEl.innerHTML =
    '<div class="cat-user-menu-wrap">' +
      avatarHtml +
      '<button class="cat-nav-user-btn" onclick="toggleUserMenu()">' + escapeHtml(name) +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cat-user-chevron"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</button>' +
      '<div class="cat-user-dropdown" id="user-dropdown">' +
        '<a href="perfil.html" class="cat-dropdown-item">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          'Mi Perfil' +
        '</a>' +
        '<a href="perfil.html" class="cat-dropdown-item">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
          'Configuraci&oacute;n' +
        '</a>' +
        '<div class="cat-dropdown-divider"></div>' +
        '<button onclick="confirmLogout()" class="cat-dropdown-item cat-dropdown-item-danger">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
          'Cerrar Sesi&oacute;n' +
        '</button>' +
      '</div>' +
    '</div>';
}

// ---- User dropdown menu ----
function toggleUserMenu() {
  var dropdown = document.getElementById('user-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('cat-dropdown-open');
}

document.addEventListener('click', function(e) {
  var dropdown = document.getElementById('user-dropdown');
  var wrap = document.querySelector('.cat-user-menu-wrap');
  if (dropdown && wrap && !wrap.contains(e.target)) {
    dropdown.classList.remove('cat-dropdown-open');
  }
});

// ================================================
// Profile Image Upload
// ================================================
function triggerAvatarUpload() {
  var input = document.getElementById('avatar-upload');
  if (input) input.click();
}

function handleAvatarUpload(input) {
  var file = input.files && input.files[0];
  if (!file) return;

  // Validate type
  var allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.indexOf(file.type) === -1) {
    showToast('Formato no válido. Usa JPG, PNG, WEBP o GIF', 'error');
    return;
  }

  // Validate size (20MB max)
  if (file.size > 20 * 1024 * 1024) {
    showToast('La imagen es muy grande. Máximo 20MB', 'error');
    return;
  }

  uploadProfileImage(file);
}

async function uploadProfileImage(file) {
  showToast('Subiendo imagen...', 'warning');

  try {
    var formData = new FormData();
    formData.append('imagen', file);

    var res = await api.solicitarJson('/usuario/imagen', {
      method: 'PUT',
      body: formData
    });

    var imagenActualizada = obtenerValorImagenPerfil(res);

    if (res.ok && imagenActualizada) {
      profile.imagen = imagenActualizada;

      var name = profile.nombre || 'Usuario';
      var initial = name.charAt(0).toUpperCase();
      var imgUrl = obtenerUrlImagenPerfil(imagenActualizada, true);
      pintarAvatarPrincipal(imgUrl, initial, name);
      updateNavbar(profile.nombre || 'Usuario', profile.email || '', initial);

      showToast('Imagen de perfil actualizada', 'success');
    } else {
      showToast(res.message || 'Error al subir la imagen', 'error');
    }
  } catch(e) {
    var errMsg = 'Error al subir la imagen';
    if (e.datos && e.datos.message) errMsg = e.datos.message;
    showToast(errMsg, 'error');
  }

  var input = document.getElementById('avatar-upload');
  if (input) input.value = '';
}

// ================================================
// Edit Profile
// ================================================
function toggleEditProfile() {
  isEditing = !isEditing;
  var viewEl = document.getElementById('personal-info');
  var editEl = document.getElementById('edit-profile-form');
  var editBtn = document.getElementById('btn-edit-profile');

  if (isEditing) {
    viewEl.style.display = 'none';
    editEl.classList.add('pf-edit-visible');
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancelar';
    editBtn.style.borderColor = '#fca5a5';
    editBtn.style.color = '#dc2626';

    document.getElementById('edit-nombre').value = profile ? profile.nombre || '' : '';
    document.getElementById('edit-email').value = profile ? profile.email || '' : '';
    document.getElementById('edit-telefono').value = profile ? profile.telefono || '' : '';

    setTimeout(function() {
      document.getElementById('edit-nombre').focus();
    }, 200);
  } else {
    viewEl.style.display = 'flex';
    editEl.classList.remove('pf-edit-visible');
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar';
    editBtn.style.borderColor = '';
    editBtn.style.color = '';
  }
}

function cancelEditProfile() {
  isEditing = false;
  var viewEl = document.getElementById('personal-info');
  var editEl = document.getElementById('edit-profile-form');
  var editBtn = document.getElementById('btn-edit-profile');

  viewEl.style.display = 'flex';
  editEl.classList.remove('pf-edit-visible');
  editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar';
  editBtn.style.borderColor = '';
  editBtn.style.color = '';
}

async function saveProfile() {
  var nombre = document.getElementById('edit-nombre').value.trim();
  var telefono = document.getElementById('edit-telefono').value.trim();

  if (!nombre) {
    showToast('El nombre es obligatorio', 'warning');
    document.getElementById('edit-nombre').focus();
    return;
  }

  var saveBtn = document.getElementById('btn-save-profile');
  var originalText = saveBtn.innerHTML;
  saveBtn.classList.add('pf-btn-loading');
  saveBtn.innerHTML = '<div class="pf-spinner"></div><span class="pf-btn-text">Guardando...</span>';
  saveBtn.disabled = true;

  try {
    var res = await api.solicitarJson('/client/profile', {
      method: 'PUT',
      body: JSON.stringify({ nombre: nombre, telefono: telefono })
    });

    if (res.ok) {
      showToast('Perfil actualizado correctamente', 'success');
      profile.nombre = nombre;
      profile.telefono = telefono;

      cancelEditProfile();
      renderProfile();
    }
  } catch(e) {
    var errMsg = 'No se pudo actualizar el perfil';
    if (e.datos && e.datos.message) errMsg = e.datos.message;
    showToast(errMsg, 'error');
  } finally {
    saveBtn.classList.remove('pf-btn-loading');
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
}

// ================================================
// Change Password
// ================================================
function toggleChangePassword() {
  isPasswordOpen = !isPasswordOpen;
  var form = document.getElementById('change-password-form');
  var arrow = document.getElementById('password-arrow');
  var trigger = document.getElementById('config-password-trigger');

  if (isPasswordOpen) {
    form.classList.add('pf-accordion-open');
    if (arrow) arrow.classList.add('pf-arrow-open');
    if (trigger) trigger.style.borderColor = 'rgba(59,130,246,0.3)';
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    setTimeout(function() {
      document.getElementById('current-password').focus();
    }, 300);
  } else {
    form.classList.remove('pf-accordion-open');
    if (arrow) arrow.classList.remove('pf-arrow-open');
    if (trigger) trigger.style.borderColor = '';
  }
}

async function changePassword() {
  var currentPassword = document.getElementById('current-password').value;
  var newPassword = document.getElementById('new-password').value;
  var confirmPassword = document.getElementById('confirm-password').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('Completa todos los campos', 'warning');
    return;
  }

  if (newPassword.length < 6) {
    showToast('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error');
    document.getElementById('confirm-password').focus();
    return;
  }

  try {
    var res = await api.solicitarJson('/client/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
    });

    if (res.ok) {
      showToast('Contraseña actualizada correctamente', 'success');
      toggleChangePassword();
    }
  } catch(e) {
    var errMsg = 'No se pudo cambiar la contraseña';
    if (e.datos && e.datos.message) errMsg = e.datos.message;
    showToast(errMsg, 'error');
  }
}

// ================================================
// Logout
// ================================================
function confirmLogout() {
  if (typeof Swal !== 'undefined') {
    var isDark = document.body.classList.contains('dark');
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Se cerrará tu sesión actual',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      customClass: isDark ? { popup: 'swal-dark' } : {},
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#e2e8f0' : '#2f343d',
    }).then(function(result) {
      if (result.isConfirmed) {
        catalogoLogout();
      }
    });
  } else {
    if (confirm('¿Cerrar sesión?')) {
      catalogoLogout();
    }
  }
}

function catalogoLogout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('shopitp_user');
  try {
    api.solicitarJson('/logout', { method: 'POST' }).catch(function(){});
  } catch(e) {}
  window.location.href = 'login.html';
}

// ================================================
// Toast Notification
// ================================================
function showToast(message, type) {
  var existing = document.querySelector('.pf-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'pf-toast pf-toast-' + (type || 'success');

  var iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pf-toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pf-toast-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pf-toast-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  }

  toast.innerHTML = iconSvg + '<span>' + escapeHtml(message) + '</span>';
  document.body.appendChild(toast);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.classList.add('pf-toast-visible');
    });
  });

  setTimeout(function() {
    toast.classList.remove('pf-toast-visible');
    setTimeout(function() {
      if (toast.parentNode) toast.remove();
    }, 350);
  }, 3000);
}

// ================================================
// Error Display
// ================================================
function showError(message) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('profile-content').style.display = 'none';
  document.getElementById('not-logged-state').style.display = 'block';

  var notLogged = document.querySelector('.pf-not-logged');
  if (notLogged) {
    notLogged.querySelector('.pf-not-logged-title').textContent = 'Error';
    notLogged.querySelector('.pf-not-logged-desc').textContent = message;
  }
}

// ================================================
// Utilities
// ================================================
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  } catch(e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
