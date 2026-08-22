/**
 * Utilitats per al tractament de decimals i configuració regional (coma decimal).
 */

/**
 * Converteix una cadena o nombre a un float de JavaScript.
 * Substitueix les comes (,) per punts (.) per a permetre el parsing flexible.
 * 
 * @param {string|number} val - Valor a parsejar
 * @param {number} fallback - Valor per defecte si val no és un nombre vàlid (per defecte 0)
 * @returns {number}
 */
export function parseDecimal(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  
  // Convertir a string i netejar
  const str = String(val).trim().replace(',', '.');
  const parsed = parseFloat(str);
  
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Formateja un nombre o cadena per a mostrar-lo amb la coma (,) com a separador decimal.
 * 
 * @param {string|number} val - Valor a formatejar
 * @param {number|null} decimals - Nombre de decimals (per defecte 2). Si és null, manté els decimals existents.
 * @returns {string}
 */
export function formatDecimal(val, decimals = 2) {
  const num = parseDecimal(val, 0);
  if (decimals !== null && decimals !== undefined && decimals >= 0) {
    return num.toFixed(decimals).replace('.', ',');
  }
  return String(num).replace('.', ',');
}

/**
 * Formateja un valor monetari en euros amb la coma decimal (p. ex., "12,50 €").
 * 
 * @param {string|number} val - Valor monetari
 * @param {number} decimals - Decimals a mostrar (per defecte 2)
 * @returns {string}
 */
export function formatCurrency(val, decimals = 2) {
  if (val === null || val === undefined || val === '') return `- - -`;
  const num = parseDecimal(val, null);
  if (num === null) return `- - -`;
  return `${formatDecimal(num, decimals)} €`;
}

/**
 * Formateja un valor per al camp d'entrada (input), substituint punts per comes.
 * Si s'especifica el nombre de decimals, arrodoneix i manté els zeros a la dreta (p. ex., 3 -> "3,00").
 * 
 * @param {string|number} val - Valor de l'input
 * @param {number|null} decimals - Decimals a formatar (opcional)
 * @returns {string}
 */
export function formatDecimalInput(val, decimals = null) {
  if (val === null || val === undefined || val === '') return '';
  if (decimals !== null && decimals !== undefined && decimals >= 0) {
    const num = parseDecimal(val, null);
    if (num !== null && !isNaN(num)) {
      return num.toFixed(decimals).replace('.', ',');
    }
  }
  return String(val).replace('.', ',');
}
