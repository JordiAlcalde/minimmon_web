import React from 'react';

export default function LegalModal({ title, onClose }) {
  if (!title) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-surface border border-outline/20 rounded-lg max-w-2xl w-full p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-primary hover:text-outline transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="font-serif text-3xl text-primary mb-4">{title} - Mínim Món</h2>
        <div className="laser-line mb-6"></div>

        <div className="space-y-4 text-on-surface-variant text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <p>
            <strong>Titular del lloc web:</strong> Jordi Alcalde Casalta (Mínim Món de Jordi Alcalde).
          </p>
          <p>
            <strong>Contacte:</strong> info@minimmon.cat | jordi.alcalde@outlook.com | +34 699 592 326
          </p>
          <p>
            Tots els drets d'imatges, textos, dissenys de Móns en Miniatura i regals artesans gravats a làser estan reservats © 2026 Mínim Món de Jordi Alcalde.
          </p>
          <p>
            Aquest lloc web té caràcter purament informatiu i de galeria de projectes artesanals privats. No es recopilen dades de navegació ni cookies de tercers amb fins publicitaris.
          </p>
        </div>

        <div className="mt-8 text-right">
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
