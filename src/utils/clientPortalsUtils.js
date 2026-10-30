/**
 * Utilitats per a la gestió de Portals Exclusius de Clients a Mínim Món
 */

/**
 * Paleta de colors per defecte suggerida per a nous clients
 */
export const DEFAULT_CLIENT_PALETTE = {
  primary: '#26170c',          // Color principal (botons, capçaleres)
  primaryContainer: '#f3ece4', // Fons de targetes i píndoles
  accent: '#a0522d',          // Detalls, preus o elements destacats
  surface: '#fbf9f8'          // Fons general del portal
};

/**
 * Normalitza un nom per convertir-lo en slug segur per a la URL (?nom_del_client)
 * Exemple: "Ajuntament de Mataró!" -> "ajuntament-de-mataro"
 */
export const generateSlugFromName = (name = '') => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina accents
    .replace(/[^a-z0-9_-]/g, '-')    // Reemplaça caràcters no alfanumèrics per guions
    .replace(/-+/g, '-')             // Evita guions duplicats
    .replace(/^-|-$/g, '');          // Elimina guions als extrems
};

/**
 * Valida si un slug és vàlid i segur per ser paràmetre a la URL
 */
export const isValidClientSlug = (slug = '') => {
  if (!slug || typeof slug !== 'string') return false;
  const reservedSlugs = [
    'producc', 'projecc', 'posting', 'perfer', 'nfc', 
    'comanda', 'seguiment', 'producte', 'projecte', 'seccio', 
    'privat', 'privada', 'taller', 'contacte', 'regals', 'mons', 'inici'
  ];
  const clean = slug.trim().toLowerCase();
  if (reservedSlugs.includes(clean)) return false;
  return /^[a-z0-9_-]{2,60}$/.test(clean);
};

/**
 * Construeix l'enllaç complet al portal del client
 */
export const buildClientPortalUrl = (slug = '') => {
  const origin = typeof window !== 'undefined' && window.location?.origin 
    ? window.location.origin 
    : 'https://minimmon.cat';
  return `${origin}/?${slug}`;
};

/**
 * Resol la ruta local del logotip del client a partir del nom del fitxer o ruta local a public/images/
 * Admet:
 * - "logo.png" -> "/images/clients/logo.png"
 * - "/images/logo.png" -> "/images/logo.png"
 * - "C:\Antigravity\MínimMón\public\images\clients\logo.png" -> "/images/clients/logo.png"
 */
export const resolveClientLogoUrl = (rawPath = '') => {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const clean = rawPath.trim();
  if (!clean) return '';

  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }

  let normalized = clean.replace(/\\/g, '/');

  const publicIdx = normalized.toLowerCase().indexOf('/public/');
  if (publicIdx !== -1) {
    normalized = normalized.substring(publicIdx + '/public'.length);
  }

  if (normalized.startsWith('/images/')) {
    return normalized;
  }
  if (normalized.startsWith('images/')) {
    return `/${normalized}`;
  }
  if (normalized.startsWith('/clients/')) {
    return `/images${normalized}`;
  }
  if (normalized.startsWith('clients/')) {
    return `/images/${normalized}`;
  }

  const fileName = normalized.replace(/^\/+/, '');
  return `/images/clients/${fileName}`;
};
