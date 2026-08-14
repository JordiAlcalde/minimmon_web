import React, { useState } from 'react';
import { STITCH_CRAFTSMAN } from '../data/stitchData';
import { getRandomPhilosophicalQuote } from '../data/philosophicalQuotes';
import { resolveMediaUrl } from '../utils/mediaUtils';

export default function ElTallerSection({ setActiveTab }) {
  const [currentQuote] = useState(() => getRandomPhilosophicalQuote());

  return (
    <div className="pt-28 pb-24 animate-fadeIn">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
          <div className="col-span-1 md:col-span-6 order-2 md:order-1 mt-12 md:mt-0">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-[0.2em] mb-4 block font-semibold">L'Essència</span>
            <h1 className="font-headline-xl text-headline-xl text-primary mb-8 md:pr-12 font-serif text-4xl md:text-5xl">
              L'Ànima de l'Espai
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 md:pr-16 leading-relaxed">
              El taller no és només un espai físic; és un santuari on la fusta respira i les idees prenen forma. L'acumulació de coneixement, el polsim de l'experiència en disseny industrial, es fa palès en cada encenall que cau al terra.
            </p>
            <p className="font-body-lg text-body-lg text-on-surface-variant md:pr-16 leading-relaxed">
              Aquí, el temps s'atura. Les eines, algunes noves, altres heretades, són l'extensió de les mans que busquen l'equilibri perfecte entre la tècnica precisa i la calidesa de l'artesania.
            </p>
          </div>
          <div className="col-span-1 md:col-span-6 order-1 md:order-2">
            <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden shadow-[0_20px_40px_-15px_rgba(38,23,12,0.1)]">
              <img 
                className="object-cover w-full h-full" 
                alt="El Taller Mínim Món" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjbC2rNNjiXrYGYsFcZ6Rd8z6fkbYMMScTZYodndO1fHG3BKl67D4bInjlXcXRdBmYco2yORtdCZQs_3m2JV_IjjZGPe8pPTbe09b7FSuoLWB5ihsAB-6vdU4kzbPxH8WeecXngkVwXfB_OoJmqFefI_p_H6m2EofwJyqnlJaYYrw0EbNPWa81BODIf5Zr53KYJQvr1YAvb-MNjh6IMNq4gfeWzybSiC_eCI8rzA8q-iieixNq_Hzyfg" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* The Human Connection */}
      <section className="bg-surface-container-lowest py-24 mb-24">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center max-w-3xl mx-auto">
            <span className="material-symbols-outlined text-outline mb-6 text-5xl notranslate" translate="no" aria-hidden="true">handshake</span>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-8 font-serif text-3xl md:text-4xl">
              La Bonhomia del Procés
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              Darrere de cada peça hi ha una conversa, una mirada, una intenció. Parlar amb el client, entendre els seus anhels i traduir-los a la materialitat de la fusta és un acte de profunda connexió humana. La peça final és només el reflex d'aquest vincle poètic.
            </p>
          </div>
        </div>
      </section>

      {/* Secció Vestida de Filosofia i Vetació de la Fusta */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-24">
        <div className="relative rounded-3xl overflow-hidden bg-primary text-on-primary shadow-2xl border border-primary/30">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center">
            {/* Imatge de Vetes i Textura de Fusta */}
            <div className="col-span-1 md:col-span-5 h-64 md:h-full relative overflow-hidden">
              <img 
                src={resolveMediaUrl('images/vetes_fusta.jpeg')} 
                alt="Vetes i textura de fusta natural Mínim Món" 
                className="w-full h-full object-cover object-center scale-105 hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-primary/40 to-primary"></div>
            </div>

            {/* Contingut Poètic i Explicatiu */}
            <div className="col-span-1 md:col-span-7 p-8 md:p-12 space-y-6">
              <span className="font-label-sm text-xs text-amber-200 uppercase tracking-[0.25em] font-semibold block">
                Manifest d'Originalitat
              </span>
              
              <blockquote className="font-serif text-2xl md:text-3xl font-light italic leading-snug text-amber-100 border-l-2 border-amber-200/40 pl-4 py-1">
                “{currentQuote.quote}”
              </blockquote>

              <div className="space-y-4 text-sm text-amber-50/85 font-medium leading-relaxed pt-2">
                <p>
                  A <em>Mínim Món</em> entenem que cada fusta té la seva pròpia empremta digital. Les vetes, els matisos i els petits nusos naturals no són imperfeccions, sinó la prova irrefutable que cap peça serà mai igual a una altra.
                </p>
                <p>
                  Defugim la producció en massa en sèrie. La nostra filosofia neix del respecte absolut per l'origen del material i la voluntat d'atorgar una identitat irrepetible a cada creació que surt del taller.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Gallery */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-24">
        <div className="mb-12">
          <span className="font-label-sm text-label-sm text-outline uppercase tracking-[0.2em] mb-2 block font-semibold">Metodologia</span>
          <h2 className="font-headline-lg text-headline-lg text-primary font-serif text-3xl md:text-4xl">Del Paper a la Mà</h2>
        </div>

        {/* Bento Grid Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[260px] gap-4">
          <div className="col-span-1 md:col-span-8 row-span-2 relative rounded-lg overflow-hidden group">
            <img 
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" 
              alt="Hands sanding walnut wood" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuATlMvrymVixbRTKYrJgUorSJ9CmW5czZp8lR8A77UFb65Ao2ShDnDarkDgRPEofAnVN0WGSijaLOgFx49758y2ESPEXj7-B4sGodxQNJaIl9xn6HKBsx8o1vjyy0flbN-pWTJItID32W3AUjqJQ3h5aN1JL-l_3REbpHj00a0HksU6vRzawX3etstaNZ15oLskEaeL9ud45iPLtj5UEGVJHuXIi10kaHIdlxzu4FUlX4vRZra23dW5pQ" 
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500"></div>
          </div>

          <div className="col-span-1 md:col-span-4 row-span-1 relative rounded-lg overflow-hidden group">
            <img 
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" 
              alt="Laser engraver" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCo6dnvZCwAgahQbmPOUB957j14_bxYNT-OEEyq_XA5TCj-HUWyMuLci8YP6oE6o2OVUcKfk4LLHT_6m9UQWWt0gjcgECGk4G58G8b6ACwWbL6SJLku9rQchPcytVw3Od5nXiL-MssJlK2pKSX0Nn0TELmcLejIa2wm3jCN5P-TvbpWiq7ryKOHMN2nGmcBFDL89UkDKF_GJJhOY1RCbCZiKKWbH9M4J4nbnSbxvzoiY8v6NkyHxoyaUg" 
            />
          </div>

          <div className="col-span-1 md:col-span-4 row-span-1 relative rounded-lg overflow-hidden group">
            <img 
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" 
              alt="3D printer and tools" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGvDi8O4KFLwsim2JMhZdhQYHmnW6NaMhp0IVIgdRINa1N2EX1I5k2_VHuo4-yUPZNul4c0M_OSn7Nvx55PDFZvSahJY12Rwrgl8D7ULPO1h1yo1SFGVAekLYozdbw4iZUPPhTLHR1CLpNs-YTF2x0sGxKvh7REkx5gFXKc3rz_3PylCJgkHp2-uK801JWh61Cc10thKgJToqgMXpxdpM4_GsB5uXe4ThtBCaMy_vRsFJaJN26044RJA" 
            />
          </div>
        </div>
      </section>

      {/* Technical Precision */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="border-t border-outline/20 pt-16 grid grid-cols-1 md:grid-cols-2 gap-gutter items-start">
          <h2 className="font-headline-lg text-headline-lg text-primary font-serif text-3xl md:text-4xl leading-tight">
            68 Anys<br /><span className="text-outline">d'Experiència</span>
          </h2>
          <div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
              La mestria tècnica no és un fi en si mateix, sinó el llenguatge a través del qual s'expressa la visió artística. Dècades de dedicació al disseny industrial atorguen la capacitat de resoldre problemes complexos amb solucions aparentment senzilles.
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Cada decisió, des de la selecció del tall de la fusta fins a l'aplicació del vernís final, està guiada per una perspectiva suau i respectuosa amb el material, cercant sempre l'harmonia i la bellesa funcional.
            </p>
            <div className="mt-8">
              <button 
                onClick={() => { setActiveTab('contacte'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-primary text-on-primary px-8 py-3.5 rounded-xl font-body-md hover:bg-primary-container transition-colors shadow-md cursor-pointer"
              >
                Parlem del teu projecte
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
