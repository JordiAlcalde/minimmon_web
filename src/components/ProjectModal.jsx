import React from 'react';

export default function ProjectModal({ project, onClose, setActiveTab }) {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-surface border border-outline/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-surface-container/90 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
          aria-label="Tancar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Modal Header Image */}
        <div className="relative h-72 md:h-96 w-full overflow-hidden bg-primary-container">
          <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent flex flex-col justify-end p-8">
            <div className="flex gap-2 mb-2">
              <span className="px-3 py-1 bg-surface/20 backdrop-blur-md rounded text-xs text-on-primary font-mono uppercase">
                {project.woodType}
              </span>
              <span className="px-3 py-1 bg-surface/20 backdrop-blur-md rounded text-xs text-on-primary font-mono uppercase">
                {project.category}
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-on-primary">{project.title}</h2>
            <p className="text-on-primary/80 text-sm md:text-base mt-1">{project.subtitle}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-8">
          <div>
            <h3 className="font-serif text-xl text-primary mb-3">Descripció &amp; Concepte</h3>
            <p className="text-on-surface-variant leading-relaxed">{project.description}</p>
          </div>

          {/* El perquè de cada detall */}
          {project.whyDetails && (
            <div>
              <h3 className="font-serif text-xl text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">help_outline</span>
                <span>El perquè de cada detall</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.whyDetails.map((detail, idx) => (
                  <div key={idx} className="bg-surface-container p-4 rounded border border-outline/10 space-y-1">
                    <h4 className="font-serif font-medium text-primary text-base">• {detail.title}</h4>
                    <p className="text-on-surface-variant text-sm leading-relaxed">{detail.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA inside Modal */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-serif text-lg text-primary">T'inspira aquesta peça?</h4>
              <p className="text-on-surface-variant text-sm">Podem crear un Món Mínim basat en el teu espai o memòria personal.</p>
            </div>
            <button 
              onClick={() => { onClose(); setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="bg-primary text-on-primary px-6 py-3 rounded font-body-md hover:bg-primary-container transition-colors shadow-md cursor-pointer whitespace-nowrap"
            >
              Contacta amb en Jordi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
