import React, { useState } from 'react';
import { STITCH_GIFTS } from '../data/stitchData';

export default function RegalsCatalogSection({ setActiveTab }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="pt-28 pb-24 animate-fadeIn">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 text-center">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-6 font-serif text-4xl md:text-5xl">
          Catàleg de regals:<br />petites peces amb ànima.
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Descobreix la nostra selecció de peces úniques, on la calidesa de la fusta i la precisió artesanal s'uneixen per crear records inesborrables.
        </p>
      </section>

      {/* Subcategories Bar */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter py-8 border-y border-outline/10">
          <div className="space-y-3">
            <h3 className="font-headline-md text-headline-md text-primary font-serif text-xl">Jocs i creativitat</h3>
            <ul className="space-y-1.5 font-body-md text-on-surface-variant text-sm">
              <li><button onClick={() => setSelectedCategory('Jocs')} className="hover:text-primary transition-colors cursor-pointer">Puzles</button></li>
              <li><button onClick={() => setSelectedCategory('Jocs')} className="hover:text-primary transition-colors cursor-pointer">Jocs tradicionals</button></li>
              <li><button onClick={() => setSelectedCategory('Jocs')} className="hover:text-primary transition-colors cursor-pointer">Infantil</button></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-headline-md text-headline-md text-primary font-serif text-xl">Records i fotografia</h3>
            <ul className="space-y-1.5 font-body-md text-on-surface-variant text-sm">
              <li><button onClick={() => setSelectedCategory('Records')} className="hover:text-primary transition-colors cursor-pointer">Clauers personalitzats</button></li>
              <li><button onClick={() => setSelectedCategory('Records')} className="hover:text-primary transition-colors cursor-pointer">Cartells i plaques</button></li>
              <li><button onClick={() => setSelectedCategory('Records')} className="hover:text-primary transition-colors cursor-pointer">Marcs de fotos</button></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-headline-md text-headline-md text-primary font-serif text-xl">Complements</h3>
            <ul className="space-y-1.5 font-body-md text-on-surface-variant text-sm">
              <li><button onClick={() => setSelectedCategory('Complements')} className="hover:text-primary transition-colors cursor-pointer">Caixes gravades</button></li>
              <li><button onClick={() => setSelectedCategory('Complements')} className="hover:text-primary transition-colors cursor-pointer">Embalatges artesans</button></li>
              <li><button onClick={() => setSelectedCategory('Complements')} className="hover:text-primary transition-colors cursor-pointer">Miscel·lània</button></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-headline-md text-headline-md text-primary font-serif text-xl">Dates assenyalades</h3>
            <ul className="space-y-1.5 font-body-md text-on-surface-variant text-sm">
              <li><button onClick={() => setSelectedCategory('Dates')} className="hover:text-primary transition-colors cursor-pointer">Sant Jordi</button></li>
              <li><button onClick={() => setSelectedCategory('Dates')} className="hover:text-primary transition-colors cursor-pointer">Dia del Pare</button></li>
              <li><button onClick={() => setSelectedCategory('Dates')} className="hover:text-primary transition-colors cursor-pointer">Nadal</button></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Grid of Catalog Cards */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {STITCH_GIFTS.map((gift) => (
          <div 
            key={gift.id} 
            onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="group block relative overflow-hidden rounded-lg aspect-[4/3] bg-surface-container-low transition-transform duration-300 hover:scale-[1.02] cursor-pointer shadow-md"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
              style={{ backgroundImage: `url("${gift.image}")` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container/85 via-primary-container/30 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-primary mb-1 font-serif text-2xl md:text-3xl">{gift.title}</h2>
                <p className="font-body-md text-body-md text-inverse-on-surface opacity-90 text-sm mb-2">{gift.subtitle}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {gift.items.map((item, idx) => (
                    <span key={idx} className="bg-surface/20 backdrop-blur-sm px-2.5 py-0.5 rounded text-xs text-on-primary font-mono">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <span className="material-symbols-outlined text-on-primary group-hover:translate-x-2 transition-transform text-3xl notranslate" translate="no" aria-hidden="true">
                arrow_forward
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Custom Order Callout */}
      <div className="mt-20 max-w-xl mx-auto text-center px-6">
        <h3 className="font-serif text-2xl text-primary mb-3">Busques un detall totalment a mida?</h3>
        <p className="text-on-surface-variant text-sm mb-6">
          Tot el catàleg es pot adaptar amb noms, dates, frases o dissenys exclusius en marcatge làser.
        </p>
        <button 
          onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="bg-primary text-on-primary px-8 py-3.5 rounded-DEFAULT font-body-md hover:bg-primary-container transition-colors shadow-md cursor-pointer"
        >
          Demana la teva personalització
        </button>
      </div>
    </div>
  );
}
