/**
 * Utilitat per gestionar la traducció automàtica transparent amb Google Translate
 */

export const SUPPORTED_LANGUAGES = {
  CA: 'ca',
  ES: 'es',
  EN: 'en',
  FR: 'fr'
};

const LANG_STORAGE_KEY = 'minimmon_user_lang';

/**
 * Netejador automàtic per suprimir la barra superior de Google Translate i forçar top: 0px
 */
export function initTransparentTranslatorCleaner() {
  if (typeof window === 'undefined') return;

  const hideBanner = () => {
    // Forçar top: 0px al cos de la pàgina
    if (document.body && document.body.style.top !== '0px') {
      document.body.style.top = '0px';
    }

    // Amagar qualsevol iframe o barra injectada per Google Translate
    const frames = document.querySelectorAll('iframe.goog-te-banner-frame, iframe.skiptranslate, iframe[id*=":1.container"], .VIpgJd-Z25bfe-hL9-b4256');
    frames.forEach(frame => {
      frame.style.setProperty('display', 'none', 'important');
      frame.style.setProperty('visibility', 'hidden', 'important');
      frame.style.setProperty('height', '0px', 'important');
      frame.style.setProperty('width', '0px', 'important');
    });
  };

  const observer = new MutationObserver(hideBanner);
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  }

  hideBanner();
}

/**
 * Obté l'idioma seleccionat actualment
 */
export function getCurrentLanguage() {
  return localStorage.getItem(LANG_STORAGE_KEY) || 'CA';
}

/**
 * Canvia l'idioma del web de manera transparent i recarrega immediatament la pàgina per aplicar la traducció
 * @param {string} langKey - 'CA' | 'ES' | 'EN' | 'FR'
 */
export function setLanguage(langKey) {
  const currentLang = getCurrentLanguage();
  const targetCode = SUPPORTED_LANGUAGES[langKey] || 'ca';
  localStorage.setItem(LANG_STORAGE_KEY, langKey);

  // Establir galetes de Google Translate per a l'idioma seleccionat
  if (targetCode === 'ca') {
    document.cookie = "googtrans=/ca/ca; path=/;";
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname;
  } else {
    document.cookie = `googtrans=/ca/${targetCode}; path=/;`;
    document.cookie = `googtrans=/ca/${targetCode}; path=/; domain=.` + window.location.hostname;
  }

  // Recarregar la pàgina si l'idioma ha canviat per aplicar la traducció automàticament sense F5 manual
  if (currentLang !== langKey) {
    window.location.reload();
  }
}
