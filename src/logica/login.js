const formularioInicio = document.getElementById("formulario_inicio");
const clienteApi = window.clienteApi;

if (!clienteApi) {
  console.error("No se encontró window.clienteApi. Revisa que configuracion-api.js cargue antes de login.js");
}

function obtenerTipoAlertaLogin(icono = "info") {
  const iconoNormalizado = String(icono || "info").trim().toLowerCase();

  if (iconoNormalizado === "success") return "exito";
  if (iconoNormalizado === "error") return "error";
  if (iconoNormalizado === "warning") return "advertencia";

  return "info";
}


async function obtenerRolUsuarioAutenticado() {
  const perfil = await clienteApi.solicitarJson("/perfil", {
    method: "GET"
  });

  return String(perfil.rol || perfil.nombre_rol || perfil?.data?.rol || perfil?.data?.nombre_rol || "")
    .trim()
    .toLowerCase();
}

function obtenerClasesAlertaLogin(icono = "info") {
  const tipoAlerta = obtenerTipoAlertaLogin(icono);
  const claseBotonConfirmar = tipoAlerta === "error"
    ? "swal-login-btn swal-login-btn-error"
    : "swal-login-btn swal-login-btn-exito";

  return {
    popup: `swal-login swal-login-${tipoAlerta}`,
    title: "swal-login-titulo",
    htmlContainer: "swal-login-texto",
    confirmButton: claseBotonConfirmar,
    validationMessage: "swal-login-validacion"
  };
}

formularioInicio.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = document.getElementById("correo").value.trim();
  const password = document.getElementById("contraseña").value.trim();

  if (!email || !password) {
    Swal.fire({
      icon: "warning",
      title: "Campos vacíos",
      text: "Completa todos los campos",
      confirmButtonText: "Aceptar",
      customClass: obtenerClasesAlertaLogin("warning")
    });
    return;
  }

  try {
    const resultados = await clienteApi.solicitarJson("/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    const nombreRolNormalizado = await obtenerRolUsuarioAutenticado();
    const rutaRedireccion = nombreRolNormalizado === "cliente"
        ? "clientes.html"
        : "dashboard.html";

    Swal.fire({
      icon: "success",
      title: "Bienvenido",
      text: resultados.message || "Inicio de sesión correcto",
      timer: 1200,
      showConfirmButton: false,
      customClass: obtenerClasesAlertaLogin("success")
    });

    setTimeout(() => {
      window.location.href = rutaRedireccion;
    }, 1200);
  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: "error",
      title: error.status === 401 ? "Credenciales incorrectas" : "Error",
      text: error.message || "No se pudo conectar al servidor",
      confirmButtonText: "Aceptar",
      customClass: obtenerClasesAlertaLogin("error")
    });
  }
});
