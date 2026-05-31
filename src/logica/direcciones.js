const estadoDirecciones = {
  lista: [],
  seleccionada: null
};

const elementosDir = {
  contenedor: document.getElementById("contenedorDirecciones"),
  indicadorCarga: document.getElementById("indicadorCarga")
};

if (!window.clienteApi) {
  console.error("No se encontró window.clienteApi. Revisa que configuracion-api.js cargue antes de direcciones.js");
}

function renderizarDirecciones() {
  if (estadoDirecciones.lista.length === 0) {
    elementosDir.contenedor.innerHTML = `
      <div class="direcciones-vacio">
        <i class="bx bx-map-alt"></i>
        <h2>No tienes direcciones guardadas</h2>
        <p>Agrega una dirección para continuar con la compra.</p>
        <button class="btn-agregar-direccion" id="btnAgregarDireccion">
          <i class="bx bx-plus"></i> Agregar dirección
        </button>
      </div>
    `;
    document.getElementById("btnAgregarDireccion")?.addEventListener("click", agregarDireccion);
    return;
  }

  elementosDir.contenedor.innerHTML = `
    <div class="direcciones-header">
      <h2>Selecciona una dirección de envío</h2>
      <button class="btn-agregar-direccion" id="btnAgregarDireccion">
        <i class="bx bx-plus"></i> Agregar nueva
      </button>
    </div>

    <div class="lista-direcciones">
      ${estadoDirecciones.lista.map((dir) => {
        const seleccionada = estadoDirecciones.seleccionada?.id === dir.id;
        return `
          <div class="direccion-card${seleccionada ? " seleccionada" : ""}" data-id="${dir.id}">
            <div class="direccion-select">
              <input type="radio" name="direccion" value="${dir.id}" ${seleccionada ? "checked" : ""} id="dir-${dir.id}">
            </div>
            <div class="direccion-info">
              <p class="direccion-texto">${escaparHtml(dir.direccion)}</p>
              ${dir.ciudad ? `<p class="direccion-ciudad">${escaparHtml(dir.ciudad)}</p>` : ""}
              ${dir.departamento ? `<p class="direccion-pais">${escaparHtml(dir.departamento)}</p>` : ""}
            </div>
            <div class="direccion-acciones">
              <button class="btn-editar-dir" data-id="${dir.id}" title="Editar">
                <i class="bx bx-edit"></i>
              </button>
              <button class="btn-eliminar-dir" data-id="${dir.id}" title="Eliminar">
                <i class="bx bx-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div class="direcciones-footer">
      <button class="btn-pagar" id="btnPagar" ${!estadoDirecciones.seleccionada ? "disabled" : ""}>
        <i class="bx bx-credit-card"></i> Proceder al pago
      </button>
    </div>
  `;

  configurarEventosDirecciones();
}

function configurarEventosDirecciones() {
  document.querySelectorAll('input[name="direccion"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const id = Number(e.target.value);
      estadoDirecciones.seleccionada = estadoDirecciones.lista.find((d) => d.id === id) || null;
      renderizarDirecciones();
    });
  });

  document.querySelectorAll(".direccion-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".direccion-acciones")) return;
      const id = Number(card.dataset.id);
      estadoDirecciones.seleccionada = estadoDirecciones.lista.find((d) => d.id === id) || null;
      renderizarDirecciones();
    });
  });

  document.getElementById("btnAgregarDireccion")?.addEventListener("click", agregarDireccion);

  document.querySelectorAll(".btn-editar-dir").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      editarDireccion(Number(btn.dataset.id));
    });
  });

  document.querySelectorAll(".btn-eliminar-dir").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      eliminarDireccion(Number(btn.dataset.id));
    });
  });

  const btnPagar = document.getElementById("btnPagar");
  if (btnPagar) {
    btnPagar.addEventListener("click", procederAlPago);
  }
}

function mostrarFormularioDireccion(titulo, datosExistentes = null) {
  const editar = !!datosExistentes;

  return Swal.fire({
    title: titulo,
    html: `
      <div class="form-direccion">
        <input id="swal-direccion" class="swal2-input" placeholder="Dirección *" value="${escaparHtml(datosExistentes?.direccion || "")}">
        <input id="swal-departamento" class="swal2-input" placeholder="Departamento" value="${escaparHtml(datosExistentes?.departamento || "")}">
        <input id="swal-ciudad" class="swal2-input" placeholder="Ciudad" value="${escaparHtml(datosExistentes?.ciudad || "")}">
      </div>
    `,
    confirmButtonText: editar ? "Guardar" : "Agregar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    focusConfirm: false,
    preConfirm: () => {
      const direccion = document.getElementById("swal-direccion").value.trim();
      if (!direccion) {
        Swal.showValidationMessage("La dirección es obligatoria");
        return false;
      }
      return {
        direccion,
        ciudad: document.getElementById("swal-ciudad").value.trim(),
        departamento: document.getElementById("swal-departamento").value.trim()
      };
    }
  });
}

async function agregarDireccion() {
  const result = await mostrarFormularioDireccion("Agregar dirección");

  if (!result.isConfirmed || !result.value) return;

  try {
    await clienteApi.solicitarJson("/direcciones", {
      method: "POST",
      body: JSON.stringify(result.value)
    });

    Swal.fire({
      icon: "success",
      title: "Dirección agregada",
      timer: 1200,
      showConfirmButton: false
    });

    await cargarDirecciones();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo agregar la dirección");
  }
}

async function editarDireccion(id) {
  const datosExistentes = estadoDirecciones.lista.find((d) => d.id === id);
  if (!datosExistentes) return;

  const result = await mostrarFormularioDireccion("Editar dirección", datosExistentes);

  if (!result.isConfirmed || !result.value) return;

  try {
    await clienteApi.solicitarJson(`/direcciones/${id}`, {
      method: "PUT",
      body: JSON.stringify(result.value)
    });

    Swal.fire({
      icon: "success",
      title: "Dirección actualizada",
      timer: 1200,
      showConfirmButton: false
    });

    await cargarDirecciones();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo actualizar la dirección");
  }
}

async function eliminarDireccion(id) {
  const confirmacion = await Swal.fire({
    title: "Eliminar dirección",
    text: "¿Estás seguro de eliminar esta dirección?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!confirmacion.isConfirmed) return;

  try {
    await clienteApi.solicitarJson(`/direcciones/${id}`, {
      method: "DELETE"
    });

    if (estadoDirecciones.seleccionada?.id === id) {
      estadoDirecciones.seleccionada = null;
    }

    Swal.fire({
      icon: "success",
      title: "Dirección eliminada",
      timer: 1200,
      showConfirmButton: false
    });

    await cargarDirecciones();
  } catch (error) {
    mostrarErrorServidor(error, "No se pudo eliminar la dirección");
  }
}

function obtenerTotalCarrito() {
  if (typeof estadoCarrito !== "undefined" && estadoCarrito) {
    return estadoCarrito.cupon ? estadoCarrito.totalConDescuento : estadoCarrito.total;
  }
  return 0;
}

async function procederAlPago() {
  if (!estadoDirecciones.seleccionada) {
    Swal.fire({
      icon: "warning",
      title: "Selecciona una dirección",
      text: "Debes elegir una dirección de envío"
    });
    return;
  }

  if (typeof estadoCarrito === "undefined" || estadoCarrito.items.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Carrito vacío",
      text: "No hay productos para pagar"
    });
    return;
  }

  const totalAPagar = estadoCarrito.cupon ? estadoCarrito.totalConDescuento : estadoCarrito.total;

  Swal.fire({
    title: "Confirmar compra",
    html: `
      <p style="margin-bottom:8px;">Vas a comprar <strong>${estadoCarrito.cantidadItems}</strong> producto(s)</p>
      ${estadoCarrito.cupon ? `<p style="margin-bottom:4px; color:#34d399;">Cupón ${escaparHtml(estadoCarrito.cupon.codigo)} (${estadoCarrito.descuento}% OFF)</p>` : ""}
      <p style="margin-bottom:8px;">Enviar a: <strong>${escaparHtml(estadoDirecciones.seleccionada.direccion)}</strong></p>
      <p style="font-size:24px; font-weight:700;">${formatearMoneda(totalAPagar)}</p>
    `,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "Ir a pagar",
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
        })),
        direccion_id: estadoDirecciones.seleccionada.id
      };

      if (estadoCarrito.cupon) {
        bodyCheckout.cupon = estadoCarrito.cupon.codigo;
      }

      const checkoutRes = await clienteApi.solicitarJson("/checkout", {
        method: "POST",
        body: JSON.stringify(bodyCheckout)
      });

      const pedidoId = checkoutRes.pedidoId;
      if (!pedidoId) {
        throw new Error("No se obtuvo el ID del pedido");
      }

      const pagosRes = await clienteApi.solicitarJson("/pagos/crear", {
        method: "POST",
        body: JSON.stringify({ pedido_id: pedidoId })
      });

      const tx = pagosRes.transaccion;
      if (!tx) {
        throw new Error("No se obtuvieron datos de la transacción");
      }

      mostrarCargando(false);

      try {
        localStorage.setItem("ECOMMERCE_PEDIDO_ID", String(pedidoId));
      } catch (e) { /* ignore */ }

      const handler = ePayco.checkout.configure({
        key: tx.public_key,
        test: true
      });

      handler.open({
        name: `Pedido #${pedidoId}`,
        description: `E-Commerce ITP IV - Pedido #${pedidoId}`,
        invoice: tx.ref,
        currency: "cop",
        amount: tx.amount,
        tax_base: "0",
        tax: "0",
        country: "co",
        lang: "es",
        external: "true",
        signature: tx.signature,
        confirmation: clienteApi.construirUrl("/pagos/confirmar"),
        response: `${window.location.origin}/src/page/pago-exitoso.html`
      });

      estadoCarrito.items = [];
      estadoCarrito.cantidadItems = 0;
      estadoCarrito.total = 0;
      estadoCarrito.cupon = null;
      estadoCarrito.descuento = 0;
      estadoCarrito.totalConDescuento = 0;
    } catch (error) {
      mostrarCargando(false);
      mostrarErrorServidor(error, "No se pudo procesar el pago");
    }
  });
}

async function cargarDirecciones() {
  mostrarCargando(true);

  try {
    const datos = await clienteApi.solicitarJson("/direcciones", {
      method: "GET"
    });

    estadoDirecciones.lista = Array.isArray(datos.direcciones) ? datos.direcciones : [];

    if (estadoDirecciones.lista.length > 0 && !estadoDirecciones.seleccionada) {
      estadoDirecciones.seleccionada = estadoDirecciones.lista[0];
    } else if (estadoDirecciones.seleccionada) {
      const aunExiste = estadoDirecciones.lista.find((d) => d.id === estadoDirecciones.seleccionada.id);
      if (!aunExiste) {
        estadoDirecciones.seleccionada = estadoDirecciones.lista[0] || null;
      }
    }

    renderizarDirecciones();
  } catch (error) {
    if (error.status === 404) {
      estadoDirecciones.lista = [];
      renderizarDirecciones();
      return;
    }

    if (error.status === 401) {
      mostrarErrorServidor(error, "Tu sesión ha expirado. Inicia sesión nuevamente.");
      return;
    }

    mostrarErrorServidor(error, "No se pudieron cargar las direcciones");
    elementosDir.contenedor.innerHTML = `
      <div class="direcciones-vacio">
        <i class="bx bx-error-circle"></i>
        <h2>Error al cargar direcciones</h2>
        <p>${escaparHtml(error.message || "Intenta de nuevo más tarde")}</p>
        <button class="btn-reintentar" id="btnReintentar">
          <i class="bx bx-refresh"></i> Reintentar
        </button>
      </div>
    `;

    document.getElementById("btnReintentar")?.addEventListener("click", cargarDirecciones);
  } finally {
    mostrarCargando(false);
  }
}

cargarDirecciones();
