/**
 * Utilitat per generar IDs seqüencials i nets per a totes les entitats de Producció
 * Ex: 'ucomp-1', 'ucomp-2', ..., 'ucomp-8' en lloc de 'ucomp-1787229321128'
 */
export function getNextSequentialId(prefix, list = []) {
  let max = 0;
  (list || []).forEach(item => {
    if (item && item.id) {
      const strId = String(item.id);
      const match = strId.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num < 100000 && num > max) {
          max = num;
        }
      }
    }
  });
  return `${prefix}-${max + 1}`;
}

/**
 * Normalitza qualsevol ID existent amb timestamp llarg a un ID seqüencial net
 */
export function normalizeEntityIds(items = [], prefix) {
  let currentMax = 0;
  
  // Primer trobar el màxim dels IDs vàlids curts
  items.forEach(item => {
    if (item && item.id) {
      const match = String(item.id).match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num < 100000 && num > currentMax) {
          currentMax = num;
        }
      }
    }
  });

  const idMap = new Map();
  const updatedItems = items.map(item => {
    if (!item) return item;
    const strId = String(item.id || '');
    // Si és un ID amb timestamp llarg (> 5 dígits) o no segueix el format curt
    if (!strId.match(new RegExp(`^${prefix}-\\d{1,5}$`))) {
      currentMax += 1;
      const newId = `${prefix}-${currentMax}`;
      idMap.set(strId, newId);
      return { ...item, id: newId };
    }
    return item;
  });

  return { updatedItems, idMap };
}
