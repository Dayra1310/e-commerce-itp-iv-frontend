// productos.js - Cargar productos desde la API con autenticación
import { peticionAutenticada, cerrarSesion, verificarAutenticacion } from './login-front.js';
import { getProductos, searchProductos } from './api.js';

// Variable global para almacenar los productos originales
let productosOriginales = [];
let productosFiltrados = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación
    if (!verificarAutenticacion()) return;

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

    // Cargar productos desde el archivo JSON local
    await cargarProductos("./metricasEjemplo/productos.json");

    // Manejar cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesion();
        });
    }

    // ========== LÓGICA DEL PANEL DE CONFIGURACIÓN ==========
    // Mostrar panel de configuración
    if (btnConfiguracion && panelConfiguracion) {
        btnConfiguracion.addEventListener('click', function(e) {
            e.preventDefault();
            panelConfiguracion.classList.add('show');
            // Actualizar estado del checkbox con lo guardado en localStorage
            const modoGuardado = localStorage.getItem('modoOscuro') === 'true';
            inputModoOscuro.checked = modoGuardado;
        });
    }

    // Cerrar panel de configuración
    if (cerrarPanel && panelConfiguracion) {
        cerrarPanel.addEventListener('click', function(e) {
            e.preventDefault();
            panelConfiguracion.classList.remove('show');
        });
    }

    // Cerrar panel al hacer clic en el fondo
    if (panelConfiguracion) {
        panelConfiguracion.addEventListener('click', function(e) {
            if (e.target === panelConfiguracion) {
                panelConfiguracion.classList.remove('show');
            }
        });
    }

    // Manejar modo oscuro
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

    // Manejar cambio de foto de perfil (simulado)
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
    // Búsqueda en tiempo real
    if (inputBuscar) {
        inputBuscar.addEventListener('input', function() {
            const terminoBusqueda = this.value.toLowerCase().trim();
            buscarProductos(terminoBusqueda);
        });
    }

    // Aplicar filtro
    if (btnAplicarFiltro) {
        btnAplicarFiltro.addEventListener('click', function() {
            const criterio = filtroOrden.value;
            const productosOrdenados = bubbleSort([...productosFiltrados], criterio);
            renderizarProductos(productosOrdenados);
        });
    }

    // Limpiar filtro
    if (btnLimpiarFiltro) {
        btnLimpiarFiltro.addEventListener('click', function() {
            filtroOrden.selectedIndex = 0; // Resetear select
            inputBuscar.value = ''; // Limpiar búsqueda
            productosFiltrados = [...productosOriginales]; // Restaurar productos filtrados
            renderizarProductos(productosOriginales);
        });
    }
});

// Función para cargar productos desde la API
async function cargarProductos() {
    try {
        productosOriginales = await getProductos();
        productosFiltrados = [...productosOriginales]; // Copia para filtrado

        // Renderizar productos inicialmente
        renderizarProductos(productosOriginales);

        console.log("✅ Productos cargados correctamente desde API:", productosOriginales.length, "productos");
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        const tbody = document.querySelector('#productos-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error al cargar productos. Verifica tu conexión.</td></tr>';
        }
    }
}

// Función para renderizar productos en la tabla
function renderizarProductos(productos) {
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
    
    // Actualizar contador de productos
    actualizarContadorProductos(productos.length);
    
    console.log(`✅ Renderizados ${productos.length} productos`);
}

// Función para actualizar el contador de productos
function actualizarContadorProductos(cantidadMostrados) {
    const contador = document.getElementById('productos-count');
    if (contador) {
        contador.textContent = cantidadMostrados;
    }
}

// Función para buscar productos (filtrado local por ahora)
function buscarProductos(termino) {
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

    renderizarProductos(productosFiltrados);
}
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
    
    renderizarProductos(productosFiltrados);


// Algoritmo de Bubble Sort optimizado
function bubbleSort(arr, criterio) {
    const n = arr.length;
    let swapped;
    
    do {
        swapped = false;
        for (let i = 0; i < n - 1; i++) {
            let a = arr[i][criterio];
            let b = arr[i + 1][criterio];
            
            // Convertir a string para comparación consistente
            if (typeof a === 'string') a = a.toLowerCase();
            if (typeof b === 'string') b = b.toLowerCase();
            
            // Determinar si es orden descendente
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
                // Intercambiar elementos
                [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                swapped = true;
            }
        }
    } while (swapped);
    
    return arr;
}