// --- Importación de Módulos Necesarios ---
const express = require('express');
const cors = require('cors'); // Importamos la librería CORS
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// --- Inicialización de la Aplicación Express ---
const app = express();

// --- Configuración de CORS ---
// Define los orígenes permitidos. Solo tu sitio de Netlify podrá hacer peticiones.
const allowedOrigins = ['https://playbooklectoescritura.netlify.app'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
// Habilita CORS con tus opciones específicas
app.use(cors(corsOptions));

// Middleware para que el servidor pueda interpretar el cuerpo de las peticiones en formato JSON
app.use(express.json()); 

// --- Configuración Segura de la API Key ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ALERTA DE CONFIGURACIÓN: La variable de entorno GEMINI_API_KEY no ha sido configurada.");
}
const genAI = new GoogleGenerativeAI(apiKey);

// (El resto de tu código: safetySettings, getSystemPrompt, etc., se mantiene exactamente igual...)
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const getSystemPrompt = (age, sessions, objective) => {
  return `
    Eres un experto en pedagogía y diseño instruccional... // (Tu prompt completo va aquí)
  `;
};

app.get('/', (req, res) => {
  res.status(200).send('¡El backend del Asistente de Lectoescritura está en línea y listo para recibir peticiones POST en /generate-plan!');
});

app.post('/generate-plan', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ message: 'Error crítico de configuración del servidor.' });
  }
  try {
    const { age, sessions, objective } = req.body;
    if (!age || !sessions || !objective) {
      return res.status(400).json({ message: 'Petición incompleta. Faltan parámetros.' });
    }
    const prompt = getSystemPrompt(age, sessions, objective);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: safetySettings,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent(prompt);
    res.json(JSON.parse(result.response.text()));
  } catch (error) {
    console.error('Error durante la llamada a la API de Gemini:', error);
    res.status(500).json({ message: 'Ocurrió un error interno al generar el plan.' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`El servidor de planes de clase está activo y escuchando en el puerto ${port}`);
});