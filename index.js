// --- Importación de Módulos Necesarios ---
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// --- Inicialización de la Aplicación Express ---
const app = express();
// Middleware para que el servidor pueda interpretar el cuerpo de las peticiones en formato JSON
app.use(express.json()); 

// --- Configuración Segura de la API Key ---
// La clave de API se carga desde una variable de entorno segura en el servidor (ej. en Google Cloud Run).
// ¡NUNCA se escribe directamente en el código!
const apiKey = process.env.GEMINI_API_KEY;

// Verificación de la API Key al iniciar
if (!apiKey) {
  console.error("ALERTA DE CONFIGURACIÓN: La variable de entorno GEMINI_API_KEY no ha sido configurada. El servicio no podrá funcionar.");
}

// Instancia del cliente de Google Generative AI
const genAI = new GoogleGenerativeAI(apiKey);

// Configuración de seguridad para el modelo. Se ajusta para evitar bloqueos por temas educativos.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- System Prompt (Rol y Base de Conocimiento para la IA) ---
/**
 * Construye el prompt detallado que se enviará a Gemini.
 * @param {string} age - Edad del alumno.
 * @param {string} sessions - Número de sesiones.
 * @param {string} objective - Objetivo pedagógico principal.
 * @returns {string} El prompt completo y listo para ser usado por el modelo.
 */
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
    Analiza la solicitud del usuario (edad, sesiones, objetivo). Revisa mentalmente los tres documentos para identificar las teorías, actividades y ejercicios más relevantes para cumplir con los requisitos. Por ejemplo, si el objetivo es la "conciencia fonológica", busca en "ART2.pdf" los fundamentos y en el "Fichero" actividades específicas que la desarrollen.

    **Paso 2: Selección y Justificación del Método.**
    Basándote en "ART2.pdf", elige el enfoque pedagógico más adecuado. Por ejemplo, para un niño de 5 años que inicia, podrías justificar un método con fuerte componente fonológico, mientras que para uno de 9, podrías enfocarte en la comprensión textual y el conocimiento discursivo. Redacta una justificación clara y concisa para tu elección.

    **Paso 3: Diseño Detallado de las Sesiones.**
    Crea el borrador del plan en formato JSON. Para cada sesión:
    -   **Objetivo de Sesión:** Define un objetivo específico que contribuya al objetivo general.
    -   **Materiales:** Lista los materiales necesarios, inspirándote en las actividades del "Fichero".
    -   **Actividades (Inicio, Desarrollo, Cierre):** Diseña tres actividades por sesión, combinando ideas de los tres documentos.
        -   Usa el "Fichero de Actividades" para actividades dinámicas y creativas (ej. "Ahora cuéntamelo tú" con títeres y masa).
        -   Usa las "Fichas de Comprensión Lectora" como modelo para crear tareas de lectura y respuesta.
        -   Usa "ART2.pdf" para inspirar técnicas de intervención directa, como la "lectura repetida" para mejorar la fluidez.
    -   **Textos:** Si una actividad requiere un texto, crea uno corto y original apropiado para la edad, o indica al educador cómo crearlo (ej. "Redacta un cuento de 3 frases sobre un personaje que supera un miedo"). No copies los textos largos de las fichas.

    **Paso 4: Autoevaluación y Refinamiento.**
    Antes de finalizar, revisa tu borrador con rigor:
    -   **Fidelidad a las Fuentes:** ¿Cada parte del plan (justificación, actividades, etc.) se basa DIRECTA y EXCLUSIVAMENTE en la información contenida en los tres PDF proporcionados?
    -   **Coherencia Pedagógica:** ¿Las actividades reflejan el método justificado? ¿Hay una progresión lógica entre las sesiones?
    -   **Adecuación al Usuario:** ¿La complejidad, los temas y los materiales son apropiados para la edad y el objetivo del usuario?
    -   **Claridad y Acción:** ¿Las instrucciones son claras y fáciles de ejecutar para un educador?

    **Paso 5: Generación de la Respuesta Final en JSON.**
    Basado en tu refinamiento, genera ÚNICAMENTE el objeto JSON final. La salida debe ser exclusivamente el JSON, sin ningún texto introductorio, explicación o marcador de formato adicional. Asegúrate de que el JSON se adhiera perfectamente al esquema definido en la aplicación.
  `;
};

// --- RUTA DE VERIFICACIÓN DE ESTADO (HEALTH CHECK) ---
// Responde a las peticiones GET en la raíz para que Google Cloud sepa que el servicio está funcionando.
app.get('/', (req, res) => {
  res.status(200).send('¡El backend del Asistente de Lectoescritura está en línea y listo para recibir peticiones POST en /generate-plan!');
});

// --- ENDPOINT PRINCIPAL DE LA API ---
// Se define la ruta '/generate-plan'. Netlify redirigirá las peticiones de '/api/generate-plan' a esta ruta.
app.post('/generate-plan', async (req, res) => {
  // Verificación de seguridad: si la API Key no está cargada, se detiene la ejecución.
  if (!apiKey) {
    console.error("Intento de ejecución sin API Key.");
    return res.status(500).json({ message: 'Error crítico de configuración del servidor.' });
  }

  try {
    // 1. Extraer los datos enviados por el frontend desde el cuerpo de la petición.
    const { age, sessions, objective } = req.body;

    // 2. Validar que los datos necesarios fueron recibidos.
    if (!age || !sessions || !objective) {
      return res.status(400).json({ message: 'Petición incompleta. Faltan los parámetros: edad, sesiones u objetivo.' });
    }

    // 3. Construir el prompt dinámico con los datos del usuario.
    const prompt = getSystemPrompt(age, sessions, objective);

    // 4. Configurar el modelo de Gemini para que genere la respuesta en formato JSON.
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Modelo recomendado por su balance de velocidad y capacidad
      safetySettings: safetySettings,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // 5. Realizar la llamada a la API de Gemini.
    console.log("Generando plan de clase para los siguientes parámetros:", { age, sessions, objective });
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // 6. Enviar la respuesta generada (el plan de clase en JSON) de vuelta al frontend.
    res.json(JSON.parse(response.text()));
    console.log("Plan de clase generado y enviado con éxito.");

  } catch (error) {
    // 7. Manejo de errores durante la llamada a la API.
    console.error('Error durante la llamada a la API de Gemini:', error);
    res.status(500).json({ message: 'Ocurrió un error en el servidor al intentar generar el plan de clase. Por favor, inténtalo de nuevo más tarde.' });
  }
});


// --- Inicio del Servidor ---
// El servidor escucha en el puerto proporcionado por Google Cloud Run o en el 8080 para desarrollo local.
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`El servidor de planes de clase está activo y escuchando en el puerto ${port}`);
});