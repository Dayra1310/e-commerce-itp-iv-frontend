// login-front.js

const API_URL = "http://localhost:4200";

// Función para obtener información del dispositivo
function obtenerInfoDispositivo() {
    const userAgent = navigator.userAgent;
    let dispositivo = "desconocido";
    
    if (/mobile/i.test(userAgent)) dispositivo = "Móvil";
    else if (/tablet/i.test(userAgent)) dispositivo = "Tablet";
    else if (/windows/i.test(userAgent)) dispositivo = "Windows";
    else if (/mac/i.test(userAgent)) dispositivo = "Mac";
    else if (/linux/i.test(userAgent)) dispositivo = "Linux";
    
    if (/chrome/i.test(userAgent)) dispositivo += " - Chrome";
    else if (/firefox/i.test(userAgent)) dispositivo += " - Firefox";
    else if (/safari/i.test(userAgent)) dispositivo += " - Safari";
    else if (/edge/i.test(userAgent)) dispositivo += " - Edge";
    
    return dispositivo;
}

// Función para verificar si ya hay una sesión activa
export async function verificarSesionExistente() {
    const token = localStorage.getItem("token");
    const tokenExpira = localStorage.getItem("token_expira");
    
    // Verificar si hay token y no ha expirado
    if (token && tokenExpira && Date.now() < parseInt(tokenExpira)) {
        try {
            // Verificar con el backend que el token sigue siendo válido
            const respuesta = await fetch(`${API_URL}/api/verificar`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (respuesta.ok) {
                const data = await respuesta.json();
                if (data.success) {
                    // Token válido, redirigir según rol
                    const rol = localStorage.getItem("rol");
                    console.log("✅ Sesión válida encontrada, redirigiendo...");
                    
                    if (rol === "1") {
                        window.location.href = "../page/dashboard.html";
                    } else if (rol === "2") {
                        window.location.href = "../page/cliente.html";
                    }
                    return true;
                }
            }
        } catch (error) {
            console.log("Error verificando sesión:", error);
        }
    }
    
    // Si llegamos aquí, no hay sesión válida
    console.log("No hay sesión válida, mostrar login");
    return false;
}

// Función para peticiones autenticadas
export async function peticionAutenticada(url, options = {}) {
    const token = localStorage.getItem("token");
    
    if (!token) {
        throw new Error("No hay token de autenticación");
    }

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        "Authorization": `Bearer ${token}`
    };

    const respuesta = await fetch(`${API_URL}${url}`, { 
        ...options, 
        headers 
    });
    
    if (respuesta.status === 401 || respuesta.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("rol");
        localStorage.removeItem("usuario");
        localStorage.removeItem("token_expira");
        alert("Sesión expirada. Por favor, inicia sesión nuevamente");
        window.location.href = "../page/login.html";
        return null;
    }

    return respuesta;
}

// Función para cerrar sesión
export function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("usuario");
    localStorage.removeItem("token_expira");
    window.location.href = "../page/login.html";
}

// Función para cerrar sesión específica
export async function cerrarSesionEspecifica(tokenId) {
    const respuesta = await peticionAutenticada("/api/cerrar-sesion", {
        method: "POST",
        body: JSON.stringify({ tokenId })
    });
    
    if (respuesta) {
        const data = await respuesta.json();
        alert(data.mensaje);
        return data;
    }
    return null;
}

// Función para ver sesiones activas
export async function verSesionesActivas() {
    const respuesta = await peticionAutenticada("/api/sesiones");
    if (respuesta) {
        const data = await respuesta.json();
        return data;
    }
    return null;
}

// Función para verificar autenticación en páginas protegidas
export function verificarAutenticacion() {
    const token = localStorage.getItem("token");
    const tokenExpira = localStorage.getItem("token_expira");
    
    if (!token) {
        window.location.href = "../page/login.html";
        return false;
    }

    if (tokenExpira && Date.now() > parseInt(tokenExpira)) {
        localStorage.removeItem("token");
        localStorage.removeItem("rol");
        localStorage.removeItem("usuario");
        localStorage.removeItem("token_expira");
        window.location.href = "../page/login.html";
        return false;
    }

    return true;
}

// ========== INICIALIZACIÓN AUTOMÁTICA ==========
// Se ejecuta cuando el script se carga
// Verificar si estamos en la página de login
if (window.location.pathname.includes("login.html") || window.location.pathname === "/" || window.location.pathname === "") {
    // Tiempo de prueba para animación (10 segundos)
    setTimeout(() => {
        ocultarPreloader();
    }, 10000);
    
    // Ejecutar verificación de sesión automáticamente
    verificarSesionExistente().then((tieneSesion) => {
        // Si tiene sesión válida, ya se redirigió
        // Si no tiene sesión válida, mostrar el formulario
        if (tieneSesion) {
            console.log("Sesión válida, redirigiendo...");
        }
    });
}

// Función para mostrar el formulario de login
function mostrarFormularioLogin() {
    const loginContent = document.getElementById("loginContent");
    if (loginContent) {
        loginContent.classList.add("ready");
    }
}

// Función para ocultar el preloader
function ocultarPreloader() {
    const preloader = document.getElementById("preloader");
    const loginContent = document.getElementById("loginContent");
    
    if (preloader) {
        preloader.classList.add("hidden");
    }
    
    if (loginContent) {
        loginContent.classList.add("ready");
    }
}

// Función para mostrar el preloader
function mostrarPreloader(callback) {
    const preloader = document.getElementById("preloader");
    const loginContent = document.getElementById("loginContent");
    
    if (loginContent) {
        loginContent.classList.remove("ready");
    }
    
    if (preloader) {
        preloader.classList.remove("hidden");
    }
    
    if (callback) {
        setTimeout(callback, 1500);
    }
}

// Evento de login (solo si estamos en la página de login)
document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btnLogin");
    const inputEmail = document.getElementById("correo");
    const inputPassword = document.getElementById("contraseña");

    // Si no hay sesión activa, ocultar preloader y mostrar el formulario
    if (!localStorage.getItem("token")) {
        ocultarPreloader();
    }

    if (btnLogin) {
        btnLogin.addEventListener("click", async (e) => {
            e.preventDefault();
            
            try {
                const email = inputEmail.value.trim();
                const password = inputPassword.value;

                if (!email || !password) {
                    alert("Por favor, ingresa email y contraseña");
                    return;
                }

                const dispositivo = obtenerInfoDispositivo();

                const res = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (data.success) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("rol", data.rol);
                    localStorage.setItem("token_expira", data.expira);
                    localStorage.setItem("usuario", JSON.stringify(data.usuario));
                    
                    alert(`✅ ${data.mensaje || "Login exitoso"}`);

                    mostrarPreloader(() => {
                        if (data.rol === 1) {
                            window.location.href = "../page/dashboard.html";
                        } else if (data.rol === 2) {
                            window.location.href = "../page/cliente.html";
                        }
                    });
                } else {
                    alert(`❌ ${data.mensaje || "Login fallido"}`);
                }

            } catch (error) {
                console.error(error);
                alert("❌ Error al conectar con el servidor");
            }
        });
    }
});