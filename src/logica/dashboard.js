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
  graficoTopVendidos: null,
  graficoCategorias: null,
  graficoProdCategorias: null,
  graficoIngresos: null,
  reporteActivo: "ventas",
  datosReporte: [],
  ventasCache: [],
  ventasCacheCompleta: [],
  pedidosCache: [],
  pedidosCacheCompleta: [],
  inventarioCache: [],
  ventasVista: "fecha",
  actividadVista: "usuarios"
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

function limpiarCookiesSesion() {
  const cookies = document.cookie.split("; ");
  cookies.forEach((cookie) => {
    const nombre = cookie.split("=")[0];
    // Conservar solo la cookie del tema
    if (nombre === "tema") return;
    document.cookie = `${nombre}=; path=/; max-age=0; SameSite=Lax`;
  });
}

// ==========================================================
// Alertas SweetAlert del administrador
// Fondo azul según dashboard, éxito verde y error rojo.
// ==========================================================
function obtenerTipoAlerta(icono = "info") {
  const iconoNormalizado = String(icono || "info").trim().toLowerCase();

  if (iconoNormalizado === "success") return "exito";
  if (iconoNormalizado === "error") return "error";
  if (iconoNormalizado === "warning") return "advertencia";

  return "info";
}

function obtenerClasesAlerta(icono = "info", clasesExtraPopup = "") {
  const tipoAlerta = obtenerTipoAlerta(icono);
  const clasesPopup = ["swal-admin", `swal-admin-${tipoAlerta}`, clasesExtraPopup]
    .filter(Boolean)
    .join(" ");

  const claseBotonConfirmar = tipoAlerta === "error"
    ? "swal-admin-btn swal-admin-btn-error"
    : "swal-admin-btn swal-admin-btn-exito";

  return {
    popup: clasesPopup,
    title: "swal-admin-titulo",
    htmlContainer: "swal-admin-texto",
    confirmButton: claseBotonConfirmar,
    cancelButton: "swal-admin-btn swal-admin-btn-cancelar",
    validationMessage: "swal-admin-validacion"
  };
}

function alertaToast(icon, title, text = "", timer = 3000) {
  const timerFinal = Math.min(timer, 3000);
  Swal.close();
  Swal.fire({
    icon,
    title,
    text,
    timer: timerFinal,
    showConfirmButton: false,
    position: "bottom-end",
    toast: true,
    timerProgressBar: true,
    customClass: obtenerClasesAlerta(icon, "swal-admin-toast")
  });
}

function alertaCentro(icon, title, text = "") {
  Swal.close();
  return Swal.fire({
    icon,
    title,
    text,
    timer: 3000,
    timerProgressBar: true,
    confirmButtonText: "Aceptar",
    customClass: obtenerClasesAlerta(icon)
  });
}

async function mostrarErrorServidor(error, mensajePorDefecto = "No se pudo completar la operación") {
  console.error(error);

  if (error.status === 401) {
    Swal.close();
    await Swal.fire({
      icon: "error",
      title: "Sesión expirada",
      text: "Tu sesión ha expirado. Serás redirigido al login.",
      timer: 3000,
      timerProgressBar: true,
      confirmButtonText: "Entendido",
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: obtenerClasesAlerta("error")
    });
    try { localStorage.clear(); } catch (_) {}
    limpiarCookiesSesion();
    redirigirALogin();
    return;
  }

  Swal.close();
  await Swal.fire({
    icon: "error",
    title: "Error",
    text: error.message || mensajePorDefecto,
    timer: 3000,
    timerProgressBar: true,
    confirmButtonText: "Aceptar",
    customClass: obtenerClasesAlerta("error")
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
  productos: null,
  reportes: null,

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
        <div class="card-filter">
          <div class="metric-title" id="actividad-titulo">Usuarios recientes</div>
          <div class="filter-controls">
            <div class="filter-dropdown">
              <button class="filter-dropdown-btn" id="actividad-filter-btn">
                <i class='bx bx-group'></i> <span>Usuarios</span> <i class='bx bx-chevron-down'></i>
              </button>
              <ul class="filter-dropdown-list" id="actividad-filter-list">
                <li data-vista="usuarios" class="activo"><i class='bx bx-group'></i> Usuarios</li>
                <li data-vista="pendientes"><i class='bx bx-cart'></i> Pedidos pendientes</li>
              </ul>
            </div>
            <div class="filter-fechas" id="actividad-fechas" style="display:none;">
              <input type="date" id="actividad-desde" class="filter-fecha" title="Desde">
              <input type="date" id="actividad-hasta" class="filter-fecha" title="Hasta">
            </div>
            <button class="filter-aceptar" id="actividad-aceptar" title="Aplicar" style="display:none;"><i class='bx bx-check'></i></button>
          </div>
        </div>
        <div class="activity-table-wrapper">
          <table class="activity-table">
            <thead id="actividad-thead">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody id="tabla-actividad"></tbody>
          </table>
        </div>
      </div>

      <div class="card dash-chart-ingresos">
        <div class="card-filter">
          <div class="metric-title">Ventas</div>
          <div class="filter-controls">
            <div class="filter-dropdown">
              <button class="filter-dropdown-btn" id="ventas-filter-btn">
                <i class='bx bx-calendar'></i> <span>Por fecha</span> <i class='bx bx-chevron-down'></i>
              </button>
              <ul class="filter-dropdown-list" id="ventas-filter-list">
                <li data-vista="fecha" class="activo"><i class='bx bx-calendar'></i> Por fecha</li>
                <li data-vista="producto"><i class='bx bx-package'></i> Por producto</li>
                <li data-vista="categoria"><i class='bx bx-category-alt'></i> Por categoría</li>
              </ul>
            </div>
            <div class="filter-fechas">
              <input type="date" id="ventas-desde" class="filter-fecha" title="Desde">
              <input type="date" id="ventas-hasta" class="filter-fecha" title="Hasta">
            </div>
            <button class="filter-aceptar" id="ventas-aceptar" title="Aplicar"><i class='bx bx-check'></i></button>
          </div>
        </div>
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
      clienteApi.solicitarJson("/reportes/pedidos", { method: "GET" }),
      clienteApi.solicitarJson("/reportes/inventario", { method: "GET" }),
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

    // ── Categorías (doughnut) ──
    if (resultados[2].status === "fulfilled") {
      crearGraficoCategorias(resultados[2].value);
    } else {
      console.error("Error al cargar categorías:", resultados[2].reason);
    }

    // ── Ventas (cache) ──
    if (resultados[3].status === "fulfilled") {
      const datos = resultados[3].value;
      estadoDashboard.ventasCache = Array.isArray(datos) ? datos : (datos.ventas || datos.datos || []);
      estadoDashboard.ventasCacheCompleta = [...estadoDashboard.ventasCache];
    } else {
      estadoDashboard.ventasCache = [];
      estadoDashboard.ventasCacheCompleta = [];
      console.error("Error al cargar ventas:", resultados[3].reason);
    }

    // ── Pedidos (cache) ──
    if (resultados[4].status === "fulfilled") {
      const datos = resultados[4].value;
      estadoDashboard.pedidosCache = Array.isArray(datos) ? datos : (datos.pedidos || datos.datos || []);
      estadoDashboard.pedidosCacheCompleta = [...estadoDashboard.pedidosCache];
    } else {
      estadoDashboard.pedidosCache = [];
      estadoDashboard.pedidosCacheCompleta = [];
      console.error("Error al cargar pedidos:", resultados[4].reason);
    }

    // ── Inventario (cache para mapeo producto→categoría) ──
    if (resultados[5].status === "fulfilled") {
      const datos = resultados[5].value;
      estadoDashboard.inventarioCache = Array.isArray(datos) ? datos : (datos.inventario || datos.datos || []);
    } else {
      estadoDashboard.inventarioCache = [];
      console.error("Error al cargar inventario:", resultados[5].reason);
    }

    // ── Renderizar vistas por defecto ──
    renderizarVentas();
    renderizarActividad();

    // ── Configurar filtros dropdown + aceptar ──
    configurarFiltrosDashboard();

  } catch (error) {
    mostrarErrorServidor(error, "No se pudo cargar el dashboard");
  }
}

// ==========================================================
// Filtros del Dashboard (dropdowns + aceptar)
// ==========================================================
function configurarFiltrosDashboard() {
  // ── Cerrar dropdowns al hacer clic fuera ──
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown")) {
      document.querySelectorAll(".filter-dropdown-list").forEach((l) => l.classList.remove("abierto"));
    }
  });

  // ── Dropdown ventas ──
  const ventasBtn = document.getElementById("ventas-filter-btn");
  const ventasList = document.getElementById("ventas-filter-list");
  const ventasAceptar = document.getElementById("ventas-aceptar");

  if (ventasBtn && ventasList) {
    ventasBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      ventasList.classList.toggle("abierto");
      const actList = document.getElementById("actividad-filter-list");
      if (actList) actList.classList.remove("abierto");
    });

    ventasList.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        estadoDashboard.ventasVista = li.dataset.vista;
        ventasList.querySelectorAll("li").forEach((l) => l.classList.remove("activo"));
        li.classList.add("activo");
        const icono = li.querySelector("i").className;
        const texto = li.textContent.trim();
        const btnSpan = ventasBtn.querySelector("span");
        const btnIcon = ventasBtn.querySelectorAll("i")[0];
        if (btnSpan) btnSpan.textContent = texto;
        if (btnIcon) btnIcon.className = icono;
        ventasList.classList.remove("abierto");
        renderizarVentas();
      });
    });
  }

  if (ventasAceptar) {
    ventasAceptar.addEventListener("click", async () => {
      const desde = document.getElementById("ventas-desde")?.value;
      const hasta = document.getElementById("ventas-hasta")?.value;

      // Filtrar del lado del cliente usando los datos ya cacheados
      if (desde || hasta) {
        const ventasFiltradas = filtrarVentasPorFecha(estadoDashboard.ventasCacheCompleta, desde, hasta);
        estadoDashboard.ventasCache = ventasFiltradas;
      } else {
        // Sin fechas, restaurar todos los datos
        estadoDashboard.ventasCache = [...estadoDashboard.ventasCacheCompleta];
      }

      renderizarVentas();
      alertaToast("success", "Filtro aplicado");
    });
  }

  // ── Dropdown actividad ──
  const actBtn = document.getElementById("actividad-filter-btn");
  const actList = document.getElementById("actividad-filter-list");
  const actAceptar = document.getElementById("actividad-aceptar");
  const actFechas = document.getElementById("actividad-fechas");

  if (actBtn && actList) {
    actBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      actList.classList.toggle("abierto");
      if (ventasList) ventasList.classList.remove("abierto");
    });

    actList.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => {
        estadoDashboard.actividadVista = li.dataset.vista;
        actList.querySelectorAll("li").forEach((l) => l.classList.remove("activo"));
        li.classList.add("activo");
        const icono = li.querySelector("i").className;
        const texto = li.textContent.trim();
        const btnSpan = actBtn.querySelector("span");
        const btnIcon = actBtn.querySelectorAll("i")[0];
        if (btnSpan) btnSpan.textContent = texto;
        if (btnIcon) btnIcon.className = icono;
        actList.classList.remove("abierto");

        // Mostrar/ocultar fechas y aceptar según la vista
        if (estadoDashboard.actividadVista === "pendientes") {
          if (actFechas) actFechas.style.display = "";
          if (actAceptar) actAceptar.style.display = "";
        } else {
          if (actFechas) actFechas.style.display = "none";
          if (actAceptar) actAceptar.style.display = "none";
        }

        renderizarActividad();
      });
    });
  }

  if (actAceptar) {
    actAceptar.addEventListener("click", async () => {
      const desde = document.getElementById("actividad-desde")?.value;
      const hasta = document.getElementById("actividad-hasta")?.value;

      // Filtrar del lado del cliente usando los datos ya cacheados
      if (desde || hasta) {
        const pedidosFiltrados = filtrarPedidosPorFecha(estadoDashboard.pedidosCacheCompleta, desde, hasta);
        estadoDashboard.pedidosCache = pedidosFiltrados;
      } else {
        // Sin fechas, restaurar todos los datos
        estadoDashboard.pedidosCache = [...estadoDashboard.pedidosCacheCompleta];
      }

      renderizarActividad();
      alertaToast("success", "Filtro aplicado");
    });
  }
}

// ==========================================================
// Filtrado client-side por fecha
// ==========================================================
function filtrarVentasPorFecha(ventas, desde, hasta) {
  if (!Array.isArray(ventas)) return [];
  return ventas.filter((v) => {
    const fecha = v.fecha || "";
    if (!fecha) return false;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });
}

function filtrarPedidosPorFecha(pedidos, desde, hasta) {
  if (!Array.isArray(pedidos)) return [];
  return pedidos.filter((p) => {
    const fecha = p.fecha || "";
    if (!fecha) return false;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });
}

// ==========================================================
// Renderizado de vistas de Ventas (card derecha inferior)
// ==========================================================
function renderizarVentas() {
  const ventas = estadoDashboard.ventasCache;
  const vista = estadoDashboard.ventasVista;

  if (estadoDashboard.graficoIngresos) {
    estadoDashboard.graficoIngresos.destroy();
    estadoDashboard.graficoIngresos = null;
  }

  if (vista === "fecha") {
    const datosMensuales = agruparIngresosPorMes(ventas);
    crearGraficoIngresos(datosMensuales);
  } else if (vista === "producto") {
    crearGraficoVentasPorProducto(ventas);
  } else if (vista === "categoria") {
    crearGraficoVentasPorCategoria(ventas);
  }
}

function crearGraficoVentasPorProducto(ventas) {
  const canvas = document.getElementById("dash-grafico-ingresos");
  if (!canvas) return;

  // Agrupar ventas por producto, sumar total
  const porProducto = {};
  ventas.forEach((v) => {
    const nombre = v.producto || "Sin nombre";
    const total = Number(v.total) || 0;
    porProducto[nombre] = (porProducto[nombre] || 0) + total;
  });

  // Ordenar por total y tomar top 10
  const ordenados = Object.entries(porProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const etiquetas = ordenados.map(([nombre]) => {
    return nombre.length > 22 ? nombre.slice(0, 22) + "…" : nombre;
  });
  const valores = ordenados.map(([, total]) => total);

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";
  const colorGrid = esDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  estadoDashboard.graficoIngresos = new Chart(canvas, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [{
        label: "Ventas",
        data: valores,
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
            label: function (item) {
              return `  Ventas: ${formatearMoneda(item.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
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
        },
        y: {
          ticks: { color: colorTexto, font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

function crearGraficoVentasPorCategoria(ventas) {
  const canvas = document.getElementById("dash-grafico-ingresos");
  if (!canvas) return;

  // Construir mapa producto → categoría desde inventario
  const productoCategoria = {};
  estadoDashboard.inventarioCache.forEach((item) => {
    if (item.producto && item.categoria) {
      productoCategoria[item.producto] = item.categoria;
    }
  });

  // Agrupar ventas por categoría
  const porCategoria = {};
  ventas.forEach((v) => {
    const categoria = productoCategoria[v.producto] || "Sin categoría";
    const total = Number(v.total) || 0;
    porCategoria[categoria] = (porCategoria[categoria] || 0) + total;
  });

  const ordenados = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  const etiquetas = ordenados.map(([cat]) => cat);
  const valores = ordenados.map(([, total]) => total);

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";

  const paletaColores = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
    "#06b6d4", "#a855f7"
  ];

  estadoDashboard.graficoIngresos = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: etiquetas,
      datasets: [{
        data: valores,
        backgroundColor: paletaColores.slice(0, etiquetas.length),
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
              return `  ${item.label}: ${formatearMoneda(item.raw)} (${porcentaje}%)`;
            }
          }
        }
      }
    }
  });
}

// ==========================================================
// Renderizado de vistas de Actividad (card izquierda inferior)
// ==========================================================
function renderizarActividad() {
  const vista = estadoDashboard.actividadVista;
  const thead = document.getElementById("actividad-thead");
  const tbody = document.getElementById("tabla-actividad");
  const titulo = document.getElementById("actividad-titulo");

  if (!thead || !tbody) return;

  if (vista === "usuarios") {
    if (titulo) titulo.textContent = "Usuarios recientes";
    thead.innerHTML = `<tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Teléfono</th></tr>`;

    const usuarios = estadoDashboard.usuarios;
    if (usuarios.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="usuarios-vacio">No hay usuarios para mostrar</td></tr>`;
      return;
    }

    tbody.innerHTML = usuarios.slice(0, 10).map((u) => `
      <tr>
        <td>#${Number(u.id)}</td>
        <td>${escaparHtml(u.nombre)}</td>
        <td>${escaparHtml(u.email)}</td>
        <td><span class="badge-rol">${escaparHtml(u.nombre_rol)}</span></td>
        <td>${escaparHtml(u.telefono)}</td>
      </tr>
    `).join("");

  } else if (vista === "pendientes") {
    if (titulo) titulo.textContent = "Pedidos pendientes";
    thead.innerHTML = `<tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Total</th></tr>`;

    const pendientes = estadoDashboard.pedidosCache.filter((p) => {
      const estado = String(p.estado || "").toLowerCase().trim();
      return estado !== "entregado" && estado !== "completado" && estado !== "cancelado";
    });

    if (pendientes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="usuarios-vacio">No hay pedidos pendientes</td></tr>`;
      return;
    }

    tbody.innerHTML = pendientes.slice(0, 20).map((p) => {
      let clasePill = "pendiente";
      const estadoLower = String(p.estado || "").toLowerCase();
      if (estadoLower.includes("entregado") || estadoLower.includes("completado")) {
        clasePill = "entregado";
      } else if (estadoLower.includes("cancelado")) {
        clasePill = "cancelado";
      }
      return `
        <tr>
          <td>#${p.idPedido}</td>
          <td>${escaparHtml(p.cliente)}</td>
          <td>${escaparHtml(p.fecha)}</td>
          <td><span class="status-pill ${clasePill}">${escaparHtml(p.estado)}</span></td>
          <td>${formatearMoneda(p.total)}</td>
        </tr>
      `;
    }).join("");
  }
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
        <div class="metric-title">10 productos menos vendidos</div>
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
      clienteApi.solicitarJson("/reportes/ventas", { method: "GET" }),
      clienteApi.solicitarJson("/productos/bajo-stock", { method: "GET" }),
      clienteApi.solicitarJson("/reportes/inventario", { method: "GET" })
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

    // ── Gráfica de 10 productos menos vendidos ──
    if (resultados[1].status === "fulfilled" && resultados[3].status === "fulfilled") {
      crearGraficoProductosMenosVendidos(resultados[1].value, resultados[3].value);
    } else if (resultados[1].status === "fulfilled") {
      crearGraficoProductosMenosVendidos(resultados[1].value, []);
      if (resultados[3].status === "rejected") console.error("Error inventario:", resultados[3].reason);
    } else {
      console.error("Error ventas:", resultados[1].reason);
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

function crearGraficoProductosMenosVendidos(ventas, inventario) {
  const canvas = document.getElementById("prod-grafico-categorias");
  if (!canvas) return;

  if (estadoDashboard.graficoProdCategorias) {
    estadoDashboard.graficoProdCategorias.destroy();
    estadoDashboard.graficoProdCategorias = null;
  }

  const ventasNormalizadas = Array.isArray(ventas) ? ventas : [];
  const inventarioNormalizado = Array.isArray(inventario) ? inventario : [];
  const mapaProductos = new Map();

  inventarioNormalizado.forEach((item) => {
    const nombre = String(item.producto || item.nombre || "Producto sin nombre").trim();
    if (!nombre) return;

    const clave = nombre.toLowerCase();
    if (!mapaProductos.has(clave)) {
      mapaProductos.set(clave, {
        nombre,
        vendidos: 0
      });
    }
  });

  ventasNormalizadas.forEach((venta) => {
    const nombre = String(venta.producto || venta.nombre || "Producto sin nombre").trim();
    if (!nombre) return;

    const clave = nombre.toLowerCase();
    const cantidad = Number(venta.cantidad ?? venta.vendidos ?? venta.total_vendidos ?? 0);
    const cantidadSegura = Number.isFinite(cantidad) ? cantidad : 0;
    const acumulado = mapaProductos.get(clave) || {
      nombre,
      vendidos: 0
    };

    acumulado.vendidos += cantidadSegura;
    mapaProductos.set(clave, acumulado);
  });

  const productos = Array.from(mapaProductos.values());
  const productosConVentas = productos.filter((producto) => Number(producto.vendidos) > 0);
  const baseProductos = productosConVentas.length > 0 ? productosConVentas : productos;

  const productosMenosVendidos = baseProductos
    .sort((a, b) => Number(a.vendidos) - Number(b.vendidos) || a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, 10);

  const datosGrafica = productosMenosVendidos.map((producto) => Number(producto.vendidos) || 0);
  const ventaMaxima = Math.max(...datosGrafica, 0);

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";
  const colorGrid = esDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  estadoDashboard.graficoProdCategorias = new Chart(canvas, {
    type: "bar",
    data: {
      labels: productosMenosVendidos.map((producto) => {
        const nombre = producto.nombre || "";
        return nombre.length > 24 ? nombre.slice(0, 24) + "…" : nombre;
      }),
      datasets: [{
        label: "Vendidos",
        data: datosGrafica,
        backgroundColor: "rgba(245, 158, 11, 0.72)",
        borderColor: "rgba(245, 158, 11, 1)",
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 44,
        minBarLength: 8
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
              const indice = items[0].dataIndex;
              return productosMenosVendidos[indice]?.nombre || "Producto";
            },
            label: function (item) {
              return `  Vendidos: ${item.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: colorTexto, font: { size: 11 }, precision: 0 },
          grid: { color: colorGrid },
          beginAtZero: true,
          suggestedMax: ventaMaxima <= 0 ? 1 : Math.ceil(ventaMaxima * 1.15)
        },
        y: {
          ticks: { color: colorTexto, font: { size: 11 } },
          grid: { display: false }
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
    columnas: ["Fecha", "Producto", "Cantidad", "Precio Unitario", "Total", "Estado"],
    keys: ["fecha", "producto", "cantidad", "precioUnitario", "total", "estado"],
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
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="reporte-tbody">
              <tr>
                <td colspan="6" class="usuarios-vacio">Selecciona un reporte y haz clic en Consultar</td>
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

  limpiarTbody(config.columnas.length, "Cargando...");

  try {
    // Fetch all data from endpoint (sin query params para evitar errores de backend)
    const datos = await clienteApi.solicitarJson(config.endpoint, { method: "GET" });
    let datosCompletos = Array.isArray(datos) ? datos : (datos.datos || datos.reporte || datos.ventas || datos.pedidos || datos.inventario || []);

    // Filtrar por fechas del lado del cliente si aplica
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

      datosCompletos = datosCompletos.filter((fila) => {
        const fecha = fila.fecha || "";
        if (!fecha) return false;
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        return true;
      });
    }

    estadoDashboard.datosReporte = datosCompletos;

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

      if (key === "total" || key === "precioUnitario" || key === "precio") {
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

  alertaToast("success", "Excel generado", `${nombreArchivo}.xlsx se descargó correctamente`);
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

  const resultado = await Swal.fire({
    title: "Agregar Usuario",
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
    customClass: obtenerClasesAlerta("success", "swal-admin-formulario"),
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
  });

  if (resultado.isConfirmed) {
    alertaToast("success", "Usuario agregado");
    cargarUsuariosTabla();
  }
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

  const resultado = await Swal.fire({
    title: "Editar Usuario",
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
    customClass: obtenerClasesAlerta("success", "swal-admin-formulario"),
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
  });

  if (resultado.isConfirmed) {
    alertaToast("success", "Usuario actualizado");
    cargarUsuariosTabla();
  }
}

async function eliminarUsuario(id) {
  const confirmacion = await Swal.fire({
    title: "Eliminar usuario",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    iconColor: "#ef4444",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    focusCancel: true,
    customClass: {
      ...obtenerClasesAlerta("warning"),
      confirmButton: "swal-admin-btn swal-admin-btn-error",
      popup: "swal-admin swal-admin-error"
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

    // Limpiar localStorage
    try { localStorage.clear(); } catch (_) {}

    // Limpiar todas las cookies excepto la del tema
    limpiarCookiesSesion();

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
  await cargarVista("dashboard");
}

iniciarDashboard();
//hola manuel
// este es un mini cambio para ver que todo funcione :3