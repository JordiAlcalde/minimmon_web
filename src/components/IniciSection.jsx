import React, { useState, useEffect } from 'react';
import { STITCH_PROJECTS, STITCH_CRAFTSMAN } from '../data/stitchData';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { getRandomPhilosophicalQuote, PHILOSOPHICAL_QUOTES } from '../data/philosophicalQuotes';

function getRandomTriplet(projectsPool, currentTriplet = []) {
  if (!projectsPool || projectsPool.length === 0) {
    return [STITCH_PROJECTS[0], STITCH_PROJECTS[1], STITCH_PROJECTS[2]];
  }
  if (projectsPool.length <= 3) {
    return [
      projectsPool[0] || STITCH_PROJECTS[0],
      projectsPool[1] || STITCH_PROJECTS[1] || projectsPool[0],
      projectsPool[2] || STITCH_PROJECTS[2] || projectsPool[0]
    ];
  }

  const prevP1Id = currentTriplet[0]?.id;
  const prevP2Id = currentTriplet[1]?.id;
  const prevP3Id = currentTriplet[2]?.id;

  // Cerca fins a 50 intents una combinació on cap projecte repeteixi la mateixa finestra que en la selecció anterior
  for (let attempt = 0; attempt < 50; attempt++) {
    const pool = [...projectsPool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const cand1 = pool[0];
    const cand2 = pool[1];
    const cand3 = pool[2];

    const valid1 = !prevP1Id || cand1.id !== prevP1Id;
    const valid2 = !prevP2Id || cand2.id !== prevP2Id;
    const valid3 = !prevP3Id || cand3.id !== prevP3Id;

    if (valid1 && valid2 && valid3) {
      return [cand1, cand2, cand3];
    }
  }

  // Fallback si per algun motiu no es troba
  const fallbackPool = [...projectsPool].sort(() => Math.random() - 0.5);
  return [fallbackPool[0], fallbackPool[1], fallbackPool[2]];
}

function getProjectImage(project, pos) {
  if (!project) return '';
  if (Array.isArray(project.media) && project.media.length > 0) {
    const iniciMatch = project.media.find(m => m.inici === pos);
    if (iniciMatch && iniciMatch.imatge) return resolveMediaUrl(iniciMatch.imatge);
    const principalMatch = project.media.find(m => m.principal);
    if (principalMatch && principalMatch.imatge) return resolveMediaUrl(principalMatch.imatge);
    if (project.media[0] && project.media[0].imatge) return resolveMediaUrl(project.media[0].imatge);
  }
  return resolveMediaUrl(project.image || 'images/hero.jpg');
}

export default function IniciSection({ setActiveTab, onSelectProject }) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', idea: '' });
  
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isQuoteFading, setIsQuoteFading] = useState(false);
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);

  // Rotació temporitzada de frases solemnes (cada 7 segons amb fade suau)
  useEffect(() => {
    if (isQuoteHovered || !PHILOSOPHICAL_QUOTES || PHILOSOPHICAL_QUOTES.length <= 1) return;
    const interval = setInterval(() => {
      setIsQuoteFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % PHILOSOPHICAL_QUOTES.length);
        setIsQuoteFading(false);
      }, 500);
    }, 7000);
    return () => clearInterval(interval);
  }, [isQuoteHovered]);

  const currentQuote = PHILOSOPHICAL_QUOTES[quoteIndex] || PHILOSOPHICAL_QUOTES[0];
  const [allProjects, setAllProjects] = useState([]);
  const [featuredConfig, setFeaturedConfig] = useState({ mode: 'manual', cadenceSeconds: 8 });
  const [featuredProjects, setFeaturedProjects] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // Listen to config/home_featured
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "config", "home_featured"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setFeaturedConfig({
          mode: data.mode || 'manual',
          cadenceSeconds: typeof data.cadenceSeconds === 'number' ? data.cadenceSeconds : 8
        });
      }
    }, (err) => {
      console.warn("Configuració home_featured no trobada, utilitzant mode per defecte:", err);
    });
    return () => unsubConfig();
  }, []);

  // Listen to projectes collection
  useEffect(() => {
    const qProjects = query(collection(db, "projectes"), orderBy("ordre", "asc"));
    const unsubscribe = onSnapshot(qProjects, (snapshot) => {
      if (!snapshot.empty) {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.actiu !== false);
        if (docs.length > 0) {
          setAllProjects(docs);
          return;
        }
      }
      setAllProjects(STITCH_PROJECTS);
    }, (err) => {
      console.warn("Utilitzant projectes locals d'inici per defecte:", err);
      setAllProjects(STITCH_PROJECTS);
    });

    return () => unsubscribe();
  }, []);

  // Compute initial or updated featured triplet when projects or mode changes
  useEffect(() => {
    if (!allProjects || allProjects.length === 0) return;

    if (featuredConfig.mode === 'random') {
      setFeaturedProjects(prev => getRandomTriplet(allProjects, prev || []));
    } else {
      let p1 = allProjects.find(p => Array.isArray(p.media) && p.media.some(m => m.inici === 1)) || allProjects[0] || STITCH_PROJECTS[0];
      let p2 = allProjects.find(p => Array.isArray(p.media) && p.media.some(m => m.inici === 2)) || allProjects[1] || STITCH_PROJECTS[1];
      let p3 = allProjects.find(p => Array.isArray(p.media) && p.media.some(m => m.inici === 3)) || allProjects[2] || STITCH_PROJECTS[2];
      setFeaturedProjects([p1, p2, p3]);
    }
  }, [allProjects, featuredConfig.mode]);

  // Dynamic interval timer for random mode with smooth cross-fade transition
  useEffect(() => {
    if (featuredConfig.mode !== 'random') return;
    if (isHovered) return;
    if (!allProjects || allProjects.length < 2) return;

    const intervalMs = Math.max(3000, Math.min(15000, (featuredConfig.cadenceSeconds || 8) * 1000));
    const fadeOutDuration = 600; // 600ms smooth fade out

    const timer = setInterval(() => {
      // 1. Desvaniment gradual (fade out)
      setIsFading(true);

      // 2. Canviar dades i tornar a mostrar gradualment (fade in)
      setTimeout(() => {
        setFeaturedProjects(prev => getRandomTriplet(allProjects, prev || []));
        setTimeout(() => {
          setIsFading(false);
        }, 50);
      }, fadeOutDuration);

    }, intervalMs);

    return () => clearInterval(timer);
  }, [featuredConfig.mode, featuredConfig.cadenceSeconds, isHovered, allProjects]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={resolveMediaUrl('images/hero.jpg')} 
            alt="Mínim Món artesania en fusta" 
            className="w-full h-full object-cover opacity-60 object-center scale-105 transition-transform duration-1000" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-black/40 to-black/60"></div>
        </div>

        <div className="relative z-10 text-center px-margin-mobile md:px-margin-desktop max-w-4xl mx-auto flex flex-col items-center gap-6 pt-28 pb-16 md:py-16">
          <span className="font-label-sm text-xs text-amber-200 uppercase tracking-widest border border-amber-200/30 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm font-bold shadow-xs">
            Artesania Digital &amp; Marcatge Làser
          </span>

          <h1 className="font-headline-xl text-headline-xl md:text-[60px] md:leading-[68px] text-white font-serif font-semibold drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
            L'essència del que som,<br />
            <span className="inline-block">en miniatura.</span>
          </h1>

          <p className="font-body-lg text-body-lg text-amber-50/90 max-w-2xl mt-1 font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {STITCH_CRAFTSMAN.subtitle}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => { setActiveTab('mons'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="bg-[#3D2B1F] text-white border border-amber-200/30 px-8 py-3.5 rounded-xl font-body-md text-body-md hover:bg-[#523B2B] transition-all duration-300 active:scale-95 cursor-pointer shadow-lg font-semibold"
            >
              Descobreix l'Obra
            </button>
            <button 
              onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="border border-white/40 text-white px-8 py-3.5 rounded-xl font-body-md text-body-md hover:bg-white/20 transition-all duration-300 active:scale-95 bg-black/30 backdrop-blur-sm cursor-pointer font-medium shadow-md"
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
              Després de més de 60 anys aprenent de la vida i acumulant experiència en disseny industrial, programació i marcatge làser, he trobat en la fusta un llenç i en el làser la meva nova eina d'expressió. <span className="notranslate" translate="no">Mínim Món</span> neix de la voluntat d'aturar el temps, de destil·lar espais i records en petits formats tangibles que capten l'esperit de les persones i els seus llocs.
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Cada peça no és només fusta tallada; és una història traduïda a relleus, ombres i textures. Una combinació íntima de l'escalfor natural i la precisió absoluta de la màquina.
            </p>

            <div className="flex items-center gap-4 mt-4">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border border-outline/10 shadow-sm">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Jordi Alcalde Casalta" 
                  src={resolveMediaUrl('images/jordi-alcalde.png')} 
                />
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider notranslate" translate="no">{STITCH_CRAFTSMAN.name}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">Artesà</p>
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

        {/* 4 Engranatges Connectats */}
        <div className="max-w-container-max mx-auto mt-24 border-t border-outline/10 pt-16">
          {/* Title directly on background */}
          <h2 className="font-serif text-2xl md:text-3xl text-primary font-semibold mb-12">
            Un sol taller. Quatre engranatges connectats.
          </h2>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Eye (La mirada artística) */}
            <div className="bg-surface border border-outline/15 rounded-lg p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <img 
                  src={resolveMediaUrl('images/icon-ull.png')} 
                  alt="La mirada artística" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                La mirada artística que busca el simbolisme, la millor composició de l'espai i el detall visual per establir un vincle emotiu.
              </p>
            </div>

            {/* Card 2: Brain (El rigor del càlcul) */}
            <div className="bg-surface border border-outline/15 rounded-lg p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <img 
                  src={resolveMediaUrl('images/icon-cervell.png')} 
                  alt="El rigor del càlcul" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                El rigor del càlcul vectorial i millímetric. Tradueix les idees abstractes o els records en línies pures i coordenades preparades per al làser.
              </p>
            </div>

            {/* Card 3: Hand (El muntatge meticulós) */}
            <div className="bg-surface border border-outline/15 rounded-lg p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <img 
                  src={resolveMediaUrl('images/icon-ma.png')} 
                  alt="El muntatge meticulós" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                El muntatge meticulós i artesanal encaixa les peces fins a crear un objecte irrepetible, llest per transmetre tota la seva història.
              </p>
            </div>

            {/* Card 4: Heart (El motor conceptual) */}
            <div className="bg-surface border border-outline/15 rounded-lg p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <img 
                  src={resolveMediaUrl('images/icon-cor.png')} 
                  alt="El motor conceptual" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                El motor conceptual i el respecte per la història del client. La passió que assegura que tot objecte sigui una recreació íntima i única.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophical Quote Banner amb Rotació Dinàmica i Fade */}
      <section 
        onMouseEnter={() => setIsQuoteHovered(true)}
        onMouseLeave={() => setIsQuoteHovered(false)}
        className="py-16 bg-[#3D2B1F] text-amber-50 relative overflow-hidden shadow-inner my-2 cursor-default"
      >
        <div className={`max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop text-center relative z-10 space-y-3 transition-all duration-700 ease-in-out ${isQuoteFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
          <span className="text-amber-200/30 text-5xl font-serif block leading-none select-none font-bold">“</span>
          <blockquote className="font-serif text-2xl md:text-3xl font-light italic leading-relaxed text-amber-100/95 tracking-wide drop-shadow-sm px-4">
            {currentQuote.quote}
          </blockquote>
          <cite className="text-xs uppercase tracking-[0.25em] text-amber-200/70 not-italic block font-sans font-semibold pt-3">
            — {currentQuote.author || "Mínim Món"}
          </cite>
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
              <span className="material-symbols-outlined text-sm notranslate" translate="no">arrow_forward</span>
            </button>
          </div>

          {/* Grid */}
          <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="grid grid-cols-1 md:grid-cols-12 gap-unit auto-rows-[300px] relative"
          >
            {!featuredProjects ? (
              /* Skeletons de Càrrega per evitar parpelleigs d'imatges */
              <>
                <div className="md:col-span-8 row-span-2 rounded-lg bg-surface-container/70 border border-outline/15 animate-pulse flex items-end p-8">
                  <div className="space-y-3 w-2/3">
                    <div className="h-4 bg-outline/20 rounded w-24"></div>
                    <div className="h-8 bg-outline/20 rounded w-48"></div>
                    <div className="h-4 bg-outline/20 rounded w-64"></div>
                  </div>
                </div>
                <div className="md:col-span-4 row-span-1 rounded-lg bg-surface-container/70 border border-outline/15 animate-pulse flex items-end p-6">
                  <div className="space-y-2 w-3/4">
                    <div className="h-6 bg-outline/20 rounded w-32"></div>
                    <div className="h-3 bg-outline/20 rounded w-20"></div>
                  </div>
                </div>
                <div className="md:col-span-4 row-span-1 rounded-lg bg-surface-container/70 border border-outline/15 animate-pulse flex items-end p-6">
                  <div className="space-y-2 w-3/4">
                    <div className="h-6 bg-outline/20 rounded w-32"></div>
                    <div className="h-3 bg-outline/20 rounded w-20"></div>
                  </div>
                </div>
              </>
            ) : (
              /* Projectes Carregats des de Firestore */
              <>
                {/* Project 1 (Large) */}
                {featuredProjects[0] && (
                  <div 
                    key={featuredProjects[0].id || 'p1'}
                    onClick={() => onSelectProject(featuredProjects[0])}
                    className={`md:col-span-8 row-span-2 relative group overflow-hidden rounded-lg bg-surface-container cursor-pointer shadow-md transition-all duration-1000 ease-in-out ${
                      isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
                    }`}
                  >
                    <img 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt={featuredProjects[0].titol || featuredProjects[0].title}
                      src={getProjectImage(featuredProjects[0], 1)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/25 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-500"></div>
                    <div className="absolute bottom-0 left-0 p-8 w-full">
                      <h3 className="font-headline-md text-headline-md text-on-primary mb-2 font-serif text-3xl">
                        {featuredProjects[0].titol || featuredProjects[0].title}
                      </h3>
                      {(featuredProjects[0].subtitol || featuredProjects[0].subtitle) && (
                        <p className="font-body-md text-body-md text-on-primary/90 max-w-lg hidden md:block">
                          {featuredProjects[0].subtitol || featuredProjects[0].subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Project 2 */}
                {featuredProjects[1] && (
                  <div 
                    key={featuredProjects[1].id || 'p2'}
                    onClick={() => onSelectProject(featuredProjects[1])}
                    className={`md:col-span-4 row-span-1 relative group overflow-hidden rounded-lg bg-surface-container cursor-pointer shadow-sm transition-all duration-1000 ease-in-out ${
                      isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
                    }`}
                  >
                    <img 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt={featuredProjects[1].titol || featuredProjects[1].title}
                      src={getProjectImage(featuredProjects[1], 2)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/30 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-500"></div>
                    <div className="absolute bottom-0 left-0 p-6 w-full">
                      <h3 className="font-headline-md text-headline-md text-on-primary mb-1 text-xl font-serif">
                        {featuredProjects[1].titol || featuredProjects[1].title}
                      </h3>
                      {(featuredProjects[1].subtitol || featuredProjects[1].subtitle) && (
                        <p className="font-body-sm text-xs text-on-primary/90 line-clamp-1">
                          {featuredProjects[1].subtitol || featuredProjects[1].subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Project 3 */}
                {featuredProjects[2] && (
                  <div 
                    key={featuredProjects[2].id || 'p3'}
                    onClick={() => onSelectProject(featuredProjects[2])}
                    className={`md:col-span-4 row-span-1 relative group overflow-hidden rounded-lg bg-surface-container cursor-pointer shadow-sm transition-all duration-1000 ease-in-out ${
                      isFading ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
                    }`}
                  >
                    <img 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt={featuredProjects[2].titol || featuredProjects[2].title}
                      src={getProjectImage(featuredProjects[2], 3)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/30 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-500"></div>
                    <div className="absolute bottom-0 left-0 p-6 w-full">
                      <h3 className="font-headline-md text-headline-md text-on-primary mb-1 text-xl font-serif">
                        {featuredProjects[2].titol || featuredProjects[2].title}
                      </h3>
                      {(featuredProjects[2].subtitol || featuredProjects[2].subtitle) && (
                        <p className="font-body-sm text-xs text-on-primary/90 line-clamp-1">
                          {featuredProjects[2].subtitol || featuredProjects[2].subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span className="material-symbols-outlined text-4xl text-primary mb-6 notranslate" translate="no">handyman</span>
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
                className="mt-4 bg-primary text-on-primary w-full py-4 rounded-xl font-body-md text-body-md hover:bg-primary-container transition-colors duration-300 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
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
