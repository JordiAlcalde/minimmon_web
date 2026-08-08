export const DEFAULT_BRANQUES = [
  { id: 'espais', nom: 'Espais', ordre: 1 },
  { id: 'persones', nom: 'Persones', ordre: 2 },
  { id: 'celebracions', nom: 'Celebracions', ordre: 3 },
  { id: 'esports', nom: 'Esports', ordre: 4 },
  { id: 'diorama', nom: 'Diorama', ordre: 5 },
  { id: 'topografia', nom: 'Topografia', ordre: 6 },
  { id: 'arquitectura', nom: 'Arquitectura', ordre: 7 }
];

export const STITCH_PROJECTS = [
  {
    id: 'esperit-masia',
    titol: "L'esperit de la Masia",
    subtitol: "Una representació íntima de la llar pairal, on cada capa de fusta narra una generació.",
    branca: "Arquitectura",
    material: "Fusta de Noguer i Bedoll",
    encarrec: "El client desitjava immortalitzar la masia familiar on van créixer tres generacions, capturant l'arquitectura tradicional catalana en un format tangible per regalar als seus pares.",
    art: "Es van digitalitzar els plànols antics i fotografies històriques, traduint les textures de pedra i les Bigues de fusta a diferents nivells de profunditat i gravats làser micromètrics.",
    resolucio: "Una peça tridimensional ensamblada manualment capa a capa, que reacciona a la llum natural destacant la calidesa del noguer fosca i el contrast del bedoll.",
    detalls: "Tall làser d'alta precisió (0.1mm), gravat vectorial de pedres, acabat protector amb olis naturals ecològics.",
    video: "",
    media: [
      {
        id: 'masia-img-1',
        imatge: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqY_JU0JHN2DvyjB6NST5p5n9vs3lWQR5mZS6qyjqxZSJ3_Sv8EcdxykIZcAH4Jmh-xZo596QW2yPmgHnRhEPw2faq09nycul_qCRP6UG3Lstup6FPWiyDUI6VQoDsQMVbRg6aaWTasZUokDxVjljhcInQBArC_zZl7a3Mwy9gX-RhA5Akm5Fi7sDhJazEx7UVqWC-WLpfgtFM13kxbxRElpoDAoARyWxdWMqSISskcyDOgkOEMtr8cA",
        principal: true,
        inici: 1,
        activa: true,
        ordre: 1
      },
      {
        id: 'masia-img-2',
        imatge: "https://lh3.googleusercontent.com/aida-public/AB6AXuDjbC2rNNjiXrYGYsFcZ6Rd8z6fkbYMMScTZYodndO1fHG3BKl67D4bInjlXcXRdBmYco2yORtdCZQs_3m2JV_IjjZGPe8pPTbe09b7FSuoLWB5ihsAB-6vdU4kzbPxH8WeecXngkVwXfB_OoJmqFefI_p_H6m2EofwJyqnlJaYYrw0EbNPWa81BODIf5Zr53KYJQvr1YAvb-MNjh6IMNq4gfeWzybSiC_eCI8rzA8q-iieixNq_Hzyfg",
        principal: false,
        inici: null,
        activa: true,
        ordre: 2
      }
    ]
  },
  {
    id: 'records-mar',
    titol: "Records de Mar",
    subtitol: "Topografia relacional d'una costa trobada amb el mar.",
    branca: "Topografia",
    material: "Bedoll Natural i Resina",
    encarrec: "Representar la cala de la Costa Brava on una parella va passar el seu primer estiu, destacant les corbes de nivell submarines i el perfil de les roques.",
    art: "Utilitzant dades batimètriques reals, es van generar 7 capes de bedoll superposades amb talls orgànics que simulen la profunditat progressiva de l'aigua.",
    resolucio: "Peça topogràfica d'alta sensibilitat tàctil on la fusta clara evoca les sorres i penya-segats mediterranis.",
    detalls: "Fusta de bedoll de 1.5mm, gravat geogràfic de coordenades GPS, vernís mat d'alta durabilitat.",
    video: "",
    media: [
      {
        id: 'mar-img-1',
        imatge: "https://lh3.googleusercontent.com/aida-public/AB6AXuA2F-qF1-hOpEBJNuqGSKMDh2E7XRUyexn8nDzu2zHAcfEU0k36qn63jEWQxo7Zmv6bW7LI1Cy0j11mTSImPb5RtQHSuQVKH5e5dAFdFqw3i69CoTEENuTFwcO0We197wHdOioJfRWMDHvAL7H7BVcYnEE2pOTcBrcmQEejTce9PupLl3d22omlJsyaHvaEJ76yN8xNYqwwVAazXfA7k4I6n0Q7fpmoKfriytnUDXZXLRuK8zwkXZrjUQ",
        principal: true,
        inici: 2,
        activa: true,
        ordre: 1
      }
    ]
  },
  {
    id: 'llum-ombra',
    titol: "Llum i Ombra",
    subtitol: "Estudi de volums entre la calidesa de la fusta i la resina impressa en 3D.",
    branca: "Espais",
    material: "Resina 3D & Fusta de Noguera",
    encarrec: "Explorar la fusió entre l'artesania tradicional en fusta i les possibilitats de la impressió 3D de detall per a un estudi d'arquitectura.",
    art: "Joc de volums geomètrics on la resina blanca translúcida trenca la rigidesa orgànica del noguer fosca.",
    resolucio: "Escultura en miniatura que canvia de caràcter segons l'angle de la incidència de la llum.",
    detalls: "Impressió 3D en resina polimèrica d'alta definició (50 micres) i base de noguera gravada.",
    video: "",
    media: [
      {
        id: 'llum-img-1',
        imatge: "https://lh3.googleusercontent.com/aida-public/AB6AXuDxWskGNKv1ViNV49QjyqE_VwuA1HyZ5_ijImBVfBcWZay5Y6kTLBV4AvTmHWQvrrn4IvdNsXTuZNHZl3iiT9kCaOhzyXVVpW4g7OWx5KvVp-RZkGoebXvocq4veeDQwRdPWxSYg4uKd4mVoPNtoIK6301xNQZgroJWHJS6RjjmX9T9biEs9SO0krHzOfNzYSSwi0EdTiqC-9rRard-oxjj75nPhyi_W_vnEWoUBuefgaVd7NWQzyjUQg",
        principal: true,
        inici: 3,
        activa: true,
        ordre: 1
      }
    ]
  },
  {
    id: 'essencia-vida',
    titol: "L'Essència d'una Vida",
    subtitol: "Aquest diorama encapsula el temps. Treballat sobre noguera fosca, cada línia gravada pel làser revela capes de memòria.",
    branca: "Persones",
    material: "Noguera i Alama de Llautó",
    encarrec: "Crear un regal d'homenatge per a la jubilació d'un fuster de tercera generació, integrant les eines històriques del seu antic taller.",
    art: "Recreació a escala d'un banc de treball tradicional amb gravat micro-texturitzat de les eines i virutes de fusta.",
    resolucio: "Un diorama emotiu que actua com a caixa de memòries tangibles.",
    detalls: "Micro-marcatge làser, acoblament manual a pressió i vernís satinat a la cera.",
    video: "",
    media: [
      {
        id: 'essencia-img-1',
        imatge: "https://lh3.googleusercontent.com/aida-public/AB6AXuAYKFs8yvpqnFny6M7slRm2OWc-6HQ7mrH6krrAL9tgqSJzOtol8KlZvVWylI9f-i6cs0X70_UMaW8vIXbVvpmaFyAZkU7xKN2lAqPek_UidJ_TLGi2jXAlfLWHUVbUm1JXCEgZ2wlAMi_vsbrf7qt_4FOtfABBO11z3xqMa3YuB-C4NfyDOSQAGo6PXGB7oWA5Cg_NjiBQ1Tp98shx3FdqpXZtvKJbguNAjdAeKM76sCEF0m7BfQ1M1A",
        principal: true,
        inici: null,
        activa: true,
        ordre: 1
      }
    ]
  },
  {
    id: 'taller-oblidat',
    titol: "El Taller Oblidat",
    subtitol: "Recreació d'un espai de treball aturat en el temps. Utilitzant roure clar i capes successives de tall làser.",
    branca: "Diorama",
    material: "Roure Clar",
    encarrec: "Diorama inspirat en els vells tallers d'artesans d'inicis del segle XX.",
    art: "Treball de perspectiva forçada mitjançant 5 plans verticals de roure de diferents gruixos.",
    resolucio: "Sensació de profunditat realista que transporta l'observador a l'interior d'un espai càlid.",
    detalls: "Roure seleccionat de 2mm i 4mm, lixat manual final i gravat d'ombres.",
    video: "",
    media: [
      {
        id: 'taller-img-1',
        imatge: "https://lh3.googleusercontent.com/aida-public/AB6AXuCqton-5uE_y0vRuokqThOI3P2KwPN-TamCGggyyMBkvOSsl8EJi1ZfXbheuXn858ryvSSFgLxzAaWXkC85cjq5MKe_Sk6WaOiYucM4jX1MRi5W5zQvStZc-ygaZ8OJKRWkoysM_RpduRQ9kgqij-2BY6ILn0KMZdX-H52dzg5CMFGbkmNxtiZ0FjJQvAIWIrAhX65pVM8-ltzJuOko_EwbxJxkU0OayfIUFJzYcX3sIuBfWrdDXMJGVg",
        principal: true,
        inici: null,
        activa: true,
        ordre: 1
      }
    ]
  },
  {
    id: 'visions-emporda',
    titol: "Visions de l'Empordà",
    subtitol: "Una topografia emocional. Milers de talls mil·limètrics sobre fusta de faig delineen el relleu d'una terra de vents i mar.",
    branca: "Topografia",
    material: "Faig Natural",
    encarrec: "Escultura topogràfica del massís del Montgrí i la línia de mar per a una casa privada.",
    art: "Més de 1.200 talls vectorials superposats en faig natural que dibuixen la cartografia del territori empordanès.",
    resolucio: "Relleu de gran format per a galeria o paret amb acabat orgànic suau.",
    detalls: "Faig vaporitzat de 0.5mm, gravat topogràfic amb corbes de nivell cada 10 metres.",
    video: "",
    media: [
      {
        id: 'emporda-img-1',
        imatge: "https://lh3.googleusercontent.com/aida-public/AB6AXuCU99slY5FqliPlV3rqA5LpidjhKWRZrn2JYDVJhE9q9SbT5IAfuOugewChvwTl970QqMeL0i7JaitlkO5rQUtPNSekFUR9u0iXoH2B1P3WprsOiMefsFRxgkcWcgPNUw7lhbb673639AywFxK1szMVVuK8MphMyE6tCCk38fx3FcMeZ0cnsYFQrUUX3nFYsFRT-VfIbN3KeZdtggvpQ54xuSCt711TlqfnEMwertka3Lpxzsg83lbVgQ",
        principal: true,
        inici: null,
        activa: true,
        ordre: 1
      }
    ]
  }
];

export const STITCH_GIFTS = [
  {
    id: 'jocs-creativitat',
    title: 'Jocs i creativitat',
    subtitle: 'Peces que inspiren la ment.',
    items: ['Puzles d fusta', 'Jocs de taula tradicionals', 'Detalls infantils personalitzats'],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWyEVZExZU3pIkENG3_beGDd0mOfR3_JCDAliqzMCnEdPRWHXZbu4-rAKrvPTG2o2W8vCYRj48JEfvx3B1i1fxsl-yc2h6XdxLSNzf0Go2xa1hV4Yrjw8IM0O0xrmtWgqHWK9RSTqXqhWRZwhSaJhRkDDxIhFgH9MLiq_OMIgpkj2DUOvc3LF7ycGpRHYH-7As9zTIkyZW3qeQ7dCbftN6BnCC75KLb0vTJgdqAvo-LFkacw5O8ZjKFA'
  },
  {
    id: 'records-fotografia',
    title: 'Records i fotografia',
    subtitle: 'Emmarca els teus moments.',
    items: ['Clauers de fusta gravats', 'Cartells i plaques', 'Marcs de fotos artesans'],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRLDtS6Tu5VS2T7hi95nw2OzuBn_M1Gk2EdX04NGl6_Ssih2MBoU_yCBt-Q1iiwgA2eWuYxOAYOpXagDfCmrUOnvK026jiLRhUC6j98UFx0Tf89Cxzk9revb8DioMzVBaToX87Tq0Jb_QjGHOWrNy4GNmFqNCo4RPGHEopDdVbPBKrw49XQuMUkJ_BA4RFzM0ytekKPNtfk0dwLQn1HdI330TWoYADvJ70iEiukw1LM5sp3v6ePYeCrA'
  },
  {
    id: 'complements-quotidiana',
    title: 'Complements i qüotidiana',
    subtitle: 'Detalls pel dia a dia.',
    items: ['Caixes de fusta amb tapa gravada', 'Embalatges especials', 'Miscel·lània de taller'],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPlmtpUe6QWmHsYF9UHLqjTiZslDU1OZ-cW3mrgxvAxVziMkt2iHHydanC2sBrjYSY2WTH-LEDGPpiF5BffY3yoT8LoMD7Hhi9of0EIpQh8V8LSLZiUKlWSzuUR-qXaTseEEcEKEqt4D6pHfkKfG9zBHSgmHyjeomAd5KqXHIfuYqI9KpABx_kAjYWyDKJTuOCiSsHgN0mZ0FOeyFe54h5p0MXr3UfaHptT7FLJ4GwF5XD6DC4pwu7TA'
  },
  {
    id: 'dates-assenyalades',
    title: 'Dates assenyalades',
    subtitle: 'Celebra les ocasions especials.',
    items: ['Detalls de Sant Jordi', 'Dia del Pare', 'Ornaments de Nadal'],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAh_xEyJ9WQ_rx4_4IahpxSaWCgqc4TVizqtMLk9f-F9SuHfkpsiXKw-mctI4GYXyZHE1JU9YHyglvEoAA1v62w_-zsP8EvdV5JlqiVeCOh1nB_T6DHd7ho0nVV906SldumOCB5Q7UkpWrT2YRRYV-jN1Kp_6slRbeTxis6AHQdKCLbFYdoXdM5FjTb7wH_r1ixD5D0CzM5s2hsbJjMleba_U_HPm-a5hdYBowUD6D4V9_bkFPI-tRaPg'
  }
];

export const STITCH_CRAFTSMAN = {
  name: "Jordi Alcalde",
  brandName: "Mínim Món de Jordi Alcalde",
  tagline: "L'essència del que som, en miniatura.",
  subtitle: "Capturant la memòria, l'espai i l'emoció a través de la calidesa de la fusta i la precisió de la llum.",
  emails: ["info@minimmon.cat", "jordi.alcalde@outlook.com"],
  phone: "+34 699 592 326",
  experienceYears: 60,
  bio: "Després de més de 60 anys aprenent de la vida i acumulant experiència en disseny industrial, programació i marcatge làser, he trobat en la fusta un llenç i en el làser la meva nova eina d'expressió. Mínim Món neix de la voluntat d'aturar el temps, de destil·lar espais i records en petits formats tangibles que capten l'esperit de les persones i els seus llocs."
};
