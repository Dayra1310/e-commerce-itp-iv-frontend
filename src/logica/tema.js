// tema.js

document.addEventListener("DOMContentLoaded", () => {
    // Aplicar modo oscuro si está guardado
    const modoGuardado = localStorage.getItem("modoOscuro") === "true";
    if (modoGuardado) {
        document.body.classList.add("modo-oscuro");
    }

    // Cargar foto de perfil si está guardada
    const fotoPerfil = localStorage.getItem("fotoPerfil");
    if (fotoPerfil) {
        const imgPerfil = document.querySelector('.perfil-usuario img');
        if (imgPerfil) {
            imgPerfil.src = fotoPerfil;
        }
    }
});