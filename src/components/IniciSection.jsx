import React, { useState } from 'react';
import { STITCH_PROJECTS, STITCH_CRAFTSMAN } from '../data/stitchData';

export default function IniciSection({ setActiveTab, onSelectProject }) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', idea: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div 
            className="bg-cover bg-center w-full h-full opacity-40" 
            style={{ 
              backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCG0nU_luhqFEt3VNzbd_G3ONzn2bqro8OqFO_wXtmQb38sbMCLjAPTWd8XVJWOD7cyjrqgk_YZOA_1y-EohuUjULhFs019JKmtgKoWfrucAI0RU2mikaOxzu7qirAi8AGSw-oWGPklgxaejgnchwkjxNaXGYD6jibSIgmySZFN_kqMlj5GHtR-YkOb7bQ-kMxLqDXkwWzrkYXQHpI49gmjqvQHClGIOc-XFVmh8EJJF85AfrkLuZ2tUw")` 
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>
        </div>

        <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop max-w-4xl mx-auto flex flex-col items-center gap-6 mt-16 md:mt-0">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest border border-outline/20 px-4 py-1 rounded-DEFAULT backdrop-blur-sm bg-surface/30">
            Artesania Digital
          </span>
          <h1 className="font-headline-xl text-headline-xl md:text-[60px] md:leading-[68px] text-primary font-serif font-semibold">
            {STITCH_CRAFTSMAN.tagline}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-2">
            {STITCH_CRAFTSMAN.subtitle}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => { setActiveTab('mons'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="bg-primary text-on-primary px-8 py-3.5 rounded-DEFAULT font-body-md text-body-md hover:bg-primary-container transition-colors duration-300 active:scale-95 cursor-pointer shadow-md"
            >
              Descobreix l'Obra
            </button>
            <button 
              onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="border border-primary/20 text-primary px-8 py-3.5 rounded-DEFAULT font-body-md text-body-md hover:bg-surface-variant transition-colors duration-300 active:scale-95 bg-surface/50 backdrop-blur-sm cursor-pointer"
            >
              Contacta'm
            </button>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest relative">
        <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          
          <div className="order-2 md:order-1 flex flex-col gap-6 relative">
            <div className="absolute -left-8 -top-8 text-surface-variant/40 hidden md:block">
              <span className="material-symbols-outlined text-[120px]">format_quote</span>
            </div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary relative z-10 font-serif">
              L'art de la paciència, la tecnologia del present.
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {STITCH_CRAFTSMAN.bio}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Cada peça no és només fusta tallada; és una història traduïda a relleus, ombres i textures. Una combinació íntima de l'escalfor natural i la precisió absoluta de la màquina.
            </p>

            <div className="flex items-center gap-4 mt-4">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border border-outline/10 shadow-sm">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Jordi Alcalde Casalta" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBcV0zRQ1SLZ7WlUViCnAktGFI_CWSxHHO-dAdCBYmR5tq3TJShqr2TGlODz5XNP3xBZv92d6ln4VlGCvkVdmASAjMl333k7d_U0cqN9UCmGwRQpNEWXQwkrGa_PPtB6jmG9r5Or51wMty8HNbwaYVezfEBV0H0KD3OnHRnK8Kj16C8FjDhVMYEilxFKOH4OmdGFz-RPMflRxfZYRYHwGbmtQM4XadZnZp3qFlz6PuxTkKS2OKfYclzA" 
                />
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">{STITCH_CRAFTSMAN.name}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">Artesà &amp; Dissenyador Industrial</p>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2 relative h-[500px] w-full bg-surface-container rounded-lg overflow-hidden border border-outline/10 shadow-sm">
            <img 
              className="absolute inset-0 w-full h-full object-cover" 
              alt="Fusta de roure i impressió 3D" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWnhJn1XIsXIeD5VZG7lTDOugUMv51zbu32TECvMi4eu4IkJ2YRVRDvWwFkbObBVLwxmMdy_3rvsgJaT6MANlVV20yy56TuQYqXXE2q1j00DY86gFNIHyCRw9MRHvS3j0_nS7uJJyNTgg42Slfe7g3986zb8Bqv0KlDZg4A7YxywCIuYOkmYEYH2C5CVQgVcV4EzN-iTOQeyApJgx-47Cb18bqNwEzbTu1AQhJjU9SQ5D0m97AXhybIg" 
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-surface/20 to-transparent"></div>
          </div>
        </div>

        {/* 4 Pillars */}
        <div className="max-w-container-max mx-auto mt-24 border-t border-outline/10 pt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary/60 mb-2">forest</span>
              <h4 className="font-body-lg text-body-lg text-primary font-medium">Fustes Nobles</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Selecció curosa</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary/60 mb-2">precision_manufacturing</span>
              <h4 className="font-body-lg text-body-lg text-primary font-medium">Tall Làser</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Precisió micromètrica</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary/60 mb-2">view_in_ar</span>
              <h4 className="font-body-lg text-body-lg text-primary font-medium">Impressió 3D</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Volums i estructures</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary/60 mb-2">handshake</span>
              <h4 className="font-body-lg text-body-lg text-primary font-medium">Fet a Mida</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Històries personals</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects Bento Grid */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface">
        <div className="max-w-container-max mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-2 block font-semibold">Obres Destacades</span>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-serif">Móns en Miniatura</h2>
            </div>
            <button 
              onClick={() => { setActiveTab('mons'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="font-body-md text-body-md text-primary border-b border-primary/30 pb-1 hover:border-primary transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Veure tota la galeria</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-unit auto-rows-[300px]">
            {/* Project 1 (Large) */}
            <div 
              onClick={() => onSelectProject(STITCH_PROJECTS[0])}
              className="md:col-span-8 row-span-2 relative group overflow-hidden rounded-lg bg-surface-container cursor-pointer shadow-md"
            >
              <img 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                alt={STITCH_PROJECTS[0].title}
                src={STITCH_PROJECTS[0].image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/25 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-500"></div>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-surface/20 backdrop-blur-md border border-surface/30 px-3 py-1 rounded-DEFAULT font-label-sm text-label-sm text-on-primary">
                    {STITCH_PROJECTS[0].category}
                  </span>
                  <span className="bg-surface/20 backdrop-blur-md border border-surface/30 px-3 py-1 rounded-DEFAULT font-label-sm text-label-sm text-on-primary">
                    {STITCH_PROJECTS[0].woodType}
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-primary mb-2 font-serif text-3xl">{STITCH_PROJECTS[0].title}</h3>
                <p className="font-body-md text-body-md text-on-primary/90 max-w-lg hidden md:block">{STITCH_PROJECTS[0].subtitle}</p>
              </div>
            </div>

            {/* Project 2 */}
            <div 
              onClick={() => onSelectProject(STITCH_PROJECTS[1])}
              className="md:col-span-4 row-span-1 relative group overflow-hidden rounded-lg bg-surface-container cursor-pointer shadow-sm"
            >
              <img 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                alt={STITCH_PROJECTS[1].title}
                src={STITCH_PROJECTS[1].image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="font-headline-md text-headline-md text-on-primary mb-1 text-xl font-serif">{STITCH_PROJECTS[1].title}</h3>
                <p className="font-label-sm text-label-sm text-on-primary/80 uppercase tracking-wider">{STITCH_PROJECTS[1].category}</p>
              </div>
            </div>

            {/* Project 3 */}
            <div 
              onClick={() => onSelectProject(STITCH_PROJECTS[2])}
              className="md:col-span-4 row-span-1 relative group overflow-hidden rounded-lg bg-surface-container cursor-pointer shadow-sm"
            >
              <img 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                alt={STITCH_PROJECTS[2].title}
                src={STITCH_PROJECTS[2].image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="font-headline-md text-headline-md text-on-primary mb-1 text-xl font-serif">{STITCH_PROJECTS[2].title}</h3>
                <p className="font-label-sm text-label-sm text-on-primary/80 uppercase tracking-wider">{STITCH_PROJECTS[2].category}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span className="material-symbols-outlined text-4xl text-primary mb-6">handyman</span>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-6 font-serif">
            Tens un espai que vols immortalitzar?
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10">
            Cada projecte personalitzat és un viatge per capturar l'essència d'un lloc especial. Treballem junts per donar forma al teu Mínim Món.
          </p>

          {!formSubmitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col gap-6 text-left">
              <div className="relative">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1 block" htmlFor="name">Nom</label>
                <input 
                  required
                  className="w-full bg-transparent border-0 border-b border-outline/30 focus:border-primary focus:ring-0 px-0 py-2 font-body-md text-primary transition-colors placeholder:text-outline-variant outline-none" 
                  id="name" 
                  placeholder="El teu nom" 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="relative">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1 block" htmlFor="email">Correu Electrònic / Telèfon</label>
                <input 
                  required
                  className="w-full bg-transparent border-0 border-b border-outline/30 focus:border-primary focus:ring-0 px-0 py-2 font-body-md text-primary transition-colors placeholder:text-outline-variant outline-none" 
                  id="email" 
                  placeholder="info@exemple.cat o 600 000 000" 
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="relative">
                <label className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1 block" htmlFor="idea">La teva idea breument</label>
                <input 
                  required
                  className="w-full bg-transparent border-0 border-b border-outline/30 focus:border-primary focus:ring-0 px-0 py-2 font-body-md text-primary transition-colors placeholder:text-outline-variant outline-none" 
                  id="idea" 
                  placeholder="M'agradaria fer un diorama de..." 
                  type="text"
                  value={formData.idea}
                  onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                />
              </div>

              <button 
                type="submit"
                className="mt-4 bg-primary text-on-primary w-full py-4 rounded-DEFAULT font-body-md text-body-md hover:bg-primary-container transition-colors duration-300 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Iniciar Conversa</span>
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          ) : (
            <div className="bg-surface-container-lowest p-8 rounded-lg border border-primary/20 max-w-md mx-auto animate-fadeIn">
              <span className="material-symbols-outlined text-4xl text-primary mb-2">check_circle</span>
              <h3 className="font-serif text-2xl text-primary mb-2">Gràcies, {formData.name}!</h3>
              <p className="text-on-surface-variant text-sm mb-4">
                El teu missatge ha estat enviat a en <strong>Jordi Alcalde Casalta</strong> ({STITCH_CRAFTSMAN.emails[0]}). Et contactarem ben aviat.
              </p>
              <button 
                onClick={() => setFormSubmitted(false)}
                className="text-xs text-primary underline"
              >
                Enviar un altre missatge
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
