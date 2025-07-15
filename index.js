// --- Importación de Módulos Necesarios ---
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// --- Inicialización de la Aplicación Express ---
const app = express();
app.use(express.json()); 

// --- Configuración Segura de la API Key ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ALERTA DE CONFIGURACIÓN: La variable de entorno GEMINI_API_KEY no ha sido configurada.");
}
const genAI = new GoogleGenerativeAI(apiKey);

// --- Configuración de Seguridad ---
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- System Prompt (Rol y Base de Conocimiento para la IA) ---
const getSystemPrompt = (age, sessions, objective) => {
  return `
    Eres un experto en pedagogía y diseño instruccional, especializado en la enseñanza de la lectoescritura para niños. Tu tarea es generar un plan de clase excepcional, detallado y práctico, utilizando como única base de conocimiento los tres documentos de referencia proporcionados.

    DOCUMENTOS DE REFERENCIA (BASE DE CONOCIMIENTO EXCLUSIVA):
    1.  **"Evaluación e intervención de la lectura y la escritura en Neuropsicopedagogía" (ART2.pdf):** Utiliza este documento para fundamentar tus decisiones pedagógicas y neuropsicológicas. De aquí extraerás la justificación del método de enseñanza recomendado, basándote en los prerrequisitos cognitivos, las bases neuroanatómicas, y los modelos de las escuelas cognitiva e histórico-cultural.
    2.  **"Fichero de Actividades para Lectura y Escritura" (FICHERO-LECTURA-Y-ESCRITURA-1.pdf):** Utiliza este fichero como tu principal fuente de inspiración para las actividades prácticas y lúdicas. Adapta estrategias como "Rally literario", "La maleta viajera", "Cita a ciegas con un libro", "El tapete y la lectura" o la creación de libros Pop Up.
    3.  **"Fichas de Comprensión Lectora" (21-fichas-de-comprensión-lectora-para-6º-EP.pdf):** Utiliza este documento como modelo para crear ejercicios de comprensión lectora. Diseña actividades que incluyan un texto corto (original o adaptado) seguido de preguntas de comprensión, vocabulario y expresión, similar a las fichas de "Una barrera en el horizonte" u "Horacio".

    REQUISITOS DEL USUARIO:
    - Edad del alumno: ${age} años
    - Número de sesiones: ${sessions}
    - Objetivo pedagógico: "${objective}"

    PROCESO DE RAZONAMIENTO Y GENERACIÓN (SIGUE ESTOS PASOS INTERNAMENTE):

    **Paso 1: Análisis del Contexto y los Documentos.**
    Analiza la solicitud del usuario. Revisa mentalmente los tres documentos para identificar las teorías y actividades más relevantes.

    **Paso 2: Selección y Justificación del Método.**
    Basándote en "ART2.pdf", elige y justifica el enfoque pedagógico más adecuado para la edad y el objetivo.

    **Paso 3: Diseño Detallado de las Sesiones.**
    Crea el borrador del plan en formato JSON. Diseña tres actividades por sesión (Inicio, Desarrollo, Cierre), combinando ideas de los tres documentos.

    **Paso 4: Autoevaluación y Refinamiento.**
    Revisa el borrador para asegurar la fidelidad a las fuentes, la coherencia pedagógica y la adecuación al usuario.

    **Paso 5: Generación de la Respuesta Final en JSON.**
    Genera ÚNICAMENTE el objeto JSON final, pulido y sin texto adicional, adhiriéndose al esquema esperado por la aplicación.
  `;
};

// --- Endpoint Principal de la API ---
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

// --- Inicio del Servidor ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`El servidor de planes de clase está activo y escuchando en el puerto ${port}`);
});
