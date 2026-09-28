// Dades inicials i configuracions per a la utilitat "Per Fer" de Mínim Món

export const PER_FER_COLUMNS = [
  {
    id: 'idees',
    titol: 'Bústia d\'Idees',
    subtitol: 'Inspiració, proves i futurs projectes',
    iconName: 'Lightbulb',
    colorKey: 'amber',
    headerBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-stone-900 dark:text-stone-100',
    badgeBg: 'bg-amber-200/90 dark:bg-amber-900/80 text-stone-900 dark:text-stone-100 border border-amber-400/50'
  },
  {
    id: 'per_fer',
    titol: 'Per Fer',
    subtitol: 'A punt per començar properament',
    iconName: 'ListTodo',
    colorKey: 'blue',
    headerBg: 'bg-sky-100 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-stone-900 dark:text-stone-100',
    badgeBg: 'bg-sky-200/90 dark:bg-sky-900/80 text-stone-900 dark:text-stone-100 border border-sky-400/50'
  },
  {
    id: 'al_taller',
    titol: 'Al Taller',
    subtitol: 'En curs i focus actual',
    iconName: 'Hammer',
    colorKey: 'orange',
    headerBg: 'bg-orange-100 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800 text-stone-900 dark:text-stone-100',
    badgeBg: 'bg-orange-200/90 dark:bg-orange-900/80 text-stone-900 dark:text-stone-100 border border-orange-400/50'
  },
  {
    id: 'en_pausa',
    titol: 'En Pausa',
    subtitol: 'Esperant material, client o assecat',
    iconName: 'Hourglass',
    colorKey: 'purple',
    headerBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-stone-900 dark:text-stone-100',
    badgeBg: 'bg-purple-200/90 dark:bg-purple-900/80 text-stone-900 dark:text-stone-100 border border-purple-400/50'
  },
  {
    id: 'enllestit',
    titol: 'Enllestit',
    subtitol: 'Feina feta i fites assolides',
    iconName: 'CheckCircle2',
    colorKey: 'emerald',
    headerBg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-stone-900 dark:text-stone-100',
    badgeBg: 'bg-emerald-200/90 dark:bg-emerald-900/80 text-stone-900 dark:text-stone-100 border border-emerald-400/50'
  }
];

export const PER_FER_AMBITS = [
  {
    id: 'disseny',
    nom: 'Disseny & I+D',
    descripcio: 'Proves de gravat làser, vectorització, nous motius i prototips',
    iconName: 'Palette',
    colorKey: 'rose',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/50 text-stone-900 dark:text-stone-100 border-rose-300 dark:border-rose-800 font-bold',
    dotClass: 'bg-rose-500'
  },
  {
    id: 'taller',
    nom: 'Taller & Fabricació',
    descripcio: 'Comandes especials, preparació de fustes, encolat i muntatges',
    iconName: 'Hammer',
    colorKey: 'amber',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/50 text-stone-900 dark:text-stone-100 border-amber-300 dark:border-amber-800 font-bold',
    dotClass: 'bg-amber-500'
  },
  {
    id: 'posting',
    nom: 'Posting & Xarxes',
    descripcio: 'Fotos de producte, reels, vídeos del taller i contingut d\'Instagram',
    iconName: 'Share2',
    colorKey: 'pink',
    badgeClass: 'bg-pink-100 dark:bg-pink-950/50 text-stone-900 dark:text-stone-100 border-pink-300 dark:border-pink-800 font-bold',
    dotClass: 'bg-pink-500'
  },
  {
    id: 'web',
    nom: 'Web & Catàleg',
    descripcio: 'Modificacions a la botiga, fitxes de productes i descripcions',
    iconName: 'Globe',
    colorKey: 'cyan',
    badgeClass: 'bg-cyan-100 dark:bg-cyan-950/50 text-stone-900 dark:text-stone-100 border-cyan-300 dark:border-cyan-800 font-bold',
    dotClass: 'bg-cyan-500'
  },
  {
    id: 'compres',
    nom: 'Compres & Proveïdors',
    descripcio: 'Fustes, complements de joieria, vernissos i material d\'embalatge',
    iconName: 'ShoppingBag',
    colorKey: 'indigo',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/50 text-stone-900 dark:text-stone-100 border-indigo-300 dark:border-indigo-800 font-bold',
    dotClass: 'bg-indigo-500'
  },
  {
    id: 'futur',
    nom: 'Idees & Futur',
    descripcio: 'Propostes a mitjà/llarg termini, fires d\'artesania i noves campanyes',
    iconName: 'Sparkles',
    colorKey: 'violet',
    badgeClass: 'bg-violet-100 dark:bg-violet-950/50 text-stone-900 dark:text-stone-100 border-violet-300 dark:border-violet-800 font-bold',
    dotClass: 'bg-violet-500'
  },
  {
    id: 'altres',
    nom: 'Altres',
    descripcio: 'Tasques generals de manteniment, ordre o administració',
    iconName: 'Tag',
    colorKey: 'slate',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-stone-900 dark:text-stone-100 border-slate-300 dark:border-slate-700 font-bold',
    dotClass: 'bg-slate-500'
  }
];

export const PER_FER_PRIORITATS = [
  {
    id: 'urgent',
    nom: 'Urgent',
    iconName: 'AlertTriangle',
    colorKey: 'red',
    badgeClass: 'bg-red-100 dark:bg-red-950/60 text-stone-900 dark:text-stone-100 border-red-300 dark:border-red-800 font-bold',
    dotClass: 'bg-red-500 animate-pulse'
  },
  {
    id: 'normal',
    nom: 'Normal',
    iconName: 'Clock',
    colorKey: 'amber',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-stone-900 dark:text-stone-100 border-amber-300 dark:border-amber-800 font-bold',
    dotClass: 'bg-amber-500'
  },
  {
    id: 'baixa',
    nom: 'Sense pressa',
    iconName: 'Coffee',
    colorKey: 'emerald',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-stone-900 dark:text-stone-100 border-emerald-300 dark:border-emerald-800 font-bold',
    dotClass: 'bg-emerald-500'
  }
];

// Tasques d'exemple per omplir el tauler si la base de dades està buida
export const INITIAL_SAMPLE_TASQUES = [
  {
    id: 'pf-sample-1',
    titol: 'Proves de gravat làser en fusta d\'olivera',
    estat: 'idees',
    ambit: 'disseny',
    prioritat: 'normal',
    descripcio: 'Provar diferents paràmetres de potència i velocitat per aconseguir un contrast nítid sense cremar les vetes naturals de l\'olivera. Anotar la configuració exacta a la màquina.',
    dataLimit: '',
    subtasques: [
      { id: 'st-1', text: 'Preparar retalls d\'olivera ben polits', completada: true },
      { id: 'st-2', text: 'Fer matriu de test (potència 15-30%, velocitat 200-400)', completada: false },
      { id: 'st-3', text: 'Aplicar capa fina d\'oli de llinosa per veure l\'acabat final', completada: false }
    ],
    imatges: [],
    vinculacio: { tipus: 'cap', id: '', nom: '' },
    ordre: 1,
    dataCreacio: new Date().toISOString()
  },
  {
    id: 'pf-sample-2',
    titol: 'Comprar cua d\'assecat ràpid Titebond i anelles per a clauers',
    estat: 'per_fer',
    ambit: 'compres',
    prioritat: 'normal',
    descripcio: 'Queda només un pot començat al taller. També cal reposar anelles d\'acer inoxidable de 25mm per a les noves comandes de clauers.',
    dataLimit: '',
    subtasques: [
      { id: 'st-4', text: 'Revisar estoc restant al magatzem', completada: true },
      { id: 'st-5', text: 'Fer comanda a proveïdor habitual', completada: false }
    ],
    imatges: [],
    vinculacio: { tipus: 'cap', id: '', nom: '' },
    ordre: 2,
    dataCreacio: new Date().toISOString()
  },
  {
    id: 'pf-sample-3',
    titol: 'Preparar comanda especial Clauers Noces de Plata',
    estat: 'al_taller',
    ambit: 'taller',
    prioritat: 'urgent',
    descripcio: 'Sèrie de 20 clauers personalitzats amb data i inicials gravades al làser. Fusta de faig amb acabat setinat i cordó de cuir trenat.',
    dataLimit: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtasques: [
      { id: 'st-6', text: 'Tall làser i gravat de les dues cares', completada: true },
      { id: 'st-7', text: 'Poliment manual dels cantells', completada: true },
      { id: 'st-8', text: 'Tractament protector amb cera natural', completada: false },
      { id: 'st-9', text: 'Muntatge dels cordons i anelles', completada: false },
      { id: 'st-10', text: 'Embalatge i caixa de regal', completada: false }
    ],
    imatges: [],
    vinculacio: { tipus: 'cap', id: '', nom: '' },
    ordre: 3,
    dataCreacio: new Date().toISOString()
  },
  {
    id: 'pf-sample-4',
    titol: 'Esperant confirmació de mides per al marc de fusta artesanal',
    estat: 'en_pausa',
    ambit: 'taller',
    prioritat: 'normal',
    descripcio: 'El client ha d\'enviar les mides exactes de la fotografia per ajustar el marc interior abans de tallar les motllures.',
    dataLimit: '',
    subtasques: [
      { id: 'st-11', text: 'Enviar missatge de recordatori per WhatsApp', completada: true }
    ],
    imatges: [],
    vinculacio: { tipus: 'cap', id: '', nom: '' },
    ordre: 4,
    dataCreacio: new Date().toISOString()
  },
  {
    id: 'pf-sample-5',
    titol: 'Crear plantilla de reels al Posting per a processos de poliment',
    estat: 'enllestit',
    ambit: 'posting',
    prioritat: 'baixa',
    descripcio: 'Configurar una plantilla a l\'eina Posting amb música relaxant i subtítols explicant l\'origen de la fusta.',
    dataLimit: '',
    subtasques: [
      { id: 'st-12', text: 'Gravar clips de 15 segons', completada: true },
      { id: 'st-13', text: 'Muntar i exportar plantilla', completada: true }
    ],
    imatges: [],
    vinculacio: { tipus: 'cap', id: '', nom: '' },
    ordre: 5,
    dataCreacio: new Date().toISOString(),
    dataCompletat: new Date().toISOString()
  }
];
