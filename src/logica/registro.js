/* ============================================
   ShopITP - Registro JavaScript
   Con animaciones, validación y conexión al backend

   Backend: POST /auth/registro
   Body: { nombre, email, telefono, password }
   Response (201): { ok: true, message: "..." }
   Response (400/409): { ok: false, message: "..." }
   ============================================ */

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  setupFormValidation();
  setupPasswordToggles();

  // Agregar event listener al form
  const form = document.getElementById('register-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleRegister(e);
      return false;
    });
  }
});

// ---- Particles ----
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = Math.random() * 8 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${Math.random() * 12 + 8}s`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    container.appendChild(particle);
  }
}

// ---- Toast ----
function showRegisterToast(message, type) {
  type = type || 'error';
  var existing = document.querySelectorAll('.register-toast');
  for (var i = 0; i < existing.length; i++) {
    existing[i].style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout((function(el) { return function() { if (el.parentElement) el.remove(); }; })(existing[i]), 300);
  }

  var toast = document.createElement('div');
  toast.className = 'register-toast toast-' + type;

  var iconSvg = '';
  if (type === 'error') {
    iconSvg = '<svg class="register-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else if (type === 'success') {
    iconSvg = '<svg class="register-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg class="register-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  }

  toast.innerHTML = iconSvg + '<span>' + message + '</span>' +
    '<button class="register-toast-close" onclick="this.parentElement.style.animation=\'toastSlideOut 0.3s ease forwards\';setTimeout(function(){this.parentElement.remove()}.bind(this),300)">&times;</button>';

  document.body.appendChild(toast);

  setTimeout(function() {
    if (toast.parentElement) {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(function() { if (toast.parentElement) toast.remove(); }, 300);
    }
  }, 5000);
}

// ---- Toggle Password ----
function togglePassword(inputId) {
  var input = document.getElementById(inputId);
  if (!input) return;

  // Buscar el botón toggle hermano
  var wrapper = input.parentElement;
  var btn = wrapper.querySelector('.toggle-password');
  if (!btn) return;

  var eyeIcon = btn.querySelector('.eye-icon');
  var eyeOffIcon = btn.querySelector('.eye-off-icon');

  if (input.type === 'password') {
    input.type = 'text';
    if (eyeIcon) eyeIcon.style.display = 'none';
    if (eyeOffIcon) eyeOffIcon.style.display = 'block';
  } else {
    input.type = 'password';
    if (eyeIcon) eyeIcon.style.display = 'block';
    if (eyeOffIcon) eyeOffIcon.style.display = 'none';
  }
}

function setupPasswordToggles() {
  var btns = document.querySelectorAll('.toggle-password');
  for (var i = 0; i < btns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var inputId = btn.getAttribute('data-input');
        if (inputId) {
          togglePassword(inputId);
        }
      });
    })(btns[i]);
  }
}

// ---- Form Validation Setup ----
function setupFormValidation() {
  var fields = ['name', 'email', 'phone', 'password', 'confirm'];
  var confirmInput = document.getElementById('reg-confirm');

  for (var i = 0; i < fields.length; i++) {
    (function(field) {
      var input = document.getElementById('reg-' + field);
      if (!input) return;

      input.addEventListener('input', function() {
        validateField(field);
        if (field === 'password') {
          updatePasswordStrength();
          if (confirmInput && confirmInput.value) validateField('confirm');
        }
      });
      input.addEventListener('blur', function() {
        validateField(field);
      });
    })(fields[i]);
  }
}

// ---- Validate Single Field ----
function validateField(field) {
  var validators = {
    name: function() {
      var val = document.getElementById('reg-name').value.trim();
      if (!val) return 'El nombre es obligatorio';
      if (val.length < 2) return 'Mínimo 2 caracteres';
      return null;
    },
    email: function() {
      var val = document.getElementById('reg-email').value.trim();
      if (!val) return 'El correo es obligatorio';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Ingresa un correo válido';
      return null;
    },
    phone: function() {
      var val = document.getElementById('reg-phone').value.trim();
      if (!val) return 'El teléfono es obligatorio';
      if (!/^\d{7,15}$/.test(val.replace(/[\s\-\+]/g, ''))) return '7-15 dígitos';
      return null;
    },
    password: function() {
      var val = document.getElementById('reg-password').value;
      if (!val) return 'La contraseña es obligatoria';
      if (val.length < 6) return 'Mínimo 6 caracteres';
      return null;
    },
    confirm: function() {
      var val = document.getElementById('reg-confirm').value;
      var pass = document.getElementById('reg-password').value;
      if (!val) return 'Confirma tu contraseña';
      if (val !== pass) return 'Las contraseñas no coinciden';
      return null;
    }
  };

  var error = validators[field]();
  var input = document.getElementById('reg-' + field);
  var errorEl = document.getElementById('error-' + field);
  var statusEl = document.getElementById('status-' + field);

  if (error) {
    input.classList.remove('valid');
    input.classList.add('invalid');
    if (errorEl) { errorEl.textContent = error; errorEl.classList.add('show'); }
    if (statusEl) statusEl.className = 'input-status error show';
  } else if (input.value.trim() || (field === 'password' && input.value) || (field === 'confirm' && input.value)) {
    input.classList.remove('invalid');
    input.classList.add('valid');
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
    if (statusEl) statusEl.className = 'input-status success show';
  } else {
    input.classList.remove('valid', 'invalid');
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
    if (statusEl) statusEl.className = 'input-status';
  }

  return !error;
}

// ---- Password Strength ----
function updatePasswordStrength() {
  var password = document.getElementById('reg-password').value;
  var strengthEl = document.getElementById('password-strength');
  var strengthText = document.getElementById('strength-text');
  var bars = [
    document.getElementById('str-1'),
    document.getElementById('str-2'),
    document.getElementById('str-3'),
    document.getElementById('str-4')
  ];

  if (!password) { strengthEl.classList.remove('visible'); return; }
  strengthEl.classList.add('visible');

  var score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  var level, levelClass;
  if (score <= 1) { level = 'Débil'; levelClass = 'weak'; }
  else if (score === 2) { level = 'Regular'; levelClass = 'fair'; }
  else if (score === 3) { level = 'Buena'; levelClass = 'good'; }
  else { level = 'Fuerte'; levelClass = 'strong'; }

  var activeBars = Math.min(Math.max(score, 1), 4);
  for (var i = 0; i < bars.length; i++) {
    if (i < activeBars) {
      bars[i].className = 'strength-bar active ' + levelClass;
    } else {
      bars[i].className = 'strength-bar';
    }
  }

  strengthText.textContent = level;
  strengthText.className = 'strength-text ' + levelClass;
}

// ---- Handle Register ----
function handleRegister(e) {
  // Prevenir cualquier recarga
  if (e) { e.preventDefault(); e.stopPropagation(); }

  // Ocultar error general previo
  var generalError = document.getElementById('general-error');
  if (generalError) generalError.style.display = 'none';

  // Validar todos los campos
  var fields = ['name', 'email', 'phone', 'password', 'confirm'];
  var allValid = true;
  var invalidFields = [];

  for (var i = 0; i < fields.length; i++) {
    if (!validateField(fields[i])) {
      allValid = false;
      invalidFields.push(fields[i]);
    }
  }

  if (!allValid) {
    var fieldNames = {
      name: 'Nombre',
      email: 'Correo',
      phone: 'Teléfono',
      password: 'Contraseña',
      confirm: 'Confirmar contraseña'
    };
    var names = [];
    for (var j = 0; j < invalidFields.length; j++) {
      names.push(fieldNames[invalidFields[j]]);
    }
    showRegisterToast('Corrige los campos: ' + names.join(', '), 'warning');

    // Hacer shake en el primer campo inválido y focus
    var firstInvalid = document.querySelector('.form-input.invalid');
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.style.animation = 'shakeError 0.4s ease';
      setTimeout(function() { firstInvalid.style.animation = ''; }, 400);
    }
    return false;
  }

  // Obtener valores
  var nombre = document.getElementById('reg-name').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var telefono = document.getElementById('reg-phone').value.trim();
  var password = document.getElementById('reg-password').value;

  // Mostrar loading
  var btn = document.getElementById('register-btn');
  var btnText = btn.querySelector('.btn-text');
  var btnLoading = btn.querySelector('.btn-loading');

  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'flex';

  // ---- Conectar al backend: POST /auth/registro ----
  fetch('http://localhost:3001/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: nombre, email: email, telefono: telefono, password: password })
  })
  .then(function(response) {
    return response.json().then(function(data) {
      return { ok: response.ok, data: data };
    });
  })
  .then(function(result) {
    if (result.data.ok) {
      // ÉXITO - Registro exitoso
      showRegisterToast('Cuenta creada exitosamente! Redirigiendo al catálogo...', 'success');
      showSuccessAnimation();

      setTimeout(function() {
        window.location.href = 'catalogo.html';
      }, 3000);
    } else {
      // Error del servidor (email duplicado, datos inválidos, etc.)
      btn.disabled = false;
      btnText.style.display = 'flex';
      btnLoading.style.display = 'none';

      var errorMsg = result.data.message || 'Error al registrarse';
      var errorType = 'error';

      if (errorMsg.indexOf('ya está registrado') !== -1 || errorMsg.indexOf('ya existe') !== -1 || errorMsg.indexOf('duplicado') !== -1) {
        errorMsg = 'Este correo ya está registrado. Intenta con otro.';
        errorType = 'warning';
        var emailInput = document.getElementById('reg-email');
        var emailError = document.getElementById('error-email');
        var emailStatus = document.getElementById('status-email');
        if (emailInput) { emailInput.classList.remove('valid'); emailInput.classList.add('invalid'); }
        if (emailError) { emailError.textContent = 'Correo ya registrado'; emailError.classList.add('show'); }
        if (emailStatus) emailStatus.className = 'input-status error show';
        if (emailInput) emailInput.focus();
      }

      showRegisterToast(errorMsg, errorType);

      if (generalError) {
        generalError.textContent = errorMsg;
        generalError.style.display = 'flex';
      }
    }
  })
  .catch(function(err) {
    btn.disabled = false;
    btnText.style.display = 'flex';
    btnLoading.style.display = 'none';

    var errorMsg = err.message || 'Error desconocido';

    if (errorMsg.indexOf('Failed to fetch') !== -1 || errorMsg.indexOf('NetworkError') !== -1 || errorMsg.indexOf('fetch') !== -1) {
      errorMsg = 'No se pudo conectar al servidor. Verifica que el backend esté corriendo en el puerto 3001.';
    }

    showRegisterToast(errorMsg, 'error');

    if (generalError) {
      generalError.textContent = errorMsg;
      generalError.style.display = 'flex';
    }
  });

  return false;
}

// ---- Success Animation ----
function showSuccessAnimation() {
  var formWrapper = document.getElementById('register-form-wrapper');
  var successEl = document.getElementById('register-success');

  formWrapper.style.transition = 'all 0.4s ease';
  formWrapper.style.opacity = '0';
  formWrapper.style.transform = 'scale(0.95)';

  setTimeout(function() {
    formWrapper.style.display = 'none';
    successEl.style.display = 'block';
  }, 400);
}

// ---- Keyboard ----
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.classList.contains('form-input')) {
    var form = document.getElementById('register-form');
    var inputs = Array.from(form.querySelectorAll('.form-input'));
    var currentIndex = inputs.indexOf(e.target);
    if (currentIndex < inputs.length - 1) {
      e.preventDefault();
      inputs[currentIndex + 1].focus();
    } else {
      e.preventDefault();
      handleRegister(e);
    }
  }
});
