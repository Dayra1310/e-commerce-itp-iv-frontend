const API_URL = "http://localhost:4200";

import { peticionAutenticada } from './login-front.js';

const PRODUCTOS_EJEMPLO = [
    { id: 1, nombre: "Tablero Acrílico 120x80", cantidad: 50, material: "Acrílico", precio: 15000 },
    { id: 2, nombre: "Pizarrón Blanco 90x60", cantidad: 30, material: "Melamina", precio: 12000 },
    { id: 3, nombre: "Tablero Magnético", cantidad: 20, material: "Metal", precio: 18000 },
    { id: 4, nombre: "Tablero con Marco Aluminio", cantidad: 15, material: "Aluminio", precio: 25000 },
    { id: 5, nombre: "Pizarrón Verde 100x70", cantidad: 25, material: "Corcho", precio: 10000 },
    { id: 6, nombre: "Tablero Digital Interactivo", cantidad: 8, material: "Táctil", precio: 85000 },
    { id: 7, nombre: "Pizarrón Móvil con Ruedas", cantidad: 12, material: "Melamina", precio: 35000 },
    { id: 8, nombre: "Tablero Cork 80x60", cantidad: 18, material: "Corcho", precio: 22000 },
    { id: 9, nombre: "Pizarrón Negro 120x90", cantidad: 22, material: "Vidrio", precio: 28000 },
    { id: 10, nombre: "Tablero Flipchart", cantidad: 35, material: "Papel", precio: 8000 },
    { id: 11, nombre: "Pizarrón Proyector 150x100", cantidad: 6, material: "Proyección", precio: 45000 },
    { id: 12, nombre: "Tablero Magnético Grande", cantidad: 14, material: "Metal", precio: 32000 },
    { id: 13, nombre: "Pizarrón Ecológico", cantidad: 28, material: "Bambú", precio: 19000 },
    { id: 14, nombre: "Tablero Acrílico Transparente", cantidad: 9, material: "Acrílico", precio: 27000 }
];

const DATOS_DASHBOARD_EJEMPLO = {
    metricas: {
        ventasMes: 125000,
        productosVendidos: 450,
        pedidos: 89
    },
    productosMasVendidos: [
        { nombre: "Tablero Acrílico 120x80", ventas: 45 },
        { nombre: "Pizarrón Blanco 90x60", ventas: 30 },
        { nombre: "Tablero Magnético", ventas: 25 }
    ],
    usuario: { email: "admin@tableroscorp.com" },
    sesiones_activas: 1,
    limite_sesiones: 5
};

export async function getDashboardData() {
    try {
        const response = await peticionAutenticada("/api/dashboard");
        if (response && response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log("Backend no disponible, usando datos de ejemplo...");
    }
    return { ...DATOS_DASHBOARD_EJEMPLO };
}

export async function getProductos() {
    try {
        const response = await peticionAutenticada("/api/productos");
        if (response && response.ok) {
            const data = await response.json();
            return data.productos || [];
        }
    } catch (error) {
        console.log("Backend no disponible, usando productos de ejemplo...");
    }
    return PRODUCTOS_EJEMPLO;
}

export async function searchProductos(query) {
    try {
        const response = await peticionAutenticada(`/api/productos/search?q=${encodeURIComponent(query)}`);
        if (response && response.ok) {
            const data = await response.json();
            return data.productos || [];
        }
    } catch (error) {
        console.log("Backend no disponible, buscando en productos de ejemplo...");
    }
    
    if (!query) return PRODUCTOS_EJEMPLO;
    
    const lowerQuery = query.toLowerCase();
    return PRODUCTOS_EJEMPLO.filter(producto =>
        producto.nombre.toLowerCase().includes(lowerQuery) ||
        producto.material.toLowerCase().includes(lowerQuery) ||
        producto.id.toString().includes(query) ||
        producto.cantidad.toString().includes(query) ||
        producto.precio.toString().includes(query)
    );
}
