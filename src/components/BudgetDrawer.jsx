import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, ShieldCheck, Send, CheckCircle2, FileText, Info, ChevronDown, Check, Sparkles, Truck, MapPin, CreditCard, ExternalLink, MessageCircle, Search, Package, Clock, ArrowRight } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { formatCurrency } from '../utils/numberUtils';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { sendTelegramNotification } from '../utils/telegramUtils';
import { getShippingConfig, calculateShippingCost, DEFAULT_SHIPPING_CONFIG } from '../utils/shippingUtils';

export default function BudgetDrawer({ onOpenTracking = null }) {
  const { 
    cart, 
    removeFromCart, 
    updateCartItem, 
    clearCart, 
    isDrawerOpen, 
    setIsDrawerOpen, 
    totalItems,
    activeDrawerTab,
    setActiveDrawerTab,
    userOrders,
    activeOrdersCount,
    saveUserOrder,
    removeUserOrder
  } = useBudget();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    generalNotes: ''
  });
  
  // Gestió de configuració de transports i enviaments
  const [shippingConfig, setShippingConfig] = useState(DEFAULT_SHIPPING_CONFIG);
  const [deliveryMethod, setDeliveryMethod] = useState('certificat'); // 'certificat' | 'ordinari' | 'recollida'
  const [shippingAddress, setShippingAddress] = useState({
    carrer: '',
    codiPostal: '',
    poblacio: '',
    provincia: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('bizum'); // 'bizum' | 'recollida'

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);
  const [submittedTotal, setSubmittedTotal] = useState(0);
  const [submittedPayment, setSubmittedPayment] = useState('bizum');
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  // Estat per a la cerca i vinculació manual de comandes a la pestanya de seguiment
  const [manualRefInput, setManualRefInput] = useState('');
  const [isSearchingManualRef, setIsSearchingManualRef] = useState(false);
  const [manualRefError, setManualRefError] = useState('');
  const [manualRefSuccess, setManualRefSuccess] = useState('');

  const handleSearchAndLinkOrder = async (e) => {
    if (e) e.preventDefault();
    const cleanRef = manualRefInput.trim().toUpperCase();
    if (!cleanRef) return;

    setIsSearchingManualRef(true);
    setManualRefError('');
    setManualRefSuccess('');

    try {
      const q = query(collection(db, "pressupostos"), where("codiReferencia", "==", cleanRef));
      const snap = await getDocs(q);
      if (snap.empty) {
        setManualRefError(`No s'ha trobat cap comanda amb la referència ${cleanRef}. Revisa el codi.`);
      } else {
        const orderDoc = snap.docs[0].data();
        saveUserOrder({
          refCode: cleanRef,
          dataCreacio: orderDoc.data?.toDate ? orderDoc.data.toDate().toISOString() : new Date().toISOString(),
          clientNom: orderDoc.clientNom || '',
          total: orderDoc.totalFinalAmbEnviament || orderDoc.totalPreuTancat || 0,
          estatComanda: orderDoc.estatComanda || 'rebuda',
          estat: orderDoc.estat || 'pendent',
          metodeLliurament: orderDoc.metodeLliurament || 'recollida'
        });
        setManualRefSuccess(`Comanda ${cleanRef} vinculada correctament!`);
        setManualRefInput('');
        setTimeout(() => setManualRefSuccess(''), 3000);
      }
    } catch (err) {
      console.warn("Error consultant comanda:", err);
      setManualRefError("Hi ha hagut un error consultant la base de dades.");
    } finally {
      setIsSearchingManualRef(false);
    }
  };

  useEffect(() => {
    getShippingConfig().then(cfg => {
      if (cfg) setShippingConfig(cfg);
    });
  }, []);

  // Si es canvia a enviament per Correos, el pagament només pot ser Bizum
  useEffect(() => {
    if (deliveryMethod !== 'recollida' && paymentMethod === 'recollida') {
      setPaymentMethod('bizum');
    }
  }, [deliveryMethod, paymentMethod]);

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

  const shippingCost = calculateShippingCost(deliveryMethod, shippingConfig);
  const totalWithShipping = totalFixedPrice + (deliveryMethod !== 'recollida' ? shippingCost : 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Validació d'adreça si és enviament físic per Correos
    if (deliveryMethod !== 'recollida') {
      if (!shippingAddress.carrer.trim() || !shippingAddress.codiPostal.trim() || !shippingAddress.poblacio.trim()) {
        alert("Si us plau, omple l'adreça d'enviament (carrer, codi postal i població) per a la tramesa per Correos.");
        return;
      }
    }

    setIsSubmitting(true);
    const prefix = isMixed ? 'CDA-PRESSUPOST' : (hasFixed ? 'CDA' : 'PRESSUPOST');
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
        // Dades de transport i pagament
        metodeLliurament: deliveryMethod,
        costEnviament: deliveryMethod !== 'recollida' ? shippingCost : 0,
        adrecaEnviament: deliveryMethod !== 'recollida' ? shippingAddress : null,
        metodePagament: paymentMethod,
        estatPagament: 'pendent',
        totalFinalAmbEnviament: hasFixed ? totalWithShipping : null,
        // Seguiment i producció
        estat: 'pendent',
        estatComanda: 'rebuda',
        diesFabricacioPrevistos: 0,
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

      let lliuramentText = 'Recollida acordada (0,00 €)';
      if (deliveryMethod === 'certificat') {
        lliuramentText = `Carta Certificada Correos (${shippingCost.toFixed(2)} €) - Amb seguiment sota signatura`;
      } else if (deliveryMethod === 'ordinari') {
        lliuramentText = `Carta Ordinària Correos (${shippingCost.toFixed(2)} €)`;
      }

      let adrecaText = '';
      if (deliveryMethod !== 'recollida') {
        adrecaText = `📍 <b>Adreça de tramesa:</b>\n   ${shippingAddress.carrer}\n   ${shippingAddress.codiPostal} ${shippingAddress.poblacio}${shippingAddress.provincia ? ` (${shippingAddress.provincia})` : ''}\n`;
      }

      const telegramMsg = `
📋 <b>${tipusTitol}</b>
Ref: <code>${refCode}</code>

👤 <b>Client:</b> ${formData.name}
📞 <b>Contacte:</b> ${formData.contact}

🚚 <b>Lliurament:</b> ${lliuramentText}
${adrecaText}💳 <b>Mètode de Pagament:</b> ${paymentMethod === 'bizum' ? 'Bizum (699 592 326)' : 'Pagament en recollir'}
${hasFixed ? `💰 <b>Subtotal Articles:</b> ${totalFixedPrice.toFixed(2)} €\n` : ''}${deliveryMethod !== 'recollida' && hasFixed ? `📦 <b>Enviament Correos:</b> ${shippingCost.toFixed(2)} €\n` : ''}${hasFixed ? `🏁 <b>TOTAL COMANDA:</b> ${totalWithShipping.toFixed(2)} € (IVA inclòs)\n` : ''}${hasBudget ? `📋 <b>Peces a Pressupostar:</b> ${totalBudgetUnits} peces\n` : ''}
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

      saveUserOrder({
        refCode,
        dataCreacio: new Date().toISOString(),
        clientNom: formData.name,
        total: hasFixed ? totalWithShipping : null,
        totalPreuTancat: totalFixedPrice,
        tePecesPreuTancat: hasFixed,
        tePecesPressupost: hasBudget,
        metodeLliurament: deliveryMethod,
        estatComanda: 'rebuda',
        estat: 'pendent',
        totalItems
      });

      setSubmittedTotal(totalWithShipping);
      setSubmittedPayment(paymentMethod);
      setSubmittedRef(refCode);
      clearCart();
    } catch (err) {
      console.warn("Nota de Firebase al desar sol·licitud:", err);
      saveUserOrder({
        refCode,
        dataCreacio: new Date().toISOString(),
        clientNom: formData.name,
        total: hasFixed ? totalWithShipping : null,
        totalPreuTancat: totalFixedPrice,
        tePecesPreuTancat: hasFixed,
        tePecesPressupost: hasBudget,
        metodeLliurament: deliveryMethod,
        estatComanda: 'rebuda',
        estat: 'pendent',
        totalItems
      });
      setSubmittedTotal(totalWithShipping);
      setSubmittedPayment(paymentMethod);
      setSubmittedRef(refCode);
      clearCart();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (order) => {
    const estatComanda = order.estatComanda || 'rebuda';
    const estat = order.estat || 'pendent';

    if (estat === 'cancel·lada' || estat === 'rebutjat') {
      return {
        label: 'Cancel·lada',
        bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300/40',
        dot: 'bg-slate-400'
      };
    }
    if (estatComanda === 'lliurat') {
      return {
        label: 'Lliurada amb èxit',
        bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/40',
        dot: 'bg-emerald-500'
      };
    }
    if (estatComanda === 'enviat') {
      return {
        label: order.metodeLliurament === 'recollida' ? 'Lliurat en mà' : 'Enviada per Correos',
        bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300/40',
        dot: 'bg-indigo-500'
      };
    }
    if (estatComanda === 'acabat') {
      return {
        label: 'Peces acabades al taller',
        bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300/40',
        dot: 'bg-teal-500'
      };
    }
    if (estatComanda === 'produccio') {
      return {
        label: order.diesFabricacioPrevistos > 0 ? `En fabricació (~${order.diesFabricacioPrevistos} dies)` : 'En fabricació artesanal',
        bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300/40',
        dot: 'bg-amber-500'
      };
    }
    if (estatComanda === 'acceptada') {
      return {
        label: 'Comanda acceptada pel taller',
        bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300/40',
        dot: 'bg-blue-500'
      };
    }
    return {
      label: 'Pendent de confirmació al taller',
      bg: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-amber-300/30',
      dot: 'bg-amber-400'
    };
  };

  const renderTrackingContent = () => {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Capçalera informativa */}
        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/15 space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Seguiment de les teves peces</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Consulta en temps real l'evolució de les teves comandes artesanes: des de la preparació al taller fins a l'enviament per Correos.
          </p>
        </div>

        {/* Llistat de comandes de l'usuari */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
              Comandes en aquest dispositiu ({userOrders.length})
            </h3>
          </div>

          {userOrders.length === 0 ? (
            <div className="py-8 px-4 text-center border-2 border-dashed border-outline/20 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Truck className="w-6 h-6 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary">Cap comanda registrada encara</p>
                <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto">
                  Quan confirmis una comanda a la cistella, quedarà vinculada aquí automàticament per fer-ne el seguiment.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {userOrders.map((order) => {
                const badge = getStatusBadge(order);
                const orderDate = order.dataCreacio 
                  ? new Date(order.dataCreacio).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '';

                return (
                  <div 
                    key={order.refCode}
                    className="bg-surface-container-lowest border border-outline/20 hover:border-primary/40 rounded-2xl p-4 shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {order.refCode}
                          </span>
                          {orderDate && (
                            <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {orderDate}
                            </span>
                          )}
                        </div>
                        {order.clientNom && (
                          <p className="text-xs text-on-surface-variant">
                            Client: <strong className="text-primary">{order.clientNom}</strong>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Vols treure la comanda ${order.refCode} de la llista d'aquest dispositiu? (No s'esborrarà del taller)`)) {
                            removeUserOrder(order.refCode);
                          }
                        }}
                        className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors cursor-pointer"
                        title="Desvincular d'aquest dispositiu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Insígnia d'estat */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${badge.bg}`}>
                      <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`} />
                      <span>{badge.label}</span>
                    </div>

                    {/* Preu i tipus de lliurament */}
                    <div className="pt-2 border-t border-outline/10 flex items-center justify-between text-xs">
                      <div className="text-on-surface-variant">
                        {order.metodeLliurament === 'recollida' ? 'Recollida acordada' : 'Enviament Correos'}
                      </div>
                      {order.total && (
                        <div className="font-bold text-primary font-mono">
                          {formatCurrency(order.total)}
                        </div>
                      )}
                    </div>

                    {/* Botó de seguiment complet */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenTracking) {
                          onOpenTracking(order.refCode);
                        } else {
                          window.location.hash = `#seguiment-${order.refCode}`;
                          window.dispatchEvent(new Event('hashchange'));
                        }
                        handleClose();
                      }}
                      className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Veure el seguiment en viu</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulari per vincular comandes manuals */}
        <div className="bg-surface-container/60 p-4 rounded-2xl border border-outline/15 space-y-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>Vincular una altra comanda o pressupost</span>
            </h4>
            <p className="text-[11px] text-on-surface-variant">
              Tens una comanda feta des d'un altre dispositiu? Introdueix la referència per guardar-la aquí.
            </p>
          </div>

          <form onSubmit={handleSearchAndLinkOrder} className="space-y-2">
            <div className="flex gap-2">
              <input 
                type="text"
                value={manualRefInput}
                onChange={(e) => setManualRefInput(e.target.value)}
                placeholder="Ex: CDA-2026-1816"
                className="flex-1 bg-surface border border-outline/25 rounded-xl px-3 py-2 text-xs font-mono text-primary placeholder:text-on-surface-variant/50 uppercase focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={isSearchingManualRef || !manualRefInput.trim()}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
              >
                {isSearchingManualRef ? (
                  <span>Cercant...</span>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Vincular</span>
                  </>
                )}
              </button>
            </div>

            {manualRefError && (
              <p className="text-[11px] text-error font-medium">{manualRefError}</p>
            )}
            {manualRefSuccess && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">{manualRefSuccess}</p>
            )}
          </form>
        </div>
      </div>
    );
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
          
          {/* Header Unificat amb Pestanyes: Cistella & Les Meves Comandes */}
          <div className="p-4 sm:p-5 bg-surface-container-lowest border-b border-outline/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-primary">El teu Espai</span>
                <span className="text-[11px] text-on-surface-variant font-mono bg-primary/5 px-2 py-0.5 rounded-full border border-primary/15">
                  Mínim Món
                </span>
              </div>

              <button 
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                aria-label="Tancar panell"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Pestanyes (Tabs) */}
            <div className="grid grid-cols-2 gap-1.5 bg-surface-container/60 p-1 rounded-xl border border-outline/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveDrawerTab('cart')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                  activeDrawerTab === 'cart' 
                    ? 'bg-surface text-primary shadow-xs font-bold' 
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface/50'
                }`}
              >
                <img src="/images/icon-cistella.png" alt="Cistella" className="w-4 h-4 object-contain dark:brightness-0 dark:invert shrink-0" />
                <span>Cistella</span>
                {totalItems > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold">
                    {totalItems}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('tracking')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer relative ${
                  activeDrawerTab === 'tracking' 
                    ? 'bg-surface text-primary shadow-xs font-bold' 
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface/50'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Comandes</span>
                {activeOrdersCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-mono font-bold animate-pulse">
                    {activeOrdersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Reassurance Banner (només a la pestanya de cistella) */}
          {activeDrawerTab === 'cart' && (
            <div className="bg-primary/5 px-6 py-2.5 border-b border-primary/15 flex items-start gap-2 text-xs text-primary">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-snug text-[11px]">
                <b>Desat automàtic:</b> La teva selecció es manté guardada al navegador. Pots revisar-la quan vulguis.
              </p>
            </div>
          )}

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {activeDrawerTab === 'tracking' ? (
              renderTrackingContent()
            ) : submittedRef ? (
              /* Success Screen */
              <div className="py-8 text-center space-y-5 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-2xl text-primary font-bold">
                    {isMixed ? 'Comanda i Pressupost Rebuts!' : (hasFixed ? 'Comanda Rebuda amb Èxit!' : 'Sol·licitud Rebuda!')}
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                    Moltes gràcies, <strong>{formData.name}</strong>. En <strong className="notranslate" translate="no">Jordi Alcalde</strong> ha rebut la notificació al taller.
                  </p>
                </div>

                {/* Caixa de Referència */}
                <div className="bg-surface-container p-3.5 rounded-xl font-mono text-xs text-primary border border-primary/20 max-w-xs mx-auto flex items-center justify-between">
                  <span className="text-on-surface-variant">Referència comanda:</span>
                  <strong className="text-sm font-bold bg-primary/10 px-2 py-0.5 rounded">{submittedRef}</strong>
                </div>

                {/* Targeta de Pagament per Bizum */}
                {submittedPayment === 'bizum' ? (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 p-4 rounded-xl border border-emerald-500/30 text-left max-w-xs mx-auto space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wide">
                      <CreditCard className="w-4 h-4" />
                      <span>Instruccions de Pagament per Bizum</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Pots formalitzar la comanda fent un Bizum amb les següents dades:
                    </p>
                    <div className="bg-surface p-3 rounded-lg border border-outline/15 text-xs font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Telèfon Bizum:</span>
                        <strong className="text-primary text-sm">699 592 326</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Titular:</span>
                        <strong className="text-primary">Jordi Alcalde</strong>
                      </div>
                      {submittedTotal > 0 && (
                        <div className="flex justify-between pt-1 border-t border-outline/10">
                          <span className="text-on-surface-variant">Import a transferir:</span>
                          <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">{formatCurrency(submittedTotal)}</strong>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-outline/10">
                        <span className="text-on-surface-variant">Concepte:</span>
                        <strong className="text-primary">{submittedRef}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container p-4 rounded-xl border border-outline/20 text-left max-w-xs mx-auto space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wide">
                      <Truck className="w-4 h-4" />
                      <span>Pagament en recollir acordat</span>
                    </div>
                    <p className="text-on-surface-variant leading-relaxed">
                      Ens posarem en contacte per concretar data i punt de trobada. L'import es liquidarà en el moment del lliurament.
                    </p>
                  </div>
                )}

                {/* Accions Post-Comanda: Seguiment i WhatsApp */}
                <div className="max-w-xs mx-auto space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenTracking) {
                        onOpenTracking(submittedRef);
                      } else {
                        window.location.hash = `#seguiment-${submittedRef}`;
                        window.dispatchEvent(new Event('hashchange'));
                      }
                      handleClose();
                    }}
                    className="w-full py-3 bg-primary text-on-primary rounded-xl font-body-md text-xs font-bold hover:bg-primary-container transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Fes el Seguiment de la teva Comanda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDrawerTab('tracking');
                      setSubmittedRef(null);
                    }}
                    className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl font-body-md text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Veure a Les Meves Comandes</span>
                  </button>

                  <a
                    href={`https://wa.me/34699592326?text=${encodeURIComponent(`Hola Jordi! Acabo de fer la comanda ${submittedRef} a Mínim Món.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Avisar per WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 border border-outline/30 text-on-surface-variant hover:text-primary rounded-xl text-xs font-medium hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Tancar i Continuar Navegant
                  </button>
                </div>
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

                {/* Targeta de Resum de la Cistella amb Enviament i Total */}
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
                        <span>Subtotal articles ({totalFixedUnits} u.):</span>
                      </span>
                      <span className="font-mono font-bold text-primary text-sm">
                        {formatCurrency(totalFixedPrice)}
                      </span>
                    </div>
                  )}

                  {/* Detall Enviament */}
                  {hasFixed && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-outline/10">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {deliveryMethod === 'recollida' 
                            ? 'Lliurament en mà acordat:' 
                            : deliveryMethod === 'certificat' 
                              ? 'Correos Carta Certificada:' 
                              : 'Correos Carta Ordinària:'}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-primary">
                        {shippingCost > 0 ? formatCurrency(shippingCost) : 'Gratuït (0,00 €)'}
                      </span>
                    </div>
                  )}

                  {/* Total Final */}
                  {hasFixed && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-primary/20">
                      <span className="font-bold text-primary text-sm uppercase tracking-wide">
                        Total Comanda (IVA inc.):
                      </span>
                      <span className="font-mono font-black text-primary text-base">
                        {formatCurrency(totalWithShipping)}
                      </span>
                    </div>
                  )}

                  {/* Detall Pressupost */}
                  {hasBudget && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-outline/10">
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
                      💡 La teva cistella combina productes de compra directa ({formatCurrency(totalWithShipping)}) i peces personalitzades a mida. En Jordi validarà tots els detalls abans de la fabricació.
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

                {/* Form d'Enviament i Pagament */}
                <form onSubmit={handleSubmit} className="bg-surface-container p-5 rounded-xl border border-outline/15 space-y-5 pt-5">
                  <h3 className="font-serif text-lg font-semibold text-primary flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span>Dades de Contacte i Lliurament</span>
                  </h3>

                  {/* 1. Dades de Contacte */}
                  <div className="space-y-3">
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
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary font-sans"
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
                        className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-primary font-sans"
                      />
                    </div>
                  </div>

                  {/* 2. Mètode de Lliurament i Enviament Correos */}
                  <div className="pt-2 border-t border-outline/10 space-y-2.5">
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      <span>Forma de Lliurament *</span>
                    </label>

                    <div className="grid grid-cols-1 gap-2">
                      {/* Carta Certificada */}
                      <div 
                        onClick={() => setDeliveryMethod('certificat')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          deliveryMethod === 'certificat'
                            ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'bg-surface/60 border-outline/20 hover:border-outline/40'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-primary">Carta Certificada (Correos)</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                              Recomanat
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                            {shippingConfig?.cartaCertificada?.descripcio || 'Fins a 2 kg. 2-4 dies de trànsit. Identificat i registrat, entrega sota signatura i seguiment garantit.'}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-primary shrink-0">
                          {formatCurrency(shippingConfig?.cartaCertificada?.preu ?? 6.00)}
                        </span>
                      </div>

                      {/* Carta Ordinària */}
                      <div 
                        onClick={() => setDeliveryMethod('ordinari')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          deliveryMethod === 'ordinari'
                            ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'bg-surface/60 border-outline/20 hover:border-outline/40'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs text-primary">Carta Ordinària (Correos)</span>
                          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                            {shippingConfig?.cartaOrdinaria?.descripcio || 'Fins a 2 kg. 2-4 dies de trànsit. Fàcil: estalvia temps i costos amb enviaments normalitzats.'}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-primary shrink-0">
                          {formatCurrency(shippingConfig?.cartaOrdinaria?.preu ?? 2.50)}
                        </span>
                      </div>

                      {/* Recollida / Entrega acordada */}
                      <div 
                        onClick={() => setDeliveryMethod('recollida')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          deliveryMethod === 'recollida'
                            ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'bg-surface/60 border-outline/20 hover:border-outline/40'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs text-primary">Recollida / Entrega en mà acordada</span>
                          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                            {shippingConfig?.recollida?.descripcio || 'Ens trobem en algun punt acordat (sense despeses de transport).'}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          Gratuït
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Adreça Postal si s'envia per Correos */}
                  {deliveryMethod !== 'recollida' && (
                    <div className="p-3.5 bg-surface rounded-xl border border-outline/20 space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>Adreça Postal per a Correos</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                          Carrer, número, pis o porta *
                        </label>
                        <input
                          type="text"
                          required={deliveryMethod !== 'recollida'}
                          placeholder="Ex: Rambla Principal, 14, 2n 1a"
                          value={shippingAddress.carrer}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, carrer: e.target.value })}
                          className="w-full bg-surface-container-lowest border border-outline/25 rounded px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-primary font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                            Codi Postal *
                          </label>
                          <input
                            type="text"
                            required={deliveryMethod !== 'recollida'}
                            placeholder="Ex: 08001"
                            value={shippingAddress.codiPostal}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, codiPostal: e.target.value })}
                            className="w-full bg-surface-container-lowest border border-outline/25 rounded px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-primary font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                            Població *
                          </label>
                          <input
                            type="text"
                            required={deliveryMethod !== 'recollida'}
                            placeholder="Ex: Barcelona"
                            value={shippingAddress.poblacio}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, poblacio: e.target.value })}
                            className="w-full bg-surface-container-lowest border border-outline/25 rounded px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-primary font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                          Província (opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Barcelona, Girona, Lleida, Tarragona..."
                          value={shippingAddress.provincia}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, provincia: e.target.value })}
                          className="w-full bg-surface-container-lowest border border-outline/25 rounded px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-primary font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. Mètode de Pagament */}
                  <div className="pt-2 border-t border-outline/10 space-y-2">
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      <span>Forma de Pagament *</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Bizum */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bizum')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          paymentMethod === 'bizum'
                            ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'bg-surface/60 border-outline/20 hover:border-outline/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-primary">Bizum</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">
                          699 592 326 (Jordi Alcalde). Immediat i segur.
                        </p>
                      </button>

                      {/* Pagament en recollir */}
                      <button
                        type="button"
                        disabled={deliveryMethod !== 'recollida'}
                        onClick={() => setPaymentMethod('recollida')}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          deliveryMethod !== 'recollida'
                            ? 'opacity-40 cursor-not-allowed bg-surface/30 border-outline/10'
                            : paymentMethod === 'recollida'
                              ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-xs cursor-pointer'
                              : 'bg-surface/60 border-outline/20 hover:border-outline/40 cursor-pointer'
                        }`}
                        title={deliveryMethod !== 'recollida' ? "Només disponible si tries 'Recollida / Entrega acordada'" : ""}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-primary">En recollir</span>
                          {deliveryMethod === 'recollida' && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">
                          {deliveryMethod === 'recollida' ? 'Pagament en efectiu/trobada.' : 'Només per entrega acordada.'}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Observacions */}
                  <div className="pt-2 border-t border-outline/10">
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Comentaris Generals (opcional)
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Explica'ns qualsevol detall sobre la comanda..."
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
                      <span>Tramitant comanda...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {isMixed 
                            ? `Tramitar Comanda (${formatCurrency(totalWithShipping)} + Pressupost)` 
                            : (hasFixed 
                              ? `Confirmar Comanda (${formatCurrency(totalWithShipping)})` 
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
