export const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/JordiAlcalde/minimmon_web/main/";
export const JSDELIVR_VIDEO_BASE = "https://cdn.jsdelivr.net/gh/JordiAlcalde/minimmon_web@main/";

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

  // Handle full HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    // If it's a raw.githubusercontent.com video link, convert to jsDelivr CDN so the browser receives Content-Type: video/mp4 with streaming support
    if (trimmed.includes('raw.githubusercontent.com') && isVideoExtension(trimmed)) {
      const parts = trimmed.replace('https://raw.githubusercontent.com/', '').split('/');
      if (parts.length >= 3) {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[2];
        const rest = parts.slice(3).join('/');
        return safeEncodeURI(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${rest}`);
      }
    }
    return safeEncodeURI(trimmed);
  }
  
  let cleanPath = trimmed;
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
  
  // Check if cleanPath is a local asset in public/images/
  if (cleanPath.startsWith('images/')) {
    const baseUrl = import.meta.env.BASE_URL || './';
    const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return safeEncodeURI(`${prefix}${cleanPath}`);
  }

  // Support imatges/, images/, and videos/ folders
  if (!cleanPath.startsWith('imatges/') && !cleanPath.startsWith('videos/')) {
    cleanPath = isVideoExtension(cleanPath) ? `videos/${cleanPath}` : `imatges/${cleanPath}`;
  }

  // Safely URL-encode spaces and special characters without double-encoding
  const encodedPath = safeEncodeURI(cleanPath);

  // If it's a video file, route through jsDelivr CDN for native HTML5 video streaming headers
  if (isVideoExtension(cleanPath)) {
    return `${JSDELIVR_VIDEO_BASE}${encodedPath}`;
  }

  return `${GITHUB_RAW_BASE}${encodedPath}`;
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
