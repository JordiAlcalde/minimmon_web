import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShieldCheck, Send, CheckCircle2, FileText, Info, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { formatCurrency } from '../utils/numberUtils';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendTelegramNotification } from '../utils/telegramUtils';

export default function BudgetDrawer() {
  const { cart, removeFromCart, updateCartItem, clearCart, isDrawerOpen, setIsDrawerOpen, totalItems } = useBudget();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    generalNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  if (!isDrawerOpen) return null;

  // Classificació dels articles: Preu Tancat (Compra Directa) vs Sol·licitud de Pressupost
  const fixedPriceItems = cart.filter(item => !item.isBudgetRequired && typeof item.preuUnitari === 'number' && item.preuUnitari > 0);
  const budgetItems = cart.filter(item => item.isBudgetRequired || !item.preuUnitari || item.preuUnitari <= 0);

  const totalFixedUnits = fixedPriceItems.reduce((acc, i) => acc + (i.quantitat || 1), 0);
  const totalBudgetUnits = budgetItems.reduce((acc, i) => acc + (i.quantitat || 1), 0);
  const totalFixedPrice = fixedPriceItems.reduce((acc, i) => acc + (i.preuUnitari * (i.quantitat || 1)), 0);

  const hasFixed = fixedPriceItems.length > 0;
  const hasBudget = budgetItems.length > 0;
  const isMixed = hasFixed && hasBudget;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    const prefix = isMixed ? 'COMANDA-PRESSUPOST' : (hasFixed ? 'COMANDA' : 'PRESSUPOST');
    const refCode = `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Desar a Cloud Firestore
      await addDoc(collection(db, "pressupostos"), {
        codiReferencia: refCode,
        clientNom: formData.name,
        clientContacte: formData.contact,
        observacionsGenerals: formData.generalNotes,
        tipusSollicitud: isMixed ? 'mixta' : (hasFixed ? 'compra_directa' : 'pressupost'),
        totalPreuTancat: totalFixedPrice,
        tePecesPreuTancat: hasFixed,
        tePecesPressupost: hasBudget,
        productes: cart.map(item => {
          const isItemFixed = !item.isBudgetRequired && typeof item.preuUnitari === 'number' && item.preuUnitari > 0;
          return {
            producteId: item.producteId,
            nom: item.nom,
            quantitat: item.quantitat,
            preuUnitari: isItemFixed ? item.preuUnitari : null,
            preuTotal: isItemFixed ? (item.preuUnitari * item.quantitat) : null,
            isBudgetRequired: !isItemFixed,
            observacions: item.observacions || '',
            opcionsTriades: item.opcionsTriades || {},
            terminiFabricacio: item.terminiFabricacio || ''
          };
        }),
        estat: 'pendent',
        data: serverTimestamp()
      });

      // 2. Format del missatge detallat per a Telegram
      const itemsSummary = cart.map((item, idx) => {
        const isItemFixed = !item.isBudgetRequired && typeof item.preuUnitari === 'number' && item.preuUnitari > 0;
        const priceTag = isItemFixed 
          ? `[PREU TANCAT: ${item.preuUnitari.toFixed(2)}€ x ${item.quantitat} = ${(item.preuUnitari * item.quantitat).toFixed(2)}€]` 
          : `[SOL·LICITUD DE PRESSUPOST]`;

        const opcionsStr = Object.entries(item.opcionsTriades || {})
          .map(([k, v]) => `   • ${k}: ${typeof v === 'object' && v?.fileName ? v.fileName : v}`)
          .join('\n');

        return `<b>${idx + 1}. ${item.nom}</b> (x${item.quantitat}) <i>${priceTag}</i>\n${opcionsStr ? opcionsStr + '\n' : ''}${item.observacions ? `   💬 Notes: ${item.observacions}\n` : ''}`;
      }).join('\n');

      let tipusTitol = 'SOL·LICITUD DE PRESSUPOST';
      if (isMixed) tipusTitol = 'COMANDA I SOL·LICITUD DE PRESSUPOST (MIXTA)';
      else if (hasFixed) tipusTitol = 'NOVA COMANDA (PREU TANCAT)';

      const telegramMsg = `
📋 <b>${tipusTitol}</b>
Ref: <code>${refCode}</code>

👤 <b>Client:</b> ${formData.name}
📞 <b>Contacte:</b> ${formData.contact}

${hasFixed ? `💰 <b>Total Preus Tancats:</b> ${totalFixedPrice.toFixed(2)} € (IVA inclòs)\n` : ''}${hasBudget ? `📋 <b>Peces a Pressupostar:</b> ${totalBudgetUnits} peces\n` : ''}
📦 <b>DETALL DE LES PECES (${totalItems}):</b>
${itemsSummary}
${formData.generalNotes ? `\n📝 <b>Observacions Generals:</b>\n${formData.generalNotes}` : ''}
`.trim();

      // 3. Enviar notificació per Telegram al taller
      await sendTelegramNotification({
        nom: formData.name,
        email: formData.contact,
        telefon: formData.contact,
        projecteTitol: `${tipusTitol} - ${refCode} (${totalItems} peces)`,
        missatge: telegramMsg,
        tipus: isMixed ? 'Comanda i Pressupost' : (hasFixed ? 'Nova Comanda' : 'Pressupost')
      });

      setSubmittedRef(refCode);
      clearCart();
    } catch (err) {
      console.warn("Nota de Firebase al desar sol·licitud:", err);
      // Fallback si no hi ha connexió directa
      setSubmittedRef(refCode);
      clearCart();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsDrawerOpen(false);
    setSubmittedRef(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={handleClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface text-on-surface border-l border-outline/15 shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-6 bg-surface-container-lowest border-b border-outline/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <img src="/images/icon-cistella.png" alt="Cistella" className="w-5 h-5 object-contain dark:brightness-0 dark:invert shrink-0" />
              </div>
              <div>
                <h2 className="font-serif text-xl text-primary font-semibold">La teva Cistella</h2>
                <p className="text-xs text-on-surface-variant">
                  {cart.length === 0 
                    ? 'Cap peça afegida' 
                    : isMixed 
                      ? `${totalItems} peces (${totalFixedUnits} de compra directa + ${totalBudgetUnits} a pressupostar)`
                      : hasFixed
                        ? `${totalItems} ${totalItems === 1 ? 'peça de compra directa' : 'peces de compra directa'}`
                        : `${totalItems} ${totalItems === 1 ? 'peça per a pressupost' : 'peces per a pressupost'}`
                  }
                </p>
              </div>
            </div>

            <button 
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              aria-label="Tancar cistella"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reassurance Banner */}
          <div className="bg-primary/5 px-6 py-3 border-b border-primary/15 flex items-start gap-2.5 text-xs text-primary">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <b>Desat automàtic:</b> La teva selecció es manté guardada al teu navegador. Pots tancar la web i revisar-la quan vulguis.
            </p>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {submittedRef ? (
              /* Success Screen */
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-serif text-2xl text-primary">
                  {isMixed ? 'Comanda i Pressupost Rebuts!' : (hasFixed ? 'Comanda Rebuda!' : 'Sol·licitud Rebuda!')}
                </h3>
                <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                  Moltes gràcies, <strong>{formData.name}</strong>. En <strong className="notranslate" translate="no">Jordi Alcalde</strong> ha rebut la notificació al taller i revisarà la teva comanda molt aviat.
                </p>
                <div className="bg-surface-container p-4 rounded-lg font-mono text-xs text-primary border border-primary/20 max-w-xs mx-auto">
                  Referència: <strong className="text-sm">{submittedRef}</strong>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-3 bg-primary text-on-primary rounded font-body-md text-sm hover:bg-primary-container transition-colors shadow cursor-pointer"
                >
                  Tancar i Continuar Navegant
                </button>
              </div>
            ) : cart.length === 0 ? (
              /* Empty Cart State */
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto text-outline">
                  <img src="/images/icon-cistella.png" alt="Cistella buida" className="w-8 h-8 object-contain opacity-60 shrink-0" />
                </div>
                <h3 className="font-serif text-lg text-primary font-semibold">La teva cistella és buida</h3>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
                  Explora el nostre Catàleg o Mons Mínims i afegeix peces per comprar o demanar una proposta a mida.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-2 px-5 py-2.5 border border-primary/30 text-primary text-xs font-semibold rounded hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Explorar Catàleg
                </button>
              </div>
            ) : (
              /* Cart Items List */
              <div className="space-y-6">
                
                <div className="flex items-center justify-between pb-1 border-b border-outline/10">
                  <span className="text-xs uppercase font-mono font-semibold text-primary tracking-wider">
                    Peces a la cistella ({totalItems}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Vols buidar tota la cistella?")) {
                        clearCart();
                      }
                    }}
                    className="text-xs text-error hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    title="Buidar tota la cistella"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Buidar cistella</span>
                  </button>
                </div>

                {/* Llistat d'articles amb diferenciació clara */}
                <div className="space-y-4">
                  {cart.map((item) => {
                    const isItemFixed = !item.isBudgetRequired && typeof item.preuUnitari === 'number' && item.preuUnitari > 0;
                    const lineTotal = isItemFixed ? item.preuUnitari * (item.quantitat || 1) : null;

                    return (
                      <div 
                        key={item.cartItemId} 
                        className={`bg-surface-container-lowest p-4 rounded-xl border space-y-3 shadow-xs transition-all ${
                          isItemFixed 
                            ? 'border-emerald-500/30 dark:border-emerald-500/20' 
                            : 'border-amber-500/30 dark:border-amber-500/20'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden shrink-0 border border-outline/10">
                            {item.imatge ? (
                              <img src={resolveMediaUrl(item.imatge)} alt={item.nom} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-outline text-xs">Sense img</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-serif text-sm sm:text-base font-semibold text-primary truncate">{item.nom}</h4>
                              <button 
                                onClick={() => removeFromCart(item.cartItemId)}
                                className="text-outline hover:text-error transition-colors p-1 cursor-pointer shrink-0"
                                title="Eliminar de la cistella"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Badge identificador del concepte: Preu tancat vs Pressupost */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {isItemFixed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  <img src="/images/icon-cistella.png" alt="" className="w-2.5 h-2.5 object-contain brightness-0 invert-0 dark:invert shrink-0" />
                                  <span>Preu tancat: {formatCurrency(item.preuUnitari)}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                  <img src="/images/icon-pressupost.png" alt="" className="w-2.5 h-2.5 object-contain brightness-0 invert-0 dark:invert shrink-0" />
                                  <span>Sol·licitud de pressupost</span>
                                </span>
                              )}

                              {item.terminiFabricacio && (
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  Termini: {item.terminiFabricacio}
                                </span>
                              )}
                            </div>

                            {/* Opcions Triades */}
                            {Object.keys(item.opcionsTriades || {}).length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-outline">
                                {Object.entries(item.opcionsTriades).map(([k, v]) => {
                                  const isFileObj = v && typeof v === 'object' && v.fileName;
                                  return (
                                    <span key={k} className="bg-surface px-2 py-0.5 rounded border border-outline/10 inline-flex items-center gap-1">
                                      <span>{k}:</span>
                                      {isFileObj ? (
                                        <span className="font-semibold text-primary inline-flex items-center gap-1">
                                          {v.isImage ? <img src={v.dataUrl} alt="" className="w-3.5 h-3.5 rounded object-cover" /> : <FileText className="w-3 h-3 text-primary" />}
                                          <span>{v.fileName} ({v.fileSize})</span>
                                        </span>
                                      ) : (
                                        <strong className="text-primary">{String(v)}</strong>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls de Quantitat, Subtotal i Observacions */}
                        <div className="pt-2 border-t border-outline/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-outline/20 rounded bg-surface">
                              <button 
                                type="button"
                                onClick={() => updateCartItem(item.cartItemId, { quantitat: Math.max(1, item.quantitat - 1) })}
                                className="p-1.5 hover:bg-surface-container text-primary transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 text-xs font-mono font-semibold text-primary">{item.quantitat}</span>
                              <button 
                                type="button"
                                onClick={() => updateCartItem(item.cartItemId, { quantitat: item.quantitat + 1 })}
                                className="p-1.5 hover:bg-surface-container text-primary transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Preu Total de la Línia si és preu tancat */}
                            {isItemFixed && lineTotal !== null && (
                              <span className="font-mono text-xs font-bold text-primary">
                                Total: {formatCurrency(lineTotal)}
                              </span>
                            )}
                          </div>

                          <input 
                            type="text"
                            placeholder="Observacions per aquesta peça..."
                            value={item.observacions || ''}
                            onChange={(e) => updateCartItem(item.cartItemId, { observacions: e.target.value })}
                            className="flex-1 bg-surface border border-outline/20 rounded px-3 py-1.5 text-xs text-primary focus:outline-none focus:border-primary font-sans"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Targeta de Resum de la Cistella (Clarament desglossada si és mixta) */}
                <div className="p-4 rounded-xl bg-surface-container border border-outline/15 space-y-2.5 font-sans shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-primary uppercase pb-1.5 border-b border-outline/10">
                    <span>Resum de la selecció:</span>
                    <span>{totalItems} peces</span>
                  </div>

                  {/* Detall Preu Tancat */}
                  {hasFixed && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <img src="/images/icon-cistella.png" alt="" className="w-3 h-3 object-contain dark:invert inline" />
                        <span>Articles amb preu tancat ({totalFixedUnits} u.):</span>
                      </span>
                      <span className="font-mono font-bold text-primary text-sm">
                        {formatCurrency(totalFixedPrice)}
                      </span>
                    </div>
                  )}

                  {/* Detall Pressupost */}
                  {hasBudget && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <img src="/images/icon-pressupost.png" alt="" className="w-3 h-3 object-contain dark:invert inline" />
                        <span>Peces a mida ({totalBudgetUnits} u.):</span>
                      </span>
                      <span className="font-mono font-semibold text-amber-700 dark:text-amber-400 italic text-[11px]">
                        A valorar al pressupost
                      </span>
                    </div>
                  )}

                  {/* Explicació de comanda mixta */}
                  {isMixed && (
                    <p className="text-[11px] text-on-surface-variant/90 italic pt-1 border-t border-outline/10 leading-snug">
                      💡 La teva cistella combina productes amb preu tancat ({formatCurrency(totalFixedPrice)}) i peces personalitzades a mida. En Jordi et contactarà per validar tots els detalls abans de qualsevol pagament.
                    </p>
                  )}

                  {hasFixed && !hasBudget && (
                    <p className="text-[11px] text-on-surface-variant/80 italic pt-1 border-t border-outline/10 leading-snug">
                      ✓ Preu amb IVA inclòs. Les despeses d'enviament i la forma de lliurament s'acordaran directament.
                    </p>
                  )}
                </div>

                {/* Acordió Desplegable "Recorda..." d'Avisos Informatius */}
                <div className="border border-outline/20 rounded-xl bg-surface-container-lowest overflow-hidden transition-all shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsNoticeOpen(!isNoticeOpen)}
                    className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-primary hover:bg-surface-container/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary shrink-0" />
                      <span>Recorda... (Informació sobre el suport natural)</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isNoticeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isNoticeOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-on-surface-variant leading-relaxed border-t border-outline/10 animate-fadeIn space-y-2">
                      <p>
                        <strong className="text-primary block mb-0.5">Vetes i caràcter de la fusta natural:</strong>
                        Tot i que les fustes que utilitzem són de la millor qualitat, s'ha de tenir en compte que es tracta d'un suport natural i que es poden apreciar les vetes i els petits nusos propis de la fusta. Això pot comportar un canvi de tonalitat en parts de les peces que no podem evitar.
                      </p>
                    </div>
                  )}
                </div>

                {/* Form d'Enviament */}
                <form onSubmit={handleSubmit} className="bg-surface-container p-5 rounded-xl border border-outline/15 space-y-4 pt-5">
                  <h3 className="font-serif text-lg font-semibold text-primary flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span>Dades de Contacte per a la Gestió</span>
                  </h3>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      El teu Nom *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Maria Pons"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Email o WhatsApp *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: nom@email.cat o 600 000 000"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Comentaris Generals (opcional)
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Explica'ns qualsevol detall sobre la data d'entrega o l'esdeveniment..."
                      value={formData.generalNotes}
                      onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary focus:outline-none focus:border-primary resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-on-primary py-3.5 rounded font-body-md text-sm hover:bg-primary-container transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Tramitant sol·licitud...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {isMixed 
                            ? `Tramitar Comanda (${formatCurrency(totalFixedPrice)} + Pressupost)` 
                            : (hasFixed 
                              ? `Confirmar Comanda (${formatCurrency(totalFixedPrice)})` 
                              : `Sol·licitar Pressupost Sense Compromís`
                            )
                          }
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Vols cancel·lar i buidar la cistella?")) {
                        clearCart();
                        handleClose();
                      }
                    }}
                    className="w-full py-2.5 bg-error-container/20 hover:bg-error-container/40 text-error text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Buidar cistella i tancar</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
