import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, MessageSquare, Heart, Box, Gift, Send } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendTelegramNotification } from '../utils/telegramUtils';

export default function ProjectWizard({ isOpen, onClose, initialItemTitle = '' }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    projectType: 'Món en Miniatura',
    itemTitle: initialItemTitle || '',
    conceptEmotion: '',
    recipient: '',
    preferredWood: 'Roure natural',
    specialFeatures: [],
    clientName: '',
    clientContact: '',
    notes: ''
  });
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (initialItemTitle) {
      setFormData(prev => ({
        ...prev,
        projectType: 'Regal Personalitzat',
        itemTitle: initialItemTitle
      }));
    }
  }, [initialItemTitle]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleFeature = (feature) => {
    setFormData(prev => {
      const exists = prev.specialFeatures.includes(feature);
      return {
        ...prev,
        specialFeatures: exists 
          ? prev.specialFeatures.filter(f => f !== feature)
          : [...prev.specialFeatures, feature]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "consultes"), {
        nom: formData.clientName,
        contacte: formData.clientContact,
        tipus: formData.projectType,
        titolPeca: formData.itemTitle,
        concepte: formData.conceptEmotion,
        destinatari: formData.recipient,
        fusta: formData.preferredWood,
        caracteristiques: formData.specialFeatures,
        notes: formData.notes,
        data: serverTimestamp()
      });

      sendTelegramNotification({
        nom: formData.clientName,
        email: formData.clientContact,
        telefon: formData.clientContact,
        projecteTitol: formData.itemTitle || formData.projectType,
        missatge: `Tipus: ${formData.projectType}\nIdees/Concepte: ${formData.conceptEmotion}\nDestinatari: ${formData.recipient}\nFusta: ${formData.preferredWood}\nNotes: ${formData.notes}`,
        tipus: 'Assistent Wizard'
      });
    } catch (err) {
      console.warn("Nota de Firebase Wizard:", err);
    }
    setIsSent(true);
  };

  const resetForm = () => {
    setIsSent(false);
    setStep(1);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content wizard-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Tancar">
          <X size={20} />
        </button>

        {!isSent ? (
          <>
            {/* Header progress */}
            <div className="wizard-header">
              <div className="badge badge-laser mb-1">
                <Sparkles size={13} />
                <span>Assistent de Personalització</span>
              </div>
              <h2 className="wizard-title font-serif">Parlem de la teva idea</h2>
              <p className="wizard-subtitle">
                Aquest assistent t'ajudarà a estructurar què vols transmetre abans que comencem a parlar.
              </p>

              {/* Step indicator */}
              <div className="wizard-progress-bar">
                {[1, 2, 3, 4].map(s => (
                  <div 
                    key={s} 
                    className={`progress-step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}
                  >
                    <span className="step-num">{s}</span>
                    <span className="step-label font-mono">
                      {s === 1 && 'Tipus'}
                      {s === 2 && 'Essència'}
                      {s === 3 && 'Materials'}
                      {s === 4 && 'Contacte'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wizard-body">
              {/* STEP 1: Tipus de Projecte */}
              {step === 1 && (
                <div className="wizard-step-content fade-in">
                  <h3 className="step-heading font-serif">1. Quin tipus de peça tens en ment?</h3>
                  <div className="grid-2 gap-4 mt-4">
                    <div 
                      className={`type-option-card glass-panel ${formData.projectType === 'Món en Miniatura' ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, projectType: 'Món en Miniatura' })}
                    >
                      <div className="option-icon"><Box size={24} /></div>
                      <h4 className="font-serif">Un Món en Miniatura</h4>
                      <p>Un escenari o recreació simbòlica d'un espai, ofici, vivència o record estimat.</p>
                    </div>

                    <div 
                      className={`type-option-card glass-panel ${formData.projectType === 'Regal Personalitzat' ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, projectType: 'Regal Personalitzat' })}
                    >
                      <div className="option-icon"><Gift size={24} /></div>
                      <h4 className="font-serif">Un Regal Personalitzat</h4>
                      <p>Clauers, punts de llibre, pins, marcs de foto o taulons gravats a làser.</p>
                    </div>
                  </div>

                  {formData.projectType === 'Regal Personalitzat' && (
                    <div className="form-group mt-4">
                      <label className="form-label">Peça específica del catàleg (opcional):</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={formData.itemTitle}
                        onChange={(e) => setFormData({ ...formData, itemTitle: e.target.value })}
                        placeholder="Ex: Clauers en fusta de noguer..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Què vols transmetre */}
              {step === 2 && (
                <div className="wizard-step-content fade-in">
                  <h3 className="step-heading font-serif">2. Quina essència o idea vols simbolitzar?</h3>
                  
                  <div className="form-group mt-3">
                    <label className="form-label">Descriu el record, espai o sentiment que et transmet:</label>
                    <textarea 
                      className="form-textarea"
                      rows={4}
                      value={formData.conceptEmotion}
                      onChange={(e) => setFormData({ ...formData, conceptEmotion: e.target.value })}
                      placeholder="Ex: M'agradaria un petit escenari que recordi el taller de fusteria del meu pare, amb la llum de la finestra i el color del faig..."
                    />
                  </div>

                  <div className="form-group mt-3">
                    <label className="form-label">Per a qui és aquesta peça?</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={formData.recipient}
                      onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                      placeholder="Ex: Per a mi mateix / Un regal de jubilació per a un amic..."
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Materials i opcions */}
              {step === 3 && (
                <div className="wizard-step-content fade-in">
                  <h3 className="step-heading font-serif">3. Preferència de materials i acabats</h3>

                  <div className="form-group mt-3">
                    <label className="form-label">Fusta principal preferida:</label>
                    <div className="wood-chips-grid">
                      {['Roure natural', 'Noguer fosquet', 'Bedoll claret', 'Faig càlid'].map(wood => (
                        <div 
                          key={wood}
                          className={`wood-chip ${formData.preferredWood === wood ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, preferredWood: wood })}
                        >
                          <span className="chip-dot"></span>
                          <span>{wood}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group mt-4">
                    <label className="form-label">Detalls o tècniques especials:</label>
                    <div className="features-checkbox-grid">
                      {[
                        'Gravat de text o dates a micro-escala',
                        'Llum LED interior (2700K ambre)',
                        'Components 3D d alta precisió',
                        'Caixa de presentació gravada',
                        'Vernís ecològic mat'
                      ].map(feat => (
                        <div 
                          key={feat}
                          className={`feature-item ${formData.specialFeatures.includes(feat) ? 'selected' : ''}`}
                          onClick={() => toggleFeature(feat)}
                        >
                          <CheckCircle2 size={16} className={formData.specialFeatures.includes(feat) ? 'text-laser' : 'text-muted'} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Les teves dades de contacte */}
              {step === 4 && (
                <form onSubmit={handleSubmit} className="wizard-step-content fade-in">
                  <h3 className="step-heading font-serif">4. Com puc connectar amb tu?</h3>
                  <p className="step-desc mb-4">
                    Com que cada treball requereix parlar directament per entendre tots els detalls, deixa'm la teva via preferida.
                  </p>

                  <div className="grid-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">El teu nom:</label>
                      <input 
                        type="text" 
                        required
                        className="form-input"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="Com t'agrada que et cridin"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email o WhatsApp de contacte:</label>
                      <input 
                        type="text" 
                        required
                        className="form-input"
                        value={formData.clientContact}
                        onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })}
                        placeholder="Ex: 600 000 000 o nom@email.com"
                      />
                    </div>
                  </div>

                  <div className="form-group mt-3">
                    <label className="form-label">Alguna nota o horari preferit per parlar?</label>
                    <textarea 
                      className="form-textarea"
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Ex: Em va bé parlar a les tardes..."
                    />
                  </div>

                  {/* Summary preview */}
                  <div className="summary-box glass-panel mt-4">
                    <span className="summary-title font-serif">Resum de la teva idea:</span>
                    <p className="summary-text font-mono">
                      • Tipus: {formData.projectType} {formData.itemTitle ? `(${formData.itemTitle})` : ''}<br />
                      • Fusta: {formData.preferredWood}<br />
                      • Detalls seleccionats: {formData.specialFeatures.length > 0 ? formData.specialFeatures.join(', ') : 'Cap especificat'}
                    </p>
                  </div>
                </form>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="wizard-footer">
              {step > 1 ? (
                <button className="btn btn-secondary" onClick={handlePrev}>
                  <ArrowLeft size={16} />
                  <span>Anterior</span>
                </button>
              ) : <div></div>}

              {step < 4 ? (
                <button className="btn btn-primary" onClick={handleNext}>
                  <span>Següent pas</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleSubmit}>
                  <Send size={16} />
                  <span>Enviar la meva proposta</span>
                </button>
              )}
            </div>
          </>
        ) : (
          /* Confirmation State */
          <div className="wizard-sent-state text-center p-6 fade-in">
            <div className="sent-icon-wrapper mx-auto mb-4">
              <Heart size={36} className="text-laser" />
            </div>
            <h2 className="font-serif text-wood text-2xl mb-2">Gràcies per compartir la teva idea, {formData.clientName}!</h2>
            <p className="text-secondary max-w-md mx-auto mb-6">
              M'ha arribat la teva sol·licitud per al projecte de <strong>{formData.projectType}</strong>. Et contactaré ben aviat a <strong>{formData.clientContact}</strong> per xerrar tranquil·lament i començar a donar forma a aquesta peça.
            </p>
            <button className="btn btn-primary" onClick={resetForm}>
              <span>Tancar l'assistent</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        .wizard-modal {
          max-width: 720px;
          padding: 2.25rem;
        }

        .wizard-title {
          font-size: 1.75rem;
          color: var(--color-wood-light);
        }

        .wizard-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        .wizard-progress-bar {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-bottom: 2rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          opacity: 0.4;
          transition: all 0.3s ease;
        }

        .progress-step.active {
          opacity: 1;
        }

        .progress-step.current .step-num {
          background: var(--color-laser-glow);
          color: #FFF;
          border-color: var(--color-laser-glow);
        }

        .step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(28, 25, 22, 0.8);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .step-label {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .step-heading {
          font-size: 1.2rem;
          color: var(--color-wood-light);
          margin-bottom: 0.5rem;
        }

        .step-desc {
          font-size: 0.88rem;
          color: var(--text-muted);
        }

        .type-option-card {
          padding: 1.25rem;
          cursor: pointer;
          border: 1px solid var(--border-subtle);
          transition: all 0.25s ease;
        }

        .type-option-card:hover {
          border-color: var(--color-wood-medium);
        }

        .type-option-card.selected {
          border-color: var(--color-laser-glow);
          background: rgba(231, 111, 81, 0.1);
        }

        .option-icon {
          color: var(--color-laser-bright);
          margin-bottom: 0.5rem;
        }

        .type-option-card h4 {
          font-size: 1.1rem;
          color: var(--color-wood-light);
          margin-bottom: 0.3rem;
        }

        .type-option-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-label {
          font-size: 0.85rem;
          color: var(--color-wood-medium);
          font-weight: 600;
        }

        .form-input, .form-textarea {
          width: 100%;
          background: rgba(18, 16, 14, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 0.75rem 1rem;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.25s ease;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: var(--color-laser-glow);
          box-shadow: 0 0 10px rgba(231, 111, 81, 0.2);
        }

        .wood-chips-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .wood-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          background: rgba(28, 25, 22, 0.6);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          font-size: 0.88rem;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .wood-chip.selected {
          border-color: var(--color-amber-accent);
          background: rgba(233, 196, 106, 0.12);
          color: var(--color-wood-light);
        }

        .chip-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-wood-medium);
        }

        .features-checkbox-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-sm);
          background: rgba(28, 25, 22, 0.4);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .feature-item.selected {
          border-color: var(--color-laser-glow);
          background: rgba(231, 111, 81, 0.08);
          color: var(--text-primary);
        }

        .summary-box {
          padding: 1rem;
          background: rgba(212, 163, 115, 0.05);
        }

        .summary-title {
          font-size: 0.9rem;
          color: var(--color-wood-medium);
          display: block;
          margin-bottom: 0.3rem;
        }

        .summary-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .wizard-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .sent-icon-wrapper {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(231, 111, 81, 0.15);
          border: 1px solid var(--border-active);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
