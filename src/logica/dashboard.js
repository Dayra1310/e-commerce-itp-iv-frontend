// dashboard.js - Manejo del sidebar colapsable y autenticación
import { peticionAutenticada, cerrarSesion, verificarAutenticacion, verSesionesActivas, cerrarSesionEspecifica } from './login-front.js';
import { getDashboardData, getProductos } from './api.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación
    if (!verificarAutenticacion()) return;

    // Cargar datos del dashboard
    await cargarDatosDashboard();
    
    // Cargar productos para las tarjetas
    await cargarProductosDashboard();
    
    // Cargar sesiones activas
    await cargarSesionesActivas();

    // Elementos del DOM
    const sidebar = document.querySelector('.barra-lateral');
    const menuItems = document.querySelectorAll('.menu-navegacion li');
    const logoutBtn = document.querySelector('.cerrar-sesion button');

    // Manejar clics en elementos del menú
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover activo de todos
            menuItems.forEach(i => i.classList.remove('activo'));
            this.classList.add('activo');

            // Verificar si tiene enlace asociado
            const link = this.dataset.link;
            if (link) {
                window.location.href = link;
                return;
            }

            const seccion = this.dataset.seccion;
            console.log('Sección seleccionada:', seccion);
        });
    });

    // Manejar cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesion();
        });
    }

    // ========== LÓGICA DEL PANEL DE CONFIGURACIÓN ==========
    const btnConfiguracion = document.querySelector('#btn-configuracion');
    const panelConfiguracion = document.querySelector('#panel-configuracion');
    const cerrarPanel = document.querySelector('#cerrar-panel');
    const inputModoOscuro = document.querySelector('#modo-oscuro');
    const inputFotoPerfil = document.querySelector('#foto-perfil');

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
});

// Función para cargar datos del dashboard
async function cargarDatosDashboard() {
    try {
        const data = await getDashboardData();

        if (data) {
            actualizarMetricas(data.metricas);
            actualizarProductosMasVendidos(data.productosMasVendidos);

            const nombreUsuario = document.querySelector('.perfil-usuario h3');
            if (nombreUsuario && data.usuario) {
                nombreUsuario.textContent = data.usuario.email;
            }

            // Mostrar info de sesiones en el perfil
            const infoSesiones = document.querySelector('.perfil-usuario p');
            if (infoSesiones && data.sesiones_activas !== undefined) {
                infoSesiones.innerHTML = `${data.sesiones_activas}/${data.limite_sesiones} sesiones activas`;
            }
        }
    } catch (error) {
        console.error("Error al cargar dashboard:", error);
    }
}

// Función para cargar sesiones activas
async function cargarSesionesActivas() {
    try {
        const sesiones = await verSesionesActivas();
        if (sesiones && sesiones.success) {
            console.log(`Sesiones activas: ${sesiones.total}/${sesiones.limite}`);
            
            // Crear panel de sesiones si no existe
            crearPanelSesiones(sesiones);
        }
    } catch (error) {
        console.error("Error al cargar sesiones:", error);
    }
}

// Función para crear panel de sesiones activas
function crearPanelSesiones(sesiones) {
    // Verificar si ya existe el panel
    if (document.querySelector('.panel-sesiones')) return;
    
    const filaCentral = document.querySelector('.fila-central');
    if (!filaCentral) return;
    
    const panelSesiones = document.createElement('section');
    panelSesiones.className = 'panel-sesiones';
    panelSesiones.style.cssText = `
        background: white;
        border-radius: 10px;
        padding: 20px;
        margin-top: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    panelSesiones.innerHTML = `
        <h2>📱 Sesiones Activas (${sesiones.total}/${sesiones.limite})</h2>
        <div id="lista-sesiones"></div>
    `;
    
    filaCentral.parentNode.insertBefore(panelSesiones, filaCentral.nextSibling);
    
    actualizarListaSesiones(sesiones.sesiones);
}

// Función para actualizar lista de sesiones
function actualizarListaSesiones(sesionesLista) {
    const container = document.getElementById('lista-sesiones');
    if (!container) return;
    
    if (!sesionesLista || sesionesLista.length === 0) {
        container.innerHTML = '<p>No hay sesiones activas</p>';
        return;
    }
    
    let html = '<ul style="list-style: none; padding: 0;">';
    sesionesLista.forEach(sesion => {
        const fechaCreacion = new Date(sesion.fecha_creacion).toLocaleString();
        const fechaExpiracion = new Date(sesion.fecha_expiracion).toLocaleString();
        
        html += `
            <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${sesion.dispositivo || "Dispositivo desconocido"}</strong><br>
                    <small>Inicio: ${fechaCreacion}</small><br>
                    <small>Expira: ${fechaExpiracion}</small>
                </div>
                <button onclick="window.cerrarSesionEspecifica(${sesion.id})" 
                        style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                    Cerrar
                </button>
            </li>
        `;
    });
    html += '</ul>';
    
    html += `
        <div style="margin-top: 15px; text-align: center;">
            <button id="btnCerrarTodasSesiones" style="background: #ff6666; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                Cerrar todas las demás sesiones
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Agregar evento para cerrar todas las sesiones
    document.getElementById('btnCerrarTodasSesiones')?.addEventListener('click', async () => {
        const respuesta = await cerrarSesionEspecifica("all");
        if (respuesta && respuesta.success) {
            await cargarSesionesActivas();
            await cargarDatosDashboard();
        }
    });
}

// Exponer función para cerrar sesión específica
window.cerrarSesionEspecifica = async (tokenId) => {
    const respuesta = await cerrarSesionEspecifica(tokenId);
    if (respuesta && respuesta.success) {
        await cargarSesionesActivas();
        await cargarDatosDashboard();
    }
};

function actualizarMetricas(metricas) {
    if (!metricas) return;
    
    const metricasElementos = document.querySelectorAll('.metrica .valor');
    if (metricasElementos.length >= 3) {
        metricasElementos[0].textContent = `$${metricas.ventasMes.toLocaleString()}`;
        metricasElementos[1].textContent = metricas.productosVendidos;
        metricasElementos[2].textContent = metricas.pedidos;
    }
}

function actualizarProductosMasVendidos(productos) {
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

// Función para cargar productos y actualizar tarjetas en dashboard
async function cargarProductosDashboard() {
    try {
        const productos = await getProductos();
        if (productos && productos.length > 0) {
            actualizarTarjetasProductos(productos.slice(0, 4)); // Primeros 4 productos
        }
    } catch (error) {
        console.error("Error cargando productos para dashboard:", error);
    }
}

// Función para actualizar las tarjetas de productos
function actualizarTarjetasProductos(productos) {
    const tarjetasContainer = document.querySelector('.tarjetas-redes');
    if (!tarjetasContainer) return;

    tarjetasContainer.innerHTML = '';

    productos.forEach(producto => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-red';
        tarjeta.innerHTML = `
            <p>${producto.nombre}</p>
            <span class="positivo">+${Math.floor(Math.random() * 20)}%</span>  <!-- Simulado, cambiar por dato real -->
        `;
        tarjetasContainer.appendChild(tarjeta);
    });
}