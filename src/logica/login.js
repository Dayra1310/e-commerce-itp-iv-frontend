const CREDENCIALES_VALIDAS = {
  usuario: "admin@gmail.com",
  contrasena: "1234",
};

const form = document.getElementById("formulario_inicio");

function mockBackendAuth(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email === CREDENCIALES_VALIDAS.usuario && password === CREDENCIALES_VALIDAS.contrasena) {
        resolve({
          token: "mock-backend-token-abc123",
          usuario: email,
          expira: Date.now() + 1000 * 60 * 60, // 1h
        });
      } else {
        reject(new Error("Credenciales inválidas"));
      }
    }, 400);
  });
}

if (!form) {
  console.error("No se encontró el formulario de login");
} else {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("correo");
    const passwordInput = document.getElementById("contrasena");

    if (!emailInput || !passwordInput) {
      alert("Formulario incompleto");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Debes completar correo y contraseña");
      return;
    }

    try {
      const respuesta = await mockBackendAuth(email, password);
      localStorage.setItem("token", respuesta.token);
      localStorage.setItem("usuario", respuesta.usuario);
      localStorage.setItem("token_expira", String(respuesta.expira));
      console.log("Login exitoso (simulado backend)", respuesta);
      window.location.href = "./dashboard.html";
    } catch (error) {
      console.error("Error de autenticación:", error);
      alert("Credenciales incorrectas o error de servidor simulado");
    }
  });
}