const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Habilita CORS para permitir que tu página del reproductor se comunique con este servidor
app.use(cors());

// Función para extraer el arreglo de datos ofuscado (Vw) del código HTML
function extractVwArray(html) {
    // Busca el patrón Vw = [[...]]; en el texto del HTML
    const match = html.match(/Vw\s*=\s*(\[\[.*?\]\]);/s);
    if (!match || !match[1]) {
        // Si no lo encuentra, lanza un error claro
        throw new Error("No se pudo encontrar el arreglo de datos del video (Vw).");
    }
    // Convierte el texto del arreglo a un arreglo real de JavaScript de forma segura
    return new Function(`return ${match[1]};`)();
}

// Función para resolver el "rompecabezas" y decodificar la URL del video
function decodePlaybackUrl(Vw) {
    let playbackURL = "";
    
    // Este es el algoritmo de decodificación que usa la página original
    Vw.sort((a, b) => a[0] - b[0]);
    const k = 56941 + 545478; // La clave secreta para decodificar

    Vw.forEach(e => {
        let v = e[1];
        // Decodifica la cadena de Base64 a texto normal
        let decodedValue = Buffer.from(v, 'base64').toString('utf8');
        // Extrae solo los números del texto decodificado
        let numericPart = parseInt(decodedValue.replace(/\D/g, ''));
        // Resta la clave secreta y convierte el número resultante a una letra (código ASCII)
        playbackURL += String.fromCharCode(numericPart - k);
    });

    return playbackURL;
}

// La ruta principal de nuestra API, que se activará con /api/canal
app.get('/canal', async (req, res) => {
    // Obtiene el nombre del stream de la URL, ej: ?stream=disney3
    const streamName = req.query.stream;
    if (!streamName) {
        return res.status(400).json({ error: 'Debes especificar un stream. Ej: ?stream=disney3' });
    }

    const targetUrl = `https://streamtp11.com/global1.php?stream=${streamName}`;

    try {
        // 1. Descargamos el HTML que contiene el rompecabezas
        const response = await axios.get(targetUrl);
        
        // 2. Extraemos las piezas del rompecabezas (el arreglo Vw)
        const Vw = extractVwArray(response.data);

        // 3. Resolvemos el rompecabezas para obtener la URL final del video
        const finalUrl = decodePlaybackUrl(Vw);

        // 4. Enviamos la URL final y limpia como respuesta
        res.json({ success: true, url: finalUrl });

    } catch (error) {
        // Si algo falla, enviamos un error detallado
        res.status(500).json({ success: false, error: 'No se pudo obtener o decodificar la URL del video.', details: error.message });
    }
});

// Exportamos la app para que Vercel pueda usarla como una función serverless
module.exports = app;

