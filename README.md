CONJUNT DE REGLES PER A DESENVOLUPAR L'APLICACIÓ

=========================================
PREUS
=========================================
Recull de totes les condicions dels Preus de Venda (Tots els supòsits)
Aquest és el funcionament de la lògica de preus al catàleg web:

    A [Preu Base del Producte] --> B{Té preus per Mida?}
    B -- Sí --> C[Preu de la Mida seleccionada]
    B -- No --> D{Té Trams per Quantitat?}
    C --> D
    D -- Sí: Qty > Llindar --> E[Preu Tram 2]
    D -- Sí: Qty <= Llindar --> F[Preu Tram 1]
    D -- No --> G[Preu Base / Mida]
    E --> H[+ Sobrecostos de Personalització]
    F --> H
    G --> H
    H --> I[Preu Unitari Final]

Supòsit A: Preu Base Fix Estàndard
On es defineix: Al camp Preu (€) de l'article a l'Àrea Privada.
Càlcul: Preu Unitari = Preu Base.
Rètol web: PREU: X,XX € (IVA inclòs).
Excepció: Si el preu és 0 o està marcat com a Demanar pressupost, mostra PREU ORIENTATIU o - - - i activa el flux de pressupost sense pagament directe.

Supòsit B: Preus diferents segons la Mida (Dimensions)
On es defineix: Quan el producte té el camp Mides amb diversos valors (p. ex. 10x15, 20x30) i s'assignen preus a Preus per mida.
Càlcul: En canviar de mida al desplegable/botons, el preu base canvia en temps real al preu assignat a aquella mida.
Rètol web: Si les mides tenen preus diferents entre elles, a la targeta del catàleg es mostra automàticament PREU DES DE: [Mida més petita] €.

Supòsit C: Trams de Preu per Quantitat (Descompte per Volum)
On es defineix: A l'Àrea Privada ➔ Preus per quantitat: Actiu.
Paràmetres:
Llindar: Límit d'unitats (p. ex. 10).
Preu Tram 1 (de 1 a 10 unitats): p. ex. 4,00 €.
Preu Tram 2 (més de 10 unitats): p. ex. 3,20 €.
Càlcul:
Si Quantitat <= Llindar ➔ S'aplica Preu Tram 1.
Si Quantitat > Llindar ➔ S'aplica Preu Tram 2.
Rètol web: Es mostra el quadre informatiu «Trams de preu per quantitat» amb una fletxa que marca dinàmicament el tram actiu segons la quantitat triada. (També suporta trams per mida si el producte té mides diferents).

Supòsit D: Sobrecostos de Personalització (opcionsPersonalitzacio)
S'afegeixen sobre el preu base (o sobre el preu de mida/quantitat):

Opcions de tipus Desplegable:
Cada opció del desplegable té la seva pròpia casella + X,XX € (preusValors).
S'aplica només el sobrecost del valor que el client tingui seleccionat en aquell instant.
Important: Si tots els valors tenen + 0,00 €, el sobrecost és zero.
Opcions de tipus Text / Memo:
Disposen d'un camp únic de sobrecost + X,XX €.
Condició: S'aplica únicament si el client escriu text. Si el camp queda en blanc, el sobrecost és 0,00 €.
Opcions de tipus Fitxer / Imatge:
Disposen d'un camp únic de sobrecost + X,XX €.
Condició: S'aplica únicament si el client adjunta un fitxer o imatge.
Forats seleccionats (per a etiquetes):
Es multiplica el nombre de forats triats pel camp preuPerForat configurat a l'article (p. ex. 2 forats × 0,10 € = +0,20 €).

Supòsit E: Rètols i Badges Dinàmics
PREU DES DE:: S'activa automàticament quan hi ha variabilitat de preu inicial (ja sigui per trams de volum, per mides amb preus diferents o per opcions amb preus diferents).
✨ Personalització inclosa: S'activa automàticament quan el producte disposa d'opcions de personalització però el sobrecost de la combinació actual és 0,00 € (comunicant al client que el servei no té cost addicional).
Total: X,XX €: Apareix automàticament sota el preu unitari quan la quantitat seleccionada és superior a 1 (Preu Unitari Final × Quantitat).

Supòsit F: Diferència entre Escandalls (Taller) i Àrea Privada (Venda)
Escandall (Producc): $\text{Cost Materials} + \text{Cost Mà d'Obra} + \text{Cost Màquines} + \text{Mermes} \rightarrow \text{Cost Fabricació} + \text{Marge %} = \mathbf{PVP\ Recomanat}$. Serveix per saber quant et costa fabricar i quin marge tens. A la pestanya 3 hi ha el botó «Copiar PVP» per si vols traspassar el preu calculat a la botiga.
Àrea Privada (Catàleg): Fixa el preu contractual de la botiga web (el que efectivament se li cobrarà a la targeta o Stripe al comprador).




***********************************************

Nou Mòdul «Gestió d'esdeveniments» a Producc
S'ha creat i integrat el mòdul complet «Gestió d'esdeveniments» (botó curt: «Esdeveniments») dins de l'aplicació Producc.

Ajust Visual a la Secció d'Opinions (Fitxa del Producte)
Intercanvi de posicions:
Costat esquerre: El botó «Deixar una opinió» (i «Veure opinions» si n'hi ha) ara s'ubica a l'esquerra.
Costat dret: El text informatiu (Sigues el primer en valorar aquesta peça) i el resum d'estrelles amb la icona s'ubiquen a la dreta.
Canvi de color i estil del botó: S'ha canviat el to fosc original (bg-primary) per un to ambre càlid (bg-amber-700 hover:bg-amber-600 text-white) per diferenciar-lo clarament dels controls de tancar finestra o accions de modal.
Millores a Compres & Ordres d'Aprovisionament
1. Selecció de Proveïdor i Fabricant & Nous Camps
Proveïdor & Fabricant a la comanda: Tant a la capçalera de la comanda com a cadascuna de les línies de material, ara és possible seleccionar qualsevol proveïdor i fabricant, encara que no siguin els principals o configurats per defecte.
Data Prevista d'Entrega: S'ha afegit el camp de data prevista que confirma el proveïdor en rebre la comanda. Es visualitza amb icona de rellotge i color cian a la fitxa de la comanda i al modal de recepció.
Nº Comanda Proveïdor: S'ha afegit el camp de número o referència que assigna el proveïdor (ex: PO-AMZ-99124, 450001...). Apareix destacat a la llista de comandes, al cercador i al text per copiar.
Detecció intel·ligent: En seleccionar un material, el sistema cerca automàticament si aquell material té assignat el proveïdor de la comanda (fins i tot si és un proveïdor alternatiu), preseleccionant el fabricant, packaging i preu corresponents. Si no coincideix, es preselecciona la configuració principal, deixant l'usuari lliure de canviar-ne qualsevol.
2. Unitats de Compra vs Unitats Reals d'Estoc
Unitat de Compra (Packaging): S'ha incorporat el desplegable de formats de packaging (unitatsCompra, ex: Pack 20u, Caixa 50u, etc.) a cada línia de comanda.
Comparativa visual en temps real:
En el formulari: es mostra la conversió immediata, per exemple: 2 pack(s) ➔ 40 u estoc.
A la taula de comandes: columnes diferenciades per a Unitats Compra (ex: 2 Pack 20u) i Estoc Real (ex: 40 u).
Recepció d'albarà: En rebre la comanda, s'introdueixen les unitats de compra rebudes i el sistema calcula i suma automàticament les unitats reals a estocActual (quantitatRebuda * factorConversio).
3. Preu de Compra del Proveïdor
Preu que rep el proveïdor: El camp de preu a l'ordre de compra és ara el preu de compra que factura el proveïdor per unitat de compra (ex: 19,90 € / pack), eliminant qualsevol artefacte de decimals infinits (com 0,9949999999999999).
Cost unitari informatiu: Es mostra de manera secundària el cost unitari equivalent (ex: (0,995 € / u)).
Actualització automàtica en recepció: En confirmar l'albarà amb l'opció d'actualitzar preus marcada, el cost base unitari del material (preuProPrin) s'actualitza a preuPactat / factor, i el preu del pack (preuPackProPrin i proveidorsMaterial) al preu de compra real.
1. On trobar-lo?
Obre Producc des de l'Àrea Privada.
Al desplegable de barres de treball (a l'esquerra), selecciona la barra «Producció».
Veuràs el nou botó amb icona de parada: «Esdeveniments» (amb el comptador de fires registrades).
2. Què inclou el nou mòdul?
1. Llistat i Gestió de Fires
Visualització d'esdeveniments: Targetes amb nom, any/edició, estat (En Preparació, En Curs, Tancat), dates, lloc, total venut i peces a la parada.
Creació i edició de fires: Nom, any, lloc, dates, despesa de parada, fons de canvi de caixa en efectiu i nom del col·laborador amb el seu percentatge de comissió (ex. 15%).
2. Pestanya 1: 📦 Dotació d'Estoc (Preparació & Traspassos)
Traspàs Taller $\rightarrow$ Fira: En prémer «+ Traspassar Peça des del Taller», es tria el producte i les unitats que marxen cap a la fira. Aquestes unitats es resten automàticament de l'estocActual general del taller, protegint la botiga web de vendre peces que físicament estan a la fira.
Preus Fira / Promocionals: Cada peça carrega el seu PVP normal, però permet editar a l'instant el camp «Preu Fira» per arrodonir preus o fer ofertes de parada.
Enllaç directe amb Fabricació (OF): Si vols portar més unitats de les que hi ha al taller, la mateixa pantalla et permet llençar una nova Ordre de Fabricació (OF) per a les peces que falten amb un sol clic.
Retorn parcial: Permet retornar unitats al taller en qualsevol moment abans del tancament.
3. Pestanya 2: 🏷️ TPV Parada / Venda Ràpida (Mòbil & Tauleta)
Disseny pensat per a peu de carrer: Targetes visuals amb foto gran, nom, preu de fira destacat i indicador d'estoc disponible a la parada.
Cobrament ràpid: En clicar sobre qualsevol producte, s'obre el modal per triar la quantitat i 3 botons grans:
💵 Efectiu
📱 Bizum
💳 Targeta
Descompta immediatament la unitat de la parada, suma l'import recaptat i registra la venda amb data i hora.
Anul·lació de vendes: Si s'ha premut per error a la parada, un botó permet desfer la venda i retornar la peça a l'estoc de parada.
4. Pestanya 3: 💰 Liquidació i Arqueig de Caixa
Arqueig de la Caixa Física:
Fons de canvi inicial portat + Total vendes en efectiu = Import exacte que hi ha d'haver a la caixa física.
Canals Digitals: Total recaptat per Bizum al mòbil i Targeta al datàfon.
Liquidació del Col·laborador: Càlcul automàtic del % de comissió sobre la facturació de la fira (ex. 15%).
Rendiment Net Taller: Facturació total - Comissió col·laborador - Despesa de la parada.
Tancament i Retorn de Romanents: El botó «Finalitzar Fira i Retornar Romanents a l'Estoc del Taller» tanca la fira i reincorpora automàticament totes les peces no venudes a l'estoc general del taller.
5. Pestanya 4: 📈 Històric i Comparativa Interanual
Relaciona automàticament totes les edicions de la mateixa fira (p. ex. 2024, 2025, 2026).
Taula comparativa: Evolució de la facturació, peces portades vs venudes, percentatge d'èxit de venda i rendiment net any a any.
Rànquing de productes estrella: Quines peces s'han venut més en la història d'aquesta fira per planificar la fabricació d'anys futurs amb màxima precisió.



