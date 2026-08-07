import React, { useState } from 'react';
import { STITCH_PROJECTS } from '../data/stitchData';

export default function MonsMinimsSection({ onSelectProject, setActiveTab }) {
  const [filter, setFilter] = useState('Tots');

  const categories = ['Tots', 'Arquitectura', 'Topografia', 'Gravat 3D', 'Diorama'];

  const filteredProjects = filter === 'Tots' 
    ? STITCH_PROJECTS 
    : STITCH_PROJECTS.filter(p => p.category.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="pt-28 pb-32 animate-fadeIn">
      {/* Hero Header */}
      <header className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-16 text-center">
        <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest block mb-2 font-semibold">Galeria de Peces</span>
        <h1 className="font-headline-xl text-headline-xl text-primary mb-6 font-serif text-4xl md:text-5xl">Móns Mínims: L'Art de la Precisió</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Una exploració tàctil on la calidesa orgànica de la fusta es troba amb la rigorositat matemàtica del làser. Cada projecte és un diàleg silenciós entre la matèria i la llum.
        </p>
        
        {/* Category Filters */}
        <div className="flex justify-center gap-3 mt-10 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-2 rounded-full font-body-md text-sm transition-all cursor-pointer ${
                filter === cat 
                  ? 'bg-primary text-on-primary font-medium shadow-sm' 
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-16 h-px bg-primary/20 mx-auto mt-12"></div>
      </header>

      {/* Gallery Section */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex flex-col gap-24">
          {filteredProjects.map((project, index) => {
            const isEven = index % 2 === 0;

            return (
              <article 
                key={project.id} 
                className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center group cursor-pointer"
                onClick={() => onSelectProject(project)}
              >
                {/* Image Side */}
                <div className={`md:col-span-7 ${isEven ? 'order-2 md:order-1' : 'md:col-start-6 order-2'} relative`}>
                  <div className={`absolute inset-0 bg-surface-container-low ${isEven ? 'translate-x-4' : '-translate-x-4'} translate-y-4 rounded transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2`}></div>
                  <img 
                    className="relative w-full aspect-[4/3] object-cover rounded shadow-md transition-transform duration-500 group-hover:scale-[1.02]" 
                    alt={project.title}
                    src={project.image}
                  />
                </div>

                {/* Text Side */}
                <div className={`md:col-span-5 ${isEven ? 'md:col-start-8 order-1 md:order-2' : 'md:col-start-1 md:row-start-1 order-1'} mb-8 md:mb-0`}>
                  <div className="inline-flex gap-2 mb-3">
                    <span className="px-3 py-1 bg-surface-container-high rounded text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
                      {project.woodType}
                    </span>
                    <span className="px-3 py-1 bg-surface-container-high rounded text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
                      {project.category}
                    </span>
                  </div>

                  <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-4 font-serif text-3xl">
                    {project.title}
                  </h2>

                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
                    {project.subtitle}
                  </p>

                  <p className="font-body-md text-body-md text-on-surface-variant/80 mb-6 text-sm">
                    {project.description}
                  </p>

                  <button className="font-body-md text-primary font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    <span>Explora el perquè de cada detall</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>

                  <div className="laser-line mt-6"></div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-32 max-w-xl mx-auto text-center px-6">
        <h3 className="font-serif text-2xl text-primary mb-3">Vols crear un Món Mínim personalitzat?</h3>
        <p className="text-on-surface-variant text-sm mb-6">
          Cada espai o memòria té una forma única en fusta. Parlem directament per idear la teva peça.
        </p>
        <button 
          onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="bg-primary text-on-primary px-8 py-3.5 rounded-DEFAULT font-body-md hover:bg-primary-container transition-colors shadow-md cursor-pointer"
        >
          Demana una proposta
        </button>
      </div>
    </div>
  );
}
