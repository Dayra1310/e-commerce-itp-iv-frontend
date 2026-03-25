// Dashboard JavaScript - Manejo del sidebar colapsable y autenticación
document.addEventListener('DOMContentLoaded', function() {
    // Función para verificar autenticación
    function verificarAutenticacion() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = './login.html';
            return false;
        }

        // Verificar expiración del token
        const tokenExpira = localStorage.getItem('token_expira');
        if (tokenExpira && Date.now() > parseInt(tokenExpira)) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            localStorage.removeItem('token_expira');
            window.location.href = './login.html';
            return false;
        }

        return true;
    }

    // Verificar autenticación al cargar
    if (!verificarAutenticacion()) return;

    // Elementos del DOM
    const sidebar = document.querySelector('.barra-lateral');
    const menuItems = document.querySelectorAll('.menu-navegacion li');
    const logoutBtn = document.querySelector('.cerrar-sesion button');
    const menuIndicator = document.querySelector('.indicador-menu');

    // Manejar clics en elementos del menú
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remover clase activo de todos los items
            menuItems.forEach(i => i.classList.remove('activo'));
            // Agregar clase activo al item clickeado
            this.classList.add('activo');

            // Aquí puedes agregar navegación a diferentes secciones
            console.log('Navegando a:', this.textContent.trim());
        });
    });

    // Manejar cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            localStorage.removeItem('token_expira');
            window.location.href = './login.html';
        });
    }

    // Efectos visuales adicionales para el sidebar
    if (sidebar) {
        sidebar.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(0)';
        });

        sidebar.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    }
});