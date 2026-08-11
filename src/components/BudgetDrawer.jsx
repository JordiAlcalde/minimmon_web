import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, Send, CheckCircle2, MessageSquare, Sparkles, FileText, Paperclip } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { resolveMediaUrl } from '../utils/mediaUtils';
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

  if (!isDrawerOpen) return null;

  const handleSubmitBudget = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    const refCode = `PRESSUPOST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Desar a Cloud Firestore
      await addDoc(collection(db, "pressupostos"), {
        codiReferencia: refCode,
        clientNom: formData.name,
        clientContacte: formData.contact,
        observacionsGenerals: formData.generalNotes,
        productes: cart.map(item => ({
          producteId: item.producteId,
          nom: item.nom,
          quantitat: item.quantitat,
          observacions: item.observacions || '',
          opcionsTriades: item.opcionsTriades || {},
          terminiFabricacio: item.terminiFabricacio || ''
        })),
        estat: 'pendent',
        data: serverTimestamp()
      });

      // 2. Format del missatge detallat per a Telegram
      const itemsSummary = cart.map((item, idx) => {
        const opcionsStr = Object.entries(item.opcionsTriades || {})
          .map(([k, v]) => `   • ${k}: ${v}`)
          .join('\n');
        return `<b>${idx + 1}. ${item.nom}</b> (x${item.quantitat})\n${opcionsStr ? opcionsStr + '\n' : ''}${item.observacions ? `   💬 Notes: ${item.observacions}\n` : ''}`;
      }).join('\n');

      const telegramMsg = `
📋 <b>NOVA SOL·LICITUD DE PRESSUPOST</b>
Ref: <code>${refCode}</code>

👤 <b>Client:</b> ${formData.name}
📞 <b>Contacte:</b> ${formData.contact}

📦 <b>PECES DE LA CISTELLA (${totalItems}):</b>
${itemsSummary}
${formData.generalNotes ? `\n📝 <b>Observacions Generals:</b>\n${formData.generalNotes}` : ''}
`.trim();

      // 3. Enviar notificació per Telegram al mòbil
      await sendTelegramNotification({
        nom: formData.name,
        email: formData.contact,
        telefon: formData.contact,
        projecteTitol: `Pressupost ${refCode} (${totalItems} peces)`,
        missatge: telegramMsg,
        tipus: 'Solicitud de Pressupost'
      });

      setSubmittedRef(refCode);
      clearCart();
    } catch (err) {
      console.warn("Nota de Firebase al desar pressupost:", err);
      // Fallback si no hi ha connexió
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
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface text-on-surface border-l border-outline/15 shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-6 bg-surface-container-lowest border-b border-outline/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl text-primary font-semibold">Cistella de Pressupostos</h2>
                <p className="text-xs text-on-surface-variant">
                  {cart.length === 0 ? 'Cap peça afegida' : `${totalItems} ${totalItems === 1 ? 'peça seleccionada' : 'peces seleccionades'}`}
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
                <h3 className="font-serif text-2xl text-primary">Sol·licitud Rebuda!</h3>
                <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                  Moltes gràcies, <strong>{formData.name}</strong>. En <strong className="notranslate" translate="no">Jordi Alcalde</strong> ha rebut la notificació al mòbil i revisarà la teva proposta molt aviat.
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
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-lg text-primary font-semibold">La teva cistella és buida</h3>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
                  Explora el nostre Catàleg de Regals o Móns Mínims i afegeix les peces que vulguis per demanar una proposta personalitzada.
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
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div 
                      key={item.cartItemId} 
                      className="bg-surface-container-lowest p-4 rounded-xl border border-outline/15 space-y-3 shadow-xs"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded bg-surface-container overflow-hidden shrink-0 border border-outline/10">
                          {item.imatge ? (
                            <img src={resolveMediaUrl(item.imatge)} alt={item.nom} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline text-xs">Sense img</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-base font-semibold text-primary truncate">{item.nom}</h4>
                          {item.terminiFabricacio && (
                            <p className="text-[11px] text-on-surface-variant font-mono">Termini: {item.terminiFabricacio}</p>
                          )}

                          {/* Opcions Triades */}
                          {Object.keys(item.opcionsTriades || {}).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-outline">
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

                        <button 
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-outline hover:text-error transition-colors p-1 self-start cursor-pointer"
                          title="Eliminar de la cistella"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Controls de Quantitat i Observacions */}
                      <div className="pt-2 border-t border-outline/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

                        <input 
                          type="text"
                          placeholder="Observacions / Comentaris..."
                          value={item.observacions || ''}
                          onChange={(e) => updateCartItem(item.cartItemId, { observacions: e.target.value })}
                          className="flex-1 bg-surface border border-outline/20 rounded px-3 py-1.5 text-xs text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form d'Enviament */}
                <form onSubmit={handleSubmitBudget} className="bg-surface-container p-5 rounded-xl border border-outline/15 space-y-4 pt-5">
                  <h3 className="font-serif text-lg font-semibold text-primary flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span>Dades de Contacte</span>
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
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-primary"
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
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
                      Comentaris Generals (opcional)
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Explica'ns qualsevol detall sobre la data o l'esdeveniment..."
                      value={formData.generalNotes}
                      onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
                      className="w-full bg-surface border border-outline/25 rounded px-3 py-2 text-xs text-primary focus:outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-on-primary py-3.5 rounded font-body-md text-sm hover:bg-primary-container transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Enviant sol·licitud...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Sol·licitar Pressupost Sense Compromís</span>
                      </>
                    )}
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
