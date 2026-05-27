// ======================== dashboard.js corregido ========================
// El frontend consume el backend mediante cookies httpOnly.
// El estado de interfaz solo vive en memoria durante la sesión abierta.

const API_BASE_URL = window.API_BASE_URL ?? "http://localhost:3001";
const IMAGEN_DEFAULT = "default.jpg";
const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024;

const estadoAplicacion = {
  usuarios: [],
  roles: [],
  modoOscuroActivo: false,
};

const vista = document.getElementById("vista");
const links = document.querySelectorAll(".menu a");
const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");
const fotoDePerfil = document.getElementById("fotoDePerfil");
const inputImagen = document.getElementById("inputImagen");
const modalImagen = document.getElementById("modalImagen");
const imagenGrande = document.getElementById("imagenGrande");
const btnEditarImagen = document.getElementById("btnEditarImagen");

const escaparHtml = (valor) => String(valor ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());
const validarTelefono = (telefono) => /^[0-9+()\s-]{7,20}$/.test(String(telefono ?? "").trim());

function construirUrlApi(ruta) {
  return `${API_BASE_URL}${ruta}`;
}

function construirUrlImagen(nombreImagen) {
  const nombreSeguro = nombreImagen && nombreImagen !== "null" ? nombreImagen : IMAGEN_DEFAULT;
  return `${API_BASE_URL}/uploads/${encodeURIComponent(nombreSeguro)}`;
}

async function leerRespuestaJson(respuesta) {
  try {
    return await respuesta.json();
  } catch (_error) {
    return { ok: false, message: "Respuesta inválida del servidor" };
  }
}

function redirigirLogin() {
  window.location.href = "../page/login.html";
}

async function solicitarApi(ruta, opciones = {}) {
  const configuracion = {
    credentials: "include",
    ...opciones,
    headers: opciones.headers ?? {},
  };

  if (configuracion.body && !(configuracion.body instanceof FormData)) {
    configuracion.headers = {
      "Content-Type": "application/json",
      ...configuracion.headers,
    };
  }

  const respuesta = await fetch(construirUrlApi(ruta), configuracion);
  const datos = await leerRespuestaJson(respuesta);

  if ([401, 403].includes(respuesta.status)) {
    Swal.fire({
      icon: "warning",
      title: "Sesión no válida",
      text: datos.message ?? "Debes iniciar sesión nuevamente",
      timer: 1500,
      showConfirmButton: false,
    });
    setTimeout(redirigirLogin, 1500);
    throw new Error(datos.message ?? "Sesión no válida");
  }

  if (!respuesta.ok) {
    throw new Error(datos.message ?? "Error en la solicitud");
  }

  if (!datos.ok) {
    throw new Error(datos.message ?? "Error en la solicitud");
  }

  return datos;
}

function actualizarIconoDark() {
  const btn = document.getElementById("btn-dark-mode");
  if (!btn) return;
  btn.innerHTML = estadoAplicacion.modoOscuroActivo ? "Modo claro" : "Modo oscuro";
}


function guardarModoOscuroEnCookie(modoOscuroActivo) {
  const valor = modoOscuroActivo ? "oscuro" : "claro";
  document.cookie = `tema=${valor}; path=/; max-age=31536000; SameSite=Lax`;
}

function obtenerModoOscuroDesdeCookie() {
  const cookieTema = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("tema="));

  if (!cookieTema) return false;

  const valorTema = cookieTema.split("=")[1];
  return valorTema === "oscuro";
}

function aplicarModoOscuro(modoOscuroActivo) {
  estadoAplicacion.modoOscuroActivo = modoOscuroActivo;
  document.body.classList.toggle("dark", modoOscuroActivo);

  const toggle = document.getElementById("toggle-dark");
  if (toggle) toggle.checked = modoOscuroActivo;

  actualizarIconoDark();
}

function toggleDarkMode() {
  const nuevoEstado = !estadoAplicacion.modoOscuroActivo;

  aplicarModoOscuro(nuevoEstado);
  guardarModoOscuroEnCookie(nuevoEstado);
}

const datosEjemplo = {
  productos: [
    { nombre: "Laptop", precio: "$1200" },
    { nombre: "Mouse", precio: "$20" },
  ],
};

const vistas = {
  dashboard: () => cargarVistaDashboardMejorada(),
  productos: () => `
    <h2>Productos</h2>
    <table>
      <thead><tr><th>Nombre</th><th>Precio</th></tr></thead>
      <tbody id="tabla-productos"></tbody>
    </table>
  `,
  reportes: () => `<h2>Reportes</h2><p>No hay datos aún</p>`,
  usuarios: () => `
    <div class="usuarios-header">
      <h2>Usuarios</h2>
      <button id="btn-agregar-usuario">
        <i class='bx bx-plus'></i>
        <span>Agregar usuario</span>
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Teléfono</th>
          <th>Rol</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tabla-usuarios"></tbody>
    </table>
  `,
};

async function cargarVista(nombre) {
  if (!vista) return;
  if (!vistas[nombre]) return;

  vista.innerHTML = vistas[nombre]();

  if (nombre === "productos") {
    const tbody = document.getElementById("tabla-productos");
    tbody.innerHTML = datosEjemplo.productos
      .map((producto) => `
        <tr>
          <td>${escaparHtml(producto.nombre)}</td>
          <td>${escaparHtml(producto.precio)}</td>
        </tr>
      `)
      .join("");
  }

  if (nombre === "usuarios") {
    document
      .getElementById("btn-agregar-usuario")
      .addEventListener("click", agregarUsuario);

    await obtenerUsuarios();
  }

  actualizarIconoDark();
}

async function obtenerRolesDisponibles() {
  if (estadoAplicacion.roles.length > 0) return estadoAplicacion.roles;

  const datos = await solicitarApi("/roles");
  estadoAplicacion.roles = datos.roles ?? [];
  return estadoAplicacion.roles;
}

function crearOpcionesRoles(rolSeleccionado) {
  return estadoAplicacion.roles.map((rol) => `
    <option value="${Number(rol.id)}" ${Number(rolSeleccionado) === Number(rol.id) ? "selected" : ""}>
      ${escaparHtml(rol.nombre)}
    </option>
  `).join("");
}

async function obtenerUsuarios() {
  try {
    await obtenerRolesDisponibles();
    const datos = await solicitarApi("/usuarios");
    estadoAplicacion.usuarios = datos.usuarios ?? [];
    renderUsuarios();
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message ?? "No se pudieron cargar los usuarios",
    });
  }
}

function renderUsuarios() {
  const tbody = document.getElementById("tabla-usuarios");
  if (!tbody) return;

  if (estadoAplicacion.usuarios.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">No hay usuarios administrativos registrados.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = estadoAplicacion.usuarios.map((usuario) => `
    <tr>
      <td>${escaparHtml(usuario.nombre)}</td>
      <td>${escaparHtml(usuario.email)}</td>
      <td>${escaparHtml(usuario.telefono)}</td>
      <td>${escaparHtml(usuario.nombre_rol)}</td>
      <td>
        <button type="button" data-accion="editar" data-id="${Number(usuario.id)}" title="Editar usuario">
          <i class='bx bx-edit'></i>
        </button>
        <button type="button" data-accion="eliminar" data-id="${Number(usuario.id)}" title="Eliminar usuario">
          <i class='bx bx-trash'></i>
        </button>
      </td>
    </tr>
  `).join("");

  tbody.onclick = manejarAccionUsuario;
}

function manejarAccionUsuario(evento) {
  const boton = evento.target.closest("button[data-accion]");

  if (!boton) return;

  const id = Number(boton.dataset.id);
  const usuario = estadoAplicacion.usuarios.find((item) => Number(item.id) === id);

  if (boton.dataset.accion === "editar" && usuario) {
    editarUsuario(usuario);
  }

  if (boton.dataset.accion === "eliminar") {
    eliminarUsuario(id);
  }
}

function validarFormularioUsuario({ nombre, email, telefono, password, rol_id }, requierePassword) {
  if (!nombre) return "El nombre debe tener mínimo 2 caracteres";
  if (nombre.length < 2) return "El nombre debe tener mínimo 2 caracteres";
  if (!validarEmail(email)) return "Ingresa un correo válido";
  if (!validarTelefono(telefono)) return "Ingresa un teléfono válido";
  if (!rol_id) return "Selecciona un rol";
  if (requierePassword) {
    if (!password) return "La contraseña debe tener mínimo 8 caracteres";
    if (password.length < 8) return "La contraseña debe tener mínimo 8 caracteres";
  }
  if (!requierePassword && password && password.length < 8) return "La nueva contraseña debe tener mínimo 8 caracteres";
  return null;
}

async function agregarUsuario() {
  try {
    await obtenerRolesDisponibles();

    Swal.fire({
      title: "Agregar usuario",
      html: `
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre">
        <input id="swal-email" class="swal2-input" placeholder="Correo">
        <input id="swal-telefono" class="swal2-input" placeholder="Número de teléfono">
        <input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña">
        <select id="swal-rol" class="swal2-input">
          <option value="">Selecciona un rol</option>
          ${crearOpcionesRoles()}
        </select>
      `,
      confirmButtonText: "Agregar",
      showCancelButton: true,
      preConfirm: async () => {
        const usuario = {
          nombre: document.getElementById("swal-nombre").value.trim(),
          email: document.getElementById("swal-email").value.trim().toLowerCase(),
          telefono: document.getElementById("swal-telefono").value.trim(),
          password: document.getElementById("swal-password").value,
          rol_id: document.getElementById("swal-rol").value,
        };

        const errorValidacion = validarFormularioUsuario(usuario, true);
        if (errorValidacion) {
          Swal.showValidationMessage(errorValidacion);
          return false;
        }

        try {
          await solicitarApi("/agregarUsuario", {
            method: "POST",
            body: JSON.stringify(usuario),
          });
          return true;
        } catch (error) {
          Swal.showValidationMessage(error.message ?? "Error del servidor");
          return false;
        }
      },
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      Swal.fire({
        icon: "success",
        title: "Usuario agregado",
        timer: 1500,
        showConfirmButton: false,
      });

      obtenerUsuarios();
    });
  } catch (error) {
    console.error("Error al abrir formulario de usuario:", error);
  }
}

async function editarUsuario(usuarioActual) {
  try {
    await obtenerRolesDisponibles();

    Swal.fire({
      title: "Editar usuario",
      html: `
        <input id="edit-nombre" class="swal2-input" value="${escaparHtml(usuarioActual.nombre)}" placeholder="Nombre">
        <input id="edit-email" class="swal2-input" value="${escaparHtml(usuarioActual.email)}" placeholder="Correo">
        <input id="edit-telefono" class="swal2-input" value="${escaparHtml(usuarioActual.telefono)}" placeholder="Teléfono">
        <input id="edit-password" type="password" class="swal2-input" placeholder="Nueva contraseña opcional">
        <select id="edit-rol" class="swal2-input">
          ${crearOpcionesRoles(usuarioActual.rol_id)}
        </select>
      `,
      confirmButtonText: "Guardar",
      showCancelButton: true,
      preConfirm: async () => {
        const usuario = {
          nombre: document.getElementById("edit-nombre").value.trim(),
          email: document.getElementById("edit-email").value.trim().toLowerCase(),
          telefono: document.getElementById("edit-telefono").value.trim(),
          password: document.getElementById("edit-password").value,
          rol_id: document.getElementById("edit-rol").value,
        };

        const errorValidacion = validarFormularioUsuario(usuario, false);
        if (errorValidacion) {
          Swal.showValidationMessage(errorValidacion);
          return false;
        }

        const body = {
          nombre: usuario.nombre,
          email: usuario.email,
          telefono: usuario.telefono,
          rol_id: usuario.rol_id,
        };

        if (usuario.password.trim()) {
          body.password = usuario.password;
        }

        try {
          await solicitarApi(`/usuario/${Number(usuarioActual.id)}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
          return true;
        } catch (error) {
          Swal.showValidationMessage(error.message ?? "Error del servidor");
          return false;
        }
      },
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      Swal.fire({
        icon: "success",
        title: "Usuario actualizado",
        timer: 1500,
        showConfirmButton: false,
      });

      obtenerUsuarios();
    });
  } catch (error) {
    console.error("Error al editar usuario:", error);
  }
}

async function eliminarUsuario(id) {
  const confirmacion = await Swal.fire({
    title: "Eliminar usuario",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
  });

  if (!confirmacion.isConfirmed) return;

  try {
    await solicitarApi(`/eliminarUsuario/${Number(id)}`, { method: "DELETE" });

    Swal.fire({
      icon: "success",
      title: "Usuario eliminado",
      timer: 1500,
      showConfirmButton: false,
    });

    obtenerUsuarios();
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    Swal.fire({
      icon: "error",
      title: "No se pudo eliminar",
      text: error.message ?? "Error del servidor",
    });
  }
}

function cargarVistaDashboardMejorada() {
  const fecha = new Date().toLocaleDateString("es-CO", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <div class="dash-header">
      <div>
        <h1>Panel de control</h1>
        <span class="dash-fecha">${escaparHtml(fecha.charAt(0).toUpperCase() + fecha.slice(1))}</span>
      </div>
    </div>
    <div class="parent">
      <div class="card stat-card div1"><div class="stat-label">Ventas del mes</div><div class="stat-val">$1.000.000</div></div>
      <div class="card stat-card div2"><div class="stat-label">Pedidos activos</div><div class="stat-val">12</div></div>
      <div class="card stat-card div3"><div class="stat-label">Pedidos pendientes</div><div class="stat-val">6</div></div>
      <div class="card div4" style="flex-direction:column; align-items:flex-start;"><div class="metric-title">Ventas por semana</div><div class="metric-placeholder">Gráfica de barras</div></div>
      <div class="card div5-chart" style="flex-direction:column; align-items:flex-start;"><div class="metric-title">Distribución</div><div class="metric-placeholder">Gráfica circular</div></div>
      <div class="card div6-activity">
        <div class="activity-header">
          <div class="metric-title">Actividad reciente</div>
          <input type="text" id="buscar-pedido" placeholder="Buscar pedido..." disabled>
        </div>
        <div class="activity-table-wrapper">
          <table class="activity-table">
            <thead>
              <tr>
                <th>#Pedido</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="tabla-dashboard-pedidos">
              <tr><td colspan="5">El backend actual aún no expone pedidos para el dashboard.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function cargarPerfilDesdeBackend() {
  try {
    const datos = await solicitarApi("/perfil", { method: "GET" });

    nombreUsuario.textContent = datos.nombre;
    rolUsuario.textContent = datos.rol;

    const imagenUrl = construirUrlImagen(datos.imagen);
    fotoDePerfil.src = imagenUrl;
    imagenGrande.src = imagenUrl;
  } catch (error) {
    console.error("Error al cargar perfil:", error);
  }
}

async function verificarAdmin() {
  try {
    await solicitarApi("/admin");
    await cargarPerfilDesdeBackend();
  } catch (error) {
    console.error("Error al verificar administrador:", error);
  }
}

async function subirImagen(archivo, elementoPreview = null) {
  if (!archivo) return false;

  if (!archivo.type.startsWith("image/")) {
    Swal.fire({ icon: "warning", title: "Archivo inválido", text: "Selecciona una imagen válida" });
    return false;
  }

  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    Swal.fire({ icon: "warning", title: "Imagen muy pesada", text: "La imagen no debe superar 5 MB" });
    return false;
  }

  const formData = new FormData();
  formData.append("imagen", archivo);

  try {
    const datos = await solicitarApi("/usuario/imagen", {
      method: "PUT",
      body: formData,
    });

    const nuevaImagenUrl = `${construirUrlImagen(datos.imagen)}?v=${Date.now()}`;
    fotoDePerfil.src = nuevaImagenUrl;
    imagenGrande.src = nuevaImagenUrl;
    if (elementoPreview) elementoPreview.src = nuevaImagenUrl;

    await Swal.fire({
      icon: "success",
      title: "Imagen actualizada",
      timer: 1500,
      showConfirmButton: false,
    });

    return true;
  } catch (error) {
    console.error("Error al subir imagen:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message ?? "No se pudo subir la imagen",
    });
    return false;
  }
}

function inyectarSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  if (!document.getElementById("btn-dark-mode")) {
    const btnDark = document.createElement("button");
    btnDark.id = "btn-dark-mode";
    btnDark.textContent = "Modo oscuro";
    btnDark.addEventListener("click", toggleDarkMode);

    const menu = sidebar.querySelector(".menu");
    if (menu) sidebar.insertBefore(btnDark, menu);
  }

  const menu = sidebar.querySelector(".menu");
  if (menu && !document.querySelector('[data-vista="configuracion"]')) {
    const linkConfig = document.createElement("a");
    linkConfig.href = "#";
    linkConfig.setAttribute("data-vista", "configuracion");
    linkConfig.textContent = "Configuración";
    linkConfig.addEventListener("click", (evento) => {
      evento.preventDefault();
      document.querySelectorAll(".menu a").forEach((link) => link.classList.remove("activo"));
      linkConfig.classList.add("activo");
      cargarVistaConfig();
    });
    menu.appendChild(linkConfig);
  }

  if (!document.getElementById("btn-logout")) {
    const btnLogout = document.createElement("button");
    btnLogout.id = "btn-logout";
    btnLogout.innerHTML = "Cerrar sesión";
    btnLogout.addEventListener("click", () => {
      document.getElementById("modal-logout").classList.add("visible");
    });
    sidebar.appendChild(btnLogout);
  }
}

function inyectarModal() {
  if (document.getElementById("modal-logout")) return;

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.id = "modal-logout";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>¿Cerrar sesión?</h3>
      <p>Se cerrará tu sesión actual y serás redirigido al inicio.</p>
      <div class="modal-btns">
        <button class="btn-cancel" id="modal-cancelar">Cancelar</button>
        <button class="btn-confirm" id="modal-confirmar">Sí, salir</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("modal-cancelar").addEventListener("click", () => {
    modal.classList.remove("visible");
  });

  document.getElementById("modal-confirmar").addEventListener("click", async () => {
    try {
      await fetch(construirUrlApi("/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }

    redirigirLogin();
  });

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.classList.remove("visible");
  });
}

function cargarVistaConfig() {
  if (!vista) return;

  const nombreActual = nombreUsuario.textContent ?? "";
  const fotoActual = fotoDePerfil.src ?? construirUrlImagen(IMAGEN_DEFAULT);
  const checked = estadoAplicacion.modoOscuroActivo ? "checked" : "";

  vista.innerHTML = `
    <div class="config-section">
      <h2>Configuración</h2>
      <div class="config-card">
        <h3>Foto de perfil</h3>
        <div class="foto-wrapper">
          <img id="preview-foto" src="${escaparHtml(fotoActual)}" alt="Foto de perfil">
          <div class="foto-info">
            <label id="btn-foto-label" for="input-foto">Cambiar foto</label>
            <input type="file" id="input-foto" accept="image/*" style="display:none">
            <p>Máximo 5 MB.</p>
            <span id="foto-error">La imagen supera 5 MB. Elige otra.</span>
          </div>
        </div>
      </div>
      <div class="config-card">
        <h3>Nombre de usuario</h3>
        <div class="config-field">
          <label for="input-nombre">Nombre visible</label>
          <input type="text" id="input-nombre" value="${escaparHtml(nombreActual)}" placeholder="Tu nombre" maxlength="80">
        </div>
        <button class="btn-guardar" id="btn-guardar-nombre">Guardar nombre</button>
        <div class="config-msg" id="msg-nombre">Nombre actualizado correctamente.</div>
      </div>
      <div class="config-card">
        <h3>Apariencia</h3>
        <div class="toggle-row">
          <span>Modo oscuro</span>
          <label class="toggle">
            <input type="checkbox" id="toggle-dark" ${checked}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;

  const inputFoto = document.getElementById("input-foto");
  const preview = document.getElementById("preview-foto");
  const fotoError = document.getElementById("foto-error");

  inputFoto.addEventListener("change", async () => {
    const archivo = inputFoto.files[0];
    if (!archivo) return;

    fotoError.style.display = "none";

    if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
      fotoError.style.display = "block";
      inputFoto.value = "";
      return;
    }

    await subirImagen(archivo, preview);
    inputFoto.value = "";
  });

  document.getElementById("btn-guardar-nombre").addEventListener("click", async () => {
    const nuevoNombre = document.getElementById("input-nombre").value.trim();
    const msgNombre = document.getElementById("msg-nombre");

    if (nuevoNombre.length < 2) {
      Swal.fire({ icon: "warning", title: "Nombre inválido", text: "El nombre debe tener mínimo 2 caracteres" });
      return;
    }

    try {
      const datos = await solicitarApi("/perfil", {
        method: "PUT",
        body: JSON.stringify({ nombre: nuevoNombre }),
      });

      nombreUsuario.textContent = datos.nombre ?? nuevoNombre;
      msgNombre.style.display = "block";
      setTimeout(() => { msgNombre.style.display = "none"; }, 3000);
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message ?? "No se pudo actualizar el nombre" });
    }
  });

  document.getElementById("toggle-dark").addEventListener("change", toggleDarkMode);
}

function registrarEventosPerfil() {
  if (fotoDePerfil && modalImagen && imagenGrande) {
    fotoDePerfil.addEventListener("click", () => {
      imagenGrande.src = fotoDePerfil.src;
      modalImagen.style.display = "flex";
    });
  }

  if (modalImagen) {
    modalImagen.addEventListener("click", (evento) => {
      if (evento.target === modalImagen) modalImagen.style.display = "none";
    });
  }

  if (btnEditarImagen && inputImagen) {
    btnEditarImagen.addEventListener("click", () => inputImagen.click());
  }

  if (inputImagen) {
    inputImagen.addEventListener("change", async () => {
      const archivo = inputImagen.files[0];
      if (!archivo) return;
      await subirImagen(archivo);
      inputImagen.value = "";
    });
  }
}

function registrarEventosMenu() {
  links.forEach((link) => {
    link.addEventListener("click", async (evento) => {
      evento.preventDefault();
      links.forEach((item) => item.classList.remove("activo"));
      link.classList.add("activo");
      await cargarVista(link.dataset.vista);
    });
  });
}

async function init() {
  aplicarModoOscuro(obtenerModoOscuroDesdeCookie());
  inyectarSidebar();
  inyectarModal();
  registrarEventosPerfil();
  registrarEventosMenu();
  await verificarAdmin();
  await cargarVista("dashboard");
}




init();
