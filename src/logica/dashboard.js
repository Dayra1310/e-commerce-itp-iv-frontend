// ==========================================================
// dashboard.js
// Implementación conectada al backend real del proyecto.
// Backend disponible según index.js:
// POST /login, POST /logout, GET /admin, GET /perfil,
// GET /usuarios, GET /roles, POST /agregarUsuario,
// PUT /usuario/:id, DELETE /eliminarUsuario/:id,
// PUT /usuario/imagen, GET /uploads/:archivo
// GET /dashboard/resumen, GET /dashboard/productos-top,
// GET /dashboard/categorias
// GET /reportes/ventas → se usa para agrupar ingresos por mes (solo pagados)
// ==========================================================

const clienteApi = window.clienteApi;
const RUTA_IMAGEN_RESPALDO = "../../public/img/avatar-default.svg";
const TAMANIO_MAXIMO_IMAGEN_BYTES = 20 * 1024 * 1024;
const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const estadoDashboard = {
  usuarios: [],
  roles: [],
  busquedaActividad: "",
  carritoCount: 0,
  soporte: {
    tickets: [],
    ticketSeleccionado: null,
    busqueda: "",
    estado: "todos"
  }
};

const productosQuemados = [
  { id: 1, nombre: "Auriculares Bluetooth", precio: 85000, stock: 15, imagen: "" },
  { id: 2, nombre: "Teclado Mecánico RGB", precio: 120000, stock: 10, imagen: "" },
  { id: 3, nombre: "Mouse Inalámbrico", precio: 45000, stock: 20, imagen: "" },
  { id: 4, nombre: "Monitor 24\" Full HD", precio: 350000, stock: 8, imagen: "" },
  { id: 5, nombre: "Webcam HD 1080p", precio: 65000, stock: 12, imagen: "" },
  { id: 6, nombre: "Hub USB-C 7 puertos", precio: 55000, stock: 18, imagen: "" }
];

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

// ==========================================================
// Alertas SweetAlert globales (siempre oscuras)
// ==========================================================
function alertaToast(icon, title, text = "", timer = 2000) {
  Swal.fire({
    icon,
    title,
    text,
    timer,
    showConfirmButton: false,
    position: "bottom",
    toast: true,
    timerProgressBar: true,
    customClass: {
      popup: "swal-dark swal-toast",
      timerProgressBar: "swal-dark-bar"
    }
  });
}

function alertaCentro(icon, title, text = "") {
  Swal.fire({
    icon,
    title,
    text,
    customClass: {
      popup: "swal-dark"
    }
  });
}

function mostrarErrorServidor(error, mensajePorDefecto = "No se pudo completar la operación") {
  console.error(error);

  Swal.fire({
    icon: "error",
    title: error.status === 401 ? "Sesión expirada" : "Error",
    text: error.message || mensajePorDefecto,
    customClass: {
      popup: "swal-dark"
    }
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
      <h2>Catálogo de Productos</h2>
      <div class="acciones-catalogo">
        <button id="btnAgregarTodos" class="btn-agregar-todos">
          <i class='bx bx-cart-download'></i> Agregar todos al carrito
        </button>
      </div>
    </div>
    <div class="grid-productos" id="gridProductos">
      ${productosQuemados.map((p) => {
        const sinStock = (p.stock ?? 0) <= 0;
        return `
        <div class="card-producto${sinStock ? " sin-stock" : ""}" data-id="${p.id}">
          <div class="producto-img-placeholder">
            <i class='bx bxs-package'></i>
          </div>
          <div class="producto-body">
            <h3 class="producto-nombre">${escaparHtml(p.nombre)}</h3>
            <p class="producto-precio">${formatearMoneda(p.precio)}</p>
            <p class="producto-stock${sinStock ? " stock-agotado" : ""}">${sinStock ? "Sin stock" : `Stock: ${p.stock} unidades`}</p>
            <button class="btn-agregar-carrito" data-producto-id="${p.id}" ${sinStock ? "disabled" : ""}>
              <i class='bx ${sinStock ? "bx-x-circle" : "bx-cart-add"}'></i> ${sinStock ? "Agotado" : "Agregar al carrito"}
            </button>
          </div>
        </div>
      `}).join("")}
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
  `,

  historial: `
    <div class="usuarios-header">
      <h2>Historial de Pedidos</h2>
    </div>
    <div class="card" style="margin-top:16px; padding:0;">
      <div class="tabla-wrapper">
        <table>
          <thead>
            <tr>
              <th>Pedido #</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tabla-pedidos"></tbody>
        </table>
      </div>
    </div>
  `,

  soporte: `
    <div class="soporte-header">
      <div>
        <h2>Centro de soporte</h2>
        <p>Administra solicitudes, respuestas y estados conectados al backend.</p>
      </div>
      <button type="button" id="btn-nuevo-ticket" class="btn-soporte-primario">
        <i class='bx bx-plus-circle'></i>
        <span>Nuevo ticket</span>
      </button>
    </div>

    <section class="soporte-resumen">
      <article class="soporte-stat">
        <span>Total</span>
        <strong id="soporte-total">0</strong>
      </article>
      <article class="soporte-stat">
        <span>Abiertos</span>
        <strong id="soporte-abiertos">0</strong>
      </article>
      <article class="soporte-stat">
        <span>En proceso</span>
        <strong id="soporte-proceso">0</strong>
      </article>
      <article class="soporte-stat">
        <span>Cerrados</span>
        <strong id="soporte-cerrados">0</strong>
      </article>
    </section>

    <section class="soporte-layout">
      <div class="soporte-panel soporte-lista-panel">
        <div class="soporte-toolbar">
          <div class="soporte-buscador">
            <i class='bx bx-search'></i>
            <input type="text" id="buscar-ticket" placeholder="Buscar por asunto, usuario o categoria">
          </div>
          <select id="filtro-ticket-estado">
            <option value="todos">Todos</option>
            <option value="abierto">Abiertos</option>
            <option value="en_proceso">En proceso</option>
            <option value="cerrado">Cerrados</option>
          </select>
        </div>
        <div id="lista-tickets" class="lista-tickets">
          <div class="soporte-loading">
            <i class='bx bx-loader-alt bx-spin'></i>
            <span>Cargando tickets...</span>
          </div>
        </div>
      </div>

      <div class="soporte-panel soporte-detalle-panel" id="detalle-ticket">
        <div class="soporte-empty">
          <i class='bx bx-message-square-dots'></i>
          <h3>Selecciona un ticket</h3>
          <p>El detalle y la conversacion apareceran aqui.</p>
        </div>
      </div>
    </section>
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

    <div class="parent parent-dashboard">

      <div class="card stat-card dash-stat-1">
        <div class="stat-icon icon-productos"><i class='bx bx-box'></i></div>
        <div class="stat-label">Total productos</div>
        <div class="stat-val" id="dash-total-productos">...</div>
        <span class="stat-badge">/dashboard/resumen</span>
      </div>

      <div class="card stat-card dash-stat-2">
        <div class="stat-icon icon-pedidos"><i class='bx bx-cart'></i></div>
        <div class="stat-label">Total pedidos</div>
        <div class="stat-val" id="dash-total-pedidos">...</div>
        <span class="stat-badge">/dashboard/resumen</span>
      </div>

      <div class="card stat-card dash-stat-3">
        <div class="stat-icon icon-usuarios"><i class='bx bx-group'></i></div>
        <div class="stat-label">Total clientes</div>
        <div class="stat-val" id="dash-total-clientes">...</div>
        <span class="stat-badge">/dashboard/resumen</span>
      </div>

      <div class="card stat-card dash-stat-4">
        <div class="stat-icon icon-ventas"><i class='bx bx-dollar-circle'></i></div>
        <div class="stat-label">Ventas totales</div>
        <div class="stat-val" id="dash-ventas-totales">...</div>
        <span class="stat-badge">/dashboard/resumen</span>
      </div>

      <div class="card dash-chart-top">
        <div class="metric-title">Top 10 productos vendidos</div>
        <div class="chart-container">
          <canvas id="dash-grafico-top-vendidos"></canvas>
        </div>
      </div>

      <div class="card dash-chart-cat">
        <div class="metric-title">Productos por categoría</div>
        <div class="chart-container">
          <canvas id="dash-grafico-categorias"></canvas>
        </div>
      </div>

      <div class="card dash-activity">
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

      <div class="card dash-chart-ingresos">
        <div class="metric-title">Ingresos por meses</div>
        <div class="chart-container">
          <canvas id="dash-grafico-ingresos"></canvas>
        </div>
      </div>

    </div>
  `;
}

// ==========================================================
// Destrucción de gráficos
// ==========================================================
function destruirGraficosDashboard() {
  if (estadoDashboard.graficoTopVendidos) {
    estadoDashboard.graficoTopVendidos.destroy();
    estadoDashboard.graficoTopVendidos = null;
  }
  if (estadoDashboard.graficoCategorias) {
    estadoDashboard.graficoCategorias.destroy();
    estadoDashboard.graficoCategorias = null;
  }
  if (estadoDashboard.graficoProdCategorias) {
    estadoDashboard.graficoProdCategorias.destroy();
    estadoDashboard.graficoProdCategorias = null;
  }
  if (estadoDashboard.graficoIngresos) {
    estadoDashboard.graficoIngresos.destroy();
    estadoDashboard.graficoIngresos = null;
  }
}

// ==========================================================
// Carga de vistas
// ==========================================================
async function cargarVista(nombre) {
  if (!elementos.vista) return;

  destruirGraficosDashboard();

  if (nombre === "dashboard") {
    elementos.vista.innerHTML = construirVistaDashboard();
    await cargarDatosDashboard();
    actualizarIconoDark();
    return;
  }

  if (nombre === "carrito") {
    window.location.href = "carrito.html";
    return;
  }

  if (nombre === "productos") {
    await cargarVistaProductos();
    return;
  }

  if (nombre === "reportes") {
    await cargarVistaReportes();
    return;
  }

  elementos.vista.innerHTML = vistas[nombre] || construirVistaDashboard();

  if (nombre === "usuarios") {
    await cargarVistaUsuarios();
  }

  if (nombre === "productos") {
    cargarVistaProductos();
  }

  if (nombre === "historial") {
    cargarVistaHistorial();
  }

  if (nombre === "soporte") {

      const respuesta = await fetch("../page/soporte.html");
      const html = await respuesta.text();

      elementos.vista.innerHTML = html;

      return;
  }

  actualizarIconoDark();
}

// ==========================================================
// Datos del Dashboard
// ==========================================================
async function cargarDatosDashboard() {
  try {
    const resultados = await Promise.allSettled([
      clienteApi.solicitarJson("/dashboard/resumen", { method: "GET" }),
      clienteApi.solicitarJson("/dashboard/productos-top", { method: "GET" }),
      clienteApi.solicitarJson("/dashboard/categorias", { method: "GET" }),
      clienteApi.solicitarJson("/reportes/ventas", { method: "GET" }),
      obtenerUsuarios()
    ]);

    // ── Resumen ──
    const elTotalProductos = document.getElementById("dash-total-productos");
    const elTotalPedidos = document.getElementById("dash-total-pedidos");
    const elTotalClientes = document.getElementById("dash-total-clientes");
    const elVentasTotales = document.getElementById("dash-ventas-totales");

    if (resultados[0].status === "fulfilled") {
      const resumen = resultados[0].value;
      if (elTotalProductos) elTotalProductos.textContent = resumen.totalProductos;
      if (elTotalPedidos) elTotalPedidos.textContent = resumen.totalPedidos;
      if (elTotalClientes) elTotalClientes.textContent = resumen.totalClientes;
      if (elVentasTotales) elVentasTotales.textContent = formatearMoneda(resumen.ventasTotales);
    } else {
      if (elTotalProductos) elTotalProductos.textContent = "—";
      if (elTotalPedidos) elTotalPedidos.textContent = "—";
      if (elTotalClientes) elTotalClientes.textContent = "—";
      if (elVentasTotales) elVentasTotales.textContent = "—";
      console.error("Error al cargar resumen:", resultados[0].reason);
    }

    // ── Top vendidos ──
    if (resultados[1].status === "fulfilled") {
      crearGraficoTopVendidos(resultados[1].value);
    } else {
      console.error("Error al cargar productos top:", resultados[1].reason);
    }

    // ── Categorías ──
    if (resultados[2].status === "fulfilled") {
      crearGraficoCategorias(resultados[2].value);
    } else {
      console.error("Error al cargar categorías:", resultados[2].reason);
    }

    // ── Ingresos mensuales (agrupados desde /reportes/ventas, solo pagados) ──
    if (resultados[3].status === "fulfilled") {
      const datosMensuales = agruparIngresosPorMes(resultados[3].value);
      crearGraficoIngresos(datosMensuales);
    } else {
      console.error("Error al cargar ventas para ingresos mensuales:", resultados[3].reason);
    }

    // ── Buscador de usuarios ──
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
// Vista Productos
// ==========================================================
function construirVistaProductos() {
  return `
    <div class="dash-header">
      <div>
        <h1>Productos</h1>
        <span class="dash-fecha">${formatearFechaActual()}</span>
      </div>
    </div>

    <div class="parent parent-productos">

      <div class="card stat-card prod-stat-1">
        <div class="stat-icon icon-productos"><i class='bx bx-box'></i></div>
        <div class="stat-label">Total productos</div>
        <div class="stat-val" id="prod-total">...</div>
        <span class="stat-badge">/productos/metricas</span>
      </div>

      <div class="card stat-card prod-stat-2">
        <div class="stat-icon icon-pedidos"><i class='bx bx-check-circle'></i></div>
        <div class="stat-label">Activos</div>
        <div class="stat-val" id="prod-activos">...</div>
        <span class="stat-badge">/productos/metricas</span>
      </div>

      <div class="card stat-card prod-stat-3">
        <div class="stat-icon icon-ventas"><i class='bx bx-x-circle'></i></div>
        <div class="stat-label">Sin stock</div>
        <div class="stat-val" id="prod-sin-stock">...</div>
        <span class="stat-badge neg">/productos/metricas</span>
      </div>

      <div class="card stat-card prod-stat-4">
        <div class="stat-icon icon-usuarios"><i class='bx bx-error-circle'></i></div>
        <div class="stat-label">Bajo stock</div>
        <div class="stat-val" id="prod-bajo-stock">...</div>
        <span class="stat-badge neg">/productos/metricas</span>
      </div>

      <div class="card prod-tabla-bajo">
        <div class="activity-header">
          <div class="metric-title">Productos con bajo stock</div>
          <span class="stat-badge">Stock entre 1 y 10 unidades</span>
        </div>
        <div class="activity-table-wrapper">
          <table class="activity-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th>Stock</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="tabla-bajo-stock"></tbody>
          </table>
        </div>
      </div>

      <div class="card prod-chart-cat">
        <div class="metric-title">Stock por categoría</div>
        <div class="chart-container">
          <canvas id="prod-grafico-categorias"></canvas>
        </div>
      </div>

    </div>
  `;
}

async function cargarVistaProductos() {
  elementos.vista.innerHTML = construirVistaProductos();

  try {
    const resultados = await Promise.allSettled([
      clienteApi.solicitarJson("/productos/metricas", { method: "GET" }),
      clienteApi.solicitarJson("/productos/categorias", { method: "GET" }),
      clienteApi.solicitarJson("/productos/bajo-stock", { method: "GET" })
    ]);

    // ── Métricas ──
    const elTotal = document.getElementById("prod-total");
    const elActivos = document.getElementById("prod-activos");
    const elSinStock = document.getElementById("prod-sin-stock");
    const elBajoStock = document.getElementById("prod-bajo-stock");

    if (resultados[0].status === "fulfilled") {
      const m = resultados[0].value;
      if (elTotal) elTotal.textContent = m.total;
      if (elActivos) elActivos.textContent = m.activos;
      if (elSinStock) elSinStock.textContent = m.sinStock;
      if (elBajoStock) elBajoStock.textContent = m.bajoStock;
    } else {
      if (elTotal) elTotal.textContent = "—";
      if (elActivos) elActivos.textContent = "—";
      if (elSinStock) elSinStock.textContent = "—";
      if (elBajoStock) elBajoStock.textContent = "—";
      console.error("Error métricas:", resultados[0].reason);
    }

    // ── Categorías ──
    if (resultados[1].status === "fulfilled") {
      crearGraficoProdCategorias(resultados[1].value);
    } else {
      console.error("Error categorías:", resultados[1].reason);
    }

    // ── Tabla bajo stock ──
    if (resultados[2].status === "fulfilled") {
      renderizarTablaBajoStock(resultados[2].value);
    } else {
      console.error("Error bajo stock:", resultados[2].reason);
    }

  } catch (error) {
    mostrarErrorServidor(error, "No se pudo cargar la vista de productos");
  }
}

function renderizarTablaBajoStock(productos) {
  const tbody = document.getElementById("tabla-bajo-stock");
  if (!tbody) return;

  if (productos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="usuarios-vacio">No hay productos con bajo stock</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = productos
    .map((p) => {
      let clasePill = "pendiente";
      let textoEstado = "Bajo stock";
      if (p.stock <= 3) {
        clasePill = "cancelado";
        textoEstado = "Crítico";
      }
      return `
        <tr>
          <td>#${p.id}</td>
          <td>${escaparHtml(p.nombre)}</td>
          <td><strong>${p.stock}</strong> uds</td>
          <td><span class="status-pill ${clasePill}">${textoEstado}</span></td>
        </tr>
      `;
    })
    .join("");
}

function crearGraficoProdCategorias(categorias) {
  const canvas = document.getElementById("prod-grafico-categorias");
  if (!canvas) return;

  if (estadoDashboard.graficoProdCategorias) {
    estadoDashboard.graficoProdCategorias.destroy();
    estadoDashboard.graficoProdCategorias = null;
  }

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";
  const colorGrid = esDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const paletaColores = [
    "#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
    "#06b6d4", "#a855f7"
  ];

  const colores = categorias.map((_, i) => paletaColores[i % paletaColores.length]);
  const coloresHover = colores.map((c) => c + "cc");

  estadoDashboard.graficoProdCategorias = new Chart(canvas, {
    type: "bar",
    data: {
      labels: categorias.map((c) => c.nombre),
      datasets: [{
        label: "Stock",
        data: categorias.map((c) => c.stock_total ?? c.productos ?? 0),
        backgroundColor: colores,
        hoverBackgroundColor: coloresHover,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 52
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: esDark ? "#1e293b" : "#ffffff",
          titleColor: esDark ? "#f1f5f9" : "#111827",
          bodyColor: esDark ? "#cbd5e1" : "#374151",
          borderColor: esDark ? "#334155" : "#e5e7eb",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (item) {
              return `  Stock: ${item.raw} uds`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: colorTexto,
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: colorTexto,
            font: { size: 11 }
          },
          grid: { color: colorGrid },
          beginAtZero: true
        }
      }
    }
  });
}

// ==========================================================
// Gráficos del Dashboard
// ==========================================================
function crearGraficoTopVendidos(productos) {
  const canvas = document.getElementById("dash-grafico-top-vendidos");
  if (!canvas) return;

  if (estadoDashboard.graficoTopVendidos) {
    estadoDashboard.graficoTopVendidos.destroy();
    estadoDashboard.graficoTopVendidos = null;
  }

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";
  const colorGrid = esDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const etiquetas = productos.map((p) => {
    const nombre = p.nombre || "";
    return nombre.length > 22 ? nombre.slice(0, 22) + "…" : nombre;
  });

  estadoDashboard.graficoTopVendidos = new Chart(canvas, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [{
        label: "Vendidos",
        data: productos.map((p) => p.vendidos),
        backgroundColor: "rgba(37, 99, 235, 0.72)",
        borderColor: "rgba(37, 99, 235, 1)",
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 38
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: esDark ? "#1e293b" : "#ffffff",
          titleColor: esDark ? "#f1f5f9" : "#111827",
          bodyColor: esDark ? "#cbd5e1" : "#374151",
          borderColor: esDark ? "#334155" : "#e5e7eb",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: function (items) {
              const idx = items[0].dataIndex;
              return productos[idx].nombre;
            },
            label: function (item) {
              return `  Vendidos: ${item.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: colorTexto, font: { size: 11 } },
          grid: { color: colorGrid },
          beginAtZero: true
        },
        y: {
          ticks: { color: colorTexto, font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

function crearGraficoCategorias(categorias) {
  const canvas = document.getElementById("dash-grafico-categorias");
  if (!canvas) return;

  if (estadoDashboard.graficoCategorias) {
    estadoDashboard.graficoCategorias.destroy();
    estadoDashboard.graficoCategorias = null;
  }

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";

  const paletaColores = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
    "#06b6d4", "#a855f7"
  ];

  estadoDashboard.graficoCategorias = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: categorias.map((c) => c.categoria),
      datasets: [{
        data: categorias.map((c) => c.cantidad),
        backgroundColor: paletaColores.slice(0, categorias.length),
        borderWidth: 2,
        borderColor: esDark ? "#1e293b" : "#ffffff",
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "55%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: colorTexto,
            padding: 14,
            font: { size: 12 },
            usePointStyle: true,
            pointStyleWidth: 10
          }
        },
        tooltip: {
          backgroundColor: esDark ? "#1e293b" : "#ffffff",
          titleColor: esDark ? "#f1f5f9" : "#111827",
          bodyColor: esDark ? "#cbd5e1" : "#374151",
          borderColor: esDark ? "#334155" : "#e5e7eb",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (item) {
              const total = item.dataset.data.reduce((a, b) => a + b, 0);
              const porcentaje = total > 0 ? ((item.raw / total) * 100).toFixed(1) : 0;
              return `  ${item.label}: ${item.raw} (${porcentaje}%)`;
            }
          }
        }
      }
    }
  });
}

// ==========================================================
// Gráfico de Ingresos Mensuales (Line Chart)
// Agrupa las ventas desde /reportes/ventas por mes
// Solo cuenta ventas con estado_pago = 'pagado' (igual que la stat card)
// ==========================================================
const NOMBRES_MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

function agruparIngresosPorMes(ventas) {
  const ventasArray = Array.isArray(ventas) ? ventas : [];

  // Agrupar totales por clave "YYYY-MM"
  const ingresosPorMes = {};
  ventasArray.forEach((venta) => {
    // Solo contar ventas pagadas (igual que el resumen del dashboard)
    const estado = String(venta.estado || "").toLowerCase().trim();
    if (estado !== "pagado") return;

    const fecha = venta.fecha || "";
    const match = fecha.match(/^(\d{4})-(\d{2})/);
    if (!match) return;

    const clave = `${match[1]}-${match[2]}`;
    const total = Number(venta.total) || 0;

    ingresosPorMes[clave] = (ingresosPorMes[clave] || 0) + total;
  });

  // Ordenar por mes y construir el array de resultados
  const clavesOrdenadas = Object.keys(ingresosPorMes).sort();

  // Mostrar máximo los últimos 12 meses
  const ultimos12 = clavesOrdenadas.slice(-12);

  return ultimos12.map((clave) => {
    const [anio, mes] = clave.split("-");
    const mesNum = parseInt(mes, 10) - 1;
    return {
      mes: `${NOMBRES_MESES[mesNum]} ${anio}`,
      ingresos: ingresosPorMes[clave]
    };
  });
}

function crearGraficoIngresos(datos) {
  const canvas = document.getElementById("dash-grafico-ingresos");
  if (!canvas) return;

  if (estadoDashboard.graficoIngresos) {
    estadoDashboard.graficoIngresos.destroy();
    estadoDashboard.graficoIngresos = null;
  }

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";
  const colorGrid = esDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  // Soportar diferentes formatos del backend
  const meses = Array.isArray(datos)
    ? datos.map((d) => d.mes ?? d.mes_nombre ?? d.label ?? "")
    : [];
  const ingresos = Array.isArray(datos)
    ? datos.map((d) => d.ingresos ?? d.total ?? d.valor ?? 0)
    : [];

  estadoDashboard.graficoIngresos = new Chart(canvas, {
    type: "line",
    data: {
      labels: meses,
      datasets: [{
        label: "Ingresos",
        data: ingresos,
        borderColor: "#3b82f6",
        backgroundColor: esDark
          ? "rgba(59, 130, 246, 0.15)"
          : "rgba(59, 130, 246, 0.10)",
        borderWidth: 3,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: esDark ? "#1e293b" : "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHoverBorderWidth: 3,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: esDark ? "#1e293b" : "#ffffff",
          titleColor: esDark ? "#f1f5f9" : "#111827",
          bodyColor: esDark ? "#cbd5e1" : "#374151",
          borderColor: esDark ? "#334155" : "#e5e7eb",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function (item) {
              return `  Ingresos: ${formatearMoneda(item.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: colorTexto,
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: colorTexto,
            font: { size: 11 },
            callback: function (valor) {
              if (valor >= 1000000) return `$${(valor / 1000000).toFixed(1)}M`;
              if (valor >= 1000) return `$${(valor / 1000).toFixed(0)}K`;
              return `$${valor}`;
            }
          },
          grid: { color: colorGrid },
          beginAtZero: true
        }
      }
    }
  });
}

// ==========================================================
// Vista Reportes
// ==========================================================
const CONFIG_REPORTE = {
  ventas: {
    endpoint: "/reportes/ventas",
    titulo: "Reporte de Ventas",
    columnas: ["Fecha", "Producto", "Cantidad", "Precio Unitario", "Total"],
    keys: ["fecha", "producto", "cantidad", "precio_unitario", "total"],
    requiereFechas: true
  },
  pedidos: {
    endpoint: "/reportes/pedidos",
    titulo: "Reporte de Pedidos",
    columnas: ["Fecha", "Cliente", "Estado", "Total"],
    keys: ["fecha", "cliente", "estado", "total"],
    requiereFechas: true
  },
  inventario: {
    endpoint: "/reportes/inventario",
    titulo: "Reporte de Inventario",
    columnas: ["Producto", "Categoría", "Stock", "Precio"],
    keys: ["producto", "categoria", "stock", "precio"],
    requiereFechas: false
  }
};

function construirVistaReportes() {
  const hoy = new Date().toISOString().split("T")[0];
  const haceUnMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return `
    <div class="dash-header">
      <div>
        <h1>Reportes</h1>
        <span class="dash-fecha">${formatearFechaActual()}</span>
      </div>
    </div>

    <div class="reporte-contenedor">

      <div class="card reporte-panel">
        <div class="reporte-tabs">
          <button class="reporte-tab activo" data-tipo="ventas">
            <i class='bx bx-dollar-circle'></i> Ventas
          </button>
          <button class="reporte-tab" data-tipo="pedidos">
            <i class='bx bx-cart'></i> Pedidos
          </button>
          <button class="reporte-tab" data-tipo="inventario">
            <i class='bx bx-box'></i> Inventario
          </button>
        </div>

        <div class="reporte-filtros" id="reporte-filtros">
          <div class="reporte-fechas">
            <div class="reporte-campo">
              <label for="reporte-desde">Desde</label>
              <input type="date" id="reporte-desde" value="${haceUnMes}">
            </div>
            <div class="reporte-campo">
              <label for="reporte-hasta">Hasta</label>
              <input type="date" id="reporte-hasta" value="${hoy}">
            </div>
          </div>
          <button class="reporte-btn-consultar" id="btn-consultar-reporte">
            <i class='bx bx-search'></i> Consultar
          </button>
        </div>
      </div>

      <div class="card reporte-tabla-card">
        <div class="reporte-tabla-header">
          <div class="metric-title" id="reporte-titulo">Reporte de Ventas</div>
          <button class="reporte-btn-exportar" id="btn-exportar-excel" disabled>
            <i class='bx bx-download'></i> Exportar Excel
          </button>
        </div>
        <div class="activity-table-wrapper">
          <table class="activity-table">
            <thead id="reporte-thead">
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody id="reporte-tbody">
              <tr>
                <td colspan="5" class="usuarios-vacio">Selecciona un reporte y haz clic en Consultar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

async function cargarVistaReportes() {
  elementos.vista.innerHTML = construirVistaReportes();

  const tabs = document.querySelectorAll(".reporte-tab");
  const btnConsultar = document.getElementById("btn-consultar-reporte");
  const btnExportar = document.getElementById("btn-exportar-excel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("activo"));
      tab.classList.add("activo");
      estadoDashboard.reporteActivo = tab.dataset.tipo;

      const config = CONFIG_REPORTE[estadoDashboard.reporteActivo];
      const filtros = document.getElementById("reporte-filtros");

      if (config.requiereFechas) {
        filtros.style.display = "";
      } else {
        filtros.style.display = "none";
      }

      const titulo = document.getElementById("reporte-titulo");
      if (titulo) titulo.textContent = config.titulo;

      actualizarThead(config.columnas);
      limpiarTbody(config.columnas.length, "Haz clic en Consultar para ver los datos");
      btnExportar.disabled = true;
      estadoDashboard.datosReporte = [];
    });
  });

  if (btnConsultar) {
    btnConsultar.addEventListener("click", consultarReporte);
  }

  if (btnExportar) {
    btnExportar.addEventListener("click", exportarExcel);
  }

  actualizarIconoDark();
}

function actualizarThead(columnas) {
  const thead = document.getElementById("reporte-thead");
  if (!thead) return;
  thead.innerHTML = `<tr>${columnas.map((c) => `<th>${c}</th>`).join("")}</tr>`;
}

function limpiarTbody(colspan, mensaje) {
  const tbody = document.getElementById("reporte-tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colspan}" class="usuarios-vacio">${mensaje}</td></tr>`;
}

async function consultarReporte() {
  const tipo = estadoDashboard.reporteActivo;
  const config = CONFIG_REPORTE[tipo];
  const btnExportar = document.getElementById("btn-exportar-excel");

  let url = config.endpoint;

  if (config.requiereFechas) {
    const desde = document.getElementById("reporte-desde").value;
    const hasta = document.getElementById("reporte-hasta").value;

    if (!desde || !hasta) {
      alertaToast("warning", "Fechas requeridas", "Selecciona fecha desde y hasta");
      return;
    }

    if (desde > hasta) {
      alertaToast("warning", "Rango inválido", "La fecha 'Desde' no puede ser mayor que 'Hasta'");
      return;
    }

    url += `?desde=${desde}&hasta=${hasta}`;
  }

  limpiarTbody(config.columnas.length, "Cargando...");

  try {
    const datos = await clienteApi.solicitarJson(url, { method: "GET" });
    estadoDashboard.datosReporte = Array.isArray(datos) ? datos : (datos.datos || datos.reporte || []);

    renderizarTablaReporte(config);

    if (btnExportar) {
      btnExportar.disabled = estadoDashboard.datosReporte.length === 0;
    }
  } catch (error) {
    limpiarTbody(config.columnas.length, "Error al cargar el reporte");
    mostrarErrorServidor(error, "No se pudo obtener el reporte");
  }
}

function renderizarTablaReporte(config) {
  const tbody = document.getElementById("reporte-tbody");
  if (!tbody) return;

  if (estadoDashboard.datosReporte.length === 0) {
    limpiarTbody(config.columnas.length, "No hay datos para el rango seleccionado");
    return;
  }

  tbody.innerHTML = estadoDashboard.datosReporte.map((fila) => {
    const celdas = config.keys.map((key) => {
      let valor = fila[key] ?? "";

      if (key === "total" || key === "precio_unitario" || key === "precio") {
        valor = formatearMoneda(valor);
      }

      if (key === "estado") {
        let clasePill = "pendiente";
        const estadoLower = String(valor).toLowerCase();
        if (estadoLower.includes("entregado") || estadoLower.includes("completado")) {
          clasePill = "entregado";
        } else if (estadoLower.includes("cancelado")) {
          clasePill = "cancelado";
        }
        return `<td><span class="status-pill ${clasePill}">${escaparHtml(valor)}</span></td>`;
      }

      if (key === "stock") {
        const stockNum = Number(valor);
        if (stockNum <= 3) {
          return `<td><span class="status-pill cancelado">${stockNum} uds</span></td>`;
        }
        if (stockNum <= 10) {
          return `<td><span class="status-pill pendiente">${stockNum} uds</span></td>`;
        }
        return `<td>${stockNum} uds</td>`;
      }

      return `<td>${escaparHtml(String(valor))}</td>`;
    }).join("");

    return `<tr>${celdas}</tr>`;
  }).join("");
}

function exportarExcel() {
  const tipo = estadoDashboard.reporteActivo;
  const config = CONFIG_REPORTE[tipo];

  if (estadoDashboard.datosReporte.length === 0) {
    alertaToast("info", "Sin datos", "No hay datos para exportar");
    return;
  }

  const filasExcel = estadoDashboard.datosReporte.map((fila) => {
    const obj = {};
    config.columnas.forEach((col, i) => {
      obj[col] = fila[config.keys[i]] ?? "";
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(filasExcel);

  const colWidths = config.columnas.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...filasExcel.map((f) => String(f[col]).length)
    );
    return { wch: Math.min(maxLen + 4, 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.titulo);

  let nombreArchivo = `${config.titulo.replace(/\s+/g, "_")}`;

  if (config.requiereFechas) {
    const desde = document.getElementById("reporte-desde").value;
    const hasta = document.getElementById("reporte-hasta").value;
    nombreArchivo += `_${desde}_a_${hasta}`;
  }

  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);

  alertaToast("success", "Excel generado", `${nombreArchivo}.xlsx se descargó correctamente`, 2500);
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
      popup: "modal-usuario swal-dark"
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

    alertaToast("success", "Usuario agregado");

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
      popup: "modal-usuario swal-dark"
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

    alertaToast("success", "Usuario actualizado");

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
    cancelButtonText: "Cancelar",
    customClass: {
      popup: "swal-dark",
      confirmButton: "swal-btn-eliminar",
      cancelButton: "swal-btn-cancelar"
    }
  });

  if (!confirmacion.isConfirmed) return;

  try {
    await clienteApi.solicitarJson(`/eliminarUsuario/${Number(id)}`, {
      method: "DELETE"
    });

    alertaToast("success", "Usuario eliminado");

    cargarUsuariosTabla();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo eliminar el usuario");
  }
}

// ==========================================================
// Catálogo de productos y carrito
// ==========================================================
function obtenerProductoPorId(id) {
  return productosQuemados.find((p) => p.id === id);
}

function cargarVistaProductos() {
  document.querySelectorAll(".btn-agregar-carrito").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const productoId = Number(btn.dataset.productoId);

      btn.disabled = true;
      btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Agregando...';

      const exito = await agregarAlCarritoDashboard(productoId);

      btn.disabled = false;
      if (exito) {
        btn.innerHTML = '<i class="bx bx-check"></i> Agregado';
        setTimeout(() => {
          btn.innerHTML = '<i class="bx bx-cart-add"></i> Agregar al carrito';
        }, 2000);
      } else {
        btn.innerHTML = '<i class="bx bx-cart-add"></i> Agregar al carrito';
      }

      await actualizarBadgeCarrito();
    });
  });

  const btnAgregarTodos = document.getElementById("btnAgregarTodos");
  if (btnAgregarTodos) {
    btnAgregarTodos.addEventListener("click", async () => {
      btnAgregarTodos.disabled = true;
      btnAgregarTodos.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Agregando todos...';

      let agregados = 0;
      let errores = 0;
      let sinStock = 0;

      for (const producto of productosQuemados) {
        if ((producto.stock ?? 0) <= 0) {
          sinStock++;
          continue;
        }
        const exito = await agregarAlCarritoDashboard(producto.id, 1, true);
        if (exito) {
          agregados++;
        } else {
          errores++;
        }
      }

      btnAgregarTodos.disabled = false;
      btnAgregarTodos.innerHTML = '<i class="bx bx-cart-download"></i> Agregar todos al carrito';

      Swal.fire({
        icon: errores === 0 ? "success" : "warning",
        title: errores === 0 ? "Productos agregados" : "Agregados con errores",
        text: `${agregados} producto(s) agregado(s) al carrito${errores ? `, ${errores} fallaron` : ""}${sinStock ? `, ${sinStock} sin stock` : ""}`,
        timer: 2000,
        showConfirmButton: false
      });

      actualizarBadgeCarrito();

      document.querySelectorAll(".btn-agregar-carrito").forEach((btn) => {
        btn.innerHTML = '<i class="bx bx-check"></i> Agregado';
        setTimeout(() => {
          btn.innerHTML = '<i class="bx bx-cart-add"></i> Agregar al carrito';
        }, 1500);
      });
    });
  }
}

async function agregarAlCarritoDashboard(productoId, cantidad = 1, silencioso = false) {
  try {
    await clienteApi.solicitarJson("/carrito/agregar", {
      method: "POST",
      body: JSON.stringify({ producto_id: productoId, cantidad })
    });

    if (!silencioso) {
      Swal.fire({
        icon: "success",
        title: "Producto agregado",
        text: "Se agregó al carrito correctamente",
        timer: 1200,
        showConfirmButton: false
      });
    }

    return true;
  } catch (error) {
    console.error(error);
    const mensaje = (error.datos?.message || error.message || "").toLowerCase();
    const esStock = mensaje.includes("stock");

    if (!silencioso) {
      Swal.fire({
        icon: esStock ? "warning" : "error",
        title: esStock ? "Stock insuficiente" : (error.status === 401 ? "Sesión expirada" : "Error"),
        text: error.datos?.message || error.message || "No se pudo agregar el producto"
      });
    }

    return false;
  }
}

async function obtenerCarritoCount() {
  try {
    const datos = await clienteApi.solicitarJson("/carrito", {
      method: "GET"
    });

    estadoDashboard.carritoCount = datos.cantidad_items || 0;
  } catch (error) {
    if (error.status !== 401 && error.status !== 404) {
      console.error("Error al obtener carrito:", error);
    }
    estadoDashboard.carritoCount = 0;
  }

  return estadoDashboard.carritoCount;
}

async function actualizarBadgeCarrito() {
  const badge = document.getElementById("badgeCarrito");
  if (!badge) return;

  await obtenerCarritoCount();
  badge.textContent = estadoDashboard.carritoCount;
  badge.style.display = estadoDashboard.carritoCount > 0 ? "inline" : "none";
}

// ==========================================================
// Historial de pedidos
// ==========================================================
async function cargarVistaHistorial() {
  const tbody = document.getElementById("tabla-pedidos");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:32px; color:#888;">
        <i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i><br>
        Cargando pedidos...
      </td>
    </tr>
  `;

  try {
    const datos = await clienteApi.solicitarJson("/pedidos", {
      method: "GET"
    });

    const pedidos = Array.isArray(datos.pedidos) ? datos.pedidos : [];

    if (pedidos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color:#888;">
            No hay pedidos registrados
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pedidos.map((pedido) => `
      <tr>
        <td>#${Number(pedido.id)}</td>
        <td>${escaparHtml(pedido.usuario_nombre || pedido.usuario || "—")}</td>
        <td>${pedido.fecha ? new Date(pedido.fecha).toLocaleDateString("es-CO") : "—"}</td>
        <td>${formatearMoneda(pedido.total)}</td>
        <td><span class="badge-estado ${pedido.estado || "pendiente"}">${escaparHtml(pedido.estado || "pendiente")}</span></td>
        <td>
          <button class="btn-ver-detalle" data-pedido-id="${Number(pedido.id)}" title="Ver detalle">
            <i class='bx bx-show'></i> Detalle
          </button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-ver-detalle").forEach((btn) => {
      btn.addEventListener("click", () => verDetallePedido(Number(btn.dataset.pedidoId)));
    });
  } catch (error) {
    console.error(error);

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:32px; color:#f87171;">
          <i class='bx bx-error-circle' style="font-size:24px;"></i><br>
          ${escaparHtml(error.message || "Error al cargar pedidos")}
        </td>
      </tr>
    `;
  }
}

async function verDetallePedido(pedidoId) {
  try {
    const datos = await clienteApi.solicitarJson(`/pedidos/${pedidoId}`, {
      method: "GET"
    });

    const pedido = datos.pedido || datos;
    const items = Array.isArray(pedido.items) ? pedido.items : [];

    Swal.fire({
      title: `Pedido #${pedidoId}`,
      width: 600,
      html: `
        <div style="text-align:left;">
          <p><strong>Usuario:</strong> ${escaparHtml(pedido.usuario_nombre || pedido.usuario || "—")}</p>
          <p><strong>Fecha:</strong> ${pedido.fecha ? new Date(pedido.fecha).toLocaleDateString("es-CO") : "—"}</p>
          <p><strong>Estado:</strong> ${escaparHtml(pedido.estado || "pendiente")}</p>
          <hr style="border-color:rgba(255,255,255,0.1); margin:12px 0;">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <th style="padding:6px 8px; text-align:left;">Producto</th>
                <th style="padding:6px 8px; text-align:center;">Cant</th>
                <th style="padding:6px 8px; text-align:right;">Precio</th>
                <th style="padding:6px 8px; text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => {
                const precio = Number(item.precio_unitario || item.precio || 0);
                return `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:6px 8px;">${escaparHtml(item.nombre || "—")}</td>
                    <td style="padding:6px 8px; text-align:center;">${Number(item.cantidad)}</td>
                    <td style="padding:6px 8px; text-align:right;">${formatearMoneda(precio)}</td>
                    <td style="padding:6px 8px; text-align:right;">${formatearMoneda(precio * Number(item.cantidad))}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding:8px; text-align:right; font-weight:700;">Total</td>
                <td style="padding:8px; text-align:right; font-weight:700;">${formatearMoneda(pedido.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `,
      confirmButtonText: "Cerrar",
      customClass: {
        popup: "modal-detalle-pedido"
      }
    });
  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message || "No se pudo cargar el detalle del pedido"
    });
  }
}

// ==========================================================
// Centro de soporte
// ==========================================================
function obtenerListaDesdeRespuesta(datos, claves) {
  if (Array.isArray(datos)) return datos;

  for (const clave of claves) {
    if (Array.isArray(datos?.[clave])) return datos[clave];
  }

  return [];
}

async function solicitarSoporte(rutas, opciones = {}) {
  let ultimoError = null;

  for (const ruta of rutas) {
    try {
      return await clienteApi.solicitarJson(ruta, opciones);
    } catch (error) {
      ultimoError = error;
      if (![404, 405].includes(error.status)) break;
    }
  }

  throw ultimoError;
}

function normalizarEstadoTicket(valor) {
  const estado = String(valor || "abierto").toLowerCase().replaceAll(" ", "_");

  if (["en_progreso", "proceso", "pendiente", "asignado"].includes(estado)) {
    return "en_proceso";
  }

  if (["resuelto", "finalizado"].includes(estado)) {
    return "cerrado";
  }

  return ["abierto", "en_proceso", "cerrado"].includes(estado) ? estado : "abierto";
}

function normalizarTicket(ticket) {
  ticket = ticket || {};

  return {
    id: Number(ticket.id || ticket.ticket_id || ticket.id_soporte || 0),
    asunto: ticket.asunto || ticket.titulo || ticket.subject || "Solicitud sin asunto",
    descripcion: ticket.descripcion || ticket.mensaje || ticket.description || "",
    categoria: ticket.categoria || ticket.tipo || ticket.category || "General",
    prioridad: String(ticket.prioridad || ticket.priority || "media").toLowerCase(),
    estado: normalizarEstadoTicket(ticket.estado || ticket.status),
    usuario: ticket.usuario_nombre || ticket.usuario || ticket.nombre_usuario || ticket.cliente || "Usuario",
    email: ticket.email || ticket.correo || ticket.usuario_email || "",
    fecha: ticket.created_at || ticket.fecha_creacion || ticket.fecha || ticket.createdAt || "",
    actualizado: ticket.updated_at || ticket.fecha_actualizacion || ticket.updatedAt || "",
    mensajes: obtenerListaDesdeRespuesta(ticket, ["mensajes", "respuestas", "messages", "comentarios"])
  };
}

function formatearFechaSoporte(valor) {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  return fecha.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function obtenerClasePrioridad(prioridad) {
  const valor = String(prioridad || "media").toLowerCase();
  if (["alta", "urgente", "critica"].includes(valor)) return "alta";
  if (["baja"].includes(valor)) return "baja";
  return "media";
}

async function obtenerTicketsSoporte() {
  const datos = await solicitarSoporte([
    "/soporte/tickets",
    "/soporte",
    "/tickets/soporte",
    "/tickets"
  ], {
    method: "GET"
  });

  const tickets = obtenerListaDesdeRespuesta(datos, ["tickets", "soportes", "solicitudes", "data"]);
  estadoDashboard.soporte.tickets = tickets.map(normalizarTicket);
  return estadoDashboard.soporte.tickets;
}

async function obtenerDetalleTicket(ticketId) {
  const datos = await solicitarSoporte([
    `/soporte/tickets/${ticketId}`,
    `/soporte/${ticketId}`,
    `/tickets/soporte/${ticketId}`,
    `/tickets/${ticketId}`
  ], {
    method: "GET"
  });

  return normalizarTicket(datos.ticket || datos.soporte || datos.solicitud || datos.data || datos);
}

async function crearTicketSoporte(ticket) {
  return solicitarSoporte([
    "/soporte/tickets",
    "/soporte",
    "/tickets/soporte",
    "/tickets"
  ], {
    method: "POST",
    body: JSON.stringify(ticket)
  });
}

async function enviarMensajeSoporte(ticketId, mensaje) {
  return solicitarSoporte([
    `/soporte/tickets/${ticketId}/mensajes`,
    `/soporte/${ticketId}/mensajes`,
    `/tickets/soporte/${ticketId}/mensajes`,
    `/tickets/${ticketId}/mensajes`
  ], {
    method: "POST",
    body: JSON.stringify({ mensaje, respuesta: mensaje, contenido: mensaje })
  });
}

async function actualizarEstadoSoporte(ticketId, estado) {
  return solicitarSoporte([
    `/soporte/tickets/${ticketId}/estado`,
    `/soporte/${ticketId}/estado`,
    `/tickets/soporte/${ticketId}/estado`,
    `/tickets/${ticketId}/estado`,
    `/soporte/tickets/${ticketId}`,
    `/soporte/${ticketId}`
  ], {
    method: "PUT",
    body: JSON.stringify({ estado, status: estado })
  });
}

async function cargarVistaSoporte() {
  document.getElementById("btn-nuevo-ticket")?.addEventListener("click", abrirModalNuevoTicket);

  const inputBusqueda = document.getElementById("buscar-ticket");
  if (inputBusqueda) {
    inputBusqueda.value = estadoDashboard.soporte.busqueda;
    inputBusqueda.addEventListener("input", () => {
      estadoDashboard.soporte.busqueda = inputBusqueda.value.trim().toLowerCase();
      renderizarTicketsSoporte();
    });
  }

  const filtroEstado = document.getElementById("filtro-ticket-estado");
  if (filtroEstado) {
    filtroEstado.value = estadoDashboard.soporte.estado;
    filtroEstado.addEventListener("change", () => {
      estadoDashboard.soporte.estado = filtroEstado.value;
      renderizarTicketsSoporte();
    });
  }

  await recargarTicketsSoporte();
}

async function recargarTicketsSoporte() {
  const lista = document.getElementById("lista-tickets");
  if (lista) {
    lista.innerHTML = `
      <div class="soporte-loading">
        <i class='bx bx-loader-alt bx-spin'></i>
        <span>Cargando tickets...</span>
      </div>
    `;
  }

  try {
    await obtenerTicketsSoporte();
    renderizarResumenSoporte();
    renderizarTicketsSoporte();
  } catch (error) {
    console.error(error);
    if (lista) {
      lista.innerHTML = `
        <div class="soporte-empty soporte-error">
          <i class='bx bx-plug'></i>
          <h3>No se pudo conectar soporte</h3>
          <p>${escaparHtml(error.message || "Revisa que el backend tenga activo el modulo de soporte.")}</p>
        </div>
      `;
    }
  }
}

function renderizarResumenSoporte() {
  const tickets = estadoDashboard.soporte.tickets;
  const abiertos = tickets.filter((ticket) => ticket.estado === "abierto").length;
  const proceso = tickets.filter((ticket) => ticket.estado === "en_proceso").length;
  const cerrados = tickets.filter((ticket) => ticket.estado === "cerrado").length;

  document.getElementById("soporte-total").textContent = tickets.length;
  document.getElementById("soporte-abiertos").textContent = abiertos;
  document.getElementById("soporte-proceso").textContent = proceso;
  document.getElementById("soporte-cerrados").textContent = cerrados;
}

function obtenerTicketsFiltrados() {
  const { tickets, busqueda, estado } = estadoDashboard.soporte;

  return tickets.filter((ticket) => {
    const coincideEstado = estado === "todos" || ticket.estado === estado;
    const texto = `${ticket.asunto} ${ticket.descripcion} ${ticket.categoria} ${ticket.usuario} ${ticket.email}`.toLowerCase();
    return coincideEstado && texto.includes(busqueda);
  });
}

function renderizarTicketsSoporte() {
  const lista = document.getElementById("lista-tickets");
  if (!lista) return;

  const tickets = obtenerTicketsFiltrados();

  if (tickets.length === 0) {
    lista.innerHTML = `
      <div class="soporte-empty">
        <i class='bx bx-inbox'></i>
        <h3>Sin tickets</h3>
        <p>No hay solicitudes con los filtros actuales.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = tickets.map((ticket) => `
    <button type="button" class="ticket-item${estadoDashboard.soporte.ticketSeleccionado?.id === ticket.id ? " activo" : ""}" data-ticket-id="${ticket.id}">
      <div class="ticket-item-top">
        <strong>#${ticket.id || "-"} ${escaparHtml(ticket.asunto)}</strong>
        <span class="ticket-estado ${ticket.estado}">${ticket.estado.replaceAll("_", " ")}</span>
      </div>
      <p>${escaparHtml(ticket.descripcion || "Sin descripcion").slice(0, 110)}</p>
      <div class="ticket-meta">
        <span><i class='bx bx-user'></i>${escaparHtml(ticket.usuario)}</span>
        <span class="ticket-prioridad ${obtenerClasePrioridad(ticket.prioridad)}">${escaparHtml(ticket.prioridad)}</span>
      </div>
    </button>
  `).join("");

  lista.querySelectorAll(".ticket-item").forEach((boton) => {
    boton.addEventListener("click", () => seleccionarTicketSoporte(Number(boton.dataset.ticketId)));
  });
}

async function seleccionarTicketSoporte(ticketId) {
  const detalle = document.getElementById("detalle-ticket");
  if (!detalle) return;

  detalle.innerHTML = `
    <div class="soporte-loading">
      <i class='bx bx-loader-alt bx-spin'></i>
      <span>Cargando detalle...</span>
    </div>
  `;

  try {
    const ticket = await obtenerDetalleTicket(ticketId);
    estadoDashboard.soporte.ticketSeleccionado = ticket;
    renderizarTicketsSoporte();
    renderizarDetalleTicket(ticket);
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo cargar el ticket");
  }
}

function normalizarMensajeSoporte(mensaje) {
  return {
    autor: mensaje.autor || mensaje.usuario || mensaje.nombre || mensaje.rol || "Soporte",
    contenido: mensaje.mensaje || mensaje.respuesta || mensaje.contenido || mensaje.texto || "",
    fecha: mensaje.created_at || mensaje.fecha || mensaje.createdAt || ""
  };
}

function renderizarDetalleTicket(ticket) {
  const detalle = document.getElementById("detalle-ticket");
  if (!detalle) return;

  const mensajes = ticket.mensajes.map(normalizarMensajeSoporte);

  detalle.innerHTML = `
    <div class="ticket-detalle-header">
      <div>
        <span class="ticket-estado ${ticket.estado}">${ticket.estado.replaceAll("_", " ")}</span>
        <h3>#${ticket.id || "-"} ${escaparHtml(ticket.asunto)}</h3>
        <p>${escaparHtml(ticket.categoria)} - ${escaparHtml(ticket.usuario)} ${ticket.email ? `(${escaparHtml(ticket.email)})` : ""}</p>
      </div>
      <select id="select-estado-ticket" class="select-estado-ticket">
        <option value="abierto" ${ticket.estado === "abierto" ? "selected" : ""}>Abierto</option>
        <option value="en_proceso" ${ticket.estado === "en_proceso" ? "selected" : ""}>En proceso</option>
        <option value="cerrado" ${ticket.estado === "cerrado" ? "selected" : ""}>Cerrado</option>
      </select>
    </div>

    <div class="ticket-descripcion">
      <span>Descripcion</span>
      <p>${escaparHtml(ticket.descripcion || "Sin descripcion registrada.")}</p>
      <small>Creado: ${escaparHtml(formatearFechaSoporte(ticket.fecha))}</small>
    </div>

    <div class="ticket-conversacion">
      ${mensajes.length === 0 ? `
        <div class="soporte-empty conversacion-vacia">
          <i class='bx bx-chat'></i>
          <p>Aun no hay mensajes en este ticket.</p>
        </div>
      ` : mensajes.map((mensaje) => `
        <article class="mensaje-soporte">
          <div>
            <strong>${escaparHtml(mensaje.autor)}</strong>
            <small>${escaparHtml(formatearFechaSoporte(mensaje.fecha))}</small>
          </div>
          <p>${escaparHtml(mensaje.contenido)}</p>
        </article>
      `).join("")}
    </div>

    <form id="form-responder-ticket" class="form-responder-ticket">
      <textarea id="respuesta-ticket" rows="4" placeholder="Escribe una respuesta clara para el cliente..."></textarea>
      <button type="submit" class="btn-soporte-primario">
        <i class='bx bx-send'></i>
        <span>Responder</span>
      </button>
    </form>
  `;

  document.getElementById("select-estado-ticket").addEventListener("change", async (evento) => {
    await cambiarEstadoTicket(ticket.id, evento.target.value);
  });

  document.getElementById("form-responder-ticket").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await responderTicket(ticket.id);
  });
}

async function abrirModalNuevoTicket() {
  const resultado = await Swal.fire({
    title: "Nuevo ticket de soporte",
    customClass: {
      popup: "modal-usuario"
    },
    html: `
      <div class="formulario-usuario-swal">
        <input id="ticket-asunto" class="swal2-input" placeholder="Asunto">
        <select id="ticket-categoria" class="swal2-input">
          <option value="General">General</option>
          <option value="Pedido">Pedido</option>
          <option value="Pago">Pago</option>
          <option value="Cuenta">Cuenta</option>
          <option value="Producto">Producto</option>
        </select>
        <select id="ticket-prioridad" class="swal2-input">
          <option value="media">Prioridad media</option>
          <option value="alta">Prioridad alta</option>
          <option value="baja">Prioridad baja</option>
        </select>
        <textarea id="ticket-descripcion" class="swal2-textarea" placeholder="Describe el caso"></textarea>
      </div>
    `,
    confirmButtonText: "Crear ticket",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    focusConfirm: false,
    preConfirm: async () => {
      const asunto = document.getElementById("ticket-asunto").value.trim();
      const categoria = document.getElementById("ticket-categoria").value;
      const prioridad = document.getElementById("ticket-prioridad").value;
      const descripcion = document.getElementById("ticket-descripcion").value.trim();

      if (!asunto || !descripcion) {
        Swal.showValidationMessage("Completa el asunto y la descripcion");
        return false;
      }

      try {
        await crearTicketSoporte({ asunto, titulo: asunto, categoria, prioridad, descripcion, mensaje: descripcion });
        return true;
      } catch (error) {
        Swal.showValidationMessage(error.message || "No se pudo crear el ticket");
        return false;
      }
    }
  });

  if (!resultado.isConfirmed) return;

  await Swal.fire({
    icon: "success",
    title: "Ticket creado",
    timer: 1400,
    showConfirmButton: false
  });

  await recargarTicketsSoporte();
}

async function responderTicket(ticketId) {
  const textarea = document.getElementById("respuesta-ticket");
  const mensaje = textarea.value.trim();

  if (!mensaje) {
    Swal.fire({
      icon: "warning",
      title: "Respuesta vacia",
      text: "Escribe un mensaje antes de responder."
    });
    return;
  }

  try {
    await enviarMensajeSoporte(ticketId, mensaje);
    textarea.value = "";
    await seleccionarTicketSoporte(ticketId);
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo enviar la respuesta");
  }
}

async function cambiarEstadoTicket(ticketId, estado) {
  try {
    await actualizarEstadoSoporte(ticketId, estado);
    await recargarTicketsSoporte();
    await seleccionarTicketSoporte(ticketId);
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo actualizar el estado");
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
    alertaToast("warning", "Imagen inválida", errorValidacion);
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

    alertaToast("success", "Imagen actualizada");

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
          <span>Modo oscuro</span>
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
  await actualizarBadgeCarrito();
  await cargarVista("dashboard");
}

iniciarDashboard();
//hola manuel
// este es un mini cambio para ver que todo funcione :3