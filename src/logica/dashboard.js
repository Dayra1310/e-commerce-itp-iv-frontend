// ==========================================================
// dashboard.js
// Implementación conectada al backend real del proyecto.
// Backend disponible según index.js:
// POST /login, POST /logout, GET /admin, GET /perfil,
// GET /usuarios, GET /roles, POST /agregarUsuario,
// PUT /usuario/:id, DELETE /eliminarUsuario/:id,
// PUT /usuario/imagen, GET /uploads/:archivo
// ==========================================================

const clienteApi = window.clienteApi;
const RUTA_IMAGEN_RESPALDO = "../../public/img/avatar-default.svg";
const TAMANIO_MAXIMO_IMAGEN_BYTES = 20 * 1024 * 1024;
const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const estadoDashboard = {
  usuarios: [],
  roles: [],
  busquedaActividad: ""
};

const elementos = {
  vista: document.getElementById("vista"),
  enlacesMenu: document.querySelectorAll(".menu a"),
  nombreUsuario: document.getElementById("nombreUsuario"),
  rolUsuario: document.getElementById("rolUsuario"),
  fotoDePerfil: document.getElementById("fotoDePerfil"),
  inputImagen: document.getElementById("inputImagen"),
  modalImagen: document.getElementById("modalImagen"),
  imagenGrande: document.getElementById("imagenGrande"),
  btnEditarImagen: document.getElementById("btnEditarImagen")
};

if (!clienteApi) {
  console.error("No se encontró window.clienteApi. Revisa que configuracion-api.js cargue antes de dashboard.js");
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(valor || 0));
}

function formatearFechaActual() {
  const fecha = new Date().toLocaleDateString("es-CO", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function construirUrlImagen(nombreImagen) {
  if (!nombreImagen) return RUTA_IMAGEN_RESPALDO;
  return clienteApi.construirUrlImagen(nombreImagen);
}

function redirigirALogin() {
  window.location.href = "login.html";
}

function mostrarErrorServidor(error, mensajePorDefecto = "No se pudo completar la operación") {
  console.error(error);

  Swal.fire({
    icon: "error",
    title: error.status === 401 ? "Sesión expirada" : "Error",
    text: error.message || mensajePorDefecto
  });
}

// ==========================================================
// Tema oscuro con cookie
// ==========================================================
function guardarTemaEnCookie(modoOscuroActivo) {
  const tema = modoOscuroActivo ? "oscuro" : "claro";
  document.cookie = `tema=${tema}; path=/; max-age=31536000; SameSite=Lax`;
}

function obtenerTemaDesdeCookie() {
  const cookieTema = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("tema="));

  return cookieTema ? cookieTema.split("=")[1] === "oscuro" : false;
}

function actualizarIconoDark() {
  const boton = document.getElementById("btn-dark-mode");
  if (!boton) return;

  boton.innerHTML = document.body.classList.contains("dark")
    ? "Modo claro"
    : "Modo oscuro";
}

function aplicarTema(modoOscuroActivo) {
  document.body.classList.toggle("dark", modoOscuroActivo);

  const toggle = document.getElementById("toggle-dark");
  if (toggle) toggle.checked = modoOscuroActivo;

  actualizarIconoDark();
}

function alternarModoOscuro() {
  const modoOscuroActivo = !document.body.classList.contains("dark");
  aplicarTema(modoOscuroActivo);
  guardarTemaEnCookie(modoOscuroActivo);
}

// ==========================================================
// Consumo del backend
// ==========================================================
async function obtenerPerfilDesdeBackend() {
  const datos = await clienteApi.solicitarJson("/perfil", {
    method: "GET"
  });

  elementos.nombreUsuario.textContent = datos.nombre || "Usuario";
  elementos.rolUsuario.textContent = datos.rol || "Sin rol";

  const urlImagen = construirUrlImagen(datos.imagen);
  elementos.fotoDePerfil.src = urlImagen;
  elementos.imagenGrande.src = urlImagen;

  elementos.fotoDePerfil.onerror = () => {
    elementos.fotoDePerfil.src = RUTA_IMAGEN_RESPALDO;
  };

  elementos.imagenGrande.onerror = () => {
    elementos.imagenGrande.src = RUTA_IMAGEN_RESPALDO;
  };
}

async function verificarAdministrador() {
  try {
    await clienteApi.solicitarJson("/admin", {
      method: "GET"
    });

    await obtenerPerfilDesdeBackend();
  } catch (error) {
    console.error(error);
    redirigirALogin();
  }
}

async function obtenerUsuarios() {
  const datos = await clienteApi.solicitarJson("/usuarios", {
    method: "GET"
  });

  estadoDashboard.usuarios = Array.isArray(datos.usuarios) ? datos.usuarios : [];
  return estadoDashboard.usuarios;
}

async function obtenerRolesDisponibles() {
  const datos = await clienteApi.solicitarJson("/roles", {
    method: "GET"
  });

  estadoDashboard.roles = Array.isArray(datos.roles) ? datos.roles : [];
  return estadoDashboard.roles;
}

// ==========================================================
// Vistas principales
// ==========================================================
const vistas = {
  productos: `
    <div class="usuarios-header">
      <h2>Productos</h2>
    </div>
    <div class="card" style="margin-top:16px;">
      <p>
        El backend actual no expone un endpoint de productos. Para evitar datos falsos,
        esta vista queda lista para conectarse cuando exista una ruta real como
        <strong>GET /productos</strong>.
      </p>
    </div>
  `,

  reportes: `
    <div class="usuarios-header">
      <h2>Reportes</h2>
    </div>
    <div class="card" style="margin-top:16px;">
      <p>
        El backend actual no expone endpoints de ventas, pedidos o reportes. El dashboard
        ya no muestra números quemados; solo presenta información que viene del backend real.
      </p>
    </div>
  `,

  usuarios: `
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
  `
};

function construirVistaDashboard() {
  return `
    <div class="dash-header">
      <div>
        <h1>Panel de control</h1>
        <span class="dash-fecha">${formatearFechaActual()}</span>
      </div>
    </div>

    <div class="parent">
      <div class="card stat-card div1">
        <div class="stat-label">Usuarios administrativos</div>
        <div class="stat-val" id="valor-total-usuarios">...</div>
        <span class="stat-badge">Backend: /usuarios</span>
      </div>

      <div class="card stat-card div2">
        <div class="stat-label">Roles disponibles</div>
        <div class="stat-val" id="valor-total-roles">...</div>
        <span class="stat-badge">Backend: /roles</span>
      </div>

      <div class="card stat-card div3">
        <div class="stat-label">Sesión</div>
        <div class="stat-val" id="valor-estado-sesion">Activa</div>
        <span class="stat-badge">Backend: /admin</span>
      </div>

      <div class="card div4" style="flex-direction:column; align-items:flex-start;">
        <div class="metric-title">Resumen del backend</div>
        <p id="resumen-backend" style="line-height:1.6; margin-top:12px;">
          Cargando datos del servidor...
        </p>
      </div>

      <div class="card div5-chart" style="flex-direction:column; align-items:flex-start;">
        <div class="metric-title">Estado de integración</div>
        <p style="line-height:1.6; margin-top:12px;">
          Conectado a:<br>
          <strong>${escaparHtml(clienteApi.baseUrl)}</strong>
        </p>
      </div>

      <div class="card div6-activity">
        <div class="activity-header">
          <div class="metric-title">Usuarios recientes</div>
          <input type="text" id="buscar-usuario-dashboard" placeholder="Buscar usuario...">
        </div>

        <div class="activity-table-wrapper">
          <table class="activity-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody id="tabla-dashboard-usuarios"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function cargarVista(nombre) {
  if (!elementos.vista) return;

  if (nombre === "dashboard") {
    elementos.vista.innerHTML = construirVistaDashboard();
    await cargarDatosDashboard();
    return;
  }

  elementos.vista.innerHTML = vistas[nombre] || construirVistaDashboard();

  if (nombre === "usuarios") {
    await cargarVistaUsuarios();
  }

  actualizarIconoDark();
}

async function cargarDatosDashboard() {
  try {
    const [usuarios, roles] = await Promise.all([
      obtenerUsuarios(),
      obtenerRolesDisponibles()
    ]);

    document.getElementById("valor-total-usuarios").textContent = usuarios.length;
    document.getElementById("valor-total-roles").textContent = roles.length;
    document.getElementById("valor-estado-sesion").textContent = "Activa";

    const resumenBackend = document.getElementById("resumen-backend");
    if (resumenBackend) {
      resumenBackend.innerHTML = `
        El dashboard está usando endpoints reales del backend:
        <strong>${usuarios.length}</strong> usuario(s) administrativo(s) y
        <strong>${roles.length}</strong> rol(es) disponibles.
        No se muestran ventas ni pedidos porque el backend actual no tiene esas rutas implementadas.
      `;
    }

    const inputBusqueda = document.getElementById("buscar-usuario-dashboard");
    if (inputBusqueda) {
      inputBusqueda.addEventListener("input", () => {
        estadoDashboard.busquedaActividad = inputBusqueda.value.trim().toLowerCase();
        renderizarUsuariosDashboard();
      });
    }

    renderizarUsuariosDashboard();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo cargar el dashboard");
  }
}

function renderizarUsuariosDashboard() {
  const tbody = document.getElementById("tabla-dashboard-usuarios");
  if (!tbody) return;

  const busqueda = estadoDashboard.busquedaActividad;
  const usuariosFiltrados = estadoDashboard.usuarios.filter((usuario) => {
    const texto = `${usuario.nombre} ${usuario.email} ${usuario.nombre_rol} ${usuario.telefono}`.toLowerCase();
    return texto.includes(busqueda);
  });

  if (usuariosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="usuarios-vacio">No hay usuarios para mostrar</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = usuariosFiltrados
    .slice(0, 10)
    .map((usuario) => `
      <tr>
        <td>#${Number(usuario.id)}</td>
        <td>${escaparHtml(usuario.nombre)}</td>
        <td>${escaparHtml(usuario.email)}</td>
        <td><span class="badge-rol">${escaparHtml(usuario.nombre_rol)}</span></td>
        <td>${escaparHtml(usuario.telefono)}</td>
      </tr>
    `)
    .join("");
}

// ==========================================================
// Vista Usuarios + CRUD
// ==========================================================
async function cargarVistaUsuarios() {
  const botonAgregarUsuario = document.getElementById("btn-agregar-usuario");
  if (botonAgregarUsuario) {
    botonAgregarUsuario.addEventListener("click", agregarUsuario);
  }

  await cargarUsuariosTabla();
}

async function cargarUsuariosTabla() {
  try {
    await obtenerUsuarios();
    renderizarUsuariosTabla();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudieron cargar los usuarios");
  }
}

function renderizarUsuariosTabla() {
  const tbody = document.getElementById("tabla-usuarios");
  if (!tbody) return;

  if (estadoDashboard.usuarios.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="usuarios-vacio">No hay usuarios registrados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = estadoDashboard.usuarios
    .map((usuario) => `
      <tr>
        <td>${escaparHtml(usuario.nombre)}</td>
        <td>${escaparHtml(usuario.email)}</td>
        <td>${escaparHtml(usuario.telefono)}</td>
        <td><span class="badge-rol">${escaparHtml(usuario.nombre_rol)}</span></td>
        <td class="acciones-usuarios">
          <button type="button" class="btn-accion-usuario btn-editar-usuario" data-id="${Number(usuario.id)}" title="Editar usuario">
            <i class='bx bx-edit'></i>
          </button>
          <button type="button" class="btn-accion-usuario btn-eliminar-usuario" data-id="${Number(usuario.id)}" title="Eliminar usuario">
            <i class='bx bx-trash'></i>
          </button>
        </td>
      </tr>
    `)
    .join("");

  tbody.querySelectorAll(".btn-editar-usuario").forEach((boton) => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      const usuario = estadoDashboard.usuarios.find((item) => Number(item.id) === id);
      if (usuario) editarUsuario(usuario);
    });
  });

  tbody.querySelectorAll(".btn-eliminar-usuario").forEach((boton) => {
    boton.addEventListener("click", () => eliminarUsuario(Number(boton.dataset.id)));
  });
}

function construirOpcionesRoles(roles, rolSeleccionado = null) {
  return roles
    .map((rol) => {
      const seleccionado = Number(rol.id) === Number(rolSeleccionado) ? "selected" : "";
      return `<option value="${Number(rol.id)}" ${seleccionado}>${escaparHtml(rol.nombre)}</option>`;
    })
    .join("");
}

function validarFormularioUsuario({ nombre, email, telefono, password, rol_id }, requierePassword = true) {
  if (!nombre || !email || !telefono || !rol_id) {
    return "Completa todos los campos obligatorios";
  }

  if (requierePassword && !password) {
    return "La contraseña es obligatoria";
  }

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!correoValido) {
    return "Ingresa un correo válido";
  }

  if (password && password.length < 6) {
    return "La contraseña debe tener mínimo 6 caracteres";
  }

  return null;
}

async function agregarUsuario() {
  let opcionesRoles = "";

  try {
    const roles = await obtenerRolesDisponibles();
    opcionesRoles = construirOpcionesRoles(roles);
  } catch (error) {
    mostrarErrorServidor(error, "No se pudieron cargar los roles");
    return;
  }

  Swal.fire({
    title: "Agregar Usuario",
    customClass: {
      popup: "modal-usuario"
    },
    html: `
      <div class="formulario-usuario-swal">
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre completo">
        <input id="swal-email" class="swal2-input" placeholder="Correo electrónico">
        <input id="swal-telefono" class="swal2-input" placeholder="Número de teléfono">
        <input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña">
        <select id="swal-rol" class="swal2-input">
          <option value="">Selecciona un rol</option>
          ${opcionesRoles}
        </select>
      </div>
    `,
    confirmButtonText: "Agregar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    focusConfirm: false,
    preConfirm: async () => {
      const nombre = document.getElementById("swal-nombre").value.trim();
      const email = document.getElementById("swal-email").value.trim();
      const telefono = document.getElementById("swal-telefono").value.trim();
      const password = document.getElementById("swal-password").value.trim();
      const rol_id = Number(document.getElementById("swal-rol").value);

      const errorValidacion = validarFormularioUsuario({ nombre, email, telefono, password, rol_id }, true);
      if (errorValidacion) {
        Swal.showValidationMessage(errorValidacion);
        return false;
      }

      try {
        await clienteApi.solicitarJson("/agregarUsuario", {
          method: "POST",
          body: JSON.stringify({ nombre, email, telefono, password, rol_id })
        });

        return true;
      } catch (error) {
        Swal.showValidationMessage(error.message || "No se pudo agregar el usuario");
        return false;
      }
    }
  }).then((resultado) => {
    if (!resultado.isConfirmed) return;

    Swal.fire({
      icon: "success",
      title: "Usuario agregado",
      timer: 1500,
      showConfirmButton: false
    });

    cargarUsuariosTabla();
  });
}

async function editarUsuario(usuario) {
  let opcionesRoles = "";

  try {
    const roles = await obtenerRolesDisponibles();
    opcionesRoles = construirOpcionesRoles(roles, usuario.rol_id);
  } catch (error) {
    mostrarErrorServidor(error, "No se pudieron cargar los roles");
    return;
  }

  Swal.fire({
    title: "Editar Usuario",
    customClass: {
      popup: "modal-usuario"
    },
    html: `
      <div class="formulario-usuario-swal">
        <input id="edit-nombre" class="swal2-input" value="${escaparHtml(usuario.nombre)}" placeholder="Nombre completo">
        <input id="edit-email" class="swal2-input" value="${escaparHtml(usuario.email)}" placeholder="Correo electrónico">
        <input id="edit-telefono" class="swal2-input" value="${escaparHtml(usuario.telefono)}" placeholder="Teléfono">
        <input id="edit-password" type="password" class="swal2-input" placeholder="Nueva contraseña opcional">
        <select id="edit-rol" class="swal2-input">
          <option value="">Selecciona un rol</option>
          ${opcionesRoles}
        </select>
      </div>
    `,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    focusConfirm: false,
    preConfirm: async () => {
      const nombre = document.getElementById("edit-nombre").value.trim();
      const email = document.getElementById("edit-email").value.trim();
      const telefono = document.getElementById("edit-telefono").value.trim();
      const password = document.getElementById("edit-password").value.trim();
      const rol_id = Number(document.getElementById("edit-rol").value);

      const errorValidacion = validarFormularioUsuario({ nombre, email, telefono, password, rol_id }, false);
      if (errorValidacion) {
        Swal.showValidationMessage(errorValidacion);
        return false;
      }

      const datosUsuario = { nombre, email, telefono, rol_id };
      if (password) datosUsuario.password = password;

      try {
        await clienteApi.solicitarJson(`/usuario/${Number(usuario.id)}`, {
          method: "PUT",
          body: JSON.stringify(datosUsuario)
        });

        return true;
      } catch (error) {
        Swal.showValidationMessage(error.message || "No se pudo actualizar el usuario");
        return false;
      }
    }
  }).then((resultado) => {
    if (!resultado.isConfirmed) return;

    Swal.fire({
      icon: "success",
      title: "Usuario actualizado",
      timer: 1500,
      showConfirmButton: false
    });

    cargarUsuariosTabla();
  });
}

async function eliminarUsuario(id) {
  const confirmacion = await Swal.fire({
    title: "Eliminar usuario",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!confirmacion.isConfirmed) return;

  try {
    await clienteApi.solicitarJson(`/eliminarUsuario/${Number(id)}`, {
      method: "DELETE"
    });

    Swal.fire({
      icon: "success",
      title: "Usuario eliminado",
      timer: 1500,
      showConfirmButton: false
    });

    cargarUsuariosTabla();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo eliminar el usuario");
  }
}

// ==========================================================
// Imagen de perfil
// ==========================================================
function validarImagen(archivo) {
  if (!archivo) return "No seleccionaste ninguna imagen";

  if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
    return "Formato no permitido. Usa JPG, PNG, WEBP o GIF";
  }

  if (archivo.size > TAMANIO_MAXIMO_IMAGEN_BYTES) {
    return "La imagen supera los 20 MB";
  }

  return null;
}

async function subirImagen(archivo) {
  const errorValidacion = validarImagen(archivo);
  if (errorValidacion) {
    Swal.fire({
      icon: "warning",
      title: "Imagen inválida",
      text: errorValidacion
    });
    return false;
  }

  const datosFormulario = new FormData();
  datosFormulario.append("imagen", archivo);

  try {
    const datos = await clienteApi.solicitarJson("/usuario/imagen", {
      method: "PUT",
      body: datosFormulario
    });

    const nuevaUrlImagen = `${construirUrlImagen(datos.imagen)}?v=${Date.now()}`;
    elementos.fotoDePerfil.src = nuevaUrlImagen;
    elementos.imagenGrande.src = nuevaUrlImagen;

    await Swal.fire({
      icon: "success",
      title: "Imagen actualizada",
      timer: 1500,
      showConfirmButton: false
    });

    return true;
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo subir la imagen");
    return false;
  }
}

// ==========================================================
// Sidebar, configuración y logout
// ==========================================================
function inyectarSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const menu = document.querySelector(".menu");
  if (!sidebar || !menu) return;

  if (!document.getElementById("btn-dark-mode")) {
    const botonModoOscuro = document.createElement("button");
    botonModoOscuro.id = "btn-dark-mode";
    botonModoOscuro.textContent = document.body.classList.contains("dark")
      ? "Modo claro"
      : "Modo oscuro";
    botonModoOscuro.addEventListener("click", alternarModoOscuro);
    sidebar.insertBefore(botonModoOscuro, menu);
  }

  if (!document.querySelector('[data-vista="configuracion"]')) {
    const enlaceConfiguracion = document.createElement("a");
    enlaceConfiguracion.href = "#";
    enlaceConfiguracion.dataset.vista = "configuracion";
    enlaceConfiguracion.textContent = "Configuración";
    menu.appendChild(enlaceConfiguracion);
  }

  if (!document.getElementById("btn-logout")) {
    const botonLogout = document.createElement("button");
    botonLogout.id = "btn-logout";
    botonLogout.innerHTML = "Cerrar sesión";
    botonLogout.addEventListener("click", () => {
      document.getElementById("modal-logout")?.classList.add("visible");
    });
    sidebar.appendChild(botonLogout);
  }
}

function inyectarModalLogout() {
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
      await clienteApi.solicitarJson("/logout", {
        method: "POST"
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }

    redirigirALogin();
  });

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.classList.remove("visible");
  });
}

function cargarVistaConfig() {
  if (!elementos.vista) return;

  const nombreActual = elementos.nombreUsuario.textContent || "";
  const fotoActual = elementos.fotoDePerfil.src || RUTA_IMAGEN_RESPALDO;
  const modoOscuroActivo = document.body.classList.contains("dark");

  elementos.vista.innerHTML = `
    <div class="config-section">
      <h2>Configuración</h2>

      <div class="config-card">
        <h3>Foto de perfil</h3>
        <div class="foto-wrapper">
          <img id="preview-foto" src="${escaparHtml(fotoActual)}" alt="Foto de perfil">
          <div class="foto-info">
            <label id="btn-foto-label" for="input-foto">Cambiar foto</label>
            <input type="file" id="input-foto" accept="image/*" style="display:none">
            <p>Máximo 20 MB. Formatos permitidos: JPG, PNG, WEBP o GIF.</p>
            <span id="foto-error">La imagen no cumple las reglas de validación.</span>
          </div>
        </div>
      </div>

      <div class="config-card">
        <h3>Nombre de usuario</h3>
        <div class="config-field">
          <label for="input-nombre">Nombre visible</label>
          <input type="text" id="input-nombre" value="${escaparHtml(nombreActual)}" placeholder="Tu nombre" maxlength="40" disabled>
        </div>
        <p class="config-msg" style="display:block;">
          El backend actual permite consultar el perfil, pero no expone un endpoint para editar el nombre propio del usuario autenticado.
        </p>
      </div>

      <div class="config-card">
        <h3>Apariencia</h3>
        <div class="toggle-row">
          <span>🌙 Modo oscuro</span>
          <label class="toggle">
            <input type="checkbox" id="toggle-dark" ${modoOscuroActivo ? "checked" : ""}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;

  const inputFoto = document.getElementById("input-foto");
  const previewFoto = document.getElementById("preview-foto");
  const mensajeErrorFoto = document.getElementById("foto-error");

  inputFoto.addEventListener("change", async () => {
    const archivo = inputFoto.files[0];
    const errorValidacion = validarImagen(archivo);

    if (errorValidacion) {
      mensajeErrorFoto.textContent = errorValidacion;
      mensajeErrorFoto.style.display = "block";
      inputFoto.value = "";
      return;
    }

    mensajeErrorFoto.style.display = "none";
    const exito = await subirImagen(archivo);
    if (exito) {
      previewFoto.src = elementos.fotoDePerfil.src;
    }
    inputFoto.value = "";
  });

  document.getElementById("toggle-dark").addEventListener("change", alternarModoOscuro);
}

// ==========================================================
// Eventos globales
// ==========================================================
function configurarEventosMenu() {
  document.querySelectorAll(".menu a").forEach((enlace) => {
    enlace.addEventListener("click", async (evento) => {
      evento.preventDefault();

      document.querySelectorAll(".menu a").forEach((item) => item.classList.remove("activo"));
      enlace.classList.add("activo");

      const vistaSeleccionada = enlace.dataset.vista;

      if (vistaSeleccionada === "configuracion") {
        cargarVistaConfig();
        return;
      }

      await cargarVista(vistaSeleccionada || "dashboard");
    });
  });
}

function configurarEventosImagenPerfil() {
  elementos.fotoDePerfil.addEventListener("click", () => {
    elementos.imagenGrande.src = elementos.fotoDePerfil.src;
    elementos.modalImagen.style.display = "flex";
  });

  elementos.modalImagen.addEventListener("click", (evento) => {
    if (evento.target === elementos.modalImagen) {
      elementos.modalImagen.style.display = "none";
    }
  });

  elementos.btnEditarImagen.addEventListener("click", () => {
    elementos.inputImagen.click();
  });

  elementos.inputImagen.addEventListener("change", async () => {
    const archivo = elementos.inputImagen.files[0];
    await subirImagen(archivo);
    elementos.inputImagen.value = "";
  });
}

async function iniciarDashboard() {
  aplicarTema(obtenerTemaDesdeCookie());
  inyectarSidebar();
  inyectarModalLogout();
  configurarEventosMenu();
  configurarEventosImagenPerfil();

  await verificarAdministrador();
  await cargarVista("dashboard");
}

iniciarDashboard();
