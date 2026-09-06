import React, { useState, useEffect } from 'react';
import { 
  Search, X, CheckCircle2, Clock, Truck, Package, Hammer, Calendar, 
  ExternalLink, Sparkles, MapPin, AlertCircle, RefreshCw, ChevronRight,
  ShieldCheck, Phone, Check
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { formatCurrency } from '../utils/numberUtils';

export default function OrderTrackingModal({ initialRef = '', isOpen, onClose }) {
  const [searchRef, setSearchRef] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (initialRef && isOpen) {
      setSearchRef(initialRef);
      fetchOrder(initialRef);
    }
  }, [initialRef, isOpen]);

  const fetchOrder = async (refToSearch) => {
    const cleaned = (refToSearch || '').trim();
    if (!cleaned) return;

    setLoading(true);
    setErrorMsg(null);
    setOrder(null);

    try {
      // Cercar a Firestore per codiReferencia o ID
      const q = query(
        collection(db, "pressupostos"), 
        where("codiReferencia", "==", cleaned)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        // Cercar si ha posat l'ID de document
        const qId = query(collection(db, "pressupostos"));
        const allSnap = await getDocs(qId);
        const match = allSnap.docs.find(d => 
          d.id.toLowerCase() === cleaned.toLowerCase() ||
          (d.data().codiReferencia && d.data().codiReferencia.toLowerCase() === cleaned.toLowerCase())
        );
        if (match) {
          setOrder({ id: match.id, ...match.data() });
        } else {
          setErrorMsg("No s'ha trobat cap comanda amb aquesta referència. Revisa que el codi sigui correcte.");
        }
      }
    } catch (err) {
      console.warn("Error consultant el seguiment de la comanda:", err);
      setErrorMsg("S'ha produït un error de connexió en consultar la comanda. Torna-ho a provar en uns instants.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrder(searchRef);
  };

  if (!isOpen) return null;

  // Càlcul de les fases del seguiment:
  // Estats possibles a Firestore: 'rebuda' | 'acceptada' | 'en_produccio' | 'acabat' | 'enviat' | 'lliurat'
  const estat = order?.estatComanda || (order?.estat === 'ates' ? 'acceptada' : 'rebuda');
  const isDelivery = order?.metodeLliurament !== 'recollida';
  const finalStageLabel = isDelivery ? 'Enviat' : 'Lliurat';
  const finalStageDesc = isDelivery 
    ? (order?.metodeLliurament === 'certificat' ? 'Correos Certificat' : 'Correos Ordinari') 
    : 'Entrega en mà acordada';

  // Índex de fase: 0: Rebuda/Pendent, 1: Acceptada, 2: En producció, 3: Acabat, 4: Enviat/Lliurat
  let currentStageIndex = 0;
  if (estat === 'acceptada') currentStageIndex = 1;
  else if (estat === 'en_produccio') currentStageIndex = 2;
  else if (estat === 'acabat') currentStageIndex = 3;
  else if (estat === 'enviat' || estat === 'lliurat') currentStageIndex = 4;

  // Càlcul de dies de producció previstos vs transcorreguts
  const diesPrevistos = Number(order?.diesFabricacioPrevistos || 0);
  let diesTranscorreguts = 0;
  let percentatgeProduccio = 0;

  if (order?.dataIniciProduccio) {
    const dataInici = new Date(order.dataIniciProduccio.seconds ? order.dataIniciProduccio.seconds * 1000 : order.dataIniciProduccio);
    const ara = order?.dataAcabat 
      ? new Date(order.dataAcabat.seconds ? order.dataAcabat.seconds * 1000 : order.dataAcabat)
      : new Date();
    
    const diffMs = Math.max(0, ara - dataInici);
    diesTranscorreguts = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (diesPrevistos > 0) {
    if (currentStageIndex >= 3) {
      percentatgeProduccio = 100;
    } else {
      percentatgeProduccio = Math.min(95, Math.round((diesTranscorreguts / diesPrevistos) * 100));
    }
  }

  // Estalvi de dies si s'ha acabat abans d'hora
  const diesReals = Number(order?.diesRealsFabricacio || diesTranscorreguts);
  const diesEstalviats = (currentStageIndex >= 3 && diesPrevistos > diesReals) ? (diesPrevistos - diesReals) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-surface text-on-surface rounded-2xl border border-outline/20 shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Capçalera del Modal */}
        <div className="p-6 bg-surface-container-lowest border-b border-outline/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-primary font-bold">Seguiment de la Comanda</h2>
              <p className="text-xs text-on-surface-variant">
                Consulta l'estat de fabricació i enviament en temps real
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            aria-label="Tancar seguiment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cercador de Comanda */}
        <div className="p-6 border-b border-outline/10 bg-surface/50">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60" />
              <input 
                type="text"
                placeholder="Ex: CDA-2026-1234 o el teu codi de referència..."
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline/25 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchRef.trim()}
              className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-body-md text-xs font-semibold hover:bg-primary-container transition-colors shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>Consultar</span>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-3 p-3 bg-error-container/20 border border-error/30 rounded-xl text-xs text-error flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Contingut de l'Ordre */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {order ? (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Targeta Resum de la Comanda */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline/15 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline/10 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                      Referència comanda
                    </span>
                    <strong className="font-mono text-base font-bold text-primary">
                      {order.codiReferencia || order.id}
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider block">
                      Data sol·licitud
                    </span>
                    <span className="text-xs font-mono text-primary font-medium">
                      {order.data ? new Date(order.data.seconds ? order.data.seconds * 1000 : order.data).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Client:</span>
                    <strong className="text-primary font-serif text-sm">{order.clientNom}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Lliurament:</span>
                    <strong className="text-primary">
                      {order.metodeLliurament === 'certificat' 
                        ? 'Correos Certificat' 
                        : order.metodeLliurament === 'ordinari' 
                          ? 'Correos Ordinari' 
                          : 'Recollida acordada'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Pagament:</span>
                    <strong className="text-primary capitalize">
                      {order.metodePagament === 'bizum' ? 'Bizum' : 'En recollir'}
                    </strong>
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      order.estatPagament === 'pagat' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {order.estatPagament === 'pagat' ? 'Pagat' : 'Pendent'}
                    </span>
                  </div>
                </div>

                {order.adrecaEnviament && (
                  <div className="pt-2 border-t border-outline/10 text-xs text-on-surface-variant flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      Adreça de tramesa: <strong>{order.adrecaEnviament.carrer}, {order.adrecaEnviament.codiPostal} {order.adrecaEnviament.poblacio}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Barra de Progrés Visual (4 Etapes) */}
              <div className="bg-surface-container p-6 rounded-2xl border border-outline/15 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm sm:text-base font-bold text-primary flex items-center gap-2">
                    <Hammer className="w-4 h-4 text-primary" />
                    <span>Estat del Procés</span>
                  </h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {estat === 'rebuda' && '1. Comanda Rebuda'}
                    {estat === 'acceptada' && '2. Comanda Acceptada'}
                    {estat === 'en_produccio' && '3. En Producció al Taller'}
                    {estat === 'acabat' && '4. Peces Acabades al Taller'}
                    {(estat === 'enviat' || estat === 'lliurat') && `5. ${finalStageLabel}`}
                  </span>
                </div>

                {/* Timeline visual de 4 passos */}
                <div className="relative">
                  {/* Línia de fons */}
                  <div className="absolute top-5 left-6 right-6 h-1 bg-outline/20 -translate-y-1/2 z-0 hidden sm:block"></div>
                  {/* Línia de progrés actiu */}
                  <div 
                    className="absolute top-5 left-6 h-1 bg-primary -translate-y-1/2 z-0 hidden sm:block transition-all duration-700"
                    style={{ 
                      width: currentStageIndex === 0 ? '0%' :
                             currentStageIndex === 1 ? '33%' :
                             currentStageIndex === 2 ? '66%' : '100%'
                    }}
                  ></div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2 relative z-10">
                    {/* Etapa 1: Acceptada */}
                    <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        currentStageIndex >= 1 
                          ? 'bg-primary text-on-primary shadow-md ring-4 ring-primary/20' 
                          : 'bg-surface border-2 border-outline/30 text-on-surface-variant'
                      }`}>
                        {currentStageIndex >= 1 ? <Check className="w-5 h-5" /> : '1'}
                      </div>
                      <div>
                        <strong className="text-xs block text-primary">Comanda Acceptada</strong>
                        <span className="text-[11px] text-on-surface-variant block">Validada pel taller</span>
                      </div>
                    </div>

                    {/* Etapa 2: En producció */}
                    <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        currentStageIndex >= 2 
                          ? 'bg-primary text-on-primary shadow-md ring-4 ring-primary/20' 
                          : 'bg-surface border-2 border-outline/30 text-on-surface-variant'
                      }`}>
                        {currentStageIndex > 2 ? <Check className="w-5 h-5" /> : <Hammer className="w-4 h-4" />}
                      </div>
                      <div>
                        <strong className="text-xs block text-primary">En Producció</strong>
                        <span className="text-[11px] text-on-surface-variant block">
                          {diesPrevistos > 0 ? `Previst: ~${diesPrevistos} dies` : 'Fabricació artesanal'}
                        </span>
                      </div>
                    </div>

                    {/* Etapa 3: Acabat */}
                    <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        currentStageIndex >= 3 
                          ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-500/20' 
                          : 'bg-surface border-2 border-outline/30 text-on-surface-variant'
                      }`}>
                        {currentStageIndex >= 3 ? <Check className="w-5 h-5" /> : <Sparkles className="w-4 h-4" />}
                      </div>
                      <div>
                        <strong className="text-xs block text-primary">Acabat</strong>
                        <span className="text-[11px] text-on-surface-variant block">Control de qualitat</span>
                      </div>
                    </div>

                    {/* Etapa 4: Enviat / Lliurat */}
                    <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        currentStageIndex >= 4 
                          ? 'bg-primary text-on-primary shadow-md ring-4 ring-primary/20' 
                          : 'bg-surface border-2 border-outline/30 text-on-surface-variant'
                      }`}>
                        {currentStageIndex >= 4 ? <Check className="w-5 h-5" /> : <Truck className="w-4 h-4" />}
                      </div>
                      <div>
                        <strong className="text-xs block text-primary">{finalStageLabel}</strong>
                        <span className="text-[11px] text-on-surface-variant block">{finalStageDesc}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-panell de Progrés de Fabricació (Dies previstos vs transcorreguts) */}
                {diesPrevistos > 0 && currentStageIndex >= 1 && (
                  <div className="bg-surface p-4 rounded-xl border border-outline/20 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>Dies de fabricació al taller:</span>
                      </span>
                      <span className="font-mono font-bold text-primary">
                        {currentStageIndex >= 3 
                          ? `${diesReals} de ${diesPrevistos} dies previstos`
                          : `Dia ${Math.min(diesTranscorreguts, diesPrevistos)} de ${diesPrevistos} dies previstos`
                        }
                      </span>
                    </div>

                    {/* Barra de progrés de fabricació */}
                    <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden p-0.5 border border-outline/15">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          currentStageIndex >= 3 ? 'bg-emerald-600' : 'bg-primary'
                        }`}
                        style={{ width: `${percentatgeProduccio}%` }}
                      ></div>
                    </div>

                    {/* Celebració si s'ha acabat abans d'hora */}
                    {diesEstalviats > 0 && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          <strong>Bones notícies!</strong> La comanda s'ha enllestit en <strong>{diesReals} {diesReals === 1 ? 'dia' : 'dies'}</strong> ({diesEstalviats} {diesEstalviats === 1 ? 'dia' : 'dies'} abans del previst 🎉).
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Caixa d'Enviament Correos amb Seguiment Oficial */}
                {order.numeroSeguimentCorreos && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-4 rounded-xl border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <strong className="text-xs text-primary uppercase tracking-wide">
                          Seguiment Oficial de Correos:
                        </strong>
                      </div>
                      <span className="font-mono font-bold text-sm text-primary bg-surface px-2 py-0.5 rounded border border-outline/20">
                        {order.numeroSeguimentCorreos}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant">
                      Pots seguir el paquet pas a pas al portal de Correos mitjançant el seu número d'enviament.
                    </p>

                    <a
                      href={`https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${encodeURIComponent(order.numeroSeguimentCorreos)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-1"
                    >
                      <span>Obrir Localitzador de Correos</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Llista de Peces de la Comanda */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-mono font-bold text-primary tracking-wider">
                  Articles de la comanda ({(order.productes || []).length}):
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(order.productes || []).map((prod, idx) => (
                    <div key={idx} className="p-3 bg-surface-container-lowest rounded-xl border border-outline/15 text-xs flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-primary text-sm">{prod.nom}</strong>
                          {prod.diesFabricacio ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              ~{prod.diesFabricacio} dies de taller
                            </span>
                          ) : null}
                          {prod.ofId && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              OF vinculada
                            </span>
                          )}
                        </div>
                        {prod.observacions && (
                          <p className="text-on-surface-variant italic text-[11px]">💬 {prod.observacions}</p>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg shrink-0">
                        x{prod.quantitat || 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : !loading && (
            <div className="py-12 text-center space-y-3">
              <Package className="w-12 h-12 text-outline/50 mx-auto" />
              <h3 className="font-serif text-lg text-primary font-semibold">Introdueix el teu codi de referència</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Trobaràs la referència al missatge de confirmació de la teva comanda (ex: CDA-2026-XXXX).
              </p>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 bg-surface-container-lowest border-t border-outline/15 flex items-center justify-between">
          <a
            href="https://wa.me/34699592326"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
          >
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span>Dubtes? Parla amb el Taller (699 592 326)</span>
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer"
          >
            Tancar
          </button>
        </div>

      </div>
    </div>
  );
}
