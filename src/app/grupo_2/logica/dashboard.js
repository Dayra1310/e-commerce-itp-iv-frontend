// dashboard.js - Manejo del sidebar colapsable y autenticación
import { peticionAutenticada, cerrarSesion, verificarAutenticacion, verSesionesActivas, cerrarSesionEspecifica } from './login-front.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación
    if (!verificarAutenticacion()) return;

    // Cargar datos del dashboard
    await cargarDatosDashboard();
    
    // Cargar sesiones activas
    await cargarSesionesActivas();

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
        });
    });

    // Manejar cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesion();
        });
    }
});

// Función para cargar datos del dashboard
async function cargarDatosDashboard() {
    try {
        const respuesta = await peticionAutenticada("/api/dashboard");
        
        if (respuesta) {
            const data = await respuesta.json();
            
            if (data.success) {
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