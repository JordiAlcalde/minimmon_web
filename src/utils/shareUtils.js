export function getDirectLink(type, id) {
  const origin = window.location.origin + window.location.pathname;
  if (type === 'projecte') {
    return `${origin}?projecte=${encodeURIComponent(id)}`;
  } else if (type === 'producte') {
    return `${origin}?producte=${encodeURIComponent(id)}`;
  } else if (type === 'seccio') {
    return `${origin}?seccio=${encodeURIComponent(id)}`;
  }
  return origin;
}

export async function copyDirectLink(type, id) {
  const link = getDirectLink(type, id);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
      return { success: true, link };
    }
    throw new Error('Clipboard API no disponible');
  } catch (err) {
    // Fallback per a navegadors antics
    const input = document.createElement('input');
    input.value = link;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return { success: true, link };
  }
}
