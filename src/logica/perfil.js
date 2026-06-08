/* ============================================
   Perfil - JavaScript v3.0
   Usa window.clienteApi del configuracion-api.js
   - Fix invitado: muestra datos reales del backend
   - Edición con animaciones fluidas
   - Toast notifications
   - Conexión con /client/profile y /client/password
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
  await loadProfile();
});

// ================================================
// Theme
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
// Staggered Animations on Scroll/Load
// ================================================
function initAnimations() {
  var items = document.querySelectorAll('.pf-animate-in');
  if (!items.length) return;

  // Intersection observer for scroll-triggered animations
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
// Load Profile - FIX INVITADO
// ================================================
async function loadProfile() {
  try {
    var res = await api.solicitarJson('/client/profile');
    if (res.ok) {
      profile = {
        nombre: res.nombre || '',
        email: res.email || '',
        telefono: res.telefono || '',
        rol: res.rol || '',
        imagen: res.imagen || '',
        fechaRegistro: res.fechaRegistro || res.fecha_registro || ''
      };
      renderProfile();
      return;
    }
  } catch(e) {
    console.warn('[Perfil] /client/profile falló:', e.message);
  }

  // Fallback: intentar /perfil (de index.js)
  try {
    var res2 = await api.solicitarJson('/perfil');
    if (res2.ok) {
      profile = {
        nombre: res2.nombre || '',
        email: res2.email || '',
        telefono: res2.telefono || '',
        rol: res2.rol || '',
        imagen: res2.imagen || '',
        fechaRegistro: res2.fechaRegistro || res2.fecha_registro || ''
      };
      renderProfile();
      return;
    }
  } catch(e2) {
    console.warn('[Perfil] /perfil fallback falló:', e2.message);
  }

  // Fallback: localStorage
  var savedUser = localStorage.getItem('shopitp_user');
  if (savedUser) {
    try {
      profile = JSON.parse(savedUser);
      renderProfile();
      return;
    } catch(e) {}
  }

  // No hay sesión — mostrar estado "no logueado"
  showNotLoggedIn();
}

function showNotLoggedIn() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('not-logged-state').style.display = 'block';
  document.getElementById('profile-content').style.display = 'none';
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

  // Avatar
  var avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    if (profile.imagen && profile.imagen !== 'default.jpg' && profile.imagen !== '') {
      var imgUrl = api.construirUrlImagen(profile.imagen);
      avatarEl.innerHTML = '<img src="' + imgUrl + '" alt="' + name + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent=\'' + initial + '\'">';
    } else {
      avatarEl.textContent = initial;
    }
  }

  // Name & Email
  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-email').textContent = email;

  // Badges
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

  // Stats
  var statRol = document.getElementById('stat-rol');
  if (statRol) statRol.textContent = profile.rol || '—';

  var statFecha = document.getElementById('stat-fecha');
  if (statFecha) statFecha.textContent = profile.fechaRegistro ? formatDate(profile.fechaRegistro) : '—';

  // Personal Info
  var infoItems = [
    {
      label: 'Nombre Completo',
      value: profile.nombre || 'No especificado',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    },
    {
      label: 'Correo Electrónico',
      value: profile.email || 'No especificado',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
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

  // Update Navbar
  updateNavbar(name, email, initial);

  // Create particles in banner
  createParticles();

  // Trigger animations
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
  localStorage.setItem('shopitp_user', JSON.stringify(user));

  var actionsEl = document.getElementById('navbar-actions');
  if (!actionsEl) return;

  var avatarHtml = '';
  if (profile.imagen && profile.imagen !== 'default.jpg' && profile.imagen !== '') {
    var imgUrl = api.construirUrlImagen(profile.imagen);
    avatarHtml = '<div class="cat-user-avatar"><img src="' + imgUrl + '" alt="' + name + '" onerror="this.parentElement.textContent=\'' + initial + '\'"></div>';
  } else {
    avatarHtml = '<div class="cat-user-avatar">' + initial + '</div>';
  }
  actionsEl.innerHTML =
    avatarHtml +
    '<span class="cat-nav-user">' + escapeHtml(name) + '</span>' +
    '<button onclick="confirmLogout()" class="cat-btn cat-btn-outline cat-btn-sm">Salir</button>';
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

    // Fill form
    document.getElementById('edit-nombre').value = profile ? profile.nombre || '' : '';
    document.getElementById('edit-email').value = profile ? profile.email || '' : '';
    document.getElementById('edit-telefono').value = profile ? profile.telefono || '' : '';

    // Focus first input
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

  // Show loading state
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

      // Update localStorage
      var savedUser = localStorage.getItem('shopitp_user');
      if (savedUser) {
        try {
          var u = JSON.parse(savedUser);
          u.nombre = nombre;
          u.telefono = telefono;
          localStorage.setItem('shopitp_user', JSON.stringify(u));
        } catch(e) {}
      }

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
  localStorage.removeItem('shopitp_user');
  localStorage.removeItem('shopitp_cart');
  try {
    api.solicitarJson('/logout', { method: 'POST' }).catch(function(){});
  } catch(e) {}
  window.location.href = 'login.html';
}

// ================================================
// Toast Notification
// ================================================
function showToast(message, type) {
  // Remove existing toast
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

  // Animate in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.classList.add('pf-toast-visible');
    });
  });

  // Auto dismiss
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
