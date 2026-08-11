import React, { useState } from 'react';
import { STITCH_CRAFTSMAN } from '../data/stitchData';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { WhatsAppIcon, getWhatsAppLink } from './WhatsAppButton';
import { sendTelegramNotification } from '../utils/telegramUtils';

export default function ContacteSection() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Guardar la consulta a la col·lecció 'consultes' de Cloud Firestore
      await addDoc(collection(db, "consultes"), {
        nom: formData.name,
        email: formData.email,
        telefon: formData.phone,
        missatge: formData.message,
        data: serverTimestamp()
      });

      // Enviar notificació instantània al mòbil per Telegram
      sendTelegramNotification({
        nom: formData.name,
        email: formData.email,
        telefon: formData.phone,
        missatge: formData.message,
        tipus: 'Formulari de Contacte'
      });
    } catch (err) {
      console.warn("Nota de Firebase: La petició s'ha processat en mode local o pendent de valors de configuració reals.", err);
    }
    setSubmitted(true);
  };

  return (
    <div className="pt-28 pb-24 animate-fadeIn">
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest block mb-2 font-semibold">Estem en contacte</span>
          <h1 className="font-headline-xl text-headline-xl text-primary mb-6 font-serif text-4xl md:text-5xl">
            Comencem a xerrar
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Parlar i connectar amb qui m'encarrega una feina és tan valuós com el resultat final.<br />Explica'm la teva idea sense cap compromís.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          {/* Form */}
          <div className="md:col-span-7 bg-surface-container-lowest p-8 md:p-12 rounded-lg border border-outline/15 shadow-sm">
            <h2 className="font-serif text-2xl text-primary mb-6">Formulari de Consulta</h2>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-2 block" htmlFor="contact-name">
                    El teu Nom *
                  </label>
                  <input
                    required
                    id="contact-name"
                    type="text"
                    placeholder="Ex: Maria Pons"
                    className="w-full bg-surface border border-outline/25 rounded px-4 py-3 text-primary outline-none focus:border-primary transition-colors"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-2 block" htmlFor="contact-email">
                      Correu Electrònic *
                    </label>
                    <input
                      required
                      id="contact-email"
                      type="email"
                      placeholder="nom@exemple.cat"
                      className="w-full bg-surface border border-outline/25 rounded px-4 py-3 text-primary outline-none focus:border-primary transition-colors"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-2 block" htmlFor="contact-phone">
                      Telèfon (opcional)
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      placeholder="600 000 000"
                      className="w-full bg-surface border border-outline/25 rounded px-4 py-3 text-primary outline-none focus:border-primary transition-colors"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-2 block" htmlFor="contact-message">
                    Descriu la teva idea o encàrrec *
                  </label>
                  <textarea
                    required
                    id="contact-message"
                    rows={5}
                    placeholder="Explica'm quin espai, idea o regal en fusta t'agradaria crear..."
                    className="w-full bg-surface border border-outline/25 rounded px-4 py-3 text-primary outline-none focus:border-primary transition-colors resize-none"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-on-primary py-4 rounded-xl font-body-md hover:bg-primary-container transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer font-semibold"
                >
                  <span>Enviar Missatge</span>
                  <span className="material-symbols-outlined text-sm notranslate" translate="no" aria-hidden="true">send</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-12 space-y-4">
                <span className="material-symbols-outlined text-5xl text-primary notranslate" translate="no" aria-hidden="true">check_circle</span>
                <h3 className="font-serif text-3xl text-primary">Moltes gràcies, {formData.name}!</h3>
                <p className="text-on-surface-variant max-w-md mx-auto">
                  El teu missatge ha estat rebut. En <strong className="notranslate" translate="no">Jordi Alcalde</strong> es posarà en contacte amb tu molt aviat a través de {formData.email}.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-sm text-primary underline cursor-pointer"
                >
                  Enviar un altre missatge
                </button>
              </div>
            )}
          </div>

          {/* Contact Info Card */}
          <div className="md:col-span-5 bg-surface-container p-8 md:p-10 rounded-lg space-y-8 border border-outline/10">
            <div>
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-semibold block mb-1">Creador &amp; Taller</span>
              <h2 className="font-serif text-3xl text-primary notranslate" translate="no">{STITCH_CRAFTSMAN.name}</h2>
              <p className="text-on-surface-variant text-sm mt-1 notranslate" translate="no">{STITCH_CRAFTSMAN.brandName}</p>
            </div>

            <div className="space-y-4 border-t border-outline/15 pt-6">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-1 notranslate" translate="no" aria-hidden="true">mail</span>
                <div>
                  <p className="font-label-sm text-xs text-outline uppercase">Correu directe</p>
                  <p><a href={`mailto:${STITCH_CRAFTSMAN.emails[0]}`} className="text-primary hover:underline">{STITCH_CRAFTSMAN.emails[0]}</a></p>
                  <p><a href={`mailto:${STITCH_CRAFTSMAN.emails[1]}`} className="text-primary hover:underline">{STITCH_CRAFTSMAN.emails[1]}</a></p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-1 notranslate" translate="no" aria-hidden="true">call</span>
                <div>
                  <p className="font-label-sm text-xs text-outline uppercase">Telèfon de contacte</p>
                  <p><a href={`tel:${STITCH_CRAFTSMAN.phone.replace(/\s+/g, '')}`} className="text-primary hover:underline font-mono">{STITCH_CRAFTSMAN.phone}</a></p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-1 notranslate" translate="no" aria-hidden="true">precision_manufacturing</span>
                <div>
                  <p className="font-label-sm text-xs text-outline uppercase">Infraestructura</p>
                  <p className="text-on-surface-variant text-sm">Màquina làser de petit format, impressora 3D i eines de fusteria fina. Software professional.</p>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Card */}
            <div className="bg-primary/5 p-5 rounded-lg border border-primary/20 space-y-3">
              <div className="flex items-center gap-3 text-primary font-serif font-semibold">
                <WhatsAppIcon className="w-5 h-5 text-primary shrink-0" />
                <span>Consulta Ràpida per WhatsApp</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Prefereixes una resposta immediata o enviar fotos del teu espai? Parlem-ho directament per xat.
              </p>
              <a
                href={getWhatsAppLink("Hola Jordi, m'agradaria fer-te una consulta sobre un projecte personalitzat.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary text-on-primary text-xs font-semibold rounded-xl hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>Obrir xat de WhatsApp ({STITCH_CRAFTSMAN.phone})</span>
              </a>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded border border-outline/10 text-xs text-on-surface-variant space-y-2">
              <p className="font-bold text-primary text-sm">Atelier Privat <span className="notranslate" translate="no">Mínim Món</span></p>
              <p>Treball privat sota comanda personalitzada. No es realitza producció en massa; cada peça rep dedicació artesana individual.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
