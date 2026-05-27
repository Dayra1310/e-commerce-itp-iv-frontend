const API_BASE_URL =  "http://localhost:3001";
const formularioInicio = document.getElementById("formulario_inicio");
const botonLogin = document.getElementById("btnLogin");

const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());

async function leerRespuestaJson(respuesta) {
  try {
    return await respuesta.json();
  } catch (_error) {
    return { ok: false, message: "Respuesta inválida del servidor" };
  }
}

formularioInicio.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = document.getElementById("correo").value.trim().toLowerCase();
  const password = document.getElementById("contraseña").value;

  if (!validarEmail(email)) {
    Swal.fire({
      icon: "warning",
      title: "Datos incompletos",
      text: "Ingresa un correo válido y tu contraseña",
    });
    return;
  }

  if (!password) {
    Swal.fire({
      icon: "warning",
      title: "Datos incompletos",
      text: "Ingresa un correo válido y tu contraseña",
    });
    return;
  }

  try {
    botonLogin.disabled = true;
    botonLogin.textContent = "Ingresando...";

    const respuesta = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const datos = await leerRespuestaJson(respuesta);

    if (!respuesta.ok) {
      Swal.fire({
        icon: "error",
        title: "No se pudo iniciar sesión",
        text: datos.message ?? "Credenciales incorrectas",
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Bienvenido",
      text: datos.message ?? "Login exitoso",
      timer: 1200,
      showConfirmButton: false,
    });

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
  } catch (error) {
    console.error("Error en login:", error);

    Swal.fire({
      icon: "error",
      title: "Error de conexión",
      text: "No se pudo conectar al servidor backend",
    });
  } finally {
    botonLogin.disabled = false;
    botonLogin.textContent = "Ingresar";
  }
});
