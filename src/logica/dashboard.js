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
  graficoProdTopVendidos: null,
  graficoProdCategorias: null
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
  productos: null,

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
  if (estadoDashboard.graficoProdTopVendidos) {
    estadoDashboard.graficoProdTopVendidos.destroy();
    estadoDashboard.graficoProdTopVendidos = null;
  }
  if (estadoDashboard.graficoProdCategorias) {
    estadoDashboard.graficoProdCategorias.destroy();
    estadoDashboard.graficoProdCategorias = null;
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

      <div class="card prod-chart-top">
        <div class="metric-title">Top 10 productos vendidos</div>
        <div class="chart-container">
          <canvas id="prod-grafico-top-vendidos"></canvas>
        </div>
      </div>

      <div class="card prod-chart-cat">
        <div class="metric-title">Productos por categoría</div>
        <div class="chart-container">
          <canvas id="prod-grafico-categorias"></canvas>
        </div>
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

    </div>
  `;
}

async function cargarVistaProductos() {
  elementos.vista.innerHTML = construirVistaProductos();

  try {
    const resultados = await Promise.allSettled([
      clienteApi.solicitarJson("/productos/metricas", { method: "GET" }),
      clienteApi.solicitarJson("/productos/top-vendidos", { method: "GET" }),
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

    // ── Top vendidos ──
    if (resultados[1].status === "fulfilled") {
      crearGraficoProdTopVendidos(resultados[1].value);
    } else {
      console.error("Error top vendidos:", resultados[1].reason);
    }

    // ── Categorías ──
    if (resultados[2].status === "fulfilled") {
      crearGraficoProdCategorias(resultados[2].value);
    } else {
      console.error("Error categorías:", resultados[2].reason);
    }

    // ── Tabla bajo stock ──
    if (resultados[3].status === "fulfilled") {
      renderizarTablaBajoStock(resultados[3].value);
    } else {
      console.error("Error bajo stock:", resultados[3].reason);
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

function crearGraficoProdTopVendidos(productos) {
  const canvas = document.getElementById("prod-grafico-top-vendidos");
  if (!canvas) return;

  if (estadoDashboard.graficoProdTopVendidos) {
    estadoDashboard.graficoProdTopVendidos.destroy();
    estadoDashboard.graficoProdTopVendidos = null;
  }

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";
  const colorGrid = esDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const etiquetas = productos.map((p) => {
    const nombre = p.nombre || "";
    return nombre.length > 22 ? nombre.slice(0, 22) + "…" : nombre;
  });

  estadoDashboard.graficoProdTopVendidos = new Chart(canvas, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [{
        label: "Vendidos",
        data: productos.map((p) => p.vendidos),
        backgroundColor: "rgba(124, 58, 237, 0.72)",
        borderColor: "rgba(124, 58, 237, 1)",
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

function crearGraficoProdCategorias(categorias) {
  const canvas = document.getElementById("prod-grafico-categorias");
  if (!canvas) return;

  if (estadoDashboard.graficoProdCategorias) {
    estadoDashboard.graficoProdCategorias.destroy();
    estadoDashboard.graficoProdCategorias = null;
  }

  const esDark = document.body.classList.contains("dark");
  const colorTexto = esDark ? "#e2e8f0" : "#374151";

  const paletaColores = [
    "#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
    "#06b6d4", "#a855f7"
  ];

  estadoDashboard.graficoProdCategorias = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: categorias.map((c) => c.nombre),
      datasets: [{
        data: categorias.map((c) => c.productos),
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