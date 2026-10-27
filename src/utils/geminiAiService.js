/**
 * geminiAiService.js
 * Servei per interactuar amb la API de Google Gemini (gemini-3.8-flash)
 * per als descriptors de PROJECTES i PRODUCTES de Mínim Món.
 */
import { filterBannedHashtagsFromText, getStoredBannedHashtags } from './bannedHashtags';

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

  posting: `Ets el redactor i creador de continguts oficial d'Instagram de "Mínim Món" (taller artesanal de creació en fusta, miniatures, diorames i regals únics a Catalunya - web: minimmon.cat, instagram: @minimmon58).
La teva missió és analitzar l'element (producte de catàleg, projecte de taller o tema lliure) i, si s'escau, la fotografia aportada, i generar una proposta completa de post d'Instagram que transmeti la filosofia de Mínim Món:
- Valors: L'art de la paciència, el treball acurat en fusta i contraxapat de til·ler seleccionat polit a mà, el tall i gravat làser d'alta precisió al servei de l'emoció, la memòria i la calidesa de les vetes naturals. IMPORTANTÍSSIM: Mínim Món NO utilitza MAI fusta de bedoll, només fusta de til·ler. Mai parlis tampoc de "fusta noble" ni "fusta massissa". Parla sempre de fusta de til·ler seleccionat, polit suau i acabat artesanal.
- To: Proper, càlid, sensible sense sensibleria buida, poètic però clar, professional i amb l'aroma d'ofici de taller.
- Redacció en català impecable.

A partir de l'element, descripció, fotos i to proposats, has de proporcionar:
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
    const banned = getStoredBannedHashtags();
    if (banned && banned.length > 0) {
      userText += `- HASHTAGS VETATS (ESTRICTAMENT PROHIBITS): No utilitzis mai cap d'aquests hashtags: ${banned.join(', ')}. Estan completament vetats per a la marca.\n`;
    }
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
  itemType = null, // 'productes' | 'projectes' | 'custom'
  itemData = null,
  apiKeyOverride = null
}) {
  const cleanTopic = (topic || '').trim();
  const apiKey = apiKeyOverride || getGeminiApiKey();

  // Context detallat si ve d'un producte o projecte real
  const elementContext = itemData ? {
    tipus: itemType || 'element',
    nom: itemData.nom || itemData.titol || existingTitle || '',
    descripcio: itemData.descripcio || itemData.art || itemData.subtitol || '',
    branca: itemData.branca || itemData.category || '',
    preu: itemData.preu ? `${itemData.preu} €` : '',
    personalitzable: Array.isArray(itemData.opcionsPersonalitzacio) && itemData.opcionsPersonalitzacio.length > 0
  } : null;

  // 1. Si tenim clau d'API de Gemini, fem servir la potència del model
  if (apiKey) {
    try {
      const res = await callGeminiDescriptor({
        type: 'posting',
        contextInfo: {
          assumpte: cleanTopic || (elementContext ? `${elementContext.nom}: ${elementContext.descripcio}` : 'Creació de Mínim Món'),
          to: tone,
          format,
          titolPrevi: existingTitle,
          element: elementContext
        },
        images: imageUrl ? [imageUrl] : [],
        apiKeyOverride: apiKey
      });

      if (res?.data && res.data.copy && res.data.titol) {
        const bannedList = getStoredBannedHashtags();
        const cleanedCopy = filterBannedHashtagsFromText(res.data.copy, bannedList);
        const cleanedVariants = Array.isArray(res.data.variantsCopy)
          ? res.data.variantsCopy.map(v => ({
              ...v,
              copy: filterBannedHashtagsFromText(v.copy, bannedList)
            }))
          : [];

        return {
          titol: res.data.titol,
          subtitol: res.data.subtitol || 'Artesania amb ànima en fusta de til·ler.',
          etiqueta: res.data.etiqueta || (itemType === 'projectes' ? '🔨 Projecte d\'Atelier' : '✨ Fet a mà'),
          copy: cleanedCopy,
          variantsCopy: cleanedVariants,
          fromAi: true
        };
      }
    } catch (err) {
      console.warn("Falla de crida a Gemini per a Posting, activant generador contextual local:", err);
    }
  }

  // 2. Generador contextual local intel·ligent (fallback autònom de Mínim Món)
  const itemName = elementContext?.nom || existingTitle || cleanTopic || 'Peça artesanal';
  const itemDesc = elementContext?.descripcio || 'Elaborada amb paciència i cura al nostre taller.';
  const isProject = itemType === 'projectes' || /diorama|espai|memòria|herboristeria|orquestra|fruits|mundet|escacs/i.test(itemName + ' ' + cleanTopic);

  let titol = itemName;
  let subtitol = itemDesc.split('.')[0] || 'Artesania en fusta de til·ler i memòria.';
  let etiqueta = isProject ? '🔨 Projecte d\'Atelier' : '🪵 Fet a mà';
  let copyIntro = '';
  let copyBody = '';
  let copyCta = isProject 
    ? '✨ Teniu un record, un espai estimat o una història que voldríeu convertir en relleu de fusta? Parlem-ne per missatge privat o a través de www.minimmon.cat!'
    : '✨ Descobreix aquesta i altres peces al catàleg de la nostra bio (@minimmon58) o a www.minimmon.cat. Personalització a mida!';

  if (tone === 'emocional') {
    copyIntro = isProject
      ? `Hi ha històries que no es poden explicar només amb paraules; necessiten volum, calidesa i temps. 🪵🤍\n\nUs mostrem "${itemName}", una peça on cada detall és un homenatge a la memòria i als vincles que perduren.`
      : `Hi ha records que mereixen un lloc especial a casa. 🪵🤍\n\nUs presentem el nostre ${itemName}, dissenyat per acollir els vostres moments més feliços amb la textura suau del contraxapat de til·ler polit.`;
    copyBody = `${itemDesc}\n\nTreballat capa a capa, respectant la veta natural de la fusta i cuidant cada acabat perquè sigui un record per a tota la vida.`;
  } else if (tone === 'taller') {
    copyIntro = `Directe des del banc de feina del taller! 🔨🪵\n\nAvui donem els últims tocs a "${itemName}". La precisió del tall làser mil·limètric i el polit suau a mà és el que fa que cada peça tingui una presència única.`;
    copyBody = `${itemDesc}\n\nSense artificis: fusta de til·ler seleccionada, vetes naturals i la satisfacció de donar forma tangible a les idees amb calma.`;
  } else if (tone === 'regal') {
    copyIntro = `Busques un detall amb ànima i que no s'oblidi mai? 🎁✨\n\n"${itemName}" és una d'aquelles peces creades pensant en emocionar a qui més estimes.`;
    copyBody = `Artesania feta a Catalunya, personalització acurada i fusta de til·ler polit. ${itemDesc}\n\nUn detall que no surt d'una gran cadena, sinó que neix d'un ofici fet amb dedicació.`;
  } else {
    copyIntro = `Nova creació a l'atelier de Mínim Món: "${itemName}". 🪵✨`;
    copyBody = `${itemDesc}\n\nCada relleu i cada capa estan pensats per aturar el temps i transmetre la calidesa de la feina ben feta.`;
  }

  const bannedList = getStoredBannedHashtags();
  const rawHashtags = '\n\n#minimmon #artesaniacatalana #fetama #diorames #recordsenfusta #dissenyartesanal #tallerartesanal #fetaCat';
  const hashtags = filterBannedHashtagsFromText(rawHashtags, bannedList);

  const mainCopy = filterBannedHashtagsFromText(`${copyIntro}\n\n${copyBody}\n\n${copyCta}${hashtags}`, bannedList);
  const variantEmocional = filterBannedHashtagsFromText(`${copyIntro.replace('!', '.')} 🪵🤍\n\nLa fusta acull la memòria amb una calma difícil de trobar avui dia.\n\n${itemDesc}\n\n${copyCta}${hashtags}`, bannedList);
  const variantTaller = filterBannedHashtagsFromText(`Mirada al procés de taller: "${itemName}". 🔨🪵\n\n${itemDesc}\n\nContraxapat de til·ler seleccionat, polit fi a mà i la il·lusió de veure com un esbós pren vida volumètrica.\n\n${copyCta}${hashtags}`, bannedList);
  const variantRegal = filterBannedHashtagsFromText(`Un detall que parla de tu: "${itemName}". 🎁✨\n\n${itemDesc}\n\n${copyCta}${hashtags}`, bannedList);

  return {
    titol,
    subtitol,
    etiqueta,
    copy: mainCopy,
    variantsCopy: [
      { estil: 'To Emocional & Memòria', copy: variantEmocional },
      { estil: 'To Taller & Ofici', copy: variantTaller },
      { estil: 'To Regal & Detall', copy: variantRegal }
    ],
    fromAi: false
  };
}

