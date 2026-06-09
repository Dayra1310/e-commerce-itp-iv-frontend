(function inicializarVistaClientes() {
  var temaGuardado = localStorage.getItem('shopitp_theme');
  var prefiereOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (temaGuardado === 'dark' || (!temaGuardado && prefiereOscuro)) {
    document.body.classList.add('dark');
  }

  var barraNavegacion = document.getElementById('cat-navbar');

  function actualizarSombraNavbar() {
    if (!barraNavegacion) return;
    barraNavegacion.classList.toggle('scrolled', window.scrollY > 8);
  }

  actualizarSombraNavbar();
  window.addEventListener('scroll', actualizarSombraNavbar);

  async function sincronizarSesionCliente() {
    if (!window.clienteApi || typeof window.clienteApi.solicitarJson !== 'function') return;

    try {
      await window.clienteApi.solicitarJson('/client/profile', { method: 'GET' });
    } catch (errorCliente) {
      if (errorCliente.status === 401 || errorCliente.status === 403) {
        window.location.href = 'login.html';
      }
    }
  }

  async function cerrarSesion() {
    try {
      if (window.clienteApi && typeof window.clienteApi.solicitarJson === 'function') {
        await window.clienteApi.solicitarJson('/logout', { method: 'POST' });
      } else {
        await fetch('http://localhost:3001/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.warn('No se pudo cerrar la sesión en el servidor:', error);
    } finally {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('shopitp_user');
      } catch (error) {}
      window.location.href = 'login.html';
    }
  }

  var botonesCerrarSesion = [
    document.getElementById('boton-cerrar-sesion-clientes'),
    document.getElementById('boton-cerrar-sesion-card')
  ];

  botonesCerrarSesion.forEach(function (boton) {
    if (boton) {
      boton.addEventListener('click', cerrarSesion);
    }
  });

  sincronizarSesionCliente();
})();
