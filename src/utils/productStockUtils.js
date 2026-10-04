/**
 * Utilitat centralitzada per al càlcul d'estoc, fabricació i reserves de productes.
 */

/**
 * Calcula de forma reactiva les mètriques d'estoc d'un producte:
 * - estocActual: peces físiques en venda
 * - estocMostres: peces físiques de mostra/exposició
 * - estocMinim: llindar mínim d'alerta
 * - fabricantSe: peces en Ordres de Fabricació en curs o en cua
 * - reservat: peces compromeses en comandes de clients no finalitzades
 * - estocDisponible: estocActual - reservat (mínim 0)
 * 
 * @param {Object} product - Objecte del producte
 * @param {Array} ordresFabricacio - Llista d'OFs de Firestore
 * @param {Array} pressupostos - Llista de pressupostos/comandes de Firestore
 * @param {Array} escandalls - Llista d'escandalls de Firestore
 * @returns {Object} Mètriques calculades i detall d'orígens
 */
export function getProductStockMetrics(product, ordresFabricacio = [], pressupostos = [], escandalls = []) {
  if (!product) {
    return {
      estocActual: 0,
      estocMostres: 0,
      estocMinim: 2,
      fabricantSe: 0,
      reservat: 0,
      estocDisponible: 0,
      ofsFabricant: [],
      comandesReservades: []
    };
  }

  const pId = String(product.id || '').trim();
  const pNom = String(product.nom || '').trim().toLowerCase();
  const pCodi = String(product.codi || '').trim().toLowerCase();

  // Escandalls que pertanyen a aquest producte
  const prodEscandallIds = new Set(
    (escandalls || [])
      .filter(e => {
        if (!e) return false;
        if (pId && e.producteId && String(e.producteId).trim() === pId) return true;
        if (pNom && e.producteNom && String(e.producteNom).trim().toLowerCase() === pNom) return true;
        if (pCodi && e.producteCodi && String(e.producteCodi).trim().toLowerCase() === pCodi) return true;
        return false;
      })
      .map(e => String(e.id))
  );

  // 1. Càlcul de peces fabricant-se (Ordres de Fabricació en 'cua' o 'en_curs')
  let fabricantSe = 0;
  const ofsFabricant = [];

  (ordresFabricacio || []).forEach(ofItem => {
    if (!ofItem) return;
    const estat = String(ofItem.estat || '').toLowerCase();
    const isActiva = estat === 'cua' || estat === 'en_curs';
    if (!isActiva) return;

    const ofPId = ofItem.producteId ? String(ofItem.producteId).trim() : '';
    const ofEscId = ofItem.escandallId ? String(ofItem.escandallId).trim() : '';
    const ofNom = String(ofItem.producteNom || ofItem.nom || '').trim().toLowerCase();
    const ofCodi = String(ofItem.producteCodi || ofItem.codi || '').trim().toLowerCase();

    const matchesId = pId && ofPId && ofPId === pId;
    const matchesEsc = ofEscId && prodEscandallIds.has(ofEscId);
    const matchesCodi = pCodi && ofCodi && ofCodi === pCodi;
    const matchesNom = pNom && ofNom && (
      ofNom === pNom || 
      ofNom.startsWith(pNom + ' ') || 
      ofNom.startsWith(pNom + '-') || 
      ofNom.startsWith(pNom + ':') ||
      pNom.startsWith(ofNom + ' ')
    );

    if (matchesId || matchesEsc || matchesCodi || matchesNom) {
      const q = Math.max(0, parseInt(ofItem.quantitat, 10) || 0);
      if (q > 0) {
        fabricantSe += q;
        ofsFabricant.push({
          id: ofItem.id,
          codi: ofItem.codi || ofItem.id,
          quantitat: q,
          estat: ofItem.estat,
          dataLimit: ofItem.dataLimitEntrega || null
        });
      }
    }
  });

  // 2. Càlcul de peces reservades en comandes de clients
  // Només comandes que han estat acceptades/en taller però que encara NO s'han enviat ni lliurat
  let reservat = 0;
  const comandesReservades = [];

  (pressupostos || []).forEach(pr => {
    if (!pr) return;
    const estatComanda = String(pr.estatComanda || '').toLowerCase();
    const isActiva = ['acceptada', 'en_produccio', 'acabat'].includes(estatComanda);
    if (!isActiva) return;

    (pr.productes || []).forEach(item => {
      if (!item) return;
      const itemPId = item.producteId ? String(item.producteId).trim() : (item.id ? String(item.id).trim() : '');
      const itemNom = String(item.nom || '').trim().toLowerCase();
      const itemCodi = String(item.codi || '').trim().toLowerCase();

      const mId = pId && itemPId && itemPId === pId;
      const mCodi = pCodi && itemCodi && itemCodi === pCodi;
      const mNom = pNom && itemNom && (
        itemNom === pNom || 
        itemNom.startsWith(pNom + ' ') || 
        itemNom.startsWith(pNom + '-') || 
        pNom.startsWith(itemNom + ' ')
      );

      if (mId || mCodi || mNom) {
        const q = Math.max(0, parseInt(item.quantitat, 10) || 0);
        if (q > 0) {
          reservat += q;
          comandesReservades.push({
            pressupostId: pr.id,
            codi: pr.codi || pr.numero || pr.id,
            client: pr.clientNom || pr.nom || 'Client',
            quantitat: q,
            estatComanda: pr.estatComanda
          });
        }
      }
    });
  });

  const estocActual = Math.max(0, parseInt(product.estocActual, 10) || 0);
  const estocMostres = Math.max(0, parseInt(product.estocMostres, 10) || 0);
  const estocMinim = product.estocMinim !== undefined ? Math.max(0, parseInt(product.estocMinim, 10) || 0) : 2;
  const estocDisponible = Math.max(0, estocActual - reservat);

  return {
    estocActual,
    estocMostres,
    estocMinim,
    fabricantSe,
    reservat,
    estocDisponible,
    ofsFabricant,
    comandesReservades
  };
}
