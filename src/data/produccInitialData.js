// Dades inicials per a l'aplicació Producc (MínimMón)

export const INITIAL_GRUPS = [
  { id: 'grup-1', grup: 'Fustes i Xapes' },
  { id: 'grup-2', grup: 'Resines i Polímers 3D' },
  { id: 'grup-3', grup: 'Il·luminació i Electrònica' },
  { id: 'grup-4', grup: 'Metalls i Llautó' },
  { id: 'grup-5', grup: 'Acabats, Olis i Vernissos' },
  { id: 'grup-6', grup: 'Embalatge i Presentació' }
];

export const INITIAL_UNITATS = [
  { id: 'unit-1', unitat: 'm²' },
  { id: 'unit-2', unitat: 'u' },
  { id: 'unit-3', unitat: 'Litre' },
  { id: 'unit-4', unitat: 'Pack' },
  { id: 'unit-5', unitat: 'kg' },
  { id: 'unit-6', unitat: 'cm²' },
  { id: 'unit-7', unitat: 'mm' }
];

export const INITIAL_UNITATS_COMPRA = [
  { id: 'ucomp-1', unitatCompra: 'Caixa 50 unitats', factorConversio: 50 },
  { id: 'ucomp-2', unitatCompra: 'Paquet 10 plaques', factorConversio: 10 },
  { id: 'ucomp-3', unitatCompra: 'Bobina 100m', factorConversio: 100 },
  { id: 'ucomp-4', unitatCompra: 'Pot 1 Litre', factorConversio: 1 },
  { id: 'ucomp-5', unitatCompra: 'Llauna 5 Litres', factorConversio: 5 },
  { id: 'ucomp-6', unitatCompra: 'Pack 100u', factorConversio: 100 },
  { id: 'ucomp-7', unitatCompra: 'Unitat solta', factorConversio: 1 }
];

export const INITIAL_FABRICANTS = [
  { 
    id: 'fab-1', 
    fabricant: 'Plywood Nordic AB', 
    pais: 'Finlàndia', 
    web: 'https://www.plywoodnordic.com', 
    descripcio: 'Fabricant de plaques de bedoll d\'alta densitat i qualitat làser.' 
  },
  { 
    id: 'fab-2', 
    fabricant: 'Anycubic Tech Co.', 
    pais: 'Xina', 
    web: 'https://www.anycubic.com', 
    descripcio: 'Resines fotopolímeres industrials UV 405nm.' 
  },
  { 
    id: 'fab-3', 
    fabricant: 'Epilog Laser Corp', 
    pais: 'EUA', 
    web: 'https://www.epiloglaser.com', 
    descripcio: 'Equips làser industrials, tubs CO2 i consumibles tècnics.' 
  },
  { 
    id: 'fab-4', 
    fabricant: 'Osmo Holz und Color', 
    pais: 'Alemanya', 
    web: 'https://www.osmo.de', 
    descripcio: 'Olis i ceres naturals ecològiques per a fusta.' 
  }
];

export const INITIAL_PROVEIDORS = [
  {
    id: 'prov-1',
    empresa: 'Fustes Girona S.L.',
    telefon: '+34 972 123 456',
    email: 'comandes@fustesgirona.cat',
    web: 'https://www.fustesgirona.cat'
  },
  {
    id: 'prov-2',
    empresa: 'LaserWood Materials',
    telefon: '+34 938 765 432',
    email: 'info@laserwood.es',
    web: 'https://www.laserwood.es'
  },
  {
    id: 'prov-3',
    empresa: '3D Resins & Tech Barcelona',
    telefon: '+34 931 998 877',
    email: 'ventes@3dresins.bcn',
    web: 'https://www.3dresinsbcn.com'
  },
  {
    id: 'prov-4',
    empresa: 'Electrònica Miniatura i LED',
    telefon: '+34 934 112 233',
    email: 'suport@minileds.com',
    web: 'https://www.minileds.com'
  }
];

export const INITIAL_MATERIALS = [
  {
    id: 'mat-1',
    material: 'Bedoll Natural 1.5mm',
    descripcio: 'Placa de fusta de bedoll especialment seleccionada per a tall i gravat làser d\'alta precisió.',
    imatge: 'https://images.unsplash.com/photo-1546484475-7f7bd55792da?auto=format&fit=crop&w=400&q=80',
    grupId: 'grup-1',
    unitat: 'm²',
    estocActual: 15.5,
    estocMinim: 5,
    proPrinId: 'prov-2',
    codiProPrin: 'LW-BED-15',
    enllacProPrin: 'https://www.laserwood.es/productes/bedoll-1-5mm',
    preuProPrin: 18.50,
    terminiProPrin: '2-3 dies feiners',
    altresProveidors: [
      {
        proveidorId: 'prov-1',
        codi: 'FG-B15',
        enllac: 'https://www.fustesgirona.cat/b15',
        preu: 19.80,
        termini: '24 hores'
      }
    ]
  },
  {
    id: 'mat-2',
    material: 'Noguer Americà 4mm',
    descripcio: 'Fusta noble de noguer fosc d\'alta densitat per a bases d\'escultures i diorames.',
    imatge: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    grupId: 'grup-1',
    unitat: 'm²',
    estocActual: 8.0,
    estocMinim: 3,
    proPrinId: 'prov-1',
    codiProPrin: 'FG-NOG-40',
    enllacProPrin: 'https://www.fustesgirona.cat/noguer-4mm',
    preuProPrin: 45.00,
    terminiProPrin: '48 hores',
    altresProveidors: []
  },
  {
    id: 'mat-3',
    material: 'Resina Polimèrica 8K Blanca translúcida',
    descripcio: 'Resina d\'alta resolució per a impressora 3D de detall (micro-estructures).',
    imatge: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    grupId: 'grup-2',
    unitat: 'Litre',
    estocActual: 2.5,
    estocMinim: 1.0,
    proPrinId: 'prov-3',
    codiProPrin: '3DR-8K-W1',
    enllacProPrin: 'https://www.3dresinsbcn.com/resina-8k',
    preuProPrin: 38.90,
    terminiProPrin: '24 hores',
    altresProveidors: []
  },
  {
    id: 'mat-4',
    material: 'Micro-LED Warm White 2700K (Pack 10u)',
    descripcio: 'Díodes LED ultrafins amb cable esmaltat de coure pre-soldat per a la il·luminació interior de miniatures.',
    imatge: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&w=400&q=80',
    grupId: 'grup-3',
    unitat: 'Pack',
    estocActual: 12,
    estocMinim: 4,
    proPrinId: 'prov-4',
    codiProPrin: 'MLED-2700K-10P',
    enllacProPrin: 'https://www.minileds.com/mled2700k',
    preuProPrin: 8.40,
    terminiProPrin: '3-4 dies feiners',
    altresProveidors: []
  },
  {
    id: 'mat-5',
    material: 'Vernís mat ecològic als olis naturals',
    descripcio: 'Vernís d\'acabat mat per a protecció de fusta natural sense alterar el color ni la textura tàctil.',
    imatge: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
    grupId: 'grup-5',
    unitat: 'Litre',
    estocActual: 1.8,
    estocMinim: 1.0,
    proPrinId: 'prov-1',
    codiProPrin: 'FG-VERN-ECO-1L',
    enllacProPrin: 'https://www.fustesgirona.cat/vernis-eco',
    preuProPrin: 24.50,
    terminiProPrin: '24 hores',
    altresProveidors: []
  }
];

export const INITIAL_MAQUINARIA = [
  {
    id: 'maq-1',
    maquina: 'Màquina Làser CO2 de Precisió (60W)',
    descripcio: 'Tall i gravat vectorial d\'alta precisió per a fustes de 0.5mm a 6mm i acrílics.',
    fabricant: 'Epilog Laser / Thunder',
    codiFabricant: 'TL-CO2-60',
    numSerie: 'SN-2023-8891A',
    dataCompra: '2022-05-15',
    preuHora: 14.50
  },
  {
    id: 'maq-2',
    maquina: 'Impressora 3D de Resina MSLA 8K',
    descripcio: 'Impressora 3D d\'alta resolució per a micro-detalls estructurals.',
    fabricant: 'Elegoo / Phrozen',
    codiFabricant: 'MSLA-8K-PRO',
    numSerie: 'SN-2023-3321R',
    dataCompra: '2023-01-20',
    preuHora: 6.00
  },
  {
    id: 'maq-3',
    maquina: 'Serra de Cinta i Pulidora de Banc',
    descripcio: 'Equip manual de preparació de taulons i acabat de marcs.',
    fabricant: 'Proxxon / Makita',
    codiFabricant: 'PX-BS240',
    numSerie: 'SN-2021-1002',
    dataCompra: '2021-11-10',
    preuHora: 5.00
  }
];

export const INITIAL_OPERACIONS = [
  {
    id: 'op-1',
    operacio: 'Vectorització i Disseny CAD/CAM',
    descripcio: 'Preparació de plànols, vectorització de capes i simulació de talls per a làser.',
    preuHora: 35.00
  },
  {
    id: 'op-2',
    operacio: 'Supervisió de Tall i Gravat Làser',
    descripcio: 'Configuració de paràmetres de potència/velocitat i supervisió del procés de tall.',
    preuHora: 22.00
  },
  {
    id: 'op-3',
    operacio: 'Ensamble i Calibrat Manual',
    descripcio: 'Acoblament manual de capes de fusta, encolat de precisió i comprovació estructural.',
    preuHora: 28.00
  },
  {
    id: 'op-4',
    operacio: 'Acabat de Superfícies i Vernissat',
    descripcio: 'Lixat fuster de gra fi, aplicació d\'olis protectors i eixugament.',
    preuHora: 25.00
  },
  {
    id: 'op-5',
    operacio: 'Instal·lació de Circuit de Llum Micro-LED',
    descripcio: 'Soldadura de cables, col·locació d\'interruptors amagats i proves d\'il·luminació.',
    preuHora: 30.00
  }
];

export const INITIAL_ESCANDALLS = [
  {
    id: 'esc-1',
    producteId: 'clauer-fusta-nom',
    producteNom: 'Clauers Personalitzats en Fusta Noble',
    tipus: 'Producte Web',
    mermePercent: 8,
    margePercent: 65,
    notes: 'Escandall base per a un clauer individual amb gravat a 2 cares.',
    materials: [
      { materialId: 'mat-1', quantitat: 0.05, costUnitari: 18.50 }, // ~0.05 m² de bedoll 1.5mm
      { materialId: 'mat-5', quantitat: 0.01, costUnitari: 24.50 }  // vernís
    ],
    operacions: [
      { operacioId: 'op-1', tempsMinuts: 10, costHora: 35.00 },
      { operacioId: 'op-2', tempsMinuts: 5, costHora: 22.00 },
      { operacioId: 'op-4', tempsMinuts: 5, costHora: 25.00 }
    ],
    maquinaria: [
      { maquinaId: 'maq-1', tempsMinuts: 6, costHora: 14.50 }
    ]
  },
  {
    id: 'esc-2',
    producteId: 'llibreria-nostalgia',
    producteNom: 'La Llibreria del Temps Aturat',
    tipus: 'Món Mínim',
    mermePercent: 10,
    margePercent: 120,
    notes: 'Miniatura d\'alta artesania amb 7 capes de fusta, micro-LEDs i resina 3D.',
    materials: [
      { materialId: 'mat-1', quantitat: 0.40, costUnitari: 18.50 },
      { materialId: 'mat-2', quantitat: 0.25, costUnitari: 45.00 },
      { materialId: 'mat-3', quantitat: 0.15, costUnitari: 38.90 },
      { materialId: 'mat-4', quantitat: 1.00, costUnitari: 8.40 },
      { materialId: 'mat-5', quantitat: 0.05, costUnitari: 24.50 }
    ],
    operacions: [
      { operacioId: 'op-1', tempsMinuts: 90, costHora: 35.00 },
      { operacioId: 'op-2', tempsMinuts: 45, costHora: 22.00 },
      { operacioId: 'op-3', tempsMinuts: 180, costHora: 28.00 },
      { operacioId: 'op-4', tempsMinuts: 40, costHora: 25.00 },
      { operacioId: 'op-5', tempsMinuts: 45, costHora: 30.00 }
    ],
    maquinaria: [
      { maquinaId: 'maq-1', tempsMinuts: 50, costHora: 14.50 },
      { maquinaId: 'maq-2', tempsMinuts: 120, costHora: 6.00 },
      { maquinaId: 'maq-3', tempsMinuts: 30, costHora: 5.00 }
    ]
  }
];

export const INITIAL_COMPRES = [
  {
    id: 'com-1',
    proveidorId: 'prov-2',
    dataCreacio: '2026-08-10',
    estat: 'Rebut', // Pendent, Demanat, Rebut, Cancel·lat
    numAlbara: 'ALB-2026-994',
    observacions: 'Comanda urgent de làmines de bedoll per a producció de comandes d\'estiu.',
    linies: [
      {
        materialId: 'mat-1',
        quantitatDemanada: 10,
        quantitatRebuda: 10,
        preuPactat: 18.50
      }
    ]
  },
  {
    id: 'com-2',
    proveidorId: 'prov-3',
    dataCreacio: '2026-08-17',
    estat: 'Demanat',
    numAlbara: '',
    observacions: 'Resina 8K per a noves proves de miniatures 3D.',
    linies: [
      {
        materialId: 'mat-3',
        quantitatDemanada: 3,
        quantitatRebuda: 0,
        preuPactat: 38.90
      }
    ]
  }
];
