// productos.js - Cargar productos desde el backend con autenticación
import { peticionAutenticada, cerrarSesion, verificarAutenticacion } from './login-front.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación
    if (!verificarAutenticacion()) return;

    // Elementos del DOM
    const menuItems = document.querySelectorAll('.menu-navegacion li');
    const logoutBtn = document.querySelector('.cerrar-sesion button');

    // Manejar clics en elementos del menú
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const seccion = this.textContent.trim();
            if (seccion === 'Dashboard') {
                window.location.href = 'dashboard.html';
            } else {
                console.log('Navegando a:', seccion);
            }
        });
    });

    // Cargar productos desde el backend
    await cargarProductos();

    // Manejar cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesion();
        });
    }
});

// Función para cargar productos desde el backend
async function cargarProductos() {
    try {
        // Petición autenticada al backend
        const respuesta = await peticionAutenticada("/api/productos");
        
        if (respuesta) {
            const data = await respuesta.json();
            
            if (data.success && data.productos) {
                const tbody = document.querySelector('#productos-table tbody');
                if (tbody) {
                    tbody.innerHTML = '';
                    data.productos.forEach(producto => {
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
                    console.log("✅ Productos cargados correctamente");
                }
            } else {
                throw new Error("No se pudieron cargar los productos");
            }
        }
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        const tbody = document.querySelector('#productos-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error al cargar productos. Verifica tu conexión.</td></tr>';
        }
    }
}