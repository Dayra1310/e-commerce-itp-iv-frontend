// login.js - Funciones de autenticación compartidas

const API_URL = "http://localhost:5500";

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
    window.location.href = "./";
}
