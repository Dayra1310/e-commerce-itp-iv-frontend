(function configurarClienteApi() {
  const PUERTO_BACKEND_POR_DEFECTO = "3001";

  function normalizarBaseUrl(valor) {
    return String(valor || "").trim().replace(/\/+$/, "");
  }

  function obtenerBaseUrlDesdeMeta() {
    const meta = document.querySelector('meta[name="api-base-url"]');
    return normalizarBaseUrl(meta?.getAttribute("content"));
  }

  function resolverBaseUrlBackend() {
    const baseUrlMeta = obtenerBaseUrlDesdeMeta();
    if (baseUrlMeta) return baseUrlMeta;

    const protocolo = window.location.protocol;
    const hostname = window.location.hostname || "localhost";

    if (protocolo === "http:" || protocolo === "https:") {
      return `${protocolo}//${hostname}:${PUERTO_BACKEND_POR_DEFECTO}`;
    }

    return `http://localhost:${PUERTO_BACKEND_POR_DEFECTO}`;
  }

  const baseUrl = resolverBaseUrlBackend();

  function construirUrl(ruta) {
    const rutaNormalizada = String(ruta || "").startsWith("/") ? ruta : `/${ruta}`;
    return `${baseUrl}${rutaNormalizada}`;
  }

  function construirUrlImagen(nombreImagen) {
    const nombreSeguro = encodeURIComponent(String(nombreImagen || "default.jpg"));
    return construirUrl(`/uploads/${nombreSeguro}`);
  }

  async function leerRespuestaJson(respuesta) {
    const tipoContenido = respuesta.headers.get("content-type") || "";

    if (!tipoContenido.includes("application/json")) {
      return {};
    }

    return respuesta.json();
  }

  async function solicitarJson(ruta, opciones = {}) {
    const { headers = {}, body, ...opcionesFetch } = opciones;
    const esFormulario = body instanceof FormData;

    const respuesta = await fetch(construirUrl(ruta), {
      credentials: "include",
      ...opcionesFetch,
      headers: esFormulario
        ? headers
        : {
            "Content-Type": "application/json",
            ...headers
          },
      body
    });

    const datos = await leerRespuestaJson(respuesta);

    if (!respuesta.ok || datos.ok === false) {
      const error = new Error(datos.message || `Error HTTP ${respuesta.status}`);
      error.status = respuesta.status;
      error.datos = datos;
      throw error;
    }

    return datos;
  }

  window.clienteApi = {
    baseUrl,
    construirUrl,
    construirUrlImagen,
    solicitarJson
  };
})();
