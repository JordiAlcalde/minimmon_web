/**
 * geminiAiService.js
 * Servei per interactuar amb la API de Google Gemini (gemini-3.8-flash)
 * per als descriptors de PROJECTES i PRODUCTES de Mínim Món.
 */

const DEFAULT_API_KEY = "";
// Llista de models amb fallback en cas de saturació temporal de servidors (Error 503 / High Demand)
const GEMINI_MODELS = [
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest"
];

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
,

  posting: `Ets el redactor i creador de continguts oficial d'Instagram de "Mínim Món" (taller artesanal de Jordi Alcalde, fusta natural, miniatures, diorames i regals únics a Catalunya - web: minimmon.cat, instagram: @minimmon58).
La teva missió és analitzar l'assumpte o tema lliure que et proposa l'artesà i, si s'escau, la fotografia aportada, i generar una proposta completa de post d'Instagram que transmeti la filosofia de Mínim Món:
- Valors: L'art de la paciència, la tecnologia del present (gravat làser de precisió) al servei de l'emoció, la calidesa de la fusta natural, l'ofici de tota una vida i la voluntat d'aturar el temps en petits formats tangibles.
- To: Proper, càlid, sensible sense caure en la sensibleria buida, poètic però clar, professional i artesanal.
- Redacció en català impecable.

A partir de l'assumpte i indicacions proposades, has de proporcionar:
1. "titol": Títol breu, concís i potent per a col·locar sobre la imatge del post (màxim 5-7 paraules).
2. "subtitol": Subtítol breu o frase evocadora d'una sola línia per a la imatge (màxim 12 paraules).
3. "etiqueta": Etiqueta curta o insígnia per a la imatge (ex: "✨ Novetat", "🌿 Al taller", "🪵 Fusta amb ànima", "📢 Estrena del web", "🕊️ Record únic", etc.).
4. "copy": Text complet del post per a Instagram (amb ganxo inicial atractiu, desenvolupament càlid que expliqui l'essència, crida a l'acció natural invitant a visitar l'enllaç de la bio cap a www.minimmon.cat o perfil @minimmon58, i una selecció d'etiquetes/hashtags rellevants).
5. "variantsCopy": Llista de 2 o 3 variants de copy amb diferents enfocaments (per exemple: una més Emocional/Poètica, una de Taller/Artesania i una altra Directa/Notícia).

RESPON EXCLUSIVAMENT EN FORMAT JSON VÀLID (sense cometes de markdown ni codi afegit) amb aquesta estructura exacta:
{
  "titol": "Títol breu per a la imatge",
  "subtitol": "Subtítol breu per a la imatge",
  "etiqueta": "Píndola curta per a la imatge",
  "copy": "Text complet del post d'Instagram amb salts de línia, crida a l'acció i hashtags",
  "variantsCopy": [
    {
      "estil": "Emocional i Poètica",
      "copy": "Text de la primera variant..."
    },
    {
      "estil": "Taller i Procés",
      "copy": "Text de la segona variant..."
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
  } else if (type === 'posting') {
    if (contextInfo.assumpte) userText += `- Assumpte o tema del post: ${contextInfo.assumpte}\n`;
    if (contextInfo.to) userText += `- Enfocament o to desitjat: ${contextInfo.to}\n`;
    if (contextInfo.format) userText += `- Format d'Instagram: ${contextInfo.format}\n`;
    if (contextInfo.titolPrevi) userText += `- Títol previ considerat: ${contextInfo.titolPrevi}\n`;
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

  let lastError = null;
  let rawOutput = '';

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

        // Si el model té una punta de saturació temporal (503 / 429) o no disponible (404), provem el següent
        const isTemporaryUnavailable = 
          response.status === 503 || 
          response.status === 429 || 
          response.status === 404 || 
          errMessage.toLowerCase().includes('high demand') || 
          errMessage.toLowerCase().includes('quota') ||
          errMessage.toLowerCase().includes('temporary');

        if (isTemporaryUnavailable) {
          console.warn(`Model ${model} saturat o temporalment no disponible (${errMessage}). Provant model alternatiu...`);
          lastError = new Error(errMessage);
          continue;
        }

        throw new Error(errMessage);
      }

      const result = await response.json();
      rawOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (rawOutput) break;
    } catch (err) {
      lastError = err;
      const msg = err.message ? err.message.toLowerCase() : '';
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('429') || msg.includes('temporary')) {
        continue;
      }
      throw err;
    }
  }

  if (!rawOutput) {
    throw lastError || new Error("No s'ha obtingut resposta de cap model de Gemini.");
  }
  
  const parsedJson = extractJsonFromGeminiResponse(rawOutput);

  return {
    rawOutput,
    data: parsedJson
  };
}

/**
 * Assistent integrat de Copywriting i disseny per a Tema Lliure a Posting
 */
export async function generatePostingAssistantContent({
  topic = '',
  tone = 'noticia', // 'noticia' | 'emocional' | 'taller' | 'filosofia' | 'regal'
  imageUrl = '',
  existingTitle = '',
  format = '4:5',
  apiKeyOverride = null
}) {
  const cleanTopic = (topic || '').trim();
  const apiKey = apiKeyOverride || getGeminiApiKey();

  // 1. Si tenim clau d'API de Gemini, fem servir la potència del model
  if (apiKey) {
    try {
      const res = await callGeminiDescriptor({
        type: 'posting',
        contextInfo: {
          assumpte: cleanTopic || 'Novetat de Mínim Món',
          to: tone,
          format,
          titolPrevi: existingTitle
        },
        images: imageUrl ? [imageUrl] : [],
        apiKeyOverride: apiKey
      });

      if (res?.data && res.data.copy && res.data.titol) {
        return {
          titol: res.data.titol,
          subtitol: res.data.subtitol || 'Artesania amb ànima en fusta natural.',
          etiqueta: res.data.etiqueta || '✨ Novetat',
          copy: res.data.copy,
          variantsCopy: Array.isArray(res.data.variantsCopy) ? res.data.variantsCopy : [],
          fromAi: true
        };
      }
    } catch (err) {
      console.warn("Falla de crida a Gemini per a Posting, activant generador contextual local:", err);
    }
  }

  // 2. Generador contextual local intel·ligent (fallback autònom de Mínim Món)
  const isWebTheme = /web|estrena|estrenem|nova pàgina|nou web|llançament|online|portal|inici/i.test(cleanTopic);
  const isFiraTheme = /fira|mercat|parada|cap de setmana|diumenge|dissabte|trobada/i.test(cleanTopic);
  const isTallerTheme = /taller|fusta|làser|gravat|eina|procés|banc|encenall|màquina/i.test(cleanTopic);
  const isDioramaTheme = /diorama|mons mínims|miniatura|record|espai|memòria/i.test(cleanTopic);

  let titol = 'Mínim Món';
  let subtitol = 'Artesania amb ànima i fusta natural.';
  let etiqueta = '✨ Novetat';
  let copyIntro = '';
  let copyBody = '';
  let copyCta = '🔗 Teniu l’enllaç a la bio (@minimmon58) o a www.minimmon.cat per descobrir-ne tots els detalls!';

  if (isWebTheme) {
    titol = 'Estrenem nou web!';
    subtitol = 'Una finestra oberta al nostre univers artesanal.';
    etiqueta = '✨ Nou Web';
    copyIntro = 'Després de moltes hores de feina al taller i davant la pantalla, per fi us podem presentar el nou web de Mínim Món! 🪵✨\n\nUn espai creat amb la mateixa calma i cura amb què tractem cada peça de fusta.';
    copyBody = 'A www.minimmon.cat hi trobareu:\n🌿 La nostra filosofia i la manera d’entendre aquest ofici.\n🖼️ Els nostres Mons Mínims i diorames fets a mà.\n🔑 El catàleg complet de peces i detalls personalitzats.\n🔨 Una mirada íntima al taller i a tot el procés creatiu.\n\nUs convidem a passejar-hi, tafanejar cada racó i fer-nos arribar les vostres impressions!';
  } else if (isFiraTheme) {
    titol = 'Ens veiem a la fira!';
    subtitol = 'Portem les nostres creacions de fusta a peu de carrer.';
    etiqueta = '📍 Parada artesana';
    copyIntro = 'Aquest cap de setmana traiem el taller al carrer! 🪵🎪\n\nEstem preparant les caixes amb tota la il·lusió per retrobar-nos amb vosaltres i compartir l’artesania en viu.';
    copyBody = `${cleanTopic ? cleanTopic + '\n\n' : ''}Tindrem exposats els nostres diorames 'Mons Mínims', clauers únics, peces de regal i estarem encantats d’explicar-vos com prenen forma al taller. Si sou a prop, passeu a saludar!`;
  } else if (isTallerTheme || tone === 'taller') {
    titol = 'L’ànima del taller';
    subtitol = 'On la tecnologia es fon amb l’ofici artesanal.';
    etiqueta = '🔨 Des del Taller';
    copyIntro = 'Hi ha una màgia especial en l’olor de la fusta acabada de tallar i el so tranquil del taller. 🪵⚙️';
    copyBody = `${cleanTopic ? cleanTopic + '\n\n' : 'Cada projecte comença com una idea i es converteix en realitat combinant el càlcul precís del làser amb l’acabat pacient i càlid de les nostres mans.\n\n'}Perquè a Mínim Món no només treballem materials; creem peces que guarden memòria.`;
  } else if (tone === 'emocional' || isDioramaTheme) {
    titol = 'L’art d’aturar el temps';
    subtitol = 'Capturar records i espais en petits formats tangibles.';
    etiqueta = '🤍 Record únic';
    copyIntro = 'Hi ha moments, llocs i persones que mereixen quedar gravats per sempre. 🪵🕊️';
    copyBody = `${cleanTopic ? cleanTopic + '\n\n' : 'A Mínim Món traduïm emocions a relleus, ombres i textures. Cada peça és una història que connecta el passat amb el present a través de la fusta natural.\n\n'}Fet a mà, amb paciència i amb tota la sensibilitat que cada record es mereix.`;
  } else {
    titol = cleanTopic ? (cleanTopic.length > 35 ? cleanTopic.slice(0, 32) + '...' : cleanTopic) : 'Creacions amb ànima';
    subtitol = 'Fusta, paciència i tecnologia al servei de l’emoció.';
    etiqueta = '✨ Mínim Món';
    copyIntro = `${cleanTopic || 'Un nou projecte pren vida al nostre taller.'} 🪵✨`;
    copyBody = 'Elaborat a mà a Catalunya, cuidant cada detall mil·limètric i respectant la veta natural de la fusta per aconseguir un resultat autèntic i irrepetible.';
  }

  const hashtags = '\n\n#minimmon #artesaniacatalana #fustaartesanal #fetama #diorames #espaisenminiatura #fetacatalunya #dissenyartesanal #recordsenfusta #tallerartesanal';

  const mainCopy = `${copyIntro}\n\n${copyBody}\n\n${copyCta}${hashtags}`;

  const variantEmocional = `${copyIntro.replace('!', '.')} 🪵🤍\n\nLa fusta té memòria, i al nostre taller ens agrada escoltar-la i donar-li forma amb calma.\n\n${copyBody}\n\n${copyCta}${hashtags}`;

  const variantTaller = `Directe des del nostre banc de treball! 🔨🪵\n\n${cleanTopic || 'Continuem creant noves peces i perfeccionant cada relleu al taller.'}\n\nPeces úniques que combinen el gravat làser d’alta precisió amb el tacte càlid de l’artesania tradicional.\n\n${copyCta}${hashtags}`;

  return {
    titol,
    subtitol,
    etiqueta,
    copy: mainCopy,
    variantsCopy: [
      { estil: 'To Emocional & Memòria', copy: variantEmocional },
      { estil: 'To Taller & Ofici', copy: variantTaller }
    ],
    fromAi: false
  };
}

