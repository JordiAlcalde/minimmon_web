import React from 'react';
import { 
  ArrowLeft, Printer, Download, Clock, Calendar, User, 
  FileText, CheckCircle2, Image as ImageIcon 
} from 'lucide-react';
import { formatSecondsToHMS, formatSecondsHuman, formatDateDMY } from '../../data/projeccInitialData';

export function ProjeccReportView({ item, isDark, onBack }) {
  if (!item) return null;

  const tasks = Array.isArray(item.tasques) ? item.tasques : [];
  
  // Càlculs de totals
  let grandTotalSeconds = 0;
  let totalSessions = 0;
  tasks.forEach(t => {
    const sList = Array.isArray(t.sessions) ? t.sessions : [];
    sList.forEach(s => {
      grandTotalSeconds += Number(s.duradaSegons) || 0;
      totalSessions += 1;
    });
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Barra de controls superior (Oculta en imprimir) */}
      <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto print:hidden">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300' : 'bg-white hover:bg-slate-200 text-slate-700 shadow-sm'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tornar</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Descarregar PDF</span>
        </button>
      </div>

      {/* Document Imprimible (Full A4 / PDF) */}
      <div className="max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        
        {/* Capçalera del document */}
        <header className="border-b-2 border-amber-600 pb-6 mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-700 font-bold">
              Mínim Món · Taller de Miniatures i Projectes
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-1">
              Informe de Control de Desenvolupament
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                item.tipus === 'projecte' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {item.tipus === 'projecte' ? 'Projecte a Mida' : 'Producte de Catàleg'}
              </span>
              <span className="text-xs text-slate-500">
                Estat: <strong className="uppercase">{item.estat || 'En curs'}</strong>
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <div>Data informe: <strong>{new Date().toLocaleDateString('ca-ES')}</strong></div>
            <div>Ref: <strong>{item.id}</strong></div>
          </div>
        </header>

        {/* Dades del Projecte/Producte */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs">
          <div>
            <div className="text-slate-500 font-semibold">Nom de la Gestió:</div>
            <div className="text-base font-bold text-slate-900 font-serif">
              {item.nomDefinitiu || item.nomProvisional || item.nom}
            </div>
            {item.nomProvisional && item.nomDefinitiu && item.nomProvisional !== item.nomDefinitiu && (
              <div className="text-slate-500 text-[11px]">
                (Nom provisional original: {item.nomProvisional})
              </div>
            )}
          </div>

          <div className="space-y-1">
            {item.nomClient && (
              <div>
                <span className="text-slate-500">Client: </span>
                <strong className="text-slate-800">{item.nomClient}</strong>
              </div>
            )}
            {item.dataInici && (
              <div>
                <span className="text-slate-500">Data d'inici: </span>
                <strong className="text-slate-800">{formatDateDMY(item.dataInici)}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-500">Temps Total de Desenvolupament: </span>
              <strong className="text-amber-700 font-mono text-sm">{formatSecondsToHMS(grandTotalSeconds)}</strong> ({formatSecondsHuman(grandTotalSeconds)})
            </div>
          </div>

          {item.notes && (
            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Notes Generals:</span>
              <p className="text-slate-700 italic">{item.notes}</p>
            </div>
          )}
        </section>

        {/* Taula de Tasques i Sessions */}
        <section className="space-y-4 mb-8">
          <h2 className="text-base font-bold font-serif text-slate-900 border-b pb-1.5 flex items-center justify-between">
            <span>Desglossament de Tasques i Sessions de Treball</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              Total {totalSessions} sessions
            </span>
          </h2>

          <div className="space-y-4">
            {tasks.map((task, tIdx) => {
              const sessions = Array.isArray(task.sessions) ? task.sessions : [];
              const taskTotal = sessions.reduce((acc, s) => acc + (Number(s.duradaSegons) || 0), 0);

              return (
                <div key={task.id || tIdx} className="border rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between font-semibold text-slate-800 border-b">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {tIdx + 1}
                      </span>
                      <span>{task.nom}</span>
                    </div>
                    <div className="font-mono text-amber-800 font-bold">
                      {formatSecondsToHMS(taskTotal)}
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="p-3 text-slate-400 italic text-[11px]">
                      Sense sessions registrades per aquesta tasca.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-slate-50 text-[10px] text-slate-500 uppercase">
                          <th className="py-1.5 px-3">Sessió</th>
                          <th className="py-1.5 px-3">Data</th>
                          <th className="py-1.5 px-3">Horari</th>
                          <th className="py-1.5 px-3">Durada</th>
                          <th className="py-1.5 px-3">Notes & Comentaris d'Operari</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sessions.map((sess, sIdx) => (
                          <tr key={sess.id || sIdx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-semibold text-slate-600">#{sIdx + 1}</td>
                            <td className="py-2 px-3 text-slate-700">{formatDateDMY(sess.data) || '-'}</td>
                            <td className="py-2 px-3 text-slate-600">{sess.horaInici || '-'} {sess.horaFi ? `a ${sess.horaFi}` : ''}</td>
                            <td className="py-2 px-3 font-mono font-bold text-amber-700">{formatSecondsToHMS(sess.duradaSegons)}</td>
                            <td className="py-2 px-3 text-slate-700 italic max-w-xs">{sess.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Galeria de Fotos de Procés i Mostres */}
        {((Array.isArray(item.mostresClient) && item.mostresClient.length > 0) || 
          tasks.some(t => Array.isArray(t.sessions) && t.sessions.some(s => Array.isArray(s.fotos) && s.fotos.length > 0))) && (
          <section className="space-y-3 pt-4 border-t border-slate-200 page-break-inside-avoid">
            <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-600" />
              Documentació Fotogràfica
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {/* Fotos del client */}
              {Array.isArray(item.mostresClient) && item.mostresClient.map((foto, idx) => (
                <div key={`cli_${idx}`} className="border rounded-lg overflow-hidden bg-slate-50 text-center p-1">
                  <img src={typeof foto === 'string' ? foto : foto.url} alt="Mostra client" className="w-full h-24 object-cover rounded" />
                  <span className="text-[9px] text-slate-500 block mt-1">Mostra Client #{idx + 1}</span>
                </div>
              ))}

              {/* Fotos de sessions de procés */}
              {tasks.map(t => 
                (t.sessions || []).map(s => 
                  (s.fotos || []).map((foto, fIdx) => (
                    <div key={`proc_${t.id}_${s.id}_${fIdx}`} className="border rounded-lg overflow-hidden bg-slate-50 text-center p-1">
                      <img src={typeof foto === 'string' ? foto : foto.url} alt="Foto procés" className="w-full h-24 object-cover rounded" />
                      <span className="text-[9px] text-slate-500 block mt-1 truncate" title={t.nom}>{t.nom}</span>
                    </div>
                  ))
                )
              )}
            </div>
          </section>
        )}

        {/* Peu de pàgina del document */}
        <footer className="mt-10 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <div>Mínim Món - Departament de Producció i Taller</div>
          <div>Pàgina generada automàticament per Projecc</div>
        </footer>

      </div>

    </div>
  );
}
