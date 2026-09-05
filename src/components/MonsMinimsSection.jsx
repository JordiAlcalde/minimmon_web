import React, { useState, useEffect } from 'react';
import { STITCH_PROJECTS, DEFAULT_BRANQUES } from '../data/stitchData';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { resolveMediaUrl, formatDateDDMMAAAA } from '../utils/mediaUtils';
import { Sparkles, Calendar, Lock, Clock, Tag } from 'lucide-react';
import { getItemScheduleStatus } from '../utils/scheduleUtils';
import { WhatsAppIcon, getWhatsAppLink } from './WhatsAppButton';
import { formatDecimal } from '../utils/numberUtils';
import { StarRating } from './CommentsSection';

// Error Boundary per protegir la galeria de Mons Mínims davant dades inusuals
class ProjectCardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error al carregar el projecte:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline/20 text-xs text-on-surface-variant space-y-2">
          <p className="font-semibold text-primary">⚠️ No s'ha pogut renderitzar aquest projecte específicament.</p>
          {this.state.error && (
            <p className="font-mono text-[10px] text-error/80 bg-error/5 p-2 rounded border border-error/20">
              Detall tècnic: {this.state.error.message || String(this.state.error)}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MonsMinimsSection({ onSelectProject, setActiveTab }) {
  const [filter, setFilter] = useState('Tots');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [projectsList, setProjectsList] = useState(null);
  const [branquesList, setBranquesList] = useState(['Tots', 'Novetats', ...DEFAULT_BRANQUES.map(b => b.nom)]);
  const [ratingsMap, setRatingsMap] = useState({});

  useEffect(() => {
    // Listen to real-time 'projectes'
    const qProjects = query(collection(db, "projectes"), orderBy("ordre", "asc"));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      if (!snapshot.empty) {
        const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('minimmon_admin_auth') === 'true';
        const loadedProjects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(p => {
          if (p.actiu === false) return false;
          const sched = getItemScheduleStatus(p);
          return sched.isVisible || isAdmin;
        });

        if (loadedProjects.length > 0) {
          setProjectsList(loadedProjects);
          return;
        }
      }
      setProjectsList(STITCH_PROJECTS);
    }, (err) => {
      console.warn("Utilitzant projectes locals per defecte:", err);
      setProjectsList(STITCH_PROJECTS);
    });

    // Listen to real-time 'branques'
    const qBranques = query(collection(db, "branques"), orderBy("ordre", "asc"));
    const unsubscribeBranques = onSnapshot(qBranques, (snapshot) => {
      if (!snapshot.empty) {
        const loadedBranques = snapshot.docs.map(doc => doc.data().nom);
        setBranquesList(['Tots', 'Novetats', ...loadedBranques]);
      }
    }, (err) => {
      console.warn("Utilitzant branques locals per defecte:", err);
    });

    // Carregar valoracions aprovades per als projectes
    const qVal = query(collection(db, "valoracions"));
    const unsubscribeVal = onSnapshot(qVal, (snapshot) => {
      const map = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.estat === 'aprovat' && data.targetId) {
          if (!map[data.targetId]) {
            map[data.targetId] = { total: 0, sum: 0 };
          }
          map[data.targetId].total += 1;
          map[data.targetId].sum += (Number(data.puntuacio) || 5);
        }
      });
      setRatingsMap(map);
    }, (err) => {
      console.warn("Error carregant valoracions:", err);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeBranques();
      unsubscribeVal();
    };
  }, []);

  // Filter projects by category (multi-category support & Novetats filter)
  const currentList = projectsList || [];
  const filteredProjects = filter === 'Tots'
    ? currentList
    : (filter === 'Novetats'
      ? currentList.filter(p => p && p.novetat === true)
      : currentList.filter(p => {
        if (!p) return false;
        const pBranques = Array.isArray(p.branques) && p.branques.length > 0
          ? p.branques
          : [p.branca || p.category || ''];
        return pBranques.some(b => String(b || '').toLowerCase() === String(filter || '').toLowerCase());
      })
    );

  // Sort projects by Data de Creació (default newest first)
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const dateA = String(a?.dataCreacio || a?.data || '');
    const dateB = String(b?.dataCreacio || b?.data || '');
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    if (sortOrder === 'newest') {
      return dateB.localeCompare(dateA); // newest first
    } else {
      return dateA.localeCompare(dateB); // oldest first
    }
  });

  return (
    <div className="pt-28 pb-32 animate-fadeIn">
      {/* Hero Header amb Fons Càlid d'Artesania */}
      <header className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-16 text-center">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-14 border border-outline/15 bg-surface-container-lowest shadow-md">
          {/* Imatge de fons atmosfèrica amb degradats per omplir el desert de fons */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-multiply blur-[0.5px]"
            style={{ backgroundImage: `url('/images/mons_minims_hero_bg.png')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-surface-container-lowest/50 via-surface-container-lowest/80 to-surface-container-lowest"></div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h1 className="font-headline-xl text-headline-xl text-primary mb-6 font-serif text-4xl md:text-5xl">L'Art de la Precisió</h1>

            {/* Poetic Intro Block */}
            <div className="space-y-4 text-on-surface-variant leading-relaxed text-base md:text-lg mb-6">
              <h2 className="font-serif text-lg md:text-xl text-primary font-medium">
                Cada línia té un nom. Cada volum, una ànima.
              </h2>
              <p>
                Els projectes que estàs a punt de veure no són fruit d'un disseny de catàleg, sinó de la vida mateixa. Tots tenen protagonistes reals i neixen d'històries autèntiques, de records compartits o d'emocions que han deixat empremta.
              </p>
              <p>
                Però el camí per arribar-hi és un acte de fe: qui demana un <span className="notranslate" translate="no">Món Mínim</span> no en dissenya el resultat. Simplement ens descriu records, ens parla de moments i ens confia les seves emocions. A partir d'aquí, a <span className="notranslate" translate="no">Mínim Món</span> ens inventem l'escenari: decidim la forma i les mides, escollim els colors i seleccionem els petits objectes que donaran vida a la història de manera física o intangible.
              </p>
              <p>
                El client confia i es deixa portar per la nostra imaginació. El resultat és un pacte de complicitat on la sorpresa és doble: es meravella tant qui fa el regal en veure'l materialitzat per primera vegada, com el destinatari final en rebre'l.
              </p>
              <p className="font-serif text-xl text-primary italic font-medium pt-2">
                Deixa't inspirar.
              </p>
            </div>
          </div>
        </div>

        {/* Controls Bar: Category Filters & Sort Selector */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-10 max-w-container-max mx-auto">
          {/* Category Filters amb la píndola 'Novetats' */}
          <div className="flex justify-center flex-wrap gap-2 flex-1">
            {branquesList.map((cat) => {
              const isNovetats = cat === 'Novetats';
              const isSelected = filter === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-1.5 rounded-full font-body-md text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 ${isSelected
                    ? (isNovetats
                      ? 'bg-[#3D2B1F] text-amber-200 font-bold border border-amber-200/40 shadow-sm'
                      : 'bg-primary text-on-primary font-medium shadow-sm')
                    : (isNovetats
                      ? 'bg-surface-container text-amber-800 hover:bg-surface-container-high border border-amber-800/20 font-semibold'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline/15')
                    }`}
                >
                  {isNovetats && <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-amber-700'}`} />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Order Control */}
          <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant shrink-0 bg-surface-container/60 px-4 py-2 rounded-lg border border-outline/15 shadow-sm">
            <span className="font-semibold uppercase tracking-wider text-primary">Ordenar:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-surface border border-outline/20 rounded px-2.5 py-1 text-xs text-primary font-sans cursor-pointer hover:border-primary/40 transition-colors"
            >
              <option value="newest">Data (Més recents primer)</option>
              <option value="oldest">Data (Més antics primer)</option>
            </select>
          </div>
        </div>

        <div className="w-16 h-px bg-primary/20 mx-auto mt-12"></div>
      </header>

      {/* Gallery Section */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        {!projectsList ? (
          /* Loading Skeletons */
          <div className="flex flex-col gap-16">
            {[1, 2, 3].map((n) => (
              <div key={n} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center animate-pulse">
                <div className="md:col-span-7 h-80 rounded-lg bg-surface-container/60 border border-outline/15"></div>
                <div className="md:col-span-5 space-y-4">
                  <div className="h-4 bg-outline/20 rounded w-32"></div>
                  <div className="h-8 bg-outline/20 rounded w-64"></div>
                  <div className="h-16 bg-outline/20 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Real Project Cards */
          <div className="flex flex-col gap-24">
            {sortedProjects.map((project, index) => {
              const isEven = index % 2 === 0;
              const title = project.titol || project.title;
              const subtitle = project.subtitol || project.subtitle;
              const displayBranques = Array.isArray(project.branques) && project.branques.length > 0
                ? project.branques
                : [project.branca || project.category || ''];
              const description = project.encarrec || project.description;
              const projectDataCreacio = project.dataCreacio || project.data || '';

              // Get header image
              let mainImage = project.image;
              if (Array.isArray(project.media) && project.media.length > 0) {
                const principalObj = project.media.find(m => m.principal) || project.media[0];
                if (principalObj && principalObj.imatge) mainImage = principalObj.imatge;
              }
              mainImage = resolveMediaUrl(mainImage);

              return (
                <ProjectCardErrorBoundary key={project.id || index}>
                  <article
                    className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center group cursor-pointer animate-fadeIn"
                    onClick={() => onSelectProject(project)}
                  >
                    {/* Image Side */}
                    <div className={`md:col-span-7 ${isEven ? 'order-2 md:order-1' : 'md:col-start-6 order-2'} relative`}>
                      <div className={`absolute inset-0 bg-surface-container-low ${isEven ? 'translate-x-4' : '-translate-x-4'} translate-y-4 rounded transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2`}></div>
                      <img
                        className="relative w-full aspect-[4/3] object-cover rounded shadow-md transition-transform duration-500 group-hover:scale-[1.02]"
                        alt={title}
                        src={mainImage}
                      />
                    </div>

                    {/* Text Side */}
                    <div className={`md:col-span-5 ${isEven ? 'md:col-start-8 order-1 md:order-2' : 'md:col-start-1 md:row-start-1 order-1'} mb-8 md:mb-0`}>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {displayBranques.map((bName, idx) => (
                          bName && (
                            <span key={idx} className="px-3 py-1 bg-surface-container-high rounded text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
                              {bName}
                            </span>
                          )
                        ))}
                        {projectDataCreacio && (
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-label-sm font-mono text-xs font-semibold inline-flex items-center gap-1.5 border border-primary/20">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{formatDateDDMMAAAA(projectDataCreacio)}</span>
                          </span>
                        )}
                        {project.novetat && (
                          <span className="px-3 py-1 bg-[#3D2B1F] text-amber-200 font-bold font-mono text-xs uppercase tracking-wider rounded-full shadow-sm inline-flex items-center gap-1.5 border border-amber-200/30">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>NOVETAT</span>
                          </span>
                        )}
                        {(() => {
                          const sched = getItemScheduleStatus(project);
                          if (sched.isProperament) {
                            return (
                              <span className="px-3 py-1 bg-indigo-900 text-indigo-100 font-bold font-sans text-xs uppercase tracking-wider rounded-full shadow-sm inline-flex items-center gap-1.5 border border-indigo-400/40">
                                <Clock className="w-3.5 h-3.5 text-indigo-300" />
                                <span>PROPERAMENT</span>
                              </span>
                            );
                          }
                          if (sched.isArxivat) {
                            return (
                              <span className="px-3 py-1 bg-stone-800 text-stone-200 font-bold font-sans text-xs uppercase tracking-wider rounded-full shadow-sm inline-flex items-center gap-1.5 border border-stone-500/40">
                                <span>FORA DE TEMPORADA</span>
                              </span>
                            );
                          }
                          if (project.esborrany || sched.rawStatus === 'programat_futur') {
                            return (
                              <span className="px-3 py-1 bg-amber-800 text-amber-100 font-bold font-sans text-xs uppercase tracking-wider rounded-full shadow-sm inline-flex items-center gap-1.5 border border-amber-300/40" title="Només visible per a l'administrador">
                                <Lock className="w-3.5 h-3.5 text-amber-300" />
                                <span>{sched.rawStatus === 'programat_futur' ? 'PROGRAMAT' : 'ESBORRANY PRIVAT'}</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-4 font-serif text-3xl">
                        {title}
                      </h2>

                      <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
                        {subtitle}
                      </p>

                      <p className="font-body-md text-body-md text-on-surface-variant/80 mb-6 text-sm line-clamp-3">
                        {description}
                      </p>

                      <button className="font-body-md text-primary font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                        <span>Explora la fitxa del projecte</span>
                        <span className="material-symbols-outlined text-sm notranslate" translate="no" aria-hidden="true">arrow_forward</span>
                      </button>

                      <div className="laser-line mt-6"></div>

                      {/* Secció de Valoració en la llista de projectes */}
                      <div className="mt-3">
                        {(() => {
                          const projId = project.id || project.titol;
                          const rData = ratingsMap[projId] || ratingsMap[project.id] || { total: 0, sum: 0 };
                          const avg = rData.total > 0 ? formatDecimal(rData.sum / rData.total, 1) : 0;

                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectProject(project, { scrollToComments: true });
                              }}
                              className="group/val text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 cursor-pointer font-mono pt-1"
                              title="Veure o afegir comentaris d'aquest projecte"
                            >
                              <StarRating rating={Math.round(Number(avg))} size="w-3.5 h-3.5" />
                              {rData.total > 0 ? (
                                <span className="font-bold text-primary">
                                  {avg} <span className="font-normal text-on-surface-variant/70">({rData.total} {rData.total === 1 ? 'valoració' : 'valoracions'})</span>
                                </span>
                              ) : (
                                <span className="text-on-surface-variant/70 italic group-hover/val:underline">
                                  Sigues el primer en valorar aquesta peça.
                                </span>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </article>
                </ProjectCardErrorBoundary>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <div className="mt-32 max-w-xl mx-auto text-center px-6">
        <h3 className="font-serif text-2xl text-primary mb-3">Vols crear un <span className="notranslate" translate="no">Món Mínim</span> personalitzat?</h3>
        <p className="text-on-surface-variant text-sm mb-6">
          Cada espai o memòria té una forma única en fusta. Parlem directament per idear la teva peça.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-4">
          <a
            href={getWhatsAppLink("Hola Jordi, m'agradaria consultar-te per crear un Món Mínim personalitzat.")}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface border border-primary/30 hover:border-primary text-primary px-6 py-3.5 rounded-xl font-body-md hover:bg-surface-container transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Parlem per WhatsApp</span>
          </a>
          <button
            onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="bg-primary text-on-primary px-8 py-3.5 rounded-xl font-body-md hover:bg-primary-container transition-colors shadow-md cursor-pointer"
          >
            Formulari de proposta
          </button>
        </div>
      </div>
    </div>
  );
}
