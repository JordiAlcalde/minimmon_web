/**
 * Utilitats per a la planificació diària "Ahir / Avui / Demà" de la secció Per Fer.
 * Inclou la lògica de rollover a les 00:05 i recuperació de dies pendents:
 *  - 'dema' -> 'avui'
 *  - 'avui' -> 'ahir' (endarrerida 1 dia)
 *  - 'ahir' -> '-1_dia' (incrementa a -1 dia, -2 dies, etc.)
 */

export const PLANIFICACIO_OPTIONS = [
  { id: '', label: 'Sense assignar', shortLabel: 'Cap' },
  { id: 'ahir', label: 'Ahir', shortLabel: 'Ahir' },
  { id: 'avui', label: 'Avui', shortLabel: 'Avui' },
  { id: 'dema', label: 'Demà', shortLabel: 'Demà' }
];

/**
 * Retorna la data en format 'YYYY-MM-DD' en l'hora local de l'usuari
 */
export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna la jornada de planificació efectiva.
 * Atès que el canvi intel·ligent és a les 00:05, la franja de 00:00 a 00:04 pertany
 * encara a la jornada anterior.
 */
export function getEffectivePlanningDate(date = new Date()) {
  const d = new Date(date);
  if (d.getHours() === 0 && d.getMinutes() < 5) {
    d.setDate(d.getDate() - 1);
  }
  return getLocalDateString(d);
}

/**
 * Retorna el text descriptiu de la planificació
 */
export function getPlanificacioLabel(val) {
  if (!val) return '';
  if (val === 'dema') return 'Demà';
  if (val === 'avui') return 'Avui';
  if (val === 'ahir') return 'Ahir';

  // Formats d'endarreriment (-1_dia, -2_dies, -3, etc.)
  if (typeof val === 'string' && val.startsWith('-')) {
    const num = Math.abs(parseInt(val, 10)) || 1;
    return num === 1 ? '- 1 dia' : `- ${num} dies`;
  }
  if (typeof val === 'number' && val < 0) {
    const num = Math.abs(val);
    return num === 1 ? '- 1 dia' : `- ${num} dies`;
  }
  return val;
}

/**
 * Retorna la informació visual (etiqueta, colors, tipus) per renderitzar badges
 */
export function getPlanificacioBadgeInfo(val) {
  if (!val) return null;

  if (val === 'avui') {
    return {
      key: 'avui',
      label: 'Avui',
      isDelayed: false,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 font-bold',
      pillClass: 'bg-amber-500 text-white font-bold shadow-xs',
      colorKey: 'amber'
    };
  }

  if (val === 'dema') {
    return {
      key: 'dema',
      label: 'Demà',
      isDelayed: false,
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700 font-bold',
      pillClass: 'bg-sky-500 text-white font-bold shadow-xs',
      colorKey: 'sky'
    };
  }

  if (val === 'ahir') {
    return {
      key: 'ahir',
      label: 'Ahir',
      isDelayed: true,
      badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-700 font-bold',
      pillClass: 'bg-orange-500 text-white font-bold shadow-xs',
      colorKey: 'orange'
    };
  }

  // Endarreriment de dies (-1 dia, -2 dies...)
  const label = getPlanificacioLabel(val);
  return {
    key: val,
    label: label,
    isDelayed: true,
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700 font-black',
    pillClass: 'bg-rose-600 text-white font-black shadow-xs',
    colorKey: 'rose'
  };
}

/**
 * Aplica l'avançament d'un dia exacte segons les directrius de l'usuari:
 *  - Demà -> Avui
 *  - Avui -> Ahir
 *  - Ahir -> -1 dia
 *  - -X dies -> -(X+1) dies
 */
export function stepPlanificacioOneDay(currentVal) {
  if (!currentVal) return null;
  if (currentVal === 'dema') return 'avui';
  if (currentVal === 'avui') return 'ahir';
  if (currentVal === 'ahir') return '-1_dia';

  if (typeof currentVal === 'string' && currentVal.startsWith('-')) {
    const num = Math.abs(parseInt(currentVal, 10)) || 1;
    const next = num + 1;
    return `-${next}_dies`;
  }

  return currentVal;
}

/**
 * Calcula la diferència en dies naturals entre dues cadenes de dates 'YYYY-MM-DD'
 */
export function calculateDaysDifference(dateStrFrom, dateStrTo) {
  if (!dateStrFrom || !dateStrTo) return 0;
  const d1 = new Date(dateStrFrom + 'T00:00:00');
  const d2 = new Date(dateStrTo + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Avança N dies la planificació acumuladament
 */
export function advancePlanificacioDays(initialVal, daysCount) {
  if (!initialVal || daysCount <= 0) return initialVal;
  let curr = initialVal;
  for (let i = 0; i < daysCount; i++) {
    curr = stepPlanificacioOneDay(curr);
    if (!curr) break;
  }
  return curr;
}

/**
 * Calcula els mil·lisegons que falten fins a les properes 00:05:00 exactes
 */
export function msUntilNext0005() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(0, 5, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}
