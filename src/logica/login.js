const formularioInicio = document.getElementById("formulario_inicio");
const clienteApi = window.clienteApi;

if (!clienteApi) {
  console.error("No se encontró window.clienteApi. Revisa que configuracion-api.js cargue antes de login.js");
}

formularioInicio.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = document.getElementById("correo").value.trim();
  const password = document.getElementById("contraseña").value.trim();

  if (!email || !password) {
    Swal.fire({
      icon: "warning",
      title: "Campos vacíos",
      text: "Completa todos los campos"
    });
    return;
  }

  try {
    const datos = await clienteApi.solicitarJson("/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    Swal.fire({
      icon: "success",
      title: "Bienvenido",
      text: datos.message || "Inicio de sesión correcto",
      timer: 1200,
      showConfirmButton: false
    });

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: error.status === 401 ? "Credenciales incorrectas" : "Error",
      text: error.message || "No se pudo conectar al servidor"
    });
  }
});
