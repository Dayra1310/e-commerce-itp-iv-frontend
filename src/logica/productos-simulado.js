// productos-simulado.js - Simulación sencilla de productos para página de productos

// Datos simulados de productos
const productosSimulados = [
    { id: 1, nombre: "Tablero Acrílico 120x80", cantidad: 50, material: "Acrílico", precio: 15000 },
    { id: 2, nombre: "Pizarrón Blanco 90x60", cantidad: 30, material: "Melamina", precio: 12000 },
    { id: 3, nombre: "Tablero Magnético", cantidad: 20, material: "Metal", precio: 18000 },
    { id: 4, nombre: "Tablero con Marco Aluminio", cantidad: 15, material: "Aluminio", precio: 25000 },
    { id: 5, nombre: "Pizarrón Verde 100x70", cantidad: 25, material: "Corcho", precio: 10000 },
    { id: 6, nombre: "Tablero Digital Interactivo", cantidad: 8, material: "Táctil", precio: 85000 },
    { id: 7, nombre: "Pizarrón Móvil con Ruedas", cantidad: 12, material: "Melamina", precio: 35000 },
    { id: 8, nombre: "Tablero Cork 80x60", cantidad: 18, material: "Corcho", precio: 22000 },
    { id: 9, nombre: "Pizarrón Negro 120x90", cantidad: 22, material: "Vidrio", precio: 28000 },
    { id: 10, nombre: "Tablero Flipchart", cantidad: 35, material: "Papel", precio: 8000 },
    { id: 11, nombre: "Pizarrón Proyector 150x100", cantidad: 6, material: "Proyección", precio: 45000 },
    { id: 12, nombre: "Tablero Magnético Grande", cantidad: 14, material: "Metal", precio: 32000 },
    { id: 13, nombre: "Pizarrón Ecológico", cantidad: 28, material: "Bambú", precio: 19000 },
    { id: 14, nombre: "Tablero Acrílico Transparente", cantidad: 9, material: "Acrílico", precio: 27000 }
];

// Variables globales
let productosOriginales = [...productosSimulados];
let productosFiltrados = [...productosSimulados];

document.addEventListener('DOMContentLoaded', function() {
    console.log("Cargando productos simulados...");

    // Simular verificación de autenticación
    if (!verificarAutenticacionSimulado()) {
        return;
    }

    // Elementos del DOM
    const dashboardLink = document.querySelector('a[href="dashboard.html"]');
    const logoutBtn = document.querySelector('.cerrar-sesion button');
    const btnConfiguracion = document.querySelector('#btn-configuracion');
    const panelConfiguracion = document.querySelector('#panel-configuracion');
    const cerrarPanel = document.querySelector('#cerrar-panel');
    const inputModoOscuro = document.querySelector('#modo-oscuro');
    const inputFotoPerfil = document.querySelector('#foto-perfil');
    const btnAplicarFiltro = document.querySelector('#btn-aplicar-filtro');
    const btnLimpiarFiltro = document.querySelector('#btn-limpiar-filtro');
    const filtroOrden = document.querySelector('#filtro-orden');
    const inputBuscar = document.querySelector('#buscar-productos');

    // Manejar clic al Dashboard
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'dashboard.html';
        });
    }

    // Cargar productos simulados
    cargarProductosSimulados();

    // Manejar cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesionSimulado();
        });
    }

    // ========== LÓGICA DEL PANEL DE CONFIGURACIÓN ==========
    if (btnConfiguracion && panelConfiguracion) {
        btnConfiguracion.addEventListener('click', function(e) {
            e.preventDefault();
            panelConfiguracion.classList.add('show');
            const modoGuardado = localStorage.getItem('modoOscuro') === 'true';
            inputModoOscuro.checked = modoGuardado;
        });
    }

    if (cerrarPanel && panelConfiguracion) {
        cerrarPanel.addEventListener('click', function(e) {
            e.preventDefault();
            panelConfiguracion.classList.remove('show');
        });
    }

    if (panelConfiguracion) {
        panelConfiguracion.addEventListener('click', function(e) {
            if (e.target === panelConfiguracion) {
                panelConfiguracion.classList.remove('show');
            }
        });
    }

    if (inputModoOscuro) {
        inputModoOscuro.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('modo-oscuro');
                localStorage.setItem('modoOscuro', 'true');
            } else {
                document.body.classList.remove('modo-oscuro');
                localStorage.setItem('modoOscuro', 'false');
            }
        });
    }

    if (inputFotoPerfil) {
        inputFotoPerfil.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgPerfil = document.querySelector('.perfil-usuario img');
                    if (imgPerfil) {
                        imgPerfil.src = e.target.result;
                        localStorage.setItem('fotoPerfil', e.target.result);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ========== LÓGICA DE FILTRADO Y BÚSQUEDA ==========
    if (inputBuscar) {
        inputBuscar.addEventListener('input', function() {
            const terminoBusqueda = this.value.toLowerCase().trim();
            buscarProductosSimulado(terminoBusqueda);
        });
    }

    if (btnAplicarFiltro) {
        btnAplicarFiltro.addEventListener('click', function() {
            const criterio = filtroOrden.value;
            const productosOrdenados = bubbleSort([...productosFiltrados], criterio);
            renderizarProductosSimulado(productosOrdenados);
        });
    }

    if (btnLimpiarFiltro) {
        btnLimpiarFiltro.addEventListener('click', function() {
            filtroOrden.selectedIndex = 0;
            inputBuscar.value = '';
            productosFiltrados = [...productosOriginales];
            renderizarProductosSimulado(productosOriginales);
        });
    }
});

// Función simulada de verificación de autenticación
function verificarAutenticacionSimulado() {
    return true;
}

// Función simulada de cerrar sesión
function cerrarSesionSimulado() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("usuario");
    localStorage.removeItem("token_expira");
    localStorage.removeItem("modoOscuro");
    localStorage.removeItem("fotoPerfil");
    window.location.href = "login.html";
}

// Función para cargar productos simulados
function cargarProductosSimulados() {
    renderizarProductosSimulado(productosOriginales);
    console.log("✅ Productos simulados cargados correctamente:", productosOriginales.length, "productos");
}

// Función para renderizar productos en la tabla
function renderizarProductosSimulado(productos) {
    const tbody = document.querySelector('#productos-table tbody');
    if (!tbody) {
        console.error('❌ No se encontró el tbody de la tabla');
        return;
    }

    tbody.innerHTML = '';

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No se encontraron productos</td></tr>';
    } else {
        productos.forEach(producto => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${producto.id}</td>
                <td>${producto.nombre}</td>
                <td>${producto.cantidad}</td>
                <td>${producto.material}</td>
                <td>$${producto.precio.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    actualizarContadorProductosSimulado(productos.length);
    console.log(`✅ Renderizados ${productos.length} productos`);
}

// Función para actualizar el contador de productos
function actualizarContadorProductosSimulado(cantidadMostrados) {
    const contador = document.getElementById('productos-count');
    if (contador) {
        contador.textContent = cantidadMostrados;
    }
}

// Función para buscar productos
function buscarProductosSimulado(termino) {
    if (!termino) {
        productosFiltrados = [...productosOriginales];
    } else {
        productosFiltrados = productosOriginales.filter(producto => {
            return producto.nombre.toLowerCase().includes(termino) ||
                   producto.material.toLowerCase().includes(termino) ||
                   producto.id.toString().includes(termino) ||
                   producto.cantidad.toString().includes(termino) ||
                   producto.precio.toString().includes(termino);
        });
    }

    renderizarProductosSimulado(productosFiltrados);
}

// Algoritmo de Bubble Sort optimizado
function bubbleSort(arr, criterio) {
    const n = arr.length;
    let swapped;

    do {
        swapped = false;
        for (let i = 0; i < n - 1; i++) {
            let a = arr[i][criterio];
            let b = arr[i + 1][criterio];

            if (typeof a === 'string') a = a.toLowerCase();
            if (typeof b === 'string') b = b.toLowerCase();

            const esDescendente = criterio.includes('-desc');
            const criterioReal = esDescendente ? criterio.replace('-desc', '') : criterio;

            a = arr[i][criterioReal];
            b = arr[i + 1][criterioReal];

            if (typeof a === 'string') a = a.toLowerCase();
            if (typeof b === 'string') b = b.toLowerCase();

            let debeIntercambiar = false;

            if (esDescendente) {
                debeIntercambiar = a < b;
            } else {
                debeIntercambiar = a > b;
            }

            if (debeIntercambiar) {
                [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                swapped = true;
            }
        }
    } while (swapped);

    return arr;
}