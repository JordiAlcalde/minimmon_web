import React from 'react';
import { createPortal } from 'react-dom';
import {
  X, Printer, Download, CheckCircle2, Clock,
  Building2, MapPin, Phone, Mail, FileText, Package, AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDecimal } from '../../utils/numberUtils';

/**
 * Converteix una data a format dd-mm-aaaa
 */
export const formatDateDDMMAAAA = (rawDate) => {
  if (!rawDate) return '';
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(rawDate)) {
    return rawDate.replace(/\//g, '-');
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const [yyyy, mm, dd] = rawDate.slice(0, 10).split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  } catch { }
  return String(rawDate);
};

export const DEFAULT_EMISSOR = {
  nomComercial: 'Mínim Món',
  titular: 'Jordi Alcalde',
  raoSocial: 'Jordi Alcalde',
  adreca: 'C./ Major, 14, 1',
  codiPostal: '08512',
  poblacio: 'Sant Hipòlit de Voltregà',
  provincia: 'Barcelona',
  pais: 'Espanya',
  nif: '37.732.370-L',
  email: 'minimmon58@gmail.com',
  telefon: '699 592 326',
  iban: '',
  banc: '',
  titularCompte: 'Jordi Alcalde / Mínim Món',
  bic: '',
  logoUrl: '/images/logo_minim_mon_documents.png'
};

export default function DocumentViewerModal({
  docData = null,
  tipus = 'factura', // 'factura' | 'albara'
  emissor = {},
  onClose,
  onEdit = null,
  onToggleCobrat = null,
  isDark = false
}) {
  if (!docData) return null;

  const emissorMerged = {
    ...DEFAULT_EMISSOR,
    ...(emissor || {})
  };
  if (!emissorMerged.email || emissorMerged.email === 'info@minimmon.cat') {
    emissorMerged.email = 'minimmon58@gmail.com';
  }
  if (!emissorMerged.telefon) {
    emissorMerged.telefon = '699 592 326';
  }

  const isFactura = tipus === 'factura';
  const isAlbara = tipus === 'albara';
  const isPressupost = tipus === 'pressupost';
  const isValorat = !isAlbara || docData.valorat !== false;

  const handlePrint = () => {
    window.print();
  };

  const numeroDoc = docData.numero || docData.codi || docData.id || '-';
  const dataDoc = docData.dataEmissio || docData.data || docData.dataInici || new Date().toISOString().slice(0, 10);
  const dataVenciment = docData.dataVenciment || '';

  const clientRaoSocial = docData.clientRaoSocial || docData.clientNom || docData.nomClient || docData.nom || 'Client no especificat';
  const clientNom = clientRaoSocial;
  const clientPersonaContacte = docData.clientPersonaContacte || docData.personaContacte || '';
  const clientNif = docData.clientNif || docData.nif || docData.cif || '';
  const clientEmail = docData.clientEmail || docData.email || '';
  const clientTelefon = docData.clientTelefon || docData.telefon || '';
  const clientWeb = docData.clientWeb || docData.web || '';

  const rawAdreca = docData.clientAdreca || docData.adreca || docData.adrecaEnviament || '';
  const clientCarrer = typeof rawAdreca === 'object' && rawAdreca !== null
    ? (rawAdreca.carrer || '')
    : (typeof rawAdreca === 'string' ? rawAdreca : '');
  const clientCp = docData.clientCodiPostal || (typeof rawAdreca === 'object' ? rawAdreca?.codiPostal : '') || '';
  const clientPob = docData.clientPoblacio || (typeof rawAdreca === 'object' ? rawAdreca?.poblacio : '') || '';
  const clientProv = docData.clientProvincia || (typeof rawAdreca === 'object' ? rawAdreca?.provincia : '') || '';
  const clientPais = docData.clientPais || (typeof rawAdreca === 'object' ? rawAdreca?.pais : '') || 'Espanya';

  const rawLinies = docData.linies || docData.productes || [];
  const condicionsEnviament = docData.condicionsEnviament || (Number(docData.costEnviament) > 0 ? 'establert' : 'pendent');
  const isAcordat = condicionsEnviament === 'establert';
  const mitjaTransport = docData.mitjaTransport || docData.transportista || 'Correos';
  const costEnviament = Number(docData.costEnviament !== undefined ? docData.costEnviament : (docData.despesesEnviament || 0));
  const notesEnviament = docData.notesEnviament || docData.descripcioEnviament || docData.comentarisEnviament || '';

  // Separem les línies regulars de producte de qualsevol línia d'enviament prèvia
  const liniesArticles = [];
  let liniaEnviamentExistent = null;

  rawLinies.forEach(l => {
    const isShippingLine = l.esEnviament || l.tipus === 'enviament' || l.tipusLinia === 'enviament' ||
      (typeof l.nom === 'string' && (l.nom.toLowerCase().startsWith('enviament') || l.nom.toLowerCase().startsWith('despeses d\'enviament')));
    if (isShippingLine) {
      liniaEnviamentExistent = l;
    } else {
      liniesArticles.push(l);
    }
  });

  // Base dels articles
  const baseArticles = liniesArticles.reduce((sum, l) => {
    const qty = Number(l.quantitat || l.quantity || 1);
    const preu = Number(l.preuUnitari !== undefined ? l.preuUnitari : (l.preu || l.price || 0));
    const dte = Number(l.descomptePercent || 0);
    return sum + (qty * preu * (1 - (dte / 100)));
  }, 0);

  // Si el transport està acordat / establert, s'afegeix com a última línia del pressupost
  const linies = [...liniesArticles];
  const preuEnviamentEfectiu = isAcordat ? (costEnviament || Number(liniaEnviamentExistent?.preuUnitari || 0)) : 0;
  const descripcioEnviamentEfectiva = notesEnviament || liniaEnviamentExistent?.descripcio || liniaEnviamentExistent?.notes || '';

  if (isAcordat) {
    linies.push({
      id: 'linia-enviament-acordat',
      esEnviament: true,
      nom: `Enviament / Transport (${mitjaTransport})`,
      concepte: `Enviament / Transport (${mitjaTransport})`,
      descripcio: descripcioEnviamentEfectiva,
      notes: descripcioEnviamentEfectiva,
      quantitat: 1,
      preuUnitari: preuEnviamentEfectiu,
      descomptePercent: 0,
      subtotal: preuEnviamentEfectiu
    });
  }

  // Càlcul de totals: si està acordat, es suma al total del pressupost; si no, queda fora del total
  const baseImposable = isAcordat ? (baseArticles + preuEnviamentEfectiu) : baseArticles;
  const ivaPercent = Number(docData.ivaPercent !== undefined ? docData.ivaPercent : 21);
  const importIva = Math.round(baseImposable * (ivaPercent / 100) * 100) / 100;
  const totalDoc = Math.round((baseImposable + importIva) * 100) / 100;

  const isCobrada = docData.estatCobrament === 'cobrada' || docData.estatPagament === 'pagat';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-4 pt-4 sm:pt-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto modal-print-overlay print:static print:inset-auto print:block print:p-0 print:m-0 print:bg-white">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 14mm 10mm 14mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          #root {
            display: none !important;
          }
          body > *:not(.modal-print-overlay) {
            display: none !important;
          }
          .modal-print-overlay {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .modal-print-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .modal-print-paper {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 266mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Contenidor Principal */}
      <div className="w-full max-w-4xl max-h-[92vh] mb-auto flex flex-col bg-surface rounded-2xl border border-outline/20 shadow-2xl overflow-hidden modal-print-container print:static print:my-0 print:mx-0 print:p-0 print:w-full print:max-w-none print:max-h-none print:border-none print:shadow-none print:rounded-none print:block">

        {/* Barra Superior d'Accions (Oculta al imprimir) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-surface-container border-b border-outline/15 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${isFactura ? 'bg-amber-600 text-white' : isPressupost ? 'bg-emerald-700 text-white' : 'bg-sky-600 text-white'
              }`}>
              {isFactura ? 'Factura Oficial' : isPressupost ? 'Pressupost Comercial' : 'Albarà de Lliurament'}
            </span>
            <span className="font-mono text-xs font-semibold text-primary">{numeroDoc}</span>
          </div>

          <div className="flex items-center gap-2">
            {isFactura && onToggleCobrat && (
              <button
                type="button"
                onClick={() => onToggleCobrat(docData)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${isCobrada
                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30'
                  }`}
                title="Canviar estat de cobrament"
              >
                {isCobrada ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                <span>{isCobrada ? 'Cobrada' : 'Pendent de Cobrament'}</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(docData)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface hover:bg-surface-container border border-outline/20 text-primary cursor-pointer transition-colors"
              >
                Editar
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary-container text-on-primary shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Desar PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer transition-colors ml-1"
              title="Tancar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full A4 Imprimible (Document Paper) */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans modal-print-paper print:p-0 print:m-0 print:overflow-visible print:w-full min-h-[650px] sm:min-h-[266mm]">

          {/* Bloc Superior (Capçalera, Client, Taula, Totals i Transport) */}
          <div className="flex-1">

            {/* 1. Capçalera del Document */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4 print:pb-3 print:mb-3">
            <div>
              <div className="mb-2">
                <img
                  src={emissorMerged.logoUrl || '/images/logo_minim_mon_documents.png'}
                  alt="Mínim Món"
                  className="h-12 w-auto object-contain notranslate mb-1.5"
                  translate="no"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {emissorMerged.titular && (
                  <p className="text-xs font-semibold text-slate-800 notranslate" translate="no">
                    {emissorMerged.titular}
                  </p>
                )}
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                {emissorMerged.adreca && <p>{emissorMerged.adreca}</p>}
                {(emissorMerged.codiPostal || emissorMerged.poblacio) && (
                  <p>{emissorMerged.codiPostal} - {emissorMerged.poblacio} {emissorMerged.provincia ? `(${emissorMerged.provincia})` : ''}</p>
                )}
                {emissorMerged.nif && <p>DNI: <strong>{emissorMerged.nif}</strong></p>}
                <p>
                  <span>{emissorMerged.email || 'minimmon58@gmail.com'}</span>
                  <span>&nbsp; / &nbsp;</span>
                  <span>{emissorMerged.telefon || '699 592 326'}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 mb-2 text-right">
                <span className="block text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  {isFactura ? 'Factura' : isPressupost ? 'Pressupost' : 'Albarà d\'Entrega'}
                </span>
                <span className="block font-mono text-lg font-bold text-slate-900">
                  {numeroDoc}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>Data d'emissió: <strong className="font-mono text-slate-800">{formatDateDDMMAAAA(dataDoc)}</strong></p>
                {dataVenciment && (
                  <p>{isPressupost ? 'Validesa fins a:' : 'Venciment:'} <strong className="font-mono text-slate-800">{formatDateDDMMAAAA(dataVenciment)}</strong></p>
                )}
                {docData.comandaCodi && (
                  <p>Ref. Comanda: <strong className="font-mono text-slate-800">{docData.comandaCodi}</strong></p>
                )}
                {isFactura && (docData.albaraNumero || docData.albaraCodi) && (
                  <p>Ref. Albarà: <strong className="font-mono text-slate-800">{docData.albaraNumero || docData.albaraCodi}</strong></p>
                )}
                {isAlbara && (
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">
                    Mode: {isValorat ? 'Albarà Valorat' : 'Lliurament Sense Preus'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Dades del Client / Destinatari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 print:mb-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                {isFactura ? 'Dades Fiscals del Client' : isPressupost ? 'Proposta Comercial per a' : 'Destinatari del Lliurament'}
              </span>
              <h4 className="font-serif font-bold text-base text-slate-900 notranslate" translate="no">
                {clientRaoSocial}
              </h4>
              {clientPersonaContacte && (
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  A/A: <strong>{clientPersonaContacte}</strong>
                </p>
              )}
              <div className="text-xs text-slate-600 space-y-0.5 mt-2 font-mono">
                {clientNif && <p>NIF/CIF: <strong>{clientNif}</strong></p>}
                {clientTelefon && <p>Tel: {clientTelefon}</p>}
                {clientEmail && <p>Email: {clientEmail}</p>}
                {clientWeb && <p>Web: {clientWeb}</p>}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                {isFactura ? 'Adreça Fiscal' : 'Adreça de Lliurament / Enviament'}
              </span>
              {clientCarrer || clientPob ? (
                <div className="text-xs text-slate-700 leading-relaxed font-mono space-y-0.5">
                  {clientCarrer && <p className="font-medium text-slate-900">{clientCarrer}</p>}
                  {(clientCp || clientPob) && (
                    <p>{clientCp} {clientPob} {clientProv ? `(${clientProv})` : ''}</p>
                  )}
                  {clientPais && <p>{clientPais}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Lliurament directe al taller o sense adreça indicada.</p>
              )}
              {docData.numeroSeguimentCorreos && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-500 font-sans">Codi Seguiment Correos: </span>
                  <strong className="font-mono text-slate-800">{docData.numeroSeguimentCorreos}</strong>
                </div>
              )}
            </div>
          </div>

          {/* 3. Taula de Línies de Productes i Projectes */}
          <div className="overflow-x-auto mb-4 print:mb-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="py-2.5 px-3">Descripció del Producte / Projecte</th>
                  <th className="py-2.5 px-3 text-center w-16">Quant.</th>
                  {isValorat && <th className="py-2.5 px-3 text-right w-24">Preu Unit.</th>}
                  {isValorat && <th className="py-2.5 px-3 text-right w-20">Dte.</th>}
                  {isValorat && <th className="py-2.5 px-3 text-right w-28">Subtotal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {linies.length === 0 ? (
                  <tr>
                    <td colSpan={isValorat ? 5 : 2} className="py-6 text-center text-slate-400 italic">
                      No s'han especificat línies en aquest document.
                    </td>
                  </tr>
                ) : (
                  linies.map((linia, idx) => {
                    const nomItem = linia.concepte || linia.nom || linia.title || linia.titol || (numeroDoc === 'PRE-2026-0001' ? 'Premis ACAPPS 30es Jornades' : 'Article');
                    const desc = linia.descripcio || linia.notes || linia.descripcioAdicional || linia.description || '';
                    const opc = (linia.opcionsTriades && typeof linia.opcionsTriades === 'object') ? linia.opcionsTriades : (linia.customOptions && typeof linia.customOptions === 'object') ? linia.customOptions : {};
                    const qty = Number(linia.quantitat || linia.quantity || 1);
                    const preu = Number(linia.preuUnitari !== undefined ? linia.preuUnitari : (linia.preu || linia.price || 0));
                    const dte = Number(linia.descomptePercent || 0);
                    const subtotal = qty * preu * (1 - (dte / 100));

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900 notranslate" translate="no">
                            {nomItem}
                          </p>
                          {desc && (
                            <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                              {desc}
                            </p>
                          )}
                          {/* Detall d'opcions de personalització */}
                          {Object.keys(opc).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-600 font-mono">
                              {Object.entries(opc).map(([k, v]) => (
                                <span key={k} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                  {k}: <strong>{String(v)}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {qty}
                        </td>
                        {isValorat && (
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(preu)}
                          </td>
                        )}
                        {isValorat && (
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {dte > 0 ? `${dte}%` : '-'}
                          </td>
                        )}
                        {isValorat && (
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(subtotal)}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Quadre de Totals i Pagament */}
          {isValorat && (
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-200 pt-4 mb-4">

              {/* Dades de Pagament (només per a Factura) */}
              <div className="w-full sm:w-1/2 space-y-3">
                {isFactura && (
                  (() => {
                    const metode = String(docData.metodePagament || 'transferencia').toLowerCase();
                    const isTransferencia = metode.includes('transfer') || !docData.metodePagament;
                    const ibanFinal = docData.iban || emissorMerged.iban;
                    const bancFinal = docData.banc || emissorMerged.banc;
                    const titularFinal = docData.titularCompte || emissorMerged.titularCompte || emissorMerged.titular || emissorMerged.raoSocial;
                    const bicFinal = docData.bic || emissorMerged.bic;

                    const labelMetode = 
                      metode === 'transferencia' ? 'Transferència Bancària' :
                      metode === 'bizum' ? 'Bizum' :
                      metode === 'targeta' ? 'Targeta de Crèdit' :
                      metode === 'efectiu' ? 'Efectiu al taller' :
                      (docData.metodePagament || 'Transferència Bancària');

                    return (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Condicions de Pagament
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCobrada ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {isCobrada ? 'Cobrada' : 'Pendent de Cobrament'}
                          </span>
                        </div>

                        <p className="text-slate-700">
                          Mètode: <strong className="text-slate-900">{labelMetode}</strong>
                        </p>

                        {/* Quadre de dades bancàries si es paga per transferència */}
                        {isTransferencia && ibanFinal && (
                          <div className="mt-2 pt-2 border-t border-slate-200 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                            <span className="block text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                              Dades per a la transferència bancària:
                            </span>
                            <p className="font-mono text-xs font-bold text-slate-900">
                              IBAN: <span className="tracking-wider select-all">{ibanFinal}</span>
                            </p>
                            {bancFinal && (
                              <p className="text-[11px] text-slate-600">
                                Entitat: <strong>{bancFinal}</strong>
                              </p>
                            )}
                            {titularFinal && (
                              <p className="text-[11px] text-slate-600">
                                Titular: <strong>{titularFinal}</strong>
                              </p>
                            )}
                            {bicFinal && (
                              <p className="text-[11px] text-slate-600 font-mono">
                                BIC / SWIFT: <strong>{bicFinal}</strong>
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500 italic pt-0.5">
                              * Si us plau, indica el número de factura ({numeroDoc}) com a concepte de la transferència.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Desglossament d'Impostos i Totals */}
              <div className="w-full sm:w-80 space-y-1.5 text-xs">
                {isAcordat && preuEnviamentEfectiu > 0 ? (
                  <>
                    <div className="flex justify-between text-slate-600 py-1">
                      <span>Subtotal Articles:</span>
                      <span className="font-mono">{formatCurrency(baseArticles)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 py-1">
                      <span>Enviament ({mitjaTransport}):</span>
                      <span className="font-mono">{formatCurrency(preuEnviamentEfectiu)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600 py-1">
                    <span>Base Imposable {isPressupost ? '' : '(Productes)'}:</span>
                    <span className="font-mono">{formatCurrency(baseArticles)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-800 py-1 border-t border-slate-200">
                  <span>Total Base Imposable:</span>
                  <span className="font-mono">{formatCurrency(baseImposable)}</span>
                </div>

                <div className="flex justify-between text-slate-600 py-1">
                  <span>IVA ({ivaPercent}%):</span>
                  <span className="font-mono">{formatCurrency(importIva)}</span>
                </div>

                <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t-2 border-slate-900">
                  <span className="uppercase tracking-wider">Total {isFactura ? 'Factura' : isPressupost ? 'Pressupost' : 'Document'}:</span>
                  <span className="font-mono text-base font-bold text-amber-900">
                    {formatCurrency(totalDoc)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Condicions de l'Enviament / Transport (només si encara no està acordat / pendent) */}
          {!isAcordat && (
            <div className="mt-3 mb-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs w-full print:mt-2 print:mb-1">
              <span className="block font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Condicions d'Enviament / Transport:
              </span>
              <p className="text-slate-700 leading-relaxed">
                <strong>Pendent d'acordar:</strong> Encara no s'ha decidit per cap de les parts i queda pendent de concreció.
              </p>
            </div>
          )}

          </div> {/* Fi Bloc Superior */}

          {/* Bloc Inferior al cap d'abaix de la pàgina (Notes i Condicions + Signatures + Peu Legal) */}
          <div className="mt-auto pt-6 print:pt-4">

            {/* Notes generals i condicions del document (a tota l'amplada, just per sobre del peu de pàgina) */}
            {(docData.notes || docData.observacionsGenerals) && (
              <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs w-full print:mb-2">
                <span className="block font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  {isPressupost ? 'Notes i Condicions del Pressupost:' : 'Observacions:'}
                </span>
                <p className="whitespace-pre-line leading-relaxed text-slate-800">
                  {docData.notes || docData.observacionsGenerals}
                </p>
              </div>
            )}

            {/* Espai de signatura per a Albarà */}
            {isAlbara && (
              <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-4 mb-4 text-xs text-slate-500">
                <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center h-24 flex flex-col justify-between">
                  <span>Expedit per Mínim Món (Taller)</span>
                  <span className="border-t border-slate-200 text-[10px] pt-1">Signatura i data de sortida</span>
                </div>
                <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center h-24 flex flex-col justify-between">
                  <span>Recepció del client / transportista</span>
                  <span className="border-t border-slate-200 text-[10px] pt-1">Nom, DNI i signatura de conformitat</span>
                </div>
              </div>
            )}

            {/* 5. Peu de Pàgina Legal */}
            <div className="pt-2.5 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-0.5 print:pt-2">
              {isFactura && (
                <p>
                  Document emès de conformitat amb la normativa de facturació vigent. Gràcies per confiar en el nostre taller artesanal.
                </p>
              )}
              {isPressupost && (
                <p>
                  Aquest pressupost és informatiu i manté la seva validesa durant el període indicat.
                </p>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

