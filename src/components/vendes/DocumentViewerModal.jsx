import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Printer, Download, CheckCircle2, Clock, 
  Building2, MapPin, Phone, Mail, FileText, Package, AlertCircle 
} from 'lucide-react';
import { formatCurrency, formatDecimal } from '../../utils/numberUtils';

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

  const clientCarrer = docData.clientAdreca || (typeof docData.adreca === 'string' ? docData.adreca : docData.adreca?.carrer) || (typeof docData.adrecaEnviament === 'string' ? docData.adrecaEnviament : docData.adrecaEnviament?.carrer) || '';
  const clientCp = docData.clientCodiPostal || docData.adreca?.codiPostal || docData.adrecaEnviament?.codiPostal || '';
  const clientPob = docData.clientPoblacio || docData.adreca?.poblacio || docData.adrecaEnviament?.poblacio || '';
  const clientProv = docData.clientProvincia || docData.adreca?.provincia || docData.adrecaEnviament?.provincia || '';
  const clientPais = docData.clientPais || docData.adreca?.pais || docData.adrecaEnviament?.pais || 'Espanya';

  const adrecaFormatada = typeof clientAdreca === 'object' && clientAdreca !== null
    ? `${clientAdreca.carrer || ''}, ${clientAdreca.codiPostal || ''} ${clientAdreca.poblacio || ''} ${clientAdreca.provincia ? `(${clientAdreca.provincia})` : ''}`.trim()
    : String(clientAdreca || '').trim();

  const linies = docData.linies || docData.productes || [];
  const baseImposable = Number(docData.baseImposable !== undefined ? docData.baseImposable : docData.total || 0);
  const ivaPercent = Number(docData.ivaPercent !== undefined ? docData.ivaPercent : 21);
  const importIva = Number(docData.importIva !== undefined ? docData.importIva : (baseImposable * ivaPercent / 100));
  const totalDoc = Number(docData.total !== undefined ? docData.total : (baseImposable + importIva));
  const costEnviament = Number(docData.costEnviament || docData.despesesEnviament || 0);

  const isCobrada = docData.estatCobrament === 'cobrada' || docData.estatPagament === 'pagat';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 pt-20 sm:pt-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      
      {/* Contenidor Principal */}
      <div className="w-full max-w-4xl max-h-[88vh] my-auto flex flex-col bg-surface rounded-2xl border border-outline/20 shadow-2xl overflow-hidden print:max-h-none print:max-w-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Barra Superior d'Accions (Oculta al imprimir) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-surface-container border-b border-outline/15 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              isFactura ? 'bg-amber-600 text-white' : isPressupost ? 'bg-emerald-700 text-white' : 'bg-sky-600 text-white'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCobrada 
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
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-8 print:m-0 print:overflow-visible print:w-full">
          
          {/* 1. Capçalera del Document */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-serif text-2xl font-bold tracking-tight text-slate-900">
                  {emissor.nomComercial || 'Mínim Món'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-serif italic mb-2">
                {emissor.raoSocial || 'Taller d\'Artesania & Precisió Làser'}
              </p>
              <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                {emissor.nif && <p>NIF / CIF: <strong>{emissor.nif}</strong></p>}
                {emissor.adreca && <p>{emissor.adreca}</p>}
                {(emissor.codiPostal || emissor.poblacio) && (
                  <p>{emissor.codiPostal} {emissor.poblacio} {emissor.provincia ? `(${emissor.provincia})` : ''}</p>
                )}
                {emissor.email && <p>Email: {emissor.email}</p>}
                {emissor.telefon && <p>Tel: {emissor.telefon}</p>}
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
                <p>Data d'emissió: <strong className="font-mono text-slate-800">{dataDoc}</strong></p>
                {dataVenciment && (
                  <p>{isPressupost ? 'Validesa fins a:' : 'Venciment:'} <strong className="font-mono text-slate-800">{dataVenciment}</strong></p>
                )}
                {docData.comandaCodi && (
                  <p>Ref. Comanda: <strong className="font-mono text-slate-800">{docData.comandaCodi}</strong></p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
          <div className="overflow-x-auto mb-6">
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
                    const nomItem = linia.nom || linia.title || linia.titol || 'Article';
                    const desc = linia.descripcio || linia.description || '';
                    const opc = linia.opcionsTriades || linia.customOptions || {};
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
                          {desc && <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>}
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
                          <p className="text-[10px] text-amber-800 font-serif italic mt-0.5">
                            Fusta de til·ler seleccionada & precisió làser
                          </p>
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
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-200 pt-4 mb-8">
              
              {/* Dades de Pagament i Notes */}
              <div className="w-full sm:w-1/2 space-y-3">
                {isFactura && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Condicions de Pagament</span>
                    <p>Mètode: <strong className="capitalize">{docData.metodePagament || 'Transferència bancària'}</strong></p>
                    {emissor.iban && (
                      <p className="font-mono text-[11px]">Compte IBAN: <strong>{emissor.iban}</strong></p>
                    )}
                    {emissor.banc && <p className="text-[11px] text-slate-500">{emissor.banc}</p>}
                    <div className="pt-1.5 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Estat:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCobrada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {isCobrada ? 'Cobrada' : 'Pendent de Cobrament'}
                      </span>
                    </div>
                  </div>
                )}

                {docData.notes && (
                  <div className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="block font-bold text-[10px] text-slate-400 uppercase">Observacions:</span>
                    <p className="italic mt-0.5">{docData.notes}</p>
                  </div>
                )}
              </div>

              {/* Desglossament d'Impostos */}
              <div className="w-full sm:w-80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 py-1">
                  <span>Base Imposable (Productes):</span>
                  <span className="font-mono">{formatCurrency(baseImposable - costEnviament)}</span>
                </div>

                {costEnviament > 0 && (
                  <div className="flex justify-between text-slate-600 py-1">
                    <span>Despeses d'Enviament (Correos):</span>
                    <span className="font-mono">{formatCurrency(costEnviament)}</span>
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
                  <span className="uppercase tracking-wider">Total {isFactura ? 'Factura' : 'Document'}:</span>
                  <span className="font-mono text-base font-bold text-amber-900">
                    {formatCurrency(totalDoc)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Espai de signatura per a Albarà */}
          {isAlbara && (
            <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6 mt-6 text-xs text-slate-500">
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center h-28 flex flex-col justify-between">
                <span>Expedit per Mínim Món (Taller)</span>
                <span className="border-t border-slate-200 text-[10px] pt-1">Signatura i data de sortida</span>
              </div>
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center h-28 flex flex-col justify-between">
                <span>Recepció del client / transportista</span>
                <span className="border-t border-slate-200 text-[10px] pt-1">Nom, DNI i signatura de conformitat</span>
              </div>
            </div>
          )}

          {/* 5. Peu de Pàgina Legal */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
            <p className="italic">
              {emissor.peuFactura || 'Peces úniques en fusta de til·ler seleccionada i precisió làser · Artesania Mínim Món'}
            </p>
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
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

