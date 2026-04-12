// dashboard-simulado.js - Simulación sencilla de datos para dashboard sin backend

document.addEventListener('DOMContentLoaded', function() {
    console.log("Cargando dashboard simulado...");

    // Simular verificación de autenticación (siempre pasa)
    if (!verificarAutenticacionSimulado()) {
        return; // No debería pasar
    }

    // Cargar datos simulados
    cargarDatosDashboardSimulado();

    // Elementos del DOM
    const sidebar = document.querySelector('.barra-lateral');
    const menuItems = document.querySelectorAll('.menu-navegacion li');
    const logoutBtn = document.querySelector('.cerrar-sesion button');

    // Manejar clics en elementos del menú
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('activo'));
            this.classList.add('activo');

            const seccion = this.textContent.trim();
            if (seccion === 'Productos') {
                window.location.href = 'productos.html';
            }
            // Agregar más secciones si es necesario
        });
    });

    // Manejar cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesionSimulado();
        });
    }

    // ========== LÓGICA DEL SIDEBAR (simplificada) ==========
    // Aquí puedes agregar lógica para expandir/colapsar sidebar si es necesario

    // ========== LÓGICA DEL PANEL DE CONFIGURACIÓN (simplificada) ==========
    const btnConfiguracion = document.querySelector('#btn-configuracion');
    const panelConfiguracion = document.querySelector('#panel-configuracion');
    const cerrarPanel = document.querySelector('#cerrar-panel');
    const inputModoOscuro = document.querySelector('#modo-oscuro');

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
});

// Función simulada de verificación de autenticación
function verificarAutenticacionSimulado() {
    // Simular que siempre está autenticado
    return true;
}

// Función simulada de cerrar sesión
function cerrarSesionSimulado() {
    // Limpiar localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("usuario");
    localStorage.removeItem("token_expira");
    localStorage.removeItem("modoOscuro");
    localStorage.removeItem("fotoPerfil");

    // Redirigir a login
    window.location.href = "login.html";
}

// Función para cargar datos simulados del dashboard
async function cargarDatosDashboardSimulado() {
    // Datos simulados base
    const datosSimulados = {
        metricas: {
            ventasMes: 125000,
            productosVendidos: 450,
            pedidos: 89
        },
        usuario: { email: "admin@tableroscorp.com" },
        sesiones_activas: 2,
        limite_sesiones: 5
    };

    // Actualizar métricas
    actualizarMetricasSimulado(datosSimulados.metricas);

    // Cargar productos más vendidos desde JSON para el gráfico polar
    const productosMasVendidos = await obtenerProductosMasVendidosEjemplo();

    // Actualizar perfil de usuario
    const nombreUsuario = document.querySelector('.perfil-usuario h3');
    if (nombreUsuario && datosSimulados.usuario) {
        nombreUsuario.textContent = datosSimulados.usuario.email;
    }

    const infoSesiones = document.querySelector('.perfil-usuario p');
    if (infoSesiones) {
        infoSesiones.innerHTML = `${datosSimulados.sesiones_activas}/${datosSimulados.limite_sesiones} sesiones activas`;
    }

    // Actualizar tarjetas de productos
    cargarProductosDashboardSimulado();

    // Crear gráfico de ventas por semana
    crearGraficoVentas();

    // Crear gráfico polar de productos más vendidos
    crearGraficoProductosMasVendidos(productosMasVendidos);

    console.log("✅ Datos simulados cargados correctamente");
}

// Función para actualizar métricas
function actualizarMetricasSimulado(metricas) {
    if (!metricas) return;

    const metricasElementos = document.querySelectorAll('.metrica .valor');
    if (metricasElementos.length >= 3) {
        metricasElementos[0].textContent = `$${metricas.ventasMes.toLocaleString()}`;
        metricasElementos[1].textContent = metricas.productosVendidos;
        metricasElementos[2].textContent = metricas.pedidos;
    }
}

// Función para actualizar productos más vendidos
function actualizarProductosMasVendidosSimulado(productos) {
    if (!productos || !productos.length) return;

    const listaInterpretes = document.querySelector('.lista-interpretes');
    if (listaInterpretes) {
        listaInterpretes.innerHTML = '';
        productos.forEach(producto => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${producto.nombre}</span>
                <span>${producto.ventas} ventas</span>
            `;
            listaInterpretes.appendChild(li);
        });
    }
}

// Función para obtener productos más vendidos desde JSON de ejemplo
async function obtenerProductosMasVendidosEjemplo() {
    try {
        const response = await fetch('../metricasEjemplo/productosMasVendidos.json');
        if (response.ok) {
            const productos = await response.json();
            return Array.isArray(productos) ? productos : [];
        }
    } catch (error) {
        console.warn('No se pudo cargar productosMasVendidos JSON:', error);
    }

    // Fallback ligero si no hay JSON
    return [];
}

// Función para cargar productos simulados para tarjetas
function cargarProductosDashboardSimulado() {
    const productosSimulados = [
        { nombre: "Tablero Acrílico 120x80", cambio: "+10%" },
        { nombre: "Pizarrón Blanco 90x60", cambio: "+6%" },
        { nombre: "Tablero Magnético", cambio: "-3%" },
        { nombre: "Tablero con Marco Aluminio", cambio: "+8%" }
    ];

    const tarjetasContainer = document.querySelector('.tarjetas-redes');
    if (!tarjetasContainer) return;

    tarjetasContainer.innerHTML = '';

    productosSimulados.forEach(producto => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-red';
        tarjeta.innerHTML = `
            <p>${producto.nombre}</p>
            <span class="${producto.cambio.startsWith('+') ? 'positivo' : 'negativo'}">${producto.cambio}</span>
        `;
        tarjetasContainer.appendChild(tarjeta);
    });
}

// Función para crear el gráfico de ventas por semana
function crearGraficoVentas() {
    const ctx = document.getElementById('ventasChart');
    if (!ctx) {
        console.error('Canvas para gráfico no encontrado');
        return;
    }

    // Datos simulados de ventas por día de la semana
    const datosVentas = {
        labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        datasets: [{
            label: 'Ventas Diarias ($)',
            data: [12000, 15000, 18000, 14000, 16000, 20000, 19000],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };

    // Configuración del gráfico
    const config = {
        type: 'bar',
        data: datosVentas,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Ventas por Día de la Semana'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    };

    // Crear el gráfico
    new Chart(ctx, config);
}

// Función para crear gráfico polar de productos más vendidos
function crearGraficoProductosMasVendidos(productos) {
    const ctx = document.getElementById('productosPolarChart');
    if (!ctx) {
        console.error('Canvas polar no encontrado');
        return;
    }

    const labels = productos.map(item => item.nombre);
    const data = productos.map(item => item.ventas);
    const backgroundColors = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)'
    ];

    const config = {
        type: 'polarArea',
        data: {
            labels,
            datasets: [{
                label: 'Ventas',
                data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Productos más vendidos (Polar Area)'
                }
            }
        }
    };

    new Chart(ctx, config);
}