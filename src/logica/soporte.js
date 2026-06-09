// =======================================
// CONFIGURACION
// =======================================

const API = "/soporte";


// =======================================
// ELEMENTOS
// =======================================

const totalTickets = document.getElementById("totalTickets");
const ticketsAbiertos = document.getElementById("ticketsAbiertos");
const ticketsProceso = document.getElementById("ticketsProceso");
const ticketsCerrados = document.getElementById("ticketsCerrados");

const tablaTickets = document.getElementById("tablaTickets");

const btnNuevoTicket = document.getElementById("btnNuevoTicket");

const modalTicket = document.getElementById("modalTicket");
const cerrarModal = document.getElementById("cerrarModal");

const formTicket = document.getElementById("formTicket");

const tipoTicket = document.getElementById("tipoTicket");
const mensajeTicket = document.getElementById("mensajeTicket");
const adjuntosTicket = document.getElementById("adjuntosTicket");


// =======================================
// INICIO
// =======================================

document.addEventListener("DOMContentLoaded", async () => {

    await cargarTipos();

    await cargarTickets();

});


// =======================================
// MODAL
// =======================================

btnNuevoTicket.addEventListener("click", () => {
    modalTicket.classList.add("show");
});

cerrarModal.addEventListener("click", () => {
    modalTicket.classList.remove("show");
});

window.addEventListener("click", (e) => {

    if (e.target === modalTicket) {
        modalTicket.classList.remove("show");
    }

});


// =======================================
// CARGAR TIPOS
// =======================================

async function cargarTipos() {

    try {

        const respuesta = await clienteApi.get(
            `${API}/tipos`
        );

        tipoTicket.innerHTML = "";

        respuesta.tipos.forEach(tipo => {

            tipoTicket.innerHTML += `
                <option value="${tipo}">
                    ${tipo}
                </option>
            `;

        });

    } catch (error) {

        console.error(error);

    }

}


// =======================================
// CARGAR TICKETS
// =======================================

async function cargarTickets() {

    try {

        const respuesta = await clienteApi.get(
            `${API}/mis-tickets`
        );

        const tickets = respuesta.tickets || [];

        actualizarEstadisticas(tickets);

        renderizarTabla(tickets);

    } catch (error) {

        console.error(error);

        mostrarError(
            "No fue posible cargar los tickets."
        );

    }

}


// =======================================
// ESTADISTICAS
// =======================================

function actualizarEstadisticas(tickets) {

    totalTickets.textContent =
        tickets.length;

    ticketsAbiertos.textContent =
        tickets.filter(
            t => t.estado === "abierto"
        ).length;

    ticketsProceso.textContent =
        tickets.filter(
            t => t.estado === "en_proceso"
        ).length;

    ticketsCerrados.textContent =
        tickets.filter(
            t =>
                t.estado === "cerrado" ||
                t.estado === "cancelado"
        ).length;

}


// =======================================
// TABLA
// =======================================

function renderizarTabla(tickets) {

    if (!tickets.length) {

        tablaTickets.innerHTML = `
            <tr>
                <td colspan="5">
                    No tienes tickets registrados.
                </td>
            </tr>
        `;

        return;
    }

    tablaTickets.innerHTML = "";

    tickets.forEach(ticket => {

        tablaTickets.innerHTML += `
            <tr>

                <td>#${ticket.id}</td>

                <td>${ticket.asunto}</td>

                <td>
                    <span class="estado ${ticket.estado}">
                        ${ticket.estado}
                    </span>
                </td>

                <td>
                    ${formatearFecha(ticket.fecha)}
                </td>

                <td>

                    <button
                        class="btn-ver"
                        onclick="verTicket(${ticket.id})"
                    >
                        Ver
                    </button>

                </td>

            </tr>
        `;

    });

}


// =======================================
// CREAR TICKET
// =======================================

formTicket.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        try {

            const formData =
                new FormData();

            formData.append(
                "tipo",
                tipoTicket.value
            );

            formData.append(
                "mensaje",
                mensajeTicket.value
            );

            const archivos =
                adjuntosTicket.files;

            for (
                let i = 0;
                i < archivos.length;
                i++
            ) {

                formData.append(
                    "adjuntos",
                    archivos[i]
                );

            }

            await clienteApi.post(
                `${API}/tickets`,
                formData
            );

            mostrarExito(
                "Ticket creado correctamente."
            );

            formTicket.reset();

            modalTicket.classList.remove(
                "show"
            );

            await cargarTickets();

        } catch (error) {

            console.error(error);

            mostrarError(
                error.message ||
                "No se pudo crear el ticket."
            );

        }

    }
);


// =======================================
// VER TICKET
// =======================================

window.verTicket = async (id) => {

    try {

        const respuesta =
            await clienteApi.get(
                `${API}/tickets/${id}`
            );

        const ticket =
            respuesta.ticket;

        let adjuntos = "";

        if (
            ticket.adjuntos &&
            ticket.adjuntos.length
        ) {

            ticket.adjuntos.forEach(
                archivo => {

                    adjuntos += `
                        <li>
                            <a
                                href="/uploads/${archivo.archivo}"
                                target="_blank"
                            >
                                Ver archivo
                            </a>
                        </li>
                    `;

                }
            );

        } else {

            adjuntos =
                "<li>Sin adjuntos</li>";

        }

        Swal.fire({

            title:
                `Ticket #${ticket.id}`,

            html: `
                <div style="text-align:left">

                    <p>
                        <strong>Tipo:</strong>
                        ${ticket.asunto}
                    </p>

                    <p>
                        <strong>Estado:</strong>
                        ${ticket.estado}
                    </p>

                    <p>
                        <strong>Mensaje:</strong>
                    </p>

                    <p>
                        ${ticket.mensaje}
                    </p>

                    <hr>

                    <h4>
                        Adjuntos
                    </h4>

                    <ul>
                        ${adjuntos}
                    </ul>

                </div>
            `,

            width: 700

        });

    } catch (error) {

        console.error(error);

        mostrarError(
            "No fue posible abrir el ticket."
        );

    }

};


// =======================================
// UTILIDADES
// =======================================

function formatearFecha(fecha) {

    return new Date(fecha)
        .toLocaleDateString(
            "es-CO",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

}

function mostrarExito(mensaje) {

    Swal.fire({
        icon: "success",
        title: "Correcto",
        text: mensaje
    });

}

function mostrarError(mensaje) {

    Swal.fire({
        icon: "error",
        title: "Error",
        text: mensaje
    });

}