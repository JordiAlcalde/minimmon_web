/**
 * geminiAiService.js
 * Servei per interactuar amb la API de Google Gemini (gemini-3.8-flash)
 * per als descriptors de PROJECTES i PRODUCTES de Mínim Món.
 */

const DEFAULT_API_KEY = "";
const GEMINI_MODEL = "gemini-3.8-flash";

export const DEFAULT_PROMPTS = {
  projectes: `Ets un escriptor/a capaç de captar i d'extraure el significat dels projectes el·laborats per Mínim Món. Prenent com a punt de partida l'explicació del encàrrec del client i a la vista del resultat, descrius breument cada una d'aquestes seccions:
- L'encàrrec (demanda del client)
- La traducció artística (procés i disseny)
- La resolució (resultat final)

T'expresses de manera natural, amb sensibilitat però no sensibleria, sense frases recaragolades, emprant metàfores o simbolismes només si és necessari. Apart de la pura descripció de les seccions, el text ha de trasmetre la sensibilitat del artesà, el perquè dels detalls, l'ànima de l'obra.
Apart de les tres seccions, has d'atorgar un títol i un subtítol que defineixin el projecte. Han de ser curts i rellevants.
Per a cada projecte analitzes les imatges proporcionades i tens en compte, com a base de coneixement, la resta de projectes i filosofia general de la pàgina web minimmon.cat.

RESPON EXCLUSIVAMENT EN FORMAT JSON VÀLID (sense cometes de markdown de codi si és possible, o en bloc json) amb aquesta estructura exacta:
{
  "titol": "Títol curt i rellevant del projecte",
  "subtitol": "Subtítol breu que defineix el projecte",
  "encarrec": "Text concís de la demanda del client",
  "traduccioArtistica": "Text del procés, disseny i decisió dels detalls",
  "resolucio": "Text del resultat final i l'ànima de l'obra",
  "propostesAlternativesTitol": ["Opció 1", "Opció 2"]
}`,

  productes: `Ets un escriptor/a capaç de captar i d'extraure el significat dels productes el·laborats per Mínim Món. Prenent com a punt de partida les imatges proporcionades i les característiques generals que defineixen la gamma on pertany, has de generar vàries propostes per aquests dos ítems:
- El NOM, de preferència amb una única paraula, si no s'especifica el contrari. És el nom que tindrà a la llista de productes del web i pel que serà conegut al llarg del temps.
- La DESCRIPCIÓ, no excessivament llarga però suficientment explicativa. És el text que acompanya el producte al web i ha de ser prou atraient i motivadora pel lector.

T'expresses de manera natural, amb sensibilitat però no sensibleria, sense frases recaragolades, emprant metàfores o simbolismes només si és necessari. Apart de la pura descripció de les seccions, el text ha de trasmetre la sensibilitat del artesà i el perquè dels detalls.
Revisa el contingut del web minimmon.cat per estar entonat amb el conjunt de projectes i productes.

RESPON EXCLUSIVAMENT EN FORMAT JSON VÀLID (sense cometes de markdown de codi si és possible, o en bloc json) amb aquesta estructura exacta:
{
  "noms": [
    { "nom": "ParaulaÚnica1", "motiu": "Breu explicació del significat i essència" },
    { "nom": "ParaulaÚnica2", "motiu": "Breu explicació del significat i essència" },
    { "nom": "ParaulaÚnica3", "motiu": "Breu explicació del significat i essència" }
  ],
  "descripcions": [
    {
      "estil": "Emocional i Càlida",
      "text": "Text que connecta amb la fusta, l'artesania i el sentiment de la llar o regal."
    },
    {
      "estil": "Botiga Web i Comercial",
      "text": "Text equilibrat, atractiu per a la compra i destacant la personalització."
    },
    {
      "estil": "Poètica i Essencial",
      "text": "Text breu i evocador que sintetitza la bellesa de la peça."
    }
  ]
}`
};

export function getGeminiApiKey() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved && saved.trim()) return saved.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY.trim();
  }
  return DEFAULT_API_KEY;
}

export function setGeminiApiKey(key) {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }
}

export function getCustomPrompt(type) {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`gemini_prompt_${type}`);
    if (saved && saved.trim()) return saved;
  }
  return DEFAULT_PROMPTS[type] || '';
}

export function setCustomPrompt(type, text) {
  if (typeof window !== 'undefined') {
    if (text && text.trim()) {
      localStorage.setItem(`gemini_prompt_${type}`, text);
    } else {
      localStorage.removeItem(`gemini_prompt_${type}`);
    }
  }
}

/**
 * Converteix una imatge (URL, Blob, File o DataURL) a un objecte { mimeType, data } base64 per a Gemini
 */
export async function convertImageToGeminiPart(imgSource) {
  if (!imgSource) return null;

  // Si ja és un File o Blob
  if (imgSource instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const match = result.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
          if (match) {
            resolve({ mimeType: match[1], data: match[2] });
            return;
          }
        }
        resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(imgSource);
    });
  }

  // Si és un String
  if (typeof imgSource === 'string') {
    // Si ja és un Data URL base64
    if (imgSource.startsWith('data:image/')) {
      const match = imgSource.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
    }

    // Si és una URL HTTP o relativa local
    try {
      const resp = await fetch(imgSource);
      const blob = await resp.blob();
      return await convertImageToGeminiPart(blob);
    } catch (e) {
      // Intentar càrrega via Image en Canvas per evitar alguns problemes de CORS locals
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            // Reduir mida si és enorme per agilitzar el transport
            const maxDim = 1024;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
            if (match) {
              resolve({ mimeType: match[1], data: match[2] });
              return;
            }
          } catch (err) {
            console.warn("No s'ha pogut extreure base64 del canvas:", err);
          }
          resolve(null);
        };
        img.onerror = () => resolve(null);
        img.src = imgSource;
      });
    }
  }

  return null;
}

/**
 * Neteja la resposta de Gemini per extreure el JSON fins i tot si ve embolicat en ```json ... ```
 */
function extractJsonFromGeminiResponse(rawText) {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  
  // Eliminar blocs markdown de codi si n'hi ha
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Si hi ha text abans o després del JSON, intentar trobar el primer '{' i l'últim '}'
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const sub = cleaned.substring(start, end + 1);
        return JSON.parse(sub);
      } catch (e2) {
        console.warn("Error secundari parsejant JSON:", e2);
      }
    }
    console.warn("No s'ha pogut parsejar la resposta com a JSON:", rawText);
    return null;
  }
}

/**
 * Crida principal al model Gemini
 */
export async function callGeminiDescriptor({
  type = 'productes', // 'projectes' | 'productes'
  contextInfo = {},
  notes = '',
  images = [],
  apiKeyOverride = null,
  customSystemPrompt = null
}) {
  const apiKey = apiKeyOverride || getGeminiApiKey();
  if (!apiKey) {
    throw new Error("No s'ha configurat cap clau d'API de Gemini.");
  }

  const systemPrompt = customSystemPrompt || getCustomPrompt(type);

  // Preparar les parts de contingut
  const parts = [];

  // 1. Imatges
  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      const part = await convertImageToGeminiPart(img);
      if (part && part.data) {
        parts.push({
          inlineData: {
            mimeType: part.mimeType,
            data: part.data
          }
        });
      }
    }
  }

  // 2. Text de context i comanda
  let userText = `INSTRUCCIONS I DIRECTRIUS DEL DESCRIPTOR:\n${systemPrompt}\n\n`;
  userText += `--- DADES DE CONTEXT DE LA FITXA (${type.toUpperCase()}) ---\n`;

  if (type === 'projectes') {
    if (contextInfo.titol) userText += `- Títol actual: ${contextInfo.titol}\n`;
    if (contextInfo.subtitol) userText += `- Subtítol actual: ${contextInfo.subtitol}\n`;
    if (contextInfo.client) userText += `- Client / Destinatari: ${contextInfo.client}\n`;
    if (contextInfo.branca) userText += `- Branca de treball: ${contextInfo.branca}\n`;
    if (contextInfo.encarrec) userText += `- Apunts previs d'encàrrec: ${contextInfo.encarrec}\n`;
    if (contextInfo.art) userText += `- Apunts previs de traducció artística: ${contextInfo.art}\n`;
    if (contextInfo.resolucio) userText += `- Apunts previs de resolució: ${contextInfo.resolucio}\n`;
  } else {
    // productes
    if (contextInfo.nom) userText += `- Nom actual: ${contextInfo.nom}\n`;
    if (contextInfo.gamma) userText += `- Gamma: ${contextInfo.gamma}\n`;
    if (contextInfo.familia) userText += `- Família: ${contextInfo.familia}\n`;
    if (contextInfo.material) userText += `- Material: ${contextInfo.material}\n`;
    if (contextInfo.dimensions) userText += `- Dimensions: ${contextInfo.dimensions}\n`;
    if (contextInfo.descripcio) userText += `- Descripció existent prèvia: ${contextInfo.descripcio}\n`;
  }

  if (notes && notes.trim()) {
    userText += `\n--- NOTES AFEGIDES PER L'ARTESÀ AL MOMENT ---\n${notes.trim()}\n`;
  }

  userText += `\nGenera la resposta seguint estrictament les instruccions del Gem i retorna el JSON requerit.`;

  parts.push({ text: userText });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    let errMessage = `Error HTTP ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error?.message) {
        errMessage = errData.error.message;
      }
    } catch (_) {}
    throw new Error(errMessage);
  }

  const result = await response.json();
  const rawOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  const parsedJson = extractJsonFromGeminiResponse(rawOutput);

  return {
    rawOutput,
    data: parsedJson
  };
}
