// ======================== dashboard.js (unificado y sin pravatar) ========================

// ---------- Modo oscuro ----------
(function initDarkMode() {
  const saved = localStorage.getItem("darkMode");
  if (saved === "true") document.body.classList.add("dark");
})();

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", isDark);
  const toggle = document.getElementById("toggle-dark");
  if (toggle) toggle.checked = isDark;
  actualizarIconoDark();
}

function actualizarIconoDark() {
  const btn = document.getElementById("btn-dark-mode");
  if (!btn) return;
  const isDark = document.body.classList.contains("dark");
  btn.innerHTML = isDark ? "Modo claro" : "Modo oscuro";
}

// ---------- Elementos DOM ----------
const vista = document.getElementById("vista");
const links = document.querySelectorAll(".menu a");
const nombreUsuario = document.getElementById("nombreUsuario");
const rolUsuario = document.getElementById("rolUsuario");
const fotoDePerfil = document.getElementById("fotoDePerfil");
const inputImagen = document.getElementById("inputImagen");
const modalImagen = document.getElementById("modalImagen");
const imagenGrande = document.getElementById("imagenGrande");
const btnEditarImagen = document.getElementById("btnEditarImagen");

// ========================
// SWEETALERT GLOBAL OSCURO
// ========================

const swalDark = {
  position: "bottom",

  customClass: {
    popup: "swal-dark"
  },

  showClass: {
    popup: `
      animate__animated
      animate__fadeInUp
      animate__faster
    `
  },

  hideClass: {
    popup: `
      animate__animated
      animate__fadeOutDown
      animate__faster
    `
  }
};



// ---------- Datos de ejemplo para vistas ----------
const datos = {
  productos: [
    { nombre: "Laptop", precio: "$1200" },
    { nombre: "Mouse", precio: "$20" },
  ],
  usuarios: [],
};

const vistas = {
  dashboard: `<h2>Dashboard</h2>`,
  productos: `
    <h2>Productos</h2>
    <table>
      <thead><tr><th>Nombre</th><th>Precio</th></tr></thead>
      <tbody id="tabla-productos"></tbody>
    </table>
  `,
  reportes: `<h2>Reportes</h2><p>No hay datos aún</p>`,

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
`,
};

function cargarVista(nombre) {

  vista.innerHTML = vistas[nombre];
  if (nombre === "productos") {
    const tbody = document.getElementById("tabla-productos");
    tbody.innerHTML = datos.productos
      .map((p) => `<tr><td>${p.nombre}</td><td>${p.precio}</td></tr>`)
      .join("");
  }
  if (nombre === "usuarios") {

  obtenerUsuarios();

  document
    .getElementById("btn-agregar-usuario")
    .addEventListener("click", agregarUsuario);
  }
}


// ---------- Usuarios ----------

// ========================
// OBTENER USUARIOS
// ========================

async function obtenerUsuarios() {

  try {

    const respuesta = await fetch(
      "http://localhost:3001/usuarios",
      {
        credentials: "include"
      }
    );

    const data = await respuesta.json();

    datos.usuarios = data.usuarios;

    renderUsuarios();

  } catch (error) {

    console.log(error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudieron cargar los usuarios"
    });
  }
}

// ========================
// RENDER USUARIOS
// ========================

function renderUsuarios() {

  const tbody = document.getElementById("tabla-usuarios");

  if (!tbody) return;

  tbody.innerHTML = datos.usuarios.map(usuario => `
    <tr>

      <td>${usuario.nombre || ""}</td>

      <td>${usuario.email || ""}</td>

      <td>${usuario.telefono || ""}</td>

      <td>${usuario.nombre_rol || ""}</td>

      <td>

        <button onclick='editarUsuario(${JSON.stringify(usuario)})'>
          <i class='bx bx-edit'></i>
        </button>

        <button onclick="eliminarUsuario(${usuario.id})">
          <i class='bx bx-trash'></i>
        </button>

      </td>

    </tr>
  `).join("");

}

async function obtenerPedidosDashboard() {

  try {

    const respuesta = await fetch(
      "http://localhost:3001/dashboard/pedidos",
      {
        credentials: "include"
      }
    );

    const data = await respuesta.json();

    if (!data.ok) return;

    renderPedidosDashboard(data.pedidos);

  } catch (error) {

    console.log(error);
  }
}


function renderPedidosDashboard(pedidos) {

  const tbody = document.getElementById("tabla-dashboard-pedidos");

  if (!tbody) return;

  tbody.innerHTML = pedidos.map(pedido => `

    <tr>

      <td>#${pedido.id}</td>

      <td>${pedido.cliente}</td>

      <td>Pedido</td>

      <td>$${Number(pedido.total).toLocaleString()}</td>

      <td>
        <span class="status-pill ${pedido.estado.toLowerCase()}">
          ${pedido.estado}
        </span>
      </td>

    </tr>

  `).join("");
}

// ========================
// AGREGAR USUARIO
// ========================

async function agregarUsuario() {

  Swal.fire({

    title: "Agregar Usuario",
    theme: "dark",
    

    html: `
      <input id="swal-nombre" class="swal2-input" placeholder="Nombre">

      <input id="swal-email" class="swal2-input" placeholder="Correo">

      <input id="swal-telefono" class="swal2-input" placeholder="Número de teléfono">

      <input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña">

      <select id="swal-rol" class="swal2-input">

        <option value="1">Administrador</option>

        <option value="3">marketing</option>

      </select>
    `,

    confirmButtonText: "Agregar",

    showCancelButton: true,

    preConfirm: async () => {

      const nombre = document.getElementById("swal-nombre").value;
      const email = document.getElementById("swal-email").value;
      const telefono = document.getElementById("swal-telefono").value;
      const password = document.getElementById("swal-password").value;
      const rol = document.getElementById("swal-rol").value;

      if (!nombre || !email || !telefono || !password || !rol) {

        Swal.showValidationMessage("Completa todos los campos");

        return false;
      }

      try {

        const respuesta = await fetch(
          "http://localhost:3001/agregarUsuario",
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              nombre,
              email,
              telefono,
              password,
              rol_id: rol
            })
          }
        );

        const data = await respuesta.json();

        if (!data.ok) {

          Swal.showValidationMessage(data.message);

          return false;
        }

        return true;

      } catch (error) {

        console.log(error);

        Swal.showValidationMessage("Error del servidor");

        return false;
      }
    }

  }).then((result) => {

    if (result.isConfirmed) {

      Swal.fire({
        icon: "success",
        title: "Usuario agregado",
        timer: 1500,
        showConfirmButton: false
      });

      obtenerUsuarios();
    }
  });
}

// ========================
// EDITAR USUARIO
// ========================

async function editarUsuario(usuario) {

  Swal.fire({

    title: "Editar Usuario",
    theme: "dark",

    html: `
      <input id="edit-nombre" class="swal2-input" value="${usuario.nombre || ""}" placeholder="Nombre">

      <input id="edit-email" class="swal2-input" value="${usuario.email || ""}" placeholder="Correo">

      <input id="edit-telefono" class="swal2-input" value="${usuario.telefono || ""}" placeholder="Teléfono">

      <input id="edit-password" type="password" class="swal2-input" placeholder="Nueva contraseña">

      <select id="edit-rol" class="swal2-input">

        <option value="1"
          ${usuario.rol === "admin" ? "selected" : ""}>
          Administrador
        </option>

        <option value="3"
          ${usuario.rol === "marketing" ? "selected" : ""}>
          Marketing
        </option>

      </select>
    `,

    confirmButtonText: "Guardar",

    showCancelButton: true,

    preConfirm: async () => {

      const nombre = document.getElementById("edit-nombre").value;
      const email = document.getElementById("edit-email").value;
      const telefono = document.getElementById("edit-telefono").value;
      const password = document.getElementById("edit-password").value;
      const rol = document.getElementById("edit-rol").value;

      if (!nombre || !email || !telefono || !rol) {

        Swal.showValidationMessage("Completa todos los campos");

        return false;
      }

      try {

        const body = {
          nombre,
          email,
          telefono,
          rol_id: rol
        };

        if (password.trim() !== "") {
          body.password = password;
        }

        const respuesta = await fetch(
          `http://localhost:3001/usuario/${usuario.id}`,
          {
            method: "PUT",

            credentials: "include",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify(body)
          }
        );

        const data = await respuesta.json();

        if (!data.ok) {

          Swal.showValidationMessage(data.message);

          return false;
        }

        return true;

      } catch (error) {

        console.log(error);

        Swal.showValidationMessage("Error del servidor");

        return false;
      }
    }

  }).then((result) => {

    if (result.isConfirmed) {

      Swal.fire({
        icon: "success",
        title: "Usuario actualizado",
        timer: 1500,
        showConfirmButton: false
      });

      obtenerUsuarios();
    }
  });
}

// ========================
// ELIMINAR USUARIO
// ========================
async function eliminarUsuario(id) {

  const confirmacion = await Swal.fire({
    title: "Eliminar usuario",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar"
  });

  if (!confirmacion.isConfirmed) return;

  try {

    const respuesta = await fetch(
      `http://localhost:3001/eliminarUsuario/${id}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );

    const data = await respuesta.json();

    if (!data.ok) {

      Swal.fire({
        icon: "error",
        title: "Error",
        text: data.message
      });

      return;
    }

    Swal.fire({
      icon: "success",
      title: "Usuario eliminado",
      timer: 1500,
      showConfirmButton: false
    });

    obtenerUsuarios();

  } catch (error) {

    console.log(error);

    Swal.fire({
      icon: "error",
      title: "Servidor",
      text: "No se pudo eliminar"
    });
  }
}





// ---------- Dashboard mejorado ----------
function cargarVistaDashboardMejorada() {
  const fecha = new Date().toLocaleDateString("es-ES", {
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
        <span class="dash-fecha">${fecha.charAt(0).toUpperCase() + fecha.slice(1)}</span>
      </div>
    </div>
    <div class="parent">
      <div class="card stat-card div1"><div class="stat-label">Ventas del mes</div><div class="stat-val">$1.000.000</div></div>
      <div class="card stat-card div2"><div class="stat-label">Pedidos activos</div><div class="stat-val">12</div></div>
      <div class="card stat-card div3"><div class="stat-label">Pedidos Pendientes</div><div class="stat-val">6</div></div>
      <div class="card div4" style="flex-direction:column; align-items:flex-start;"><div class="metric-title">Ventas por semana</div><div class="metric-placeholder">gráfica de barras</div></div>
      <div class="card div5-chart" style="flex-direction:column; align-items:flex-start;"><div class="metric-title">Distribución</div><div class="metric-placeholder">gráfica circular</div></div>
      
      
      <div class="card div6-activity">
        <div class="activity-header">
          <div class="metric-title">
            Actividad reciente
          </div>
          <input
            type="text"
            id="buscar-pedido"
            placeholder="Buscar pedido...">
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
            <tbody id="tabla-dashboard-pedidos"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ---------- Perfil (backend) ----------
async function cargarPerfilDesdeBackend() {
  try {
    const res = await fetch("http://localhost:3001/perfil", {
      method: "GET",
      credentials: "include",
    });

    if (res.status === 401) {
      Swal.fire({
        icon: "error",
        title: "Sesión expirada",
        text: "Debes iniciar sesión nuevamente",
      });
      setTimeout(() => {
        window.location.href = "../page/login.html";
      }, 1500);
      return;
    }

    const data = await res.json();
    if (!data.ok) return;

    // Actualizar nombre y rol
    nombreUsuario.textContent = data.nombre || "Usuario";
    rolUsuario.textContent = data.rol || "Sin rol";

    // Imagen: si viene null o vacío, usar default.jpg
    let imagenUrl = "http://localhost:3001/uploads/default.jpg";
    if (data.imagen && data.imagen !== "default.jpg") {
      imagenUrl = `http://localhost:3001/uploads/${data.imagen}`;
    }
    fotoDePerfil.src = imagenUrl;
    imagenGrande.src = imagenUrl;
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: "error",
      title: "Servidor",
      text: "No se pudo cargar el perfil",
    });
  }
}

// ---------- Verificar admin (protege dashboard) ----------
async function verificarAdmin() {
  try {
    const respuesta = await fetch("http://localhost:3001/admin", {
      credentials: "include",
    });
    const datos = await respuesta.json();
    if (!datos.ok) {
      window.location.href = "../page/login.html";
    } else {
      cargarPerfilDesdeBackend();
    }
  } catch (error) {
    console.log(error);
    window.location.href = "../page/login.html";
  }
}

// ---------- Subir imagen (evento desde el modal o desde configuración) ----------
async function subirImagen(archivo) {
  if (!archivo) return false;

  const formData = new FormData();
  formData.append("imagen", archivo);

  try {
    const respuesta = await fetch("http://localhost:3001/usuario/imagen", {
      method: "PUT",
      credentials: "include",
      body: formData,
    });
    const datos = await respuesta.json();

    if (!datos.ok) {
      Swal.fire({ icon: "error", title: "Error", text: datos.message });
      return false;
    }

    await Swal.fire({
      icon: "success",
      title: "Imagen actualizada",
      text: "La página se recargará para ver los cambios",
      timer: 1500,
      showConfirmButton: false,
    });

    // Recargar la página completa para reflejar la nueva imagen desde la BD
    location.reload();
    return true;
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo subir la imagen",
    });
    return false;
  }
}

// ---------- Eventos del modal/foto de perfil ----------
fotoDePerfil.addEventListener("click", () => {
  imagenGrande.src = fotoDePerfil.src;
  modalImagen.style.display = "flex";
});

modalImagen.addEventListener("click", (e) => {
  if (e.target === modalImagen) modalImagen.style.display = "none";
});

btnEditarImagen.addEventListener("click", () => {
  inputImagen.click();
});

inputImagen.addEventListener("change", async () => {
  const archivo = inputImagen.files[0];
  if (!archivo) return;
  await subirImagen(archivo);
  inputImagen.value = ""; // limpiar para permitir subir la misma imagen de nuevo
});

// ---------- Sidebar dinámico (botones, logout, configuración) ----------
function inyectarSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  // Botón modo oscuro
  if (!document.getElementById("btn-dark-mode")) {
    const btnDark = document.createElement("button");
    btnDark.id = "btn-dark-mode";
    btnDark.textContent = document.body.classList.contains("dark")
      ? "Modo claro"
      : "Modo oscuro";
    btnDark.addEventListener("click", toggleDarkMode);
    const menu = sidebar.querySelector(".menu");
    if (menu) sidebar.insertBefore(btnDark, menu);
  }

  // Enlace Configuración
  const menu = sidebar.querySelector(".menu");
  if (menu && !document.querySelector('[data-vista="configuracion"]')) {
    const linkConfig = document.createElement("a");
    linkConfig.href = "#";
    linkConfig.setAttribute("data-vista", "configuracion");
    linkConfig.textContent = "Configuración";
    linkConfig.addEventListener("click", (e) => {
      e.preventDefault();
      document
        .querySelectorAll(".menu a")
        .forEach((l) => l.classList.remove("activo"));
      linkConfig.classList.add("activo");
      cargarVistaConfig();
    });
    menu.appendChild(linkConfig);
  }

  // Botón cerrar sesión
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

  document
    .getElementById("modal-confirmar")
    .addEventListener("click", async () => {
      try {
        await fetch("http://localhost:3001/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.log("Error al cerrar sesión:", error);
      }
      localStorage.removeItem("darkMode");
      window.location.href = "../page/login.html";
    });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("visible");
  });
}

// ---------- Vista de Configuración (sin pravatar) ----------
function cargarVistaConfig() {
  if (!vista) return;

  const nombreActual = nombreUsuario.textContent || "";
  const fotoActual = fotoDePerfil.src; // ya es local o default.jpg
  const isDark = document.body.classList.contains("dark");

  vista.innerHTML = `
    <div class="config-section">
      <h2>Configuración</h2>
      <div class="config-card">
        <h3>Foto de perfil</h3>
        <div class="foto-wrapper">
          <img id="preview-foto" src="${fotoActual}" alt="Foto de perfil">
          <div class="foto-info">
            <label id="btn-foto-label" for="input-foto">Cambiar foto</label>
            <input type="file" id="input-foto" accept="image/*" style="display:none">
            <p>Máximo 20 MB.</p>
            <span id="foto-error">La imagen supera los 20 MB. Elige otra.</span>
          </div>
        </div>
      </div>
      <div class="config-card">
        <h3>Nombre de usuario</h3>
        <div class="config-field">
          <label for="input-nombre">Nombre visible</label>
          <input type="text" id="input-nombre" value="${nombreActual}" placeholder="Tu nombre" maxlength="40">
        </div>
        <button class="btn-guardar" id="btn-guardar-nombre">💾 Guardar nombre</button>
        <div class="config-msg" id="msg-nombre">✅ Nombre guardado correctamente.</div>
      </div>
      <div class="config-card">
        <h3>Apariencia</h3>
        <div class="toggle-row">
          <span>🌙 Modo oscuro</span>
          <label class="toggle">
            <input type="checkbox" id="toggle-dark" ${isDark ? "checked" : ""}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;

  // Lógica de cambio de foto en configuración
  const inputFoto = document.getElementById("input-foto");
  const preview = document.getElementById("preview-foto");
  const fotoError = document.getElementById("foto-error");
  const MAX_BYTES = 20 * 1024 * 1024;

  inputFoto.addEventListener("change", async () => {
    const file = inputFoto.files[0];
    if (!file) return;
    fotoError.style.display = "none";
    if (file.size > MAX_BYTES) {
      fotoError.style.display = "block";
      inputFoto.value = "";
      return;
    }
    const exito = await subirImagen(file, preview);
    if (exito) {
      // Actualizar también la miniatura del sidebar
      fotoDePerfil.src = preview.src;
      imagenGrande.src = preview.src;
    }
    inputFoto.value = "";
  });

  // Guardar nombre (solo frontend por ahora)
  const btnGuardar = document.getElementById("btn-guardar-nombre");
  const msgNombre = document.getElementById("msg-nombre");
  btnGuardar.addEventListener("click", () => {
    const nuevoNombre = document.getElementById("input-nombre").value.trim();
    if (!nuevoNombre) return;
    nombreUsuario.textContent = nuevoNombre;
    msgNombre.style.display = "block";
    setTimeout(() => (msgNombre.style.display = "none"), 3000);
  });

  // Modo oscuro desde config
  document.getElementById("toggle-dark").addEventListener("change", () => {
    toggleDarkMode();
  });
}

// ---------- Inicialización ----------
function init() {
  inyectarSidebar();
  inyectarModal();
  patchCargarVista(); // reemplaza cargarVista para usar dashboard mejorado
  verificarAdmin(); // protege y carga perfil



  // Eventos de los links del menú original
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      links.forEach((l) => l.classList.remove("activo"));
      link.classList.add("activo");
      const vistaSeleccionada = link.dataset.vista;
      window.cargarVista(vistaSeleccionada);
    });
  });
  window.cargarVista("dashboard");
}



// Sobrescribir window.cargarVista para que el dashboard use la versión mejorada
function patchCargarVista() {
  const original = window.cargarVista;
  window.cargarVista = function (nombre) {
    if (nombre === "dashboard") {
      
      document.getElementById("vista").innerHTML =
        cargarVistaDashboardMejorada();
        
    } else {
      original(nombre);
    }
    actualizarIconoDark();
  };
}

// Iniciar
init();
