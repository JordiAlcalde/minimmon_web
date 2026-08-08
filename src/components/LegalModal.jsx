import React from 'react';

export default function LegalModal({ title, onClose }) {
  if (!title) return null;

  const renderContent = () => {
    const t = title.toLowerCase();

    if (t.includes('avís') || t.includes('avis') || t.includes('legal')) {
      return (
        <div className="space-y-4 text-on-surface-variant text-sm leading-relaxed">
          <p>
            <span className="notranslate" translate="no">Mínim Món</span> és el nom comercial de l'activitat a títol personal de<br />
            <span className="notranslate" translate="no">Jordi Alcalde Casalta</span><br />
            08512 - Sant Hipòlit de Voltregà - Barcelona - Espanya<br />
            DNI: 37732370L<br />
            Email: <a href="mailto:jordi.alcalde@outlook.com" className="text-primary underline font-medium">jordi.alcalde@outlook.com</a>
          </p>
          <p>
            Aquest lloc web té com a finalitat la presentació de serveis i productes entre particulars i mostrar projectes personals.
          </p>
          <p>
            La informació continguda a aquesta web és de caràcter general i no constitueix assessorament professional.
          </p>
          <p>
            Tots els continguts d'aquest lloc web (textos, imatges, logotips, disseny) són propietat de <span className="notranslate" translate="no">Jordi Alcalde</span> i estan protegits per la legislació de propietat intel·lectual.
          </p>
        </div>
      );
    }

    if (t.includes('privacitat') || t.includes('privacidad') || t.includes('privacy')) {
      return (
        <div className="space-y-4 text-on-surface-variant text-sm leading-relaxed">
          <p>
            En compliment del Reglament General de Protecció de Dades (RGPD), informem:
          </p>
          <p className="space-y-1">
            <i>Responsable del tractament</i>: <span className="notranslate" translate="no">Jordi Alcalde</span><br />
            <i>Finalitat</i>: Gestió de comunicacions i prestació de serveis professionals.<br />
            <i>Legitimació</i>: Consentiment de l'interessat i execució del contracte.<br />
            <i>Destinataris</i>: No se cediran dades a tercers excepte obligació legal.<br />
            <i>Drets</i>: Accés, rectificació, supressió, limitació, portabilitat i oposició.<br />
            <i>Contacte</i>: <a href="mailto:jordi.alcalde@outlook.com" className="text-primary underline font-medium">jordi.alcalde@outlook.com</a>
          </p>
          <p>
            Les dades personals es conservaran mentre duri la relació professional i durant el termini legalment establert.
          </p>
          <p>
            Pots exercir els teus drets enviant un correu electrònic a{' '}
            <a
              href="mailto:jordi.alcalde@outlook.com"
              style={{ color: '#AC80FF', textDecoration: 'underline', fontWeight: 500 }}
            >
              jordi.alcalde@outlook.com
            </a>.
          </p>
        </div>
      );
    }

    if (t.includes('cookie')) {
      return (
        <div className="space-y-4 text-on-surface-variant text-sm leading-relaxed">
          <p>
            Aquest lloc web utilitza <i>cookies</i> pròpies i de tercers per millorar l'experiència de navegació.
          </p>
          <p>
            <strong>Què són les <i>cookies</i> (galetes)?</strong><br />
            Són petits fitxers de text que s'emmagatzemen al navegador quan visites un lloc web.
          </p>
          <p>
            <strong>Tipus de cookies utilitzades:</strong><br />
            · <i>Cookies tècniques</i>: Necessàries per al funcionament del lloc.<br />
            · <i>Cookies analítiques</i>: Ens permeten mesurar i analitzar el trànsit.<br />
            · <i>Cookies de preferències</i>: Emmagatzemen les teves eleccions (com el consentiment de cookies).
          </p>
          <p>
            <strong>Com desactivar les <i>cookies</i>?</strong><br />
            Pots configurar el teu navegador per rebutjar galetes. Tingueu en compte que això pot afectar el funcionament del lloc.
          </p>
          <p>
            Contacte: <a href="mailto:jordialcalde@outlook.com" className="text-primary underline font-medium">jordialcalde@outlook.com</a>
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-surface border border-outline/20 rounded-lg max-w-2xl w-full p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-primary hover:text-outline transition-colors"
          aria-label="Tancar"
        >
          <span className="material-symbols-outlined notranslate" translate="no" aria-hidden="true">close</span>
        </button>

        <h2 className="font-serif text-3xl text-primary mb-4">{title}</h2>
        <div className="laser-line mb-6"></div>

        <div className="max-h-[65vh] overflow-y-auto pr-2">
          {renderContent()}
        </div>

        <div className="mt-8 text-right border-t border-outline/10 pt-4">
          <button
            onClick={onClose}
            className="bg-primary text-on-primary px-6 py-2 rounded text-sm hover:bg-primary-container transition-colors cursor-pointer"
          >
            Tancar
          </button>
        </div>
      </div>
    </div>
  );
}
