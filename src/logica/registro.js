/* ============================================
   ShopITP - Registro JavaScript
   Modulo: Catalogo y Clientes

   Archivo separado para el registro de usuarios.
   Se conecta al backend POST /auth/register

   Conexion: este archivo se carga desde registro.html
   con <script src="js/registro.js">

   Si api.js esta disponible (via ../../public/js/api.js),
   usa authApi.register(). Si no, usa fetch directo.
   ============================================ */

(function() {
  'use strict';

  // ---- Detectar origen de la pagina ----
  var pageOrigin = window.location.origin;
  var pageProtocol = window.location.protocol;
  var isFileProtocol = pageProtocol === 'file:';
  var isBackendOrigin = pageOrigin === 'http://localhost:3001';

  // ---- Config del Backend ----
  // Si la pagina es servida por el backend (http://localhost:3001),
  // usamos URL relativa /auth/register (sin CORS)
  // Si no, usamos URL absoluta http://localhost:3001/auth/register
  var API_URL = isBackendOrigin ? '' : 'http://localhost:3001';

  console.log('[Registro] Protocolo:', pageProtocol);
  console.log('[Registro] Origin:', pageOrigin);
  console.log('[Registro] API_URL:', API_URL || '(mismo origen, URL relativa)');
  console.log('[Registro] isFileProtocol:', isFileProtocol);

  // ---- Backend URL auto-detect ----
  var BACKEND_URL = 'http://localhost:3001';
  var backendChecked = false;
  var backendAvailable = false;

  // ---- Mostrar banner si se abre desde file:// ----
  function showCorsBanner() {
    var banner = document.createElement('div');
    banner.id = 'cors-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:16px 20px;' +
      'background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;font-family:system-ui,sans-serif;' +
      'font-size:0.9375rem;line-height:1.6;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-align:center;';
    banner.innerHTML =
      '<div style="max-width:750px;margin:0 auto;">' +
        '<strong style="font-size:1.0625rem;">Archivo abierto directamente (file://)</strong><br>' +
        'El navegador bloquea las peticiones al backend por seguridad. Usa <strong>Live Server</strong> en VS Code:<br>' +
        '<span style="display:inline-block;margin-top:8px;padding:8px 14px;background:rgba(0,0,0,0.2);' +
        'border-radius:8px;font-size:0.9375rem;text-align:left;">' +
        '1. Abre la carpeta en VS Code<br>' +
        '2. Click derecho en registro.html<br>' +
        '3. "Open with Live Server"<br>' +
        '4. Se abre en http://localhost:5500/registro.html</span>' +
      '</div>' +
      '<button onclick="this.parentElement.remove()" style="position:absolute;top:8px;right:12px;' +
      'background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;opacity:0.7;line-height:1;">&times;</button>';
    document.body.appendChild(banner);
    document.body.style.paddingTop = '120px';
  }

  // Probar la conexion al backend al cargar la pagina
  function testBackendConnection() {
    console.log('[Registro] Probando conexion al backend...');
    var testUrl = isBackendOrigin ? '/' : BACKEND_URL + '/';
    fetch(testUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then(function(r) { return r.text(); })
      .then(function(text) {
        backendChecked = true;
        try {
          var data = JSON.parse(text);
          console.log('[Registro] Backend disponible:', data);
          backendAvailable = true;
        } catch(e) {
          console.warn('[Registro] Backend responde pero no con JSON. Puede ser Express sin ruta /.');
          backendAvailable = true;
        }
      })
      .catch(function(err) {
        backendChecked = true;
        backendAvailable = false;
        console.error('[Registro] Backend NO disponible:', err.message);
        if (isFileProtocol) {
          showRegisterToast('Estas abriendo el archivo directamente (file://). El navegador bloquea el acceso al backend. Usa Live Server en VS Code: click derecho en registro.html > "Open with Live Server"', 'error');
        } else {
          showRegisterToast('El backend no esta corriendo en ' + BACKEND_URL + '. Inicia el servidor con: node index.js', 'error');
        }
      });
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Registro] Pagina cargada, inicializando...');

    // Si abrieron desde file://, mostrar banner CORS inmediatamente
    if (isFileProtocol) {
      showCorsBanner();
    }

    createParticles();
    setupFormValidation();
    setupPasswordToggles();

    // Probar conexion al backend
    testBackendConnection();

    var form = document.getElementById('register-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        handleRegister(e);
        return false;
      });
      console.log('[Registro] Form listener conectado');
    } else {
      console.error('[Registro] ERROR: No se encontro el form');
      alert('Error: No se encontro el formulario. Recarga la pagina.');
    }

    if (typeof authApi !== 'undefined') {
      console.log('[Registro] authApi detectado correctamente');
    } else {
      console.warn('[Registro] authApi no disponible - se usara fetch directo');
    }
  });

  // ---- Particles ----
  function createParticles() {
    var container = document.getElementById('particles');
    if (!container) return;
    for (var i = 0; i < 20; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      var size = Math.random() * 8 + 3;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (Math.random() * 12 + 8) + 's';
      p.style.animationDelay = Math.random() * 8 + 's';
      container.appendChild(p);
    }
  }

  // ---- Toast ----
  function showRegisterToast(message, type) {
    type = type || 'error';
    console.log('[Registro] Toast:', type, '-', message);

    try {
      var existing = document.querySelectorAll('.register-toast');
      for (var i = 0; i < existing.length; i++) {
        (function(el) {
          el.style.transition = 'all 0.3s ease';
          el.style.opacity = '0';
          el.style.transform = 'translateX(100%)';
          setTimeout(function() { if (el.parentElement) el.remove(); }, 300);
        })(existing[i]);
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

      // Inline styles como fallback
      var base = 'position:fixed;top:1.5rem;right:1.5rem;z-index:9999;min-width:300px;max-width:440px;' +
        'padding:1rem 1.25rem;border-radius:14px;display:flex;align-items:center;gap:0.75rem;' +
        'font-size:0.875rem;font-weight:500;font-family:system-ui,sans-serif;' +
        'box-shadow:0 12px 40px rgba(0,0,0,0.15);border-left:4px solid;';
      var colors = '';
      if (type === 'error') colors = 'border-left-color:#ef4444;color:#dc2626;background:#fef2f2;';
      else if (type === 'success') colors = 'border-left-color:#22c55e;color:#166534;background:#f0fdf4;';
      else if (type === 'warning') colors = 'border-left-color:#f59e0b;color:#92400e;background:#fffbeb;';
      else colors = 'border-left-color:#3b82f6;color:#1e40af;background:#eff6ff;';

      toast.style.cssText = base + colors;
      toast.innerHTML = iconSvg + '<span>' + message + '</span>' +
        '<button style="margin-left:auto;background:none;border:none;font-size:1.25rem;cursor:pointer;padding:0;line-height:1;color:inherit;opacity:0.5;" onclick="this.parentElement.remove()">&times;</button>';

      document.body.appendChild(toast);

      // Animacion de entrada
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.4s cubic-bezier(0.16,1,0.3,1)';
      setTimeout(function() {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      }, 10);

      // Auto-ocultar despues de 6s
      setTimeout(function() {
        if (toast.parentElement) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          setTimeout(function() { if (toast.parentElement) toast.remove(); }, 400);
        }
      }, 6000);

    } catch(e) {
      console.error('[Registro] Error mostrando toast:', e);
      alert(message);
    }
  }

  // ---- Toggle Password ----
  function togglePassword(inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
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
          if (inputId) togglePassword(inputId);
        });
      })(btns[i]);
    }
  }

  // ---- Validation ----
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
        input.addEventListener('blur', function() { validateField(field); });
      })(fields[i]);
    }
  }

  function validateField(field) {
    var validators = {
      name: function() { var v = document.getElementById('reg-name').value.trim(); if (!v) return 'El nombre es obligatorio'; if (v.length < 2) return 'Minimo 2 caracteres'; return null; },
      email: function() { var v = document.getElementById('reg-email').value.trim(); if (!v) return 'El correo es obligatorio'; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Ingresa un correo valido'; return null; },
      phone: function() { var v = document.getElementById('reg-phone').value.trim(); if (!v) return 'El telefono es obligatorio'; if (!/^\d{7,15}$/.test(v.replace(/[\s\-\+]/g, ''))) return '7-15 digitos'; return null; },
      password: function() { var v = document.getElementById('reg-password').value; if (!v) return 'La contrasena es obligatoria'; if (v.length < 6) return 'Minimo 6 caracteres'; return null; },
      confirm: function() { var v = document.getElementById('reg-confirm').value; var p = document.getElementById('reg-password').value; if (!v) return 'Confirma tu contrasena'; if (v !== p) return 'Las contrasenas no coinciden'; return null; }
    };
    var error = validators[field]();
    var input = document.getElementById('reg-' + field);
    var errorEl = document.getElementById('error-' + field);
    var statusEl = document.getElementById('status-' + field);
    if (error) {
      input.classList.remove('valid'); input.classList.add('invalid');
      if (errorEl) { errorEl.textContent = error; errorEl.classList.add('show'); }
      if (statusEl) statusEl.className = 'input-status error show';
    } else if (input.value.trim() || (field === 'password' && input.value) || (field === 'confirm' && input.value)) {
      input.classList.remove('invalid'); input.classList.add('valid');
      if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
      if (statusEl) statusEl.className = 'input-status success show';
    } else {
      input.classList.remove('valid', 'invalid');
      if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('show'); }
      if (statusEl) statusEl.className = 'input-status';
    }
    return !error;
  }

  function updatePasswordStrength() {
    var password = document.getElementById('reg-password').value;
    var strengthEl = document.getElementById('password-strength');
    var strengthText = document.getElementById('strength-text');
    var bars = [document.getElementById('str-1'), document.getElementById('str-2'), document.getElementById('str-3'), document.getElementById('str-4')];
    if (!password) { strengthEl.classList.remove('visible'); return; }
    strengthEl.classList.add('visible');
    var score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    var level, cls;
    if (score <= 1) { level = 'Debil'; cls = 'weak'; }
    else if (score === 2) { level = 'Regular'; cls = 'fair'; }
    else if (score === 3) { level = 'Buena'; cls = 'good'; }
    else { level = 'Fuerte'; cls = 'strong'; }
    var active = Math.min(Math.max(score, 1), 4);
    for (var i = 0; i < bars.length; i++) {
      bars[i].className = i < active ? 'strength-bar active ' + cls : 'strength-bar';
    }
    strengthText.textContent = level;
    strengthText.className = 'strength-text ' + cls;
  }

  // ---- Handle Register ----
  function handleRegister(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    console.log('[Registro] Iniciando registro...');

    var generalError = document.getElementById('general-error');
    if (generalError) generalError.style.display = 'none';

    // Validar todos los campos
    var fields = ['name', 'email', 'phone', 'password', 'confirm'];
    var allValid = true, invalidFields = [];
    for (var i = 0; i < fields.length; i++) {
      if (!validateField(fields[i])) { allValid = false; invalidFields.push(fields[i]); }
    }

    if (!allValid) {
      var names = { name:'Nombre', email:'Correo', phone:'Telefono', password:'Contrasena', confirm:'Confirmar contrasena' };
      var list = [];
      for (var j = 0; j < invalidFields.length; j++) list.push(names[invalidFields[j]]);
      showRegisterToast('Corrige los campos: ' + list.join(', '), 'warning');
      var firstInvalid = document.querySelector('.form-input.invalid');
      if (firstInvalid) { firstInvalid.focus(); firstInvalid.style.animation = 'shakeError 0.4s ease'; setTimeout(function() { firstInvalid.style.animation = ''; }, 400); }
      return false;
    }

    // Obtener valores del formulario
    var name = document.getElementById('reg-name').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var phone = document.getElementById('reg-phone').value.trim();
    var password = document.getElementById('reg-password').value;

    console.log('[Registro] Datos:', { name: name, email: email, phone: phone });

    // Mostrar estado de loading en el boton
    var btn = document.getElementById('register-btn');
    var btnText = btn ? btn.querySelector('.btn-text') : null;
    var btnLoading = btn ? btn.querySelector('.btn-loading') : null;
    if (!btn || !btnText || !btnLoading) {
      alert('Error interno del formulario. Recarga la pagina.');
      return false;
    }
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';

    // Payload para el backend
    var payload = { name: name, email: email, phone: phone, password: password };

    // Elegir metodo: authApi o fetch directo
    var registerPromise;

    if (typeof authApi !== 'undefined' && authApi.register) {
      console.log('[Registro] Usando authApi.register()');
      registerPromise = authApi.register(payload);
    } else {
      var registerUrl = API_URL + '/auth/register';
      console.log('[Registro] Usando fetch directo a ' + registerUrl);
      registerPromise = fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      })
      .then(function(response) {
        console.log('[Registro] Response status:', response.status);
        // Detectar error "Cannot POST" de Express
        var contentType = response.headers.get('content-type') || '';
        if (!response.ok && contentType.indexOf('text/html') !== -1) {
          return response.text().then(function(html) {
            console.error('[Registro] El backend devuelve HTML en vez de JSON:', html.substring(0, 200));
            if (html.indexOf('Cannot POST') !== -1) {
              throw new Error('BACKEND_RUTA_NO_EXISTE');
            }
            throw new Error('El backend devuelve una pagina HTML en vez de JSON. Verifica que el backend este configurado correctamente.');
          });
        }
        if (!response.ok) {
          return response.text().then(function(text) {
            var errData;
            try { errData = JSON.parse(text); } catch(e) { errData = { error: text }; }
            var errMsg = errData.error || errData.message || ('Error ' + response.status);
            throw new Error(errMsg);
          });
        }
        return response.json();
      })
      .then(function(data) {
        console.log('[Registro] Response data:', data);
        // Unwrap: { success, data: { token, user } } -> { token, user }
        if (data && data.success && data.data) return data.data;
        return data;
      });
    }

    // Procesar resultado del registro
    registerPromise
    .then(function(result) {
      console.log('[Registro] EXITO!', result);

      // El registro no guarda sesión en localStorage.
      // La autenticación real se crea únicamente al iniciar sesión,
      // usando la cookie httpOnly generada por el backend.

      // Mostrar toast de exito y animacion
      showRegisterToast('Cuenta creada exitosamente! Redirigiendo al login...', 'success');
      showSuccessAnimation();

      // Redirigir al login despues de 3 segundos
      setTimeout(function() { window.location.href = 'login.html'; }, 3000);
    })
    .catch(function(err) {
      console.error('[Registro] ERROR:', err);

      // Restaurar boton
      btn.disabled = false;
      btnText.style.display = 'flex';
      btnLoading.style.display = 'none';

      var errorMsg = err.message || 'Error desconocido';
      var errorType = 'error';

      // Detectar tipo de error para mostrar mensaje adecuado
      if (errorMsg === 'BACKEND_RUTA_NO_EXISTE') {
        errorMsg = 'El backend no tiene la ruta POST /auth/register. Verifica que estes corriendo node index.js en la carpeta backend';
        errorType = 'error';
      } else if (errorMsg.indexOf('ya est') !== -1 || errorMsg.indexOf('ya registrado') !== -1 ||
          errorMsg.indexOf('already') !== -1 || errorMsg.indexOf('duplicate') !== -1 || errorMsg.indexOf('UNIQUE') !== -1) {
        errorMsg = 'Este correo ya esta registrado. Intenta con otro.';
        errorType = 'warning';
        var ei = document.getElementById('reg-email');
        var ee = document.getElementById('error-email');
        var es = document.getElementById('status-email');
        if (ei) { ei.classList.remove('valid'); ei.classList.add('invalid'); }
        if (ee) { ee.textContent = 'Correo ya registrado'; ee.classList.add('show'); }
        if (es) es.className = 'input-status error show';
        if (ei) ei.focus();
      } else if (errorMsg.indexOf('Failed to fetch') !== -1 || errorMsg.indexOf('NetworkError') !== -1 || errorMsg.indexOf('El servidor no responde') !== -1 || errorMsg.indexOf('Load failed') !== -1 || errorMsg.indexOf('Network request failed') !== -1) {
        if (isFileProtocol) {
          errorMsg = 'CORS: Abriste el archivo directamente (file://). Usa Live Server en VS Code para abrir registro.html';
        } else {
          errorMsg = 'No se pudo conectar al servidor. Verifica que el backend este corriendo en http://localhost:3001';
        }
        errorType = 'error';
      } else if (errorMsg.indexOf('obligatorio') !== -1) {
        errorType = 'warning';
      } else if (errorMsg.indexOf('contrase') !== -1 && errorMsg.indexOf('6') !== -1) {
        errorType = 'warning';
        var pi = document.getElementById('reg-password');
        var pe = document.getElementById('error-password');
        if (pi) { pi.classList.remove('valid'); pi.classList.add('invalid'); }
        if (pe) { pe.textContent = errorMsg; pe.classList.add('show'); }
      } else if (errorMsg.indexOf('no v') !== -1 || errorMsg.indexOf('inv') !== -1) {
        errorType = 'warning';
        var ei2 = document.getElementById('reg-email');
        var ee2 = document.getElementById('error-email');
        if (ei2) { ei2.classList.remove('valid'); ei2.classList.add('invalid'); }
        if (ee2) { ee2.textContent = errorMsg; ee2.classList.add('show'); }
      } else if (errorMsg.indexOf('interno') !== -1 || errorMsg.indexOf('500') !== -1) {
        errorMsg = 'Error interno del servidor. Intenta de nuevo mas tarde.';
        errorType = 'error';
      }

      showRegisterToast(errorMsg, errorType);

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
    if (!formWrapper || !successEl) return;
    formWrapper.style.transition = 'all 0.4s ease';
    formWrapper.style.opacity = '0';
    formWrapper.style.transform = 'scale(0.95)';
    setTimeout(function() {
      formWrapper.style.display = 'none';
      successEl.style.display = 'block';
    }, 400);
  }

  // ---- Keyboard navigation (Enter para avanzar campo) ----
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.classList.contains('form-input')) {
      var form = document.getElementById('register-form');
      if (!form) return;
      var inputs = Array.prototype.slice.call(form.querySelectorAll('.form-input'));
      var idx = inputs.indexOf(e.target);
      if (idx < inputs.length - 1) { e.preventDefault(); inputs[idx + 1].focus(); }
      else { e.preventDefault(); handleRegister(e); }
    }
  });

})();
