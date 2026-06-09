const clienteApi = window.clienteApi;

const estadoCarrito = {
  carritoId: null,
  items: [],
  cantidadItems: 0,
  total: 0,
  cupon: null,
  descuento: 0,
  totalConDescuento: 0
};

const elementos = {
  contenedor: document.getElementById("contenedorCarrito"),
  contador: document.getElementById("contadorItems"),
  indicadorCarga: document.getElementById("indicadorCarga")
};

if (!clienteApi) {
  console.error("No se encontró window.clienteApi. Revisa que configuracion-api.js cargue antes de carrito.js");
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

function construirUrlImagen(nombreImagen) {
  if (!nombreImagen) return "../../public/img/avatar-default.svg";
  return clienteApi.construirUrlImagen(nombreImagen);
}

function actualizarContador() {
  elementos.contador.textContent = estadoCarrito.cantidadItems;
}

function mostrarCargando(visible) {
  if (!elementos.indicadorCarga) return;
  elementos.indicadorCarga.style.display = visible ? "flex" : "none";
}

function mostrarErrorServidor(error, mensajePorDefecto) {
  console.error(error);

  Swal.fire({
    icon: "error",
    title: error.status === 401 ? "Sesión expirada" : "Error",
    text: error.message || mensajePorDefecto || "No se pudo completar la operación"
  });
}

function obtenerPrecioItem(item) {
  return item.precio_unitario ?? item.precio ?? 0;
}

function renderizarCarrito() {
  if (!elementos.contenedor) return;

  if (estadoCarrito.items.length === 0) {
    elementos.contenedor.innerHTML = `
      <div class="carrito-vacio">
        <i class="bx bx-cart-alt"></i>
        <h2>Tu carrito está vacío</h2>
        <p>Agrega productos desde la tienda para empezar a comprar.</p>
        <a href="dashboard.html" class="btn-ir-tienda">Ir a la tienda</a>
      </div>
    `;
    actualizarContador();
    return;
  }

  elementos.contenedor.innerHTML = `
    <div class="lista-carrito">
      ${estadoCarrito.items.map((item) => {
        const precio = obtenerPrecioItem(item);
        const stock = item.stock ?? Infinity;
        const sinStock = stock <= 0;
        const alMaximo = item.cantidad >= stock;
        return `
        <div class="item-carrito${sinStock ? " sin-stock" : ""}" data-producto-id="${item.producto_id}">
          <img
            class="item-imagen"
            src="${construirUrlImagen(item.imagen)}"
            alt="${escaparHtml(item.nombre)}"
            loading="lazy"
          >
          <div class="item-info">
            <h3 class="item-nombre">${escaparHtml(item.nombre)}</h3>
            <p class="item-precio-unitario">${formatearMoneda(precio)} c/u</p>
            ${sinStock ? '<p class="item-stock-msg sin-stock-msg">Sin stock</p>' : ''}
          </div>
          <div class="item-cantidad">
            <button class="btn-cantidad btn-restar" data-producto-id="${item.producto_id}" title="Disminuir cantidad" ${sinStock ? "disabled" : ""}>
              <i class="bx bx-minus"></i>
            </button>
            <span class="cantidad-valor">${item.cantidad}</span>
            <button class="btn-cantidad btn-sumar" data-producto-id="${item.producto_id}" title="Aumentar cantidad" ${sinStock || alMaximo ? "disabled" : ""}>
              <i class="bx bx-plus"></i>
            </button>
          </div>
          <p class="item-subtotal">${formatearMoneda(precio * item.cantidad)}</p>
          <button class="btn-eliminar" data-producto-id="${item.producto_id}" title="Eliminar producto">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      `}).join("")}
      <p class="stock-leyenda">* Stock disponible por producto</p>
    </div>

    <div class="resumen-carrito">
      <div class="resumen-fila">
        <span>Productos (${estadoCarrito.cantidadItems})</span>
        <span>${formatearMoneda(estadoCarrito.total)}</span>
      </div>

      <div class="cupon-section">
        <div class="cupon-input-group">
          <input type="text" id="inputCupon" class="cupon-input" placeholder="Código de cupón" value="${escaparHtml(estadoCarrito.cupon?.codigo || "")}" ${estadoCarrito.cupon ? "disabled" : ""}>
          <button class="btn-cupon" id="btnAplicarCupon" ${estadoCarrito.cupon ? "style='display:none'" : ""}>
            <i class='bx bx-tag'></i> Aplicar
          </button>
          <button class="btn-cupon-remover" id="btnRemoverCupon" ${estadoCarrito.cupon ? "" : "style='display:none'"}>
            <i class='bx bx-x'></i> Quitar
          </button>
        </div>
        ${estadoCarrito.cupon ? `
          <div class="cupon-aplicado">
            Cupón <strong>${escaparHtml(estadoCarrito.cupon.codigo)}</strong> aplicado — ${estadoCarrito.cupon.descuento}% OFF
          </div>
        ` : ""}
      </div>

      ${estadoCarrito.cupon ? `
        <div class="resumen-fila resumen-descuento">
          <span>Descuento (${estadoCarrito.cupon.descuento}%)</span>
          <span>-${formatearMoneda(estadoCarrito.total - estadoCarrito.totalConDescuento)}</span>
        </div>
      ` : ""}

      <div class="resumen-fila resumen-total">
        <span>Total</span>
        <span class="total-valor">${formatearMoneda(estadoCarrito.cupon ? estadoCarrito.totalConDescuento : estadoCarrito.total)}</span>
      </div>
      <button class="btn-continuar" id="btnContinuar">
        <i class="bx bx-arrow-forward"></i> Continuar
      </button>
      <button class="btn-vaciar" id="btnVaciar">
        <i class="bx bx-trash-alt"></i> Vaciar carrito
      </button>
    </div>
  `;

  actualizarContador();
  configurarEventosCarrito();
}

function configurarEventosCarrito() {
  document.querySelectorAll(".btn-sumar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const productoId = Number(btn.dataset.productoId);
      const item = estadoCarrito.items.find((i) => i.producto_id === productoId);
      if (item) {
        const nuevaCantidad = item.cantidad + 1;
        const stockDisponible = item.stock ?? Infinity;

        if (nuevaCantidad > stockDisponible) {
          Swal.fire({
            icon: "warning",
            title: "Stock insuficiente",
            text: `Solo hay ${stockDisponible} unidad(es) disponible(s) de "${item.nombre}"`
          });
          return;
        }

        actualizarCantidad(productoId, nuevaCantidad);
      }
    });
  });

  document.querySelectorAll(".btn-restar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const productoId = Number(btn.dataset.productoId);
      const item = estadoCarrito.items.find((i) => i.producto_id === productoId);
      if (item) {
        if (item.cantidad > 1) {
          actualizarCantidad(productoId, item.cantidad - 1);
        } else {
          eliminarItem(productoId);
        }
      }
    });
  });

  document.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", () => {
      eliminarItem(Number(btn.dataset.productoId));
    });
  });

  const btnAplicarCupon = document.getElementById("btnAplicarCupon");
  if (btnAplicarCupon) {
    btnAplicarCupon.addEventListener("click", validarCupon);
  }

  const btnRemoverCupon = document.getElementById("btnRemoverCupon");
  if (btnRemoverCupon) {
    btnRemoverCupon.addEventListener("click", removerCupon);
  }

  const inputCupon = document.getElementById("inputCupon");
  if (inputCupon) {
    inputCupon.addEventListener("keydown", (e) => {
      if (e.key === "Enter") validarCupon();
    });
  }

  const btnContinuar = document.getElementById("btnContinuar");
  if (btnContinuar) {
    btnContinuar.addEventListener("click", () => {
      if (estadoCarrito.items.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Carrito vacío",
          text: "Agrega productos antes de continuar"
        });
        return;
      }
      window.location.href = "direcciones.html";
    });
  }

  const btnVaciar = document.getElementById("btnVaciar");
  if (btnVaciar) {
    btnVaciar.addEventListener("click", vaciarCarrito);
  }
}

async function agregarAlCarrito(productoId, cantidad = 1) {
  try {
    const datos = await clienteApi.solicitarJson("/carrito/agregar", {
      method: "POST",
      body: JSON.stringify({ producto_id: productoId, cantidad })
    });

    await cargarCarrito();

    Swal.fire({
      icon: "success",
      title: "Producto agregado",
      text: datos.message || "Se agregó al carrito correctamente",
      timer: 1200,
      showConfirmButton: false
    });

    return true;
  } catch (error) {
    const mensaje = (error.datos?.message || error.message || "").toLowerCase();
    if (mensaje.includes("stock")) {
      Swal.fire({
        icon: "warning",
        title: "Stock insuficiente",
        text: error.datos?.message || error.message || "No hay suficiente stock disponible"
      });
    } else {
      mostrarErrorServidor(error, "No se pudo agregar el producto al carrito");
    }
    return false;
  }
}

async function validarCupon() {
  const input = document.getElementById("inputCupon");
  if (!input) return;

  const codigo = input.value.trim();
  if (!codigo) {
    Swal.fire({
      icon: "warning",
      title: "Código vacío",
      text: "Ingresa un código de cupón"
    });
    return;
  }

  try {
    const datos = await clienteApi.solicitarJson("/cupones/validar", {
      method: "POST",
      body: JSON.stringify({ codigo })
    });

    const cuponData = datos.cupon || datos;

    estadoCarrito.cupon = {
      codigo: cuponData.codigo || codigo,
      descuento: cuponData.porcentaje_descuento || 0
    };
    estadoCarrito.descuento = estadoCarrito.cupon.descuento;
    estadoCarrito.totalConDescuento = estadoCarrito.total - (estadoCarrito.total * estadoCarrito.descuento / 100);

    renderizarCarrito();

    Swal.fire({
      icon: "success",
      title: "Cupón aplicado",
      text: `Descuento del ${estadoCarrito.descuento}% aplicado correctamente`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: "Cupón inválido",
      text: error.datos?.message || error.message || "El código ingresado no es válido"
    });
  }
}

function removerCupon() {
  estadoCarrito.cupon = null;
  estadoCarrito.descuento = 0;
  estadoCarrito.totalConDescuento = 0;
  renderizarCarrito();
}

async function actualizarCantidad(productoId, cantidad) {
  try {
    await clienteApi.solicitarJson("/carrito/actualizar", {
      method: "PUT",
      body: JSON.stringify({ producto_id: productoId, cantidad })
    });

    await cargarCarrito();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo actualizar la cantidad");
  }
}

async function eliminarItem(productoId) {
  const item = estadoCarrito.items.find((i) => i.producto_id === productoId);
  if (!item) return;

  const confirmacion = await Swal.fire({
    title: "Eliminar producto",
    text: `¿Quitar "${item.nombre}" del carrito?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!confirmacion.isConfirmed) return;

  try {
    await clienteApi.solicitarJson(`/carrito/eliminar/${productoId}`, {
      method: "DELETE"
    });

    await cargarCarrito();

    Swal.fire({
      icon: "success",
      title: "Producto eliminado",
      timer: 1000,
      showConfirmButton: false
    });
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo eliminar el producto");
  }
}

async function vaciarCarrito() {
  if (estadoCarrito.items.length === 0) return;

  const confirmacion = await Swal.fire({
    title: "Vaciar carrito",
    text: "¿Eliminar todos los productos del carrito?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Vaciar",
    cancelButtonText: "Cancelar"
  });

  if (!confirmacion.isConfirmed) return;

  try {
    await clienteApi.solicitarJson("/carrito/vaciar", {
      method: "DELETE"
    });

    await cargarCarrito();

    Swal.fire({
      icon: "info",
      title: "Carrito vaciado",
      timer: 1200,
      showConfirmButton: false
    });
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo vaciar el carrito");
  }
}

async function procederAlPago() {
  if (estadoCarrito.items.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Carrito vacío",
      text: "Agrega productos antes de pagar"
    });
    return;
  }

  const totalAPagar = estadoCarrito.cupon ? estadoCarrito.totalConDescuento : estadoCarrito.total;

  Swal.fire({
    title: "Confirmar compra",
    html: `
      <p style="margin-bottom:8px;">Vas a comprar <strong>${estadoCarrito.cantidadItems}</strong> producto(s)</p>
      ${estadoCarrito.cupon ? `<p style="margin-bottom:4px; color:#34d399;">Cupón ${escaparHtml(estadoCarrito.cupon.codigo)} (${estadoCarrito.descuento}% OFF)</p>` : ""}
      <p style="font-size:24px; font-weight:700;">${formatearMoneda(totalAPagar)}</p>
    `,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "Confirmar pago",
    cancelButtonText: "Cancelar"
  }).then(async (resultado) => {
    if (!resultado.isConfirmed) return;

    try {
      mostrarCargando(true);

      const bodyCheckout = {
        items: estadoCarrito.items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio: obtenerPrecioItem(item)
        }))
      };

      if (estadoCarrito.cupon) {
        bodyCheckout.cupon = estadoCarrito.cupon.codigo;
      }

      const datos = await clienteApi.solicitarJson("/checkout", {
        method: "POST",
        body: JSON.stringify(bodyCheckout)
      });

      Swal.fire({
        icon: "success",
        title: "Compra realizada",
        text: datos.message || "Tu pedido ha sido procesado exitosamente",
        timer: 2000,
        showConfirmButton: false
      });

      estadoCarrito.items = [];
      estadoCarrito.cantidadItems = 0;
      estadoCarrito.total = 0;
      renderizarCarrito();
    } catch (error) {
      mostrarErrorServidor(error, "No se pudo procesar el pago");
    } finally {
      mostrarCargando(false);
    }
  });
}

async function cargarCarrito() {
  mostrarCargando(true);

  try {
    const datos = await clienteApi.solicitarJson("/carrito", {
      method: "GET"
    });

    estadoCarrito.carritoId = datos.carritoId || null;
    estadoCarrito.items = Array.isArray(datos.items) ? datos.items : [];
    estadoCarrito.cantidadItems = datos.cantidad_items || 0;
    estadoCarrito.total = datos.total || 0;

    if (estadoCarrito.cupon) {
      estadoCarrito.totalConDescuento = estadoCarrito.total - (estadoCarrito.total * estadoCarrito.descuento / 100);
    }

    if (estadoCarrito.items.length === 0) {
      await poblarCarritoPorDefecto();
      return;
    }

    renderizarCarrito();
  } catch (error) {
    if (error.status === 404) {
      await poblarCarritoPorDefecto();
      return;
    }

    if (error.status === 401) {
      mostrarErrorServidor(error, "Tu sesión ha expirado. Inicia sesión nuevamente.");
      return;
    }

    mostrarErrorServidor(error, "No se pudo cargar el carrito");
    if (elementos.contenedor) {
      elementos.contenedor.innerHTML = `
        <div class="carrito-vacio">
          <i class="bx bx-error-circle"></i>
          <h2>Error al cargar el carrito</h2>
          <p>${escaparHtml(error.message || "Intenta de nuevo más tarde")}</p>
          <button class="btn-reintentar" id="btnReintentar">
            <i class="bx bx-refresh"></i> Reintentar
          </button>
        </div>
      `;

      document.getElementById("btnReintentar")?.addEventListener("click", cargarCarrito);
    }
  } finally {
    mostrarCargando(false);
  }
}

async function poblarCarritoPorDefecto() {
  try {
    const productos = await clienteApi.solicitarJson("/productos", {
      method: "GET"
    });

    const listaProductos = Array.isArray(productos) ? productos : (Array.isArray(productos.productos) ? productos.productos : []);

    if (listaProductos.length === 0) {
      renderizarCarrito();
      return;
    }

    for (const producto of listaProductos) {
      if ((producto.stock ?? 0) <= 0) continue;

      try {
        await clienteApi.solicitarJson("/carrito/agregar", {
          method: "POST",
          body: JSON.stringify({ producto_id: producto.id, cantidad: 1 })
        });
      } catch (err) {
        console.error("Error al agregar producto", producto.id, err);
      }
    }

    const datos = await clienteApi.solicitarJson("/carrito", {
      method: "GET"
    });

    estadoCarrito.carritoId = datos.carritoId || null;
    estadoCarrito.items = Array.isArray(datos.items) ? datos.items : [];
    estadoCarrito.cantidadItems = datos.cantidad_items || 0;
    estadoCarrito.total = datos.total || 0;

    renderizarCarrito();
  } catch (error) {
    console.error("No se pudieron cargar los productos del backend:", error);
    renderizarCarrito();
  }
}

cargarCarrito();
