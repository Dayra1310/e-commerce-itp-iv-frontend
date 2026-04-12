// login.ts
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { conectar } from "./db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// 📁 SERVIR ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, '../')));

// 🌐 RUTA PRINCIPAL - Login
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../page/login.html'));
});

// 🌐 RUTAS PARA PÁGINAS HTML
app.get("/page/productos.html", (req, res) => {
    res.sendFile(path.join(__dirname, '../page/productos.html'));
});

app.get("/page/configuracion.html", (req, res) => {
    res.sendFile(path.join(__dirname, '../page/configuracion.html'));
});

const SECRET = "clave_secreta";
const MAX_TOKENS_POR_USUARIO = 5; // Límite de dispositivos diferentes

// 🔐 MIDDLEWARE para verificar token
async function verificarToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            mensaje: "Acceso denegado. Token no proporcionado" 
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET) as any;
        
        // Verificar que el token exista en la base de datos
        const conexion = await conectar();
        const [rows]: any = await conexion.execute(
            "SELECT * FROM user_tokens WHERE token = ? AND id_usuario = ? AND fecha_expiracion > NOW()",
            [token, decoded.id]
        );
        
        if (rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                mensaje: "Token inválido o sesión cerrada" 
            });
        }
        
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            mensaje: "Token inválido o expirado" 
        });
    }
}

// 🔐 LOGIN - Límite de 5 dispositivos (uno por tipo de dispositivo)
app.post("/login", async (req, res) => {
    const { email, password, dispositivo = "desconocido" } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            mensaje: "Email y contraseña son requeridos" 
        });
    }

    try {
        const conexion = await conectar();

        // Buscar usuario
        const [rows]: any = await conexion.execute(
            "SELECT id_usuario, email, password, id_rol FROM usuarios WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, mensaje: "Usuario no encontrado" });
        }

        const user = rows[0];

        if (user.password !== password) {
            return res.status(401).json({ success: false, mensaje: "Contraseña incorrecta" });
        }

        // ========== NUEVA LÓGICA HÍBRIDA ==========
        
        // 1. Contar tokens activos (excluyendo el mismo dispositivo)
        const [tokensActivos]: any = await conexion.execute(
            `SELECT COUNT(*) as total FROM user_tokens 
             WHERE id_usuario = ? 
             AND fecha_expiracion > NOW() 
             AND dispositivo != ?`,
            [user.id_usuario, dispositivo]
        );
        
        // 2. Verificar si ya hay token de este dispositivo
        const [tokenMismoDispositivo]: any = await conexion.execute(
            "SELECT id FROM user_tokens WHERE id_usuario = ? AND dispositivo = ? AND fecha_expiracion > NOW()",
            [user.id_usuario, dispositivo]
        );

        let tokenReemplazado = false;
        
        // Si ya tiene token de este dispositivo, reemplazarlo
        if (tokenMismoDispositivo.length > 0) {
            await conexion.execute(
                "DELETE FROM user_tokens WHERE id = ?",
                [tokenMismoDispositivo[0].id]
            );
            tokenReemplazado = true;
            console.log(`♻️ Token reemplazado para ${dispositivo} - Usuario: ${user.email}`);
        }
        // Si no tiene token de este dispositivo, verificar límite
        else if (tokensActivos[0].total >= MAX_TOKENS_POR_USUARIO) {
            return res.status(403).json({ 
                success: false, 
                mensaje: `Límite de ${MAX_TOKENS_POR_USUARIO} dispositivos alcanzado. Cierra una sesión en otro dispositivo.`,
                codigo: "MAX_SESIONES",
                sesiones_activas: tokensActivos[0].total,
                limite: MAX_TOKENS_POR_USUARIO
            });
        }

        // Calcular expiración (1 hora)
        const expiracion = new Date();
        expiracion.setHours(expiracion.getHours() + 1);

        // Generar token
        const token = jwt.sign(
            { 
                id: user.id_usuario, 
                email: user.email,
                rol: user.id_rol 
            },
            SECRET,
            { expiresIn: "1h" }
        );

        // Guardar token en base de datos
        await conexion.execute(
            "INSERT INTO user_tokens (id_usuario, token, fecha_expiracion, dispositivo) VALUES (?, ?, ?, ?)",
            [user.id_usuario, token, expiracion, dispositivo]
        );

        // Obtener información de sesiones activas
        const [sesionesActivas]: any = await conexion.execute(
            "SELECT dispositivo, fecha_creacion, fecha_expiracion FROM user_tokens WHERE id_usuario = ? AND fecha_expiracion > NOW() ORDER BY fecha_creacion DESC",
            [user.id_usuario]
        );

        const mensaje = tokenReemplazado 
            ? `✅ Sesión renovada en ${dispositivo}. Tienes ${sesionesActivas.length}/${MAX_TOKENS_POR_USUARIO} dispositivos activos.`
            : `✅ Login exitoso en ${dispositivo}. Tienes ${sesionesActivas.length}/${MAX_TOKENS_POR_USUARIO} dispositivos activos.`;

        res.json({ 
            success: true, 
            rol: user.id_rol, 
            token,
            expira: expiracion.getTime(),
            usuario: {
                id: user.id_usuario,
                email: user.email
            },
            sesiones_activas: sesionesActivas.length,
            limite_sesiones: MAX_TOKENS_POR_USUARIO,
            token_reemplazado: tokenReemplazado,
            mensaje: mensaje
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, mensaje: "Error del servidor" });
    }
});

// 📌 RUTA PROTEGIDA - Ver sesiones activas
app.get("/api/sesiones", verificarToken, async (req: any, res) => {
    try {
        const conexion = await conectar();
        const [sesiones]: any = await conexion.execute(
            `SELECT id, dispositivo, fecha_creacion, fecha_expiracion 
             FROM user_tokens 
             WHERE id_usuario = ? AND fecha_expiracion > NOW() 
             ORDER BY fecha_creacion DESC`,
            [req.usuario.id]
        );
        
        res.json({
            success: true,
            sesiones,
            total: sesiones.length,
            limite: MAX_TOKENS_POR_USUARIO
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, mensaje: "Error al obtener sesiones" });
    }
});

// 📌 RUTA PROTEGIDA - Cerrar sesión específica
app.post("/api/cerrar-sesion", verificarToken, async (req: any, res) => {
    const { tokenId } = req.body;
    
    try {
        const conexion = await conectar();
        
        if (tokenId === "all") {
            // Cerrar todas las sesiones excepto la actual
            await conexion.execute(
                "DELETE FROM user_tokens WHERE id_usuario = ? AND token != ?",
                [req.usuario.id, req.headers['authorization']?.split(' ')[1]]
            );
            res.json({ success: true, mensaje: "Todas las demás sesiones cerradas" });
        } else {
            // Cerrar una sesión específica
            await conexion.execute(
                "DELETE FROM user_tokens WHERE id = ? AND id_usuario = ?",
                [tokenId, req.usuario.id]
            );
            res.json({ success: true, mensaje: "Sesión cerrada exitosamente" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, mensaje: "Error al cerrar sesión" });
    }
});

// 📌 RUTA PROTEGIDA - Dashboard
app.get("/api/dashboard", verificarToken, async (req: any, res) => {
    try {
        const conexion = await conectar();
        const [sesiones]: any = await conexion.execute(
            "SELECT COUNT(*) as total FROM user_tokens WHERE id_usuario = ? AND fecha_expiracion > NOW()",
            [req.usuario.id]
        );
        
        res.json({
            success: true,
            mensaje: "Datos del dashboard",
            usuario: req.usuario,
            sesiones_activas: sesiones[0].total,
            limite_sesiones: MAX_TOKENS_POR_USUARIO,
            metricas: {
                ventasMes: 12500000,
                productosVendidos: 320,
                pedidos: 85
            },
            productosMasVendidos: [
                { nombre: "Tablero Acrílico 120x80", ventas: 45 },
                { nombre: "Pizarrón Blanco 90x60", ventas: 30 },
                { nombre: "Tablero Magnético", ventas: 25 }
            ]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, mensaje: "Error del servidor" });
    }
});

// 📌 RUTA PROTEGIDA - Productos (desde JSON)
app.get("/api/productos", verificarToken, async (req: any, res) => {
    try {
        // Cargar productos desde el archivo JSON
        const fs = await import('fs');
        const path = await import('path');
        const productosPath = path.join(process.cwd(), 'logica', 'productos.json');
        const productosData = fs.readFileSync(productosPath, 'utf-8');
        const productos = JSON.parse(productosData);
        
        res.json({
            success: true,
            productos
        });
    } catch (error) {
        console.error("Error cargando productos:", error);
        //  Productos por defecto si no se encuentra el archivo
        // res.json({
        //     success: true,
        //     productos: [
        //         { id: 1, nombre: "Tablero Acrílico 120x80", cantidad: 50, material: "Acrílico", precio: 15000 },
        //         { id: 2, nombre: "Pizarrón Blanco 90x60", cantidad: 30, material: "Melamina", precio: 12000 },
        //         { id: 3, nombre: "Tablero Magnético", cantidad: 20, material: "Metal", precio: 18000 },
        //         { id: 4, nombre: "Tablero con Marco Aluminio", cantidad: 15, material: "Aluminio", precio: 25000 },
        //         { id: 5, nombre: "Pizarrón Verde 100x70", cantidad: 25, material: "Corcho", precio: 10000 }
        //     ]
        //});
    }
});

// 📌 RUTA PROTEGIDA - Verificar token
app.get("/api/verificar", verificarToken, (req: any, res) => {
    res.json({
        success: true,
        usuario: req.usuario,
        expira: Date.now() + (60 * 60 * 1000)
    });
});

// Ruta pública
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

app.listen(5500, () => {
    console.log("🚀 Servidor en http://localhost:5500");
    console.log(`📌 Límite: ${MAX_TOKENS_POR_USUARIO} dispositivos diferentes por usuario`);
    console.log(`📌 Mismo dispositivo: reemplaza el token anterior`);
});