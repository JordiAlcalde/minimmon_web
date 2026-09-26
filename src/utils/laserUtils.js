/**
 * Utilitats i estructures per a la gestió de paràmetres de Màquina Làser (LaserGRBL)
 * Diferencia entre paràmetres FIXOS (F) i VARIABLES (V), tant per GRAVAR com per TALLAR.
 */

export const DEFAULT_LASER_CONFIG = {
  gravar: {
    // --- 1. Preprocessament d'imatge (Imatge 1) ---
    redimensionar: 'Suavizado (HQ Bicubic)', // [F] Fix
    brillo: 40,                              // [V] 40 .. 160
    contraste: 40,                           // [V] 40 .. 160
    blancos: 0,                              // [V] 0 .. 100
    bnHabilitat: true,                       // [V] Checkbox B&N (activa/desactiva slider)
    bn: 0,                                   // [V] 0 .. 100

    // --- 2. Eina de conversió (Imatge 1) ---
    conversio: 'Línea a Línea',              // [F] Fix
    direccio: 'Horizontal',                  // [F] Fix
    qualitat: 11.940,                        // [F] Fix (Línies/mm)

    // --- 3. Velocitat i Potència Làser (Imatge 2) ---
    engravingSpeed: 3000,                    // [V] mm/min
    laserMode: 'M4 - Dynamic Power',         // [F] Fix
    sMin: 0,                                 // [F] Fix (0,0%)
    sMaxPercent: 95.0,                       // [V] 0% .. 100%
    sMaxPwm: 9500,                           // [V] PWM (proporcional, 0 .. 10000)

    // --- 4. Mida d'Imatge i Posició (Imatge 2) ---
    midaW: '',                               // [V] mm (Amplada)
    midaH: 'Proporcional',                   // [F] Fix (Calculat pel programa de marcatge)
    iniciX: 0.0,                             // [V] mm (X)
    iniciY: 0.0,                             // [V] mm (Y)

    // --- 5. Fitxer i Notes de Gravat (Escandall) ---
    ruta: '',                                // [V] Ruta de la carpeta al PC on es troba el fitxer
    fitxer: '',                              // [V] Nom del fitxer per a enviar al làser
    notes: ''                                // [V] Camp memo per a notes/observacions del procés
  },
  tallar: {
    // --- 1. Velocitat i Làser de Tall (Imatge 3) ---
    velocidadBorde: 140,                     // [V] mm/min
    laserOn: 'M4',                           // [F] Fix
    sMin: 0,                                 // [F] Fix (0,0%)
    sMaxPercent: 95.0,                       // [V] 0% .. 100%
    sMaxPwm: 9500,                           // [V] PWM (0 .. 10000)
    passades: 1,                             // [V] Nombre de passades (relacionat amb el material)

    // --- 2. Fitxer i Notes de Tall (Escandall) ---
    ruta: '',                                // [V] Ruta de la carpeta al PC on es troba el fitxer
    fitxer: '',                              // [V] Nom del fitxer per a enviar al làser
    notes: ''                                // [V] Camp memo per a notes/observacions del procés
  }
};

/**
 * Normalitza qualsevol objecte de paràmetres làser antic o incomplet
 * assegurant que contingui tots els camps de Gravar i Tallar amb valors vàlids.
 */
export function normalizeLaserConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_LASER_CONFIG));
  }

  // Compatibilitat amb el format simple anterior: { potencia: '65%', velocitat: '400 mm/s', passades: '1' }
  const isLegacy = raw.potencia !== undefined || raw.velocitat !== undefined || raw.passades !== undefined;
  let legacySpeed = 3000;
  let legacyPwm = 9500;
  let legacyPercent = 95.0;
  let legacyPassades = 1;

  if (isLegacy) {
    if (raw.velocitat) {
      const parsedSpeed = parseFloat(String(raw.velocitat).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedSpeed) && parsedSpeed > 0) {
        legacySpeed = parsedSpeed < 100 ? Math.round(parsedSpeed * 60) : Math.round(parsedSpeed);
      }
    }
    if (raw.potencia) {
      const parsedPow = parseFloat(String(raw.potencia).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedPow) && parsedPow >= 0 && parsedPow <= 100) {
        legacyPercent = parsedPow;
        legacyPwm = Math.round(parsedPow * 100);
      }
    }
    if (raw.passades) {
      const parsedPass = parseInt(String(raw.passades).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedPass) && parsedPass >= 1) {
        legacyPassades = parsedPass;
      }
    }
  }

  const rawG = raw.gravar || {};
  const rawT = raw.tallar || {};

  const gravar = {
    redimensionar: 'Suavizado (HQ Bicubic)',
    brillo: rawG.brillo !== undefined ? Number(rawG.brillo) : (isLegacy ? 40 : DEFAULT_LASER_CONFIG.gravar.brillo),
    contraste: rawG.contraste !== undefined ? Number(rawG.contraste) : (isLegacy ? 40 : DEFAULT_LASER_CONFIG.gravar.contraste),
    blancos: rawG.blancos !== undefined ? Number(rawG.blancos) : (isLegacy ? 0 : DEFAULT_LASER_CONFIG.gravar.blancos),
    bnHabilitat: rawG.bnHabilitat !== undefined ? Boolean(rawG.bnHabilitat) : DEFAULT_LASER_CONFIG.gravar.bnHabilitat,
    bn: rawG.bn !== undefined ? Number(rawG.bn) : DEFAULT_LASER_CONFIG.gravar.bn,
    conversio: 'Línea a Línea',
    direccio: 'Horizontal',
    qualitat: 11.940,
    engravingSpeed: rawG.engravingSpeed !== undefined ? Number(rawG.engravingSpeed) : (isLegacy ? legacySpeed : DEFAULT_LASER_CONFIG.gravar.engravingSpeed),
    laserMode: 'M4 - Dynamic Power',
    sMin: 0,
    sMaxPercent: rawG.sMaxPercent !== undefined ? Number(rawG.sMaxPercent) : (isLegacy ? legacyPercent : DEFAULT_LASER_CONFIG.gravar.sMaxPercent),
    sMaxPwm: rawG.sMaxPwm !== undefined ? Number(rawG.sMaxPwm) : (isLegacy ? legacyPwm : DEFAULT_LASER_CONFIG.gravar.sMaxPwm),
    midaW: rawG.midaW !== undefined ? rawG.midaW : '',
    midaH: 'Proporcional',
    iniciX: rawG.iniciX !== undefined ? Number(rawG.iniciX) : 0.0,
    iniciY: rawG.iniciY !== undefined ? Number(rawG.iniciY) : 0.0,
    ruta: rawG.ruta || rawG.rutaCarpeta || '',
    fitxer: rawG.fitxer || rawG.nomFitxer || '',
    notes: rawG.notes || rawG.observacions || ''
  };

  const passadesVal = rawT.passades !== undefined
    ? Math.max(1, Math.round(Number(rawT.passades) || 1))
    : (isLegacy ? legacyPassades : (DEFAULT_LASER_CONFIG.tallar.passades || 1));

  const tallar = {
    velocidadBorde: rawT.velocidadBorde !== undefined ? Number(rawT.velocidadBorde) : DEFAULT_LASER_CONFIG.tallar.velocidadBorde,
    laserOn: 'M4',
    sMin: 0,
    sMaxPercent: rawT.sMaxPercent !== undefined ? Number(rawT.sMaxPercent) : (isLegacy ? legacyPercent : DEFAULT_LASER_CONFIG.tallar.sMaxPercent),
    sMaxPwm: rawT.sMaxPwm !== undefined ? Number(rawT.sMaxPwm) : (isLegacy ? legacyPwm : DEFAULT_LASER_CONFIG.tallar.sMaxPwm),
    passades: passadesVal,
    ruta: rawT.ruta || rawT.rutaCarpeta || '',
    fitxer: rawT.fitxer || rawT.nomFitxer || '',
    notes: rawT.notes || rawT.observacions || ''
  };

  return { gravar, tallar };
}

/**
 * Compara dos objectes de paràmetres làser per saber si s'han modificat
 */
export function areLaserConfigsEqual(a, b) {
  const normA = normalizeLaserConfig(a);
  const normB = normalizeLaserConfig(b);
  return JSON.stringify(normA) === JSON.stringify(normB);
}

/**
 * Noms de materials de mostra inicials (ara eliminats de la biblioteca)
 */
export const SAMPLE_MATERIAL_NAMES = [];

/**
 * Comprova si un material és un dels exemples de mostra anteriors
 */
export function isSampleMaterial(item) {
  if (!item) return false;
  const id = (item.id || '').toLowerCase().trim();
  return (
    id === 'preset-dm-3' ||
    id === 'preset-metacrilat-3' ||
    id.startsWith('preset-')
  );
}

/**
 * Biblioteca base de materials (inicialment buida; es construeix amb els materials de l'usuari)
 */
export const DEFAULT_MATERIAL_PRESETS = [];

/**
 * Recupera tots els materials de la biblioteca làser a partir de la maquinària
 * Filtra qualsevol material residual de mostra i no n'injecta cap de fictici.
 */
export function getLaserMaterialsLibrary(maquinaria = []) {
  const library = [];
  const laserMachines = (maquinaria || []).filter(m => 
    m.esLaser || m.parametresLaser || (m.bibliotecaMaterials && m.bibliotecaMaterials.length > 0) || 
    m.maquina?.toLowerCase().includes('laser') || m.maquina?.toLowerCase().includes('làser')
  );

  for (const maq of laserMachines) {
    if (Array.isArray(maq.bibliotecaMaterials) && maq.bibliotecaMaterials.length > 0) {
      for (const item of maq.bibliotecaMaterials) {
        if (isSampleMaterial(item)) continue;
        if (!library.some(existing => (item.id && existing.id === item.id) || existing.nom === item.nom)) {
          library.push({
            ...item,
            parametres: normalizeLaserConfig(item.parametres)
          });
        }
      }
    }
  }

  return library;
}

/**
 * Busca paràmetres làser per a un material concret (per ID de material o per nom)
 */
export function findLaserParamsForMaterial(materialIdOrName, maquinaria = []) {
  if (!materialIdOrName) return null;
  const library = getLaserMaterialsLibrary(maquinaria);
  const searchStr = String(materialIdOrName).toLowerCase().trim();

  const found = library.find(item => 
    (item.materialId && String(item.materialId).toLowerCase().trim() === searchStr) ||
    (item.id && String(item.id).toLowerCase().trim() === searchStr) ||
    (item.nom && String(item.nom).toLowerCase().trim() === searchStr) ||
    (item.nom && searchStr && (searchStr.includes(String(item.nom).toLowerCase().trim()) || String(item.nom).toLowerCase().trim().includes(searchStr)))
  );

  return found ? normalizeLaserConfig(found.parametres) : null;
}

