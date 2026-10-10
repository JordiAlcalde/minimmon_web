import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Download, 
  Star, 
  Wifi, 
  Music, 
  Globe, 
  UserCheck, 
  ShieldCheck, 
  RefreshCw, 
  Layers, 
  ArrowRight, 
  MessageSquare, 
  Phone, 
  Mail, 
  Zap, 
  Award,
  QrCode,
  Share2,
  Check
} from 'lucide-react';

export default function NfcLandingSection({ setActiveTab }) {
  const [activeDemo, setActiveDemo] = useState('contact');
  const [openFaq, setOpenFaq] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isNfcScanDetected, setIsNfcScanDetected] = useState(false);

  useEffect(() => {
    // Comprovar si l'usuari ha arribat tocant una targeta NFC real
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash || '';
    if (urlParams.has('nfc') || urlParams.get('origen') === 'nfc' || hash.includes('nfc')) {
      setIsNfcScanDetected(true);
    }
  }, []);

  const handleDownloadDemoVCard = () => {
    // Generar un arxiu vCard (.vcf) de demostració real
    const vcardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Jordi Alcalde - Mínim Món',
      'N:Alcalde;Jordi;;;',
      'ORG:Mínim Món (Artesania en fusta i espais en miniatura)',
      'TITLE:Artesà & Dissenyador',
      'TEL;TYPE=CELL,VOICE:+34600000000',
      'EMAIL;TYPE=WORK,INTERNET:info@minimmon.cat',
      'URL:https://minimmon.cat',
      'NOTE:Targeta de visita intel·ligent NFC en fusta massissa gravada a làser per Mínim Món.',
      'END:VCARD'
    ].join('\r\n');

    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Jordi_Alcalde_MinimMon.vcf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const demoScenarios = [
    {
      id: 'contact',
      title: 'Targeta de Visita (vCard)',
      subtitle: 'Guarda el contacte al telèfon a l\'instant',
      icon: UserCheck,
      color: 'from-amber-500 to-orange-600',
      description: 'Oblida\'t del paper. Amb un sol toc, el teu nou client o col·laborador obre la seva agenda i guarda el teu nom, telèfon, correu, web i xarxes socials sense haver d\'escriure res.',
      actionText: 'Descarregar contacte de prova (.vcf)',
      onAction: handleDownloadDemoVCard
    },
    {
      id: 'google',
      title: 'Ressenyes de Google (5 Estrelles)',
      subtitle: 'Multiplica les opinions al teu negoci',
      icon: Star,
      color: 'from-yellow-400 to-amber-600',
      description: 'Ideal per a marcadors de taulell o taula a botigues, cafeteries, restaurants i despatxos. El client apropa el mòbil i se li obre directament la pantalla per puntuar amb 5 estrelles.',
      actionText: 'Obrir pantalla de ressenyes (Demo)',
      onAction: () => window.open('https://search.google.com/local/writereview', '_blank')
    },
    {
      id: 'social',
      title: 'Xarxes Socials & Instagram',
      subtitle: 'Guanya seguidors en directe',
      icon: Share2,
      color: 'from-pink-500 to-rose-600',
      description: 'Enllaça directament al teu perfil d\'Instagram, TikTok, LinkedIn o al teu arbre d\'enllaços personalitzat. Perfecte per a esdeveniments, fires i estands.',
      actionText: 'Veure perfil d\'Instagram de Mínim Món',
      onAction: () => window.open('https://instagram.com', '_blank')
    },
    {
      id: 'menu',
      title: 'Carta Digital o Catàleg Web',
      subtitle: 'Actualitzable sense reimprimir res',
      icon: Globe,
      color: 'from-emerald-500 to-teal-700',
      description: 'Els teus clients visualitzen la carta, la llista de preus o el catàleg interactiu de la temporada sense necessitat de tocar cartes de paper ni descarregar apps feixugues.',
      actionText: 'Explorar Catàleg de Mínim Món',
      onAction: () => {
        if (setActiveTab) setActiveTab('regals');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      id: 'spotify',
      title: 'Música, YouTube o Podcast',
      subtitle: 'Comparteix contingut multimèdia',
      icon: Music,
      color: 'from-green-500 to-emerald-700',
      description: 'Un marcador de fusta que obre una llista de reproducció seleccionada a Spotify per a la teva botiga, un nou senzill d\'un artista o un vídeo de presentació a YouTube.',
      actionText: 'Obrir llista de reproducció (Spotify)',
      onAction: () => window.open('https://open.spotify.com', '_blank')
    },
    {
      id: 'wifi',
      title: 'Connexió Wi-Fi Instantània',
      subtitle: 'Adeu a les contrasenyes complicades',
      icon: Wifi,
      color: 'from-blue-500 to-indigo-600',
      description: 'Un suport de fusta a la taula que connecta els convidats o clients a la teva xarxa Wi-Fi segura amb un sol toc, sense haver de dictar ni escriure caràcters llargs.',
      actionText: 'Simular connexió de xarxa',
      onAction: () => alert('Demostració: En un entorn real, el xip NFC envia automàticament les credencials Wi-Fi xifrades al dispositiu.')
    }
  ];

  const currentScenario = demoScenarios.find(s => s.id === activeDemo) || demoScenarios[0];

  const virtues = [
    {
      icon: Zap,
      title: 'Zero aplicacions necessàries',
      description: 'L\'altra persona no ha d\'instal·lar absolutament res. Només ha d\'apropar el seu mòbil i la pàgina o contacte s\'obre a l\'instant.'
    },
    {
      icon: RefreshCw,
      title: '100% Reprogramable pel client',
      description: 'Ets lliure! Pots reescriure el contingut del xip les vegades que vulguis en 10 segons amb aplicacions gratuïtes com NFC Tools. Si canvies de web o de telèfon, la targeta continua sent vàlida.'
    },
    {
      icon: Award,
      title: 'Fusta noble artesanal',
      description: 'Substitueix el plàstic i les milers de targetes de paper d\'un sol ús per una peça de fusta massissa càlida, sostenible i gravada a làser d\'alta precisió al taller.'
    },
    {
      icon: Sparkles,
      title: 'Efecte "WOW" garantit',
      description: 'A fires, trobades de negoci o taulells de botiga, apropar una targeta de fusta i veure com s\'obre el contingut al mòbil genera una impressió professional inoblidable.'
    },
    {
      icon: ShieldCheck,
      title: 'Sense bateries ni caducitat',
      description: 'El xip és passiu i s\'alimenta per inducció del propi telèfon. No s\'esgota mai, no requereix càrrega i resisteix intacte dècades protegit sota la fusta.'
    },
    {
      icon: Layers,
      title: 'Sense quotes ni subscripcions',
      description: 'La tecnologia és teva per sempre. Sense mensualitats, sense plataformes de pagament i sense dependre de proveïdors externs.'
    }
  ];

  const productCategories = [
    {
      badge: 'Properament al catàleg',
      title: 'Targetes de Visita de Fusta',
      description: 'Format targeta de crèdit en fusta noble (roure, faig o noguera) amb el teu logotip, nom i càrrec gravats a làser. El xip NFC queda completament ocult a l\'interior.',
      idealFor: 'Professionals, directius, arquitectes, artesans, conferenciants i emprenedors.'
    },
    {
      badge: 'Hostaleria & Comerç',
      title: 'Marcadors de Taula & Expositors',
      description: 'Suports de peu o cubs de fusta massissa per col·locar sobre taules, barres o taulells. Opcionalment combinable amb codi QR gravat.',
      idealFor: 'Restaurants (carta digital), botigues (ressenyes Google 5★), hotels i clíniques.'
    },
    {
      badge: 'Detall & Packaging',
      title: 'Etiquetes Intel·ligents & Clauers',
      description: 'Etiquetes de fusta per a packaging de luxe, ampolles de vi, regals d\'empresa o clauers que enllacen a vídeos dedicatòries o certificats d\'autenticitat.',
      idealFor: 'Regals corporatius, marxandatge exclusiu, cellers i esdeveniments privats.'
    }
  ];

  const faqItems = [
    {
      q: 'Funciona amb qualsevol telèfon intel·ligent?',
      a: 'Sí. El 100% dels iPhones moderns (des de l\'iPhone XS / XR de 2018 fins als més recents) i pràcticament la totalitat dels telèfons Android de gamma mitjana i alta incorporen lector NFC actiu per defecte.'
    },
    {
      q: 'Com puc reprogramar jo mateix la targeta o el marcador?',
      a: 'És facilíssim: descarregues l\'aplicació gratuïta "NFC Tools" (disponible tant a l\'App Store d\'Apple com a Google Play). Tries l\'opció "Escriure" (Write), afegeixes l\'enllaç, contacte o text que vulguis i toques la fusta amb el mòbil. El canvi es fa a l\'instant!'
    },
    {
      q: 'Què passa si canvio de número de telèfon o de pàgina web?',
      a: 'Aquest és el gran avantatge: no has de llençar la targeta ni fer-ne una de nova. En 10 segons la reprogrames amb les noves dades i continuarà funcionant com el primer dia.'
    },
    {
      q: 'Es pot bloquejar el xip perquè ningú més el pugui modificar?',
      a: 'Sí. Si ho desitges, amb la mateixa aplicació pots bloquejar el xip perquè quedi en mode "Només lectura" o protegir-lo amb contrasenya.'
    },
    {
      q: 'Cal pagar alguna quota mensual o registre?',
      a: 'Cap ni una. A Mínim Món no venem plataformes tancades de subscripció. Tu compres la peça de fusta amb el sensor i la tecnologia és teva i lliure per sempre.'
    },
    {
      q: 'Com es personalitza el disseny exterior de fusta?',
      a: 'Treballem amb gravat i tall làser d\'alta precisió al nostre taller. Podem gravar el teu logotip vectorial, tipografia corporativa, motius decoratius o codis QR complementaris.'
    }
  ];

  return (
    <div className="pt-24 pb-28 animate-fadeIn text-on-surface">

      {/* Notificació en viu quan s'ha escanejat una targeta real */}
      {isNfcScanDetected && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-400 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-1">
                <Sparkles className="w-3 h-3" /> Demostració en directe
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg">
                Has escanejat una targeta NFC de Mínim Món!
              </h3>
              <p className="text-emerald-100/80 text-xs sm:text-sm mt-0.5">
                Així de ràpid i senzill és connectar amb el teu client: només apropar el telèfon a la fusta.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs sm:text-sm font-medium mb-6">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <span>Tecnologia Invisible & Artesania en Fusta</span>
        </div>

        <h1 className="font-headline-xl text-headline-xl text-primary font-serif text-3xl sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight mb-6">
          Connecta el món físic amb el digital <span className="italic font-normal">en un sol toc</span>
        </h1>

        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8 text-base sm:text-lg leading-relaxed">
          Targetes de visita, marcadors i etiquetes de fusta massissa artesanal amb sensor NFC integrat. 
          Sense aplicacions, sense paper i 100% configurable per tu en qualsevol moment.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <a
            href="#simulador"
            className="px-6 py-3.5 rounded-full bg-primary text-on-primary font-medium hover:opacity-90 transition-all flex items-center gap-2 shadow-md active:scale-95 text-sm sm:text-base cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Provar el simulador interactiu</span>
          </a>
          <button
            onClick={() => {
              const text = encodeURIComponent("Hola Jordi! He vist la landing de les targetes i marcadors NFC de fusta i m'agradaria demanar més informació o pressupost.");
              window.open(`https://wa.me/34644297184?text=${text}`, '_blank');
            }}
            className="px-6 py-3.5 rounded-full bg-surface-container border border-outline/30 hover:border-primary text-primary font-medium transition-all flex items-center gap-2 shadow-xs active:scale-95 text-sm sm:text-base cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Demanar mostra o pressupost</span>
          </button>
        </div>

        {/* Badge demostració ràpida */}
        <div className="inline-flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-high/60 px-4 py-2 rounded-lg border border-outline/10">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Fes servir aquesta pàgina per ensenyar als teus clients com funciona la teva targeta real</span>
        </div>
      </section>

      {/* SECCIÓ SIMULADOR INTERACTIU */}
      <section id="simulador" className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-28">
        <div className="bg-surface-container rounded-3xl p-6 sm:p-10 border border-outline/15 shadow-xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-[0.2em] font-semibold block mb-2">
              Experiència en viu
            </span>
            <h2 className="font-headline-lg text-primary font-serif text-2xl sm:text-4xl mb-3">
              Què pot fer la teva targeta NFC?
            </h2>
            <p className="text-on-surface-variant text-sm sm:text-base">
              Selecciona qualsevol dels casos d'ús per veure com respon el telèfon del teu client quan toca la fusta:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Llistat d'accions (Selector) */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              {demoScenarios.map((scenario) => {
                const IconComponent = scenario.icon;
                const isSelected = activeDemo === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setActiveDemo(scenario.id)}
                    className={`text-left p-4 sm:p-5 rounded-2xl transition-all cursor-pointer flex items-start gap-4 border ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40'
                        : 'bg-surface hover:bg-surface-container-high border-outline/10 hover:border-outline/25'
                    }`}
                  >
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${scenario.color} text-white shrink-0 shadow-xs`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-base ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                          {scenario.title}
                        </h3>
                        {isSelected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-on-primary font-mono font-medium">
                            Actiu
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                        {scenario.subtitle}
                      </p>
                      {isSelected && (
                        <p className="text-xs text-on-surface-variant/90 mt-2.5 leading-relaxed pt-2 border-t border-primary/20">
                          {scenario.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Simulador visual de smartphone */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-neutral-900 rounded-[44px] p-3 shadow-2xl border-4 border-neutral-700/80 ring-1 ring-white/10 flex flex-col">
                
                {/* Illa dinàmica / altaveu superior */}
                <div className="w-full flex justify-center py-1">
                  <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-neutral-800 ml-auto mr-2" />
                  </div>
                </div>

                {/* Pantalla del telèfon */}
                <div className="relative flex-1 bg-surface-dim rounded-[34px] overflow-hidden flex flex-col p-4 text-on-surface border border-white/5">
                  
                  {/* Animació d'ona NFC superior */}
                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping" />
                      <div className="w-10 h-10 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                        <Radio className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 mt-2 font-semibold">
                      Senyal NFC Detectat
                    </span>
                  </div>

                  {/* Contingut segons l'escenari seleccionat */}
                  <div className="flex-1 flex flex-col justify-between py-2">
                    
                    {/* Targeta simulada */}
                    <div className="bg-surface rounded-2xl p-4 border border-outline/15 shadow-sm text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                        {React.createElement(currentScenario.icon, { className: 'w-6 h-6' })}
                      </div>

                      <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                        Mínim Món Smart Wood
                      </span>
                      <h4 className="font-serif text-lg text-primary font-bold mt-1">
                        {currentScenario.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-2 line-clamp-3">
                        {currentScenario.description}
                      </p>
                    </div>

                    {/* Botó d'acció interactiu del mòbil */}
                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={currentScenario.onAction}
                        className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                      >
                        {activeDemo === 'contact' ? (
                          <Download className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        <span>{currentScenario.actionText}</span>
                      </button>

                      <p className="text-[10px] text-center text-on-surface-variant/70 italic">
                        Demostració funcional: clica per provar l'acció
                      </p>
                    </div>

                  </div>

                  {/* Barra inferior d'inici de mòbil */}
                  <div className="w-24 h-1 bg-neutral-600 rounded-full mx-auto mt-2" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ELS 6 GRANS AVANTATGES */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-label-sm text-label-sm text-outline uppercase tracking-[0.2em] font-semibold block mb-2">
            Per què escollir-ho?
          </span>
          <h2 className="font-headline-lg text-primary font-serif text-3xl sm:text-4xl mb-4">
            Les virtuts del sistema NFC de Mínim Món
          </h2>
          <p className="text-on-surface-variant text-base">
            El millor de dos mons: la noblesa i calidesa de la fusta artesanal combinada amb la màxima tecnologia digital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {virtues.map((v, idx) => {
            const Icon = v.icon;
            return (
              <div 
                key={idx}
                className="bg-surface-container/60 hover:bg-surface-container p-6 rounded-2xl border border-outline/10 hover:border-outline/25 transition-all flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-primary mb-2">
                  {v.title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {v.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PRODUCTES INTEL·LIGENTS AMB NFC */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-24">
        <div className="bg-surface-container-high/40 border border-outline/15 rounded-3xl p-8 sm:p-12">
          <div className="max-w-3xl mb-12">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-[0.2em] font-semibold block mb-2">
              Línies de Producte
            </span>
            <h2 className="font-headline-lg text-primary font-serif text-3xl sm:text-4xl mb-4">
              Creats a mà al nostre taller
            </h2>
            <p className="text-on-surface-variant text-base">
              Estem preparant la incorporació d'aquests productes al catàleg de Mínim Món. Ja pots encarregar comandes a mida o demanar un lot personalitzat per a la teva empresa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {productCategories.map((prod, idx) => (
              <div 
                key={idx}
                className="bg-surface rounded-2xl p-6 border border-outline/15 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                    {prod.badge}
                  </span>
                  <h3 className="font-serif text-xl text-primary font-bold mb-3">
                    {prod.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                    {prod.description}
                  </p>
                </div>
                <div className="pt-4 border-t border-outline/10">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-outline block mb-1">
                    Ideal per a:
                  </span>
                  <p className="text-xs text-on-surface-variant italic">
                    {prod.idealFor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COM REPROGRAMAR EL SENSOR EN 3 PASSOS */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-label-sm text-label-sm text-outline uppercase tracking-[0.2em] font-semibold block mb-2">
            Autonomia Total
          </span>
          <h2 className="font-headline-lg text-primary font-serif text-3xl sm:text-4xl mb-4">
            Com reprogramar el sensor en 3 passos
          </h2>
          <p className="text-on-surface-variant text-base">
            No depens de nosaltres ni de quotes mensuals. Tu mateix pots canviar l'enllaç o contacte quan vulguis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface-container p-6 rounded-2xl border border-outline/15 relative">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary font-mono font-bold flex items-center justify-center text-lg mb-4">
              1
            </div>
            <h3 className="font-semibold text-lg text-primary mb-2">
              Descarrega una app gratuïta
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Instal·la <strong>NFC Tools</strong> des de Google Play (Android) o App Store (iPhone). És una eina de referència internacional, 100% gratuïta.
            </p>
          </div>

          <div className="bg-surface-container p-6 rounded-2xl border border-outline/15 relative">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary font-mono font-bold flex items-center justify-center text-lg mb-4">
              2
            </div>
            <h3 className="font-semibold text-lg text-primary mb-2">
              Tria què vols que faci
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Obre l'app, prem <em>"Escriure" (Write)</em> &rarr; <em>"Afegir registre"</em> i enganxa la teva web, el teu Instagram, la teva vCard o la teva xarxa Wi-Fi.
            </p>
          </div>

          <div className="bg-surface-container p-6 rounded-2xl border border-outline/15 relative">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary font-mono font-bold flex items-center justify-center text-lg mb-4">
              3
            </div>
            <h3 className="font-semibold text-lg text-primary mb-2">
              Apropa el mòbil a la fusta
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Prem <em>"Escriure"</em> i toca la targeta o marcador amb la part posterior del teu telèfon. En 2 segons sentiràs la vibració de confirmació. Fet!
            </p>
          </div>
        </div>
      </section>

      {/* PREGUNTES FREQÜENTS (FAQ) */}
      <section className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop mb-24">
        <div className="text-center mb-10">
          <h2 className="font-headline-lg text-primary font-serif text-2xl sm:text-3xl mb-2">
            Preguntes Freqüents
          </h2>
          <p className="text-sm text-on-surface-variant">
            Tot el que cal saber sobre la tecnologia NFC aplicada a la fusta.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx}
                className="bg-surface-container rounded-2xl border border-outline/15 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-semibold text-sm sm:text-base text-primary">
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-on-surface-variant shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-on-surface-variant leading-relaxed border-t border-outline/10 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CRIDA A L'ACCIÓ (CTA FINAL) */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="bg-gradient-to-br from-primary/95 to-primary rounded-3xl p-8 sm:p-14 text-on-primary text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-4">
              Comandes a mida al taller
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold mb-4 text-white">
              Vols la teva targeta o expositor de fusta amb NFC?
            </h2>
            <p className="text-white/80 text-sm sm:text-base mb-8 leading-relaxed">
              Treballem amb artesania i tecnologia per a crear peces úniques amb el teu logotip i identitat de marca gravats a làser.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => {
                  const text = encodeURIComponent("Hola Jordi! He estat provant la targeta NFC de demostració de Mínim Món i voldria informació per encarregar un lot personalitzat.");
                  window.open(`https://wa.me/34644297184?text=${text}`, '_blank');
                }}
                className="px-8 py-4 rounded-full bg-white text-primary font-bold text-sm sm:text-base hover:bg-white/95 active:scale-95 transition-all shadow-lg cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Contactar per WhatsApp</span>
              </button>
              
              <button
                onClick={handleCopyLink}
                className="px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white font-medium text-sm sm:text-base active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                {copiedLink ? <Check className="w-5 h-5 text-emerald-300" /> : <Share2 className="w-5 h-5" />}
                <span>{copiedLink ? 'Enllaç copiat!' : 'Compartir aquesta pàgina'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
