const form = document.getElementById("formulario_inicio");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

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

    const res = await fetch("http://localhost:3001/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    // ❌ error de login
    if (!data.ok) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: data.message || "Credenciales incorrectas"
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Bienvenido",
      text: data.message,
      timer: 1200,
      showConfirmButton: false
    });

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);

  } catch (error) {

    console.log(error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo conectar al servidor"
    });
  }
});