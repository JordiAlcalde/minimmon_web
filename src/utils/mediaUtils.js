export const GITHUB_RAW_BASE = "https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/";
export const GITHUB_RAW_PRODUCTES_BASE = "https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/productes/";
export const GITHUB_RAW_PROJECTES_BASE = "https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/projectes/";
export const GITHUB_RAW_MATERIALS_BASE = "https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/materials/";
export const JSDELIVR_VIDEO_BASE = "https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/";

export function toRawProjecteUrl(input) {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/') && !trimmed.includes('/imatges/projectes/')) {
      return trimmed.replace('/public/imatges/', '/public/imatges/projectes/');
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/') && !trimmed.includes('/imatges/projectes/')) {
      return trimmed.replace('/imatges/', '/public/imatges/projectes/');
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/') && !trimmed.includes('/imatges/projectes/')) {
      return trimmed.replace('/public/imatges/', '/public/imatges/projectes/');
    }
    return trimmed;
  }
  let clean = trimmed.replace(/^\/+/, '');
  if (clean.startsWith('public/')) clean = clean.replace('public/', '');
  if (clean.startsWith('imatges/projectes/')) clean = clean.replace('imatges/projectes/', '');
  else if (clean.startsWith('imatges/')) clean = clean.replace('imatges/', '');
  else if (clean.startsWith('projectes/')) clean = clean.replace('projectes/', '');

  return `${GITHUB_RAW_PROJECTES_BASE}${clean}`;
}

export function isVideoExtension(path = '') {
  const lower = path.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.webm') || lower.includes('.m4v') || lower.endsWith('.ogv');
}

export function safeEncodeURI(urlStr) {
  if (!urlStr) return '';
  try {
    let current = urlStr;
    // Unwrap any multi-encoded %2525 sequences
    while (current.includes('%25')) {
      current = decodeURIComponent(current);
    }
    const decoded = decodeURI(current);
    return encodeURI(decoded);
  } catch (e) {
    return encodeURI(urlStr);
  }
}

export function resolveMediaUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  // If it's a full URL pointing to GitHub repo, normalize to local path
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/', '');
      return resolveMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/', '');
      return resolveMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/', '');
      return resolveMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/', '');
      return resolveMediaUrl(rel);
    }
    return safeEncodeURI(trimmed);
  }
  
  let cleanPath = trimmed;
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
  if (cleanPath.startsWith('public/')) cleanPath = cleanPath.replace('public/', '');
  
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL) || './';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  // Local assets in public/images/
  if (cleanPath.startsWith('images/')) {
    if (cleanPath.startsWith('images/etiqueta_')) {
      cleanPath = cleanPath.replace('images/', 'imatges/productes/');
      return safeEncodeURI(`${prefix}${cleanPath}`);
    }
    return safeEncodeURI(`${prefix}${cleanPath}`);
  }

  // If path already starts with imatges/
  if (cleanPath.startsWith('imatges/')) {
    if (
      cleanPath.startsWith('imatges/productes/') ||
      cleanPath.startsWith('imatges/projectes/') ||
      cleanPath.startsWith('imatges/materials/') ||
      cleanPath.startsWith('imatges/temporal/')
    ) {
      return safeEncodeURI(`${prefix}${cleanPath}`);
    }

    const filename = cleanPath.replace('imatges/', '');
    if (
      filename.startsWith('etiqueta_') ||
      filename.startsWith('família_') ||
      filename.startsWith('familia_') ||
      filename.startsWith('clauer_') ||
      filename.startsWith('joc_') ||
      filename.startsWith('punt_') ||
      filename.startsWith('puzle_') ||
      filename.startsWith('caixa_') ||
      filename.startsWith('marc_')
    ) {
      cleanPath = `imatges/productes/${filename}`;
    } else {
      // All other images that were in public/imatges/ are now in public/imatges/projectes/
      cleanPath = `imatges/projectes/${filename}`;
    }
    return safeEncodeURI(`${prefix}${cleanPath}`);
  }

  // Handle paths that don't start with imatges/ and don't start with videos/
  if (!cleanPath.startsWith('videos/')) {
    if (cleanPath.startsWith('productes/')) {
      cleanPath = `imatges/${cleanPath}`;
    } else if (cleanPath.startsWith('projectes/')) {
      cleanPath = `imatges/${cleanPath}`;
    } else if (cleanPath.startsWith('materials/')) {
      cleanPath = `imatges/${cleanPath}`;
    } else if (
      cleanPath.startsWith('família_') ||
      cleanPath.startsWith('familia_') ||
      cleanPath.startsWith('clauer_') ||
      cleanPath.startsWith('joc_') ||
      cleanPath.startsWith('etiqueta_') ||
      cleanPath.startsWith('punt_') ||
      cleanPath.startsWith('puzle_') ||
      cleanPath.startsWith('caixa_') ||
      cleanPath.startsWith('marc_')
    ) {
      cleanPath = `imatges/productes/${cleanPath}`;
    } else {
      cleanPath = isVideoExtension(cleanPath) ? `videos/${cleanPath}` : `imatges/projectes/${cleanPath}`;
    }
  }

  return safeEncodeURI(`${prefix}${cleanPath}`);
}

export function resolveProducteMediaUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/productes/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/productes/', '');
      return resolveProducteMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/', '');
      return resolveProducteMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/imatges/productes/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/imatges/productes/', '');
      return resolveProducteMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/', '');
      return resolveProducteMediaUrl(rel);
    }
    return safeEncodeURI(trimmed);
  }
  
  let cleanPath = trimmed;
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
  if (cleanPath.startsWith('public/')) cleanPath = cleanPath.replace('public/', '');
  
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL) || './';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  if (cleanPath.startsWith('images/')) {
    if (cleanPath.startsWith('images/etiqueta_')) {
      cleanPath = cleanPath.replace('images/', '');
    } else {
      return safeEncodeURI(`${prefix}${cleanPath}`);
    }
  }

  // Remove imatges/productes/ or imatges/ prefix if present
  if (cleanPath.startsWith('imatges/productes/')) {
    cleanPath = cleanPath.replace('imatges/productes/', '');
  } else if (cleanPath.startsWith('imatges/')) {
    cleanPath = cleanPath.replace('imatges/', '');
  }

  return safeEncodeURI(`${prefix}imatges/productes/${cleanPath}`);
}

export function resolveProjecteMediaUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/projectes/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/projectes/', '');
      return resolveProjecteMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/projectes/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/projectes/', '');
      return resolveProjecteMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/', '');
      return resolveProjecteMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/', '');
      return resolveProjecteMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/projectes/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/projectes/', '');
      return resolveProjecteMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/', '');
      return resolveProjecteMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/', '');
      return resolveProjecteMediaUrl(rel);
    }
    return safeEncodeURI(trimmed);
  }

  let cleanPath = trimmed;
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
  if (cleanPath.startsWith('public/')) cleanPath = cleanPath.replace('public/', '');

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL) || './';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  if (cleanPath.startsWith('imatges/projectes/')) {
    cleanPath = cleanPath.replace('imatges/projectes/', '');
  } else if (cleanPath.startsWith('imatges/')) {
    cleanPath = cleanPath.replace('imatges/', '');
  } else if (cleanPath.startsWith('projectes/')) {
    cleanPath = cleanPath.replace('projectes/', '');
  }

  return safeEncodeURI(`${prefix}imatges/projectes/${cleanPath}`);
}

export function resolveMaterialMediaUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/materials/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/materials/', '');
      return resolveMaterialMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/materials/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/materials/', '');
      return resolveMaterialMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/public/imatges/', '');
      return resolveMaterialMediaUrl(rel);
    }
    if (trimmed.includes('raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/')) {
      const rel = trimmed.replace('https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/imatges/', '');
      return resolveMaterialMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/materials/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/materials/', '');
      return resolveMaterialMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/public/imatges/', '');
      return resolveMaterialMediaUrl(rel);
    }
    if (trimmed.includes('cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/')) {
      const rel = trimmed.replace('https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/', '');
      return resolveMaterialMediaUrl(rel);
    }
    return safeEncodeURI(trimmed);
  }

  let cleanPath = trimmed;
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
  if (cleanPath.startsWith('public/')) cleanPath = cleanPath.replace('public/', '');

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL) || './';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  if (cleanPath.startsWith('imatges/materials/')) {
    cleanPath = cleanPath.replace('imatges/materials/', '');
  } else if (cleanPath.startsWith('imatges/')) {
    cleanPath = cleanPath.replace('imatges/', '');
  } else if (cleanPath.startsWith('materials/')) {
    cleanPath = cleanPath.replace('materials/', '');
  }

  return safeEncodeURI(`${prefix}imatges/materials/${cleanPath}`);
}

export function handleImageFallback(e, fallbackUrl = 'images/tots_productes.jpg') {
  if (!e || !e.target) return;
  if (fallbackUrl) {
    e.target.src = resolveMediaUrl(fallbackUrl);
  }
}

export function formatVideoEmbedUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  // YouTube watch URL: https://www.youtube.com/watch?v=XYZ
  if (trimmed.includes('youtube.com/watch')) {
    const match = trimmed.match(/v=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  // YouTube short URL: https://youtu.be/XYZ
  if (trimmed.includes('youtu.be/')) {
    const match = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  // Vimeo URL: https://vimeo.com/XYZ
  if (trimmed.includes('vimeo.com/')) {
    const match = trimmed.match(/vimeo\.com\/([0-9]+)/);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }

  return resolveMediaUrl(trimmed);
}

export function formatDateDDMMAAAA(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // If format is YYYY-MM-DD
  const matchISO = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchISO) {
    const [, yyyy, mm, dd] = matchISO;
    return `${dd.padStart(2, '0')}-${mm.padStart(2, '0')}-${yyyy}`;
  }

  // If format is DD-MM-YYYY or DD/MM/YYYY
  const matchEU = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchEU) {
    const [, dd, mm, yyyy] = matchEU;
    return `${dd.padStart(2, '0')}-${mm.padStart(2, '0')}-${yyyy}`;
  }

  return str;
}

