import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  Building2, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  Edit3, 
  Trash2, 
  Palette, 
  Eye, 
  EyeOff,
  Globe, 
  Mail, 
  Phone, 
  Info,
  Package,
  Layers,
  Sparkles,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { 
  DEFAULT_CLIENT_PALETTE, 
  generateSlugFromName, 
  isValidClientSlug, 
  buildClientPortalUrl,
  resolveClientLogoUrl
} from '../utils/clientPortalsUtils';

export default function ClientsPortalsManager({
  clients = [],
  products = [],
  onEditProduct = null,
  onManageTaxonomy = null,
  setActiveModule = null
}) {
  const [editingClient, setEditingClient] = useState(null); // null = list, {} = form
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [slugError, setSlugError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Comptador de productes per a cada client
  const getProductCountForClient = (clientId, clientSlug) => {
    return products.filter(p => 
      (p.clientId && p.clientId === clientId) || 
      (p.clientSlug && p.clientSlug === clientSlug)
    ).length;
  };

  const handleCopyLink = (slug) => {
    const url = buildClientPortalUrl(slug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleOpenForm = (client = null) => {
    setSlugError('');
    if (client) {
      setEditingClient({
        ...client,
        etiquetaLogo: client.etiquetaLogo !== undefined ? client.etiquetaLogo : 'Col·lecció Exclusiva',
        etiquetaSuperior: client.etiquetaSuperior !== undefined ? client.etiquetaSuperior : 'Fusta de til·ler seleccionada & precisió làser · Artesania Mínim Món',
        titolCapcalera: client.titolCapcalera !== undefined ? client.titolCapcalera : (client.nomComercial || ''),
        titolInfoComanda: client.titolInfoComanda !== undefined ? client.titolInfoComanda : (client.nomComercial ? `Tramitació directa amb ${client.nomComercial}:` : ''),
        peuContingut: client.peuContingut || '',
        peuCol1Titol: client.peuCol1Titol || '',
        peuCol1Text: client.peuCol1Text || '',
        peuCol2Titol: client.peuCol2Titol || '',
        peuCol2Text: client.peuCol2Text || '',
        peuCol3Titol: client.peuCol3Titol || '',
        peuCol3Text: client.peuCol3Text || '',
        peuCopyright: client.peuCopyright !== undefined ? client.peuCopyright : `© ${new Date().getFullYear()} ${client.nomComercial || ''} · Col·lecció Exclusiva`,
        peuCredit: client.peuCredit !== undefined ? client.peuCredit : 'Artesania en fusta de til·ler per Mínim Món',
        colors: {
          ...DEFAULT_CLIENT_PALETTE,
          ...(client.colors || {})
        }
      });
    } else {
      setEditingClient({
        id: `cp_${Date.now()}`,
        nomComercial: '',
        slug: '',
        logoUrl: '',
        etiquetaLogo: 'Col·lecció Exclusiva',
        etiquetaSuperior: 'Fusta de til·ler seleccionada & precisió làser · Artesania Mínim Món',
        titolCapcalera: '',
        subtitolCapcalera: '',
        descripcioCapcalera: '',
        emailContacte: '',
        telefonContacte: '',
        titolInfoComanda: '',
        infoComanda: 'Els pagaments i condicions d\'enviament d\'aquesta col·lecció exclusiva es gestionen directament amb la marca.',
        peuContingut: '',
        peuCol1Titol: '',
        peuCol1Text: '',
        peuCol2Titol: '',
        peuCol2Text: '',
        peuCol3Titol: '',
        peuCol3Text: '',
        peuCopyright: '',
        peuCredit: 'Artesania en fusta de til·ler per Mínim Món',
        colors: { ...DEFAULT_CLIENT_PALETTE },
        actiu: true,
        dataCreacio: new Date().toISOString()
      });
    }
  };

  const handleSlugChange = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    setEditingClient(prev => ({ ...prev, slug: clean }));
    if (!isValidClientSlug(clean)) {
      setSlugError('L\'slug ha de tenir entre 2 i 60 caràcters alfanumèrics (lletres, números, guió o subratllat) i no pot ser una paraula reservada del sistema.');
    } else {
      // Comprovar duplicitat d'slug
      const exists = clients.some(c => c.slug === clean && c.id !== editingClient.id);
      if (exists) {
        setSlugError('Aquest slug ja està en ús per un altre client.');
      } else {
        setSlugError('');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingClient.nomComercial?.trim()) {
      alert('Si us plau, indica el nom del client o entitat.');
      return;
    }

    const finalSlug = (editingClient.slug || generateSlugFromName(editingClient.nomComercial)).trim();
    if (!isValidClientSlug(finalSlug)) {
      setSlugError('L\'slug no és vàlid. Revisa que només contingui lletres, números o guió.');
      return;
    }

    const isDuplicate = clients.some(c => c.slug === finalSlug && c.id !== editingClient.id);
    if (isDuplicate) {
      setSlugError('Aquest slug ja està en ús per un altre client.');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'clients_portals', editingClient.id);
      const dataToSave = {
        ...editingClient,
        slug: finalSlug,
        nomComercial: editingClient.nomComercial.trim(),
        etiquetaLogo: String(editingClient.etiquetaLogo ?? '').trim(),
        etiquetaSuperior: String(editingClient.etiquetaSuperior ?? '').trim(),
        titolCapcalera: String(editingClient.titolCapcalera ?? '').trim(),
        subtitolCapcalera: String(editingClient.subtitolCapcalera ?? '').trim(),
        descripcioCapcalera: String(editingClient.descripcioCapcalera ?? '').trim(),
        emailContacte: String(editingClient.emailContacte ?? '').trim(),
        telefonContacte: String(editingClient.telefonContacte ?? '').trim(),
        titolInfoComanda: String(editingClient.titolInfoComanda ?? '').trim(),
        infoComanda: String(editingClient.infoComanda ?? '').trim(),
        peuContingut: String(editingClient.peuContingut ?? '').trim(),
        peuCol1Titol: String(editingClient.peuCol1Titol ?? '').trim(),
        peuCol1Text: String(editingClient.peuCol1Text ?? '').trim(),
        peuCol2Titol: String(editingClient.peuCol2Titol ?? '').trim(),
        peuCol2Text: String(editingClient.peuCol2Text ?? '').trim(),
        peuCol3Titol: String(editingClient.peuCol3Titol ?? '').trim(),
        peuCol3Text: String(editingClient.peuCol3Text ?? '').trim(),
        peuCopyright: String(editingClient.peuCopyright ?? '').trim(),
        peuCredit: String(editingClient.peuCredit ?? '').trim(),
        logoUrl: String(editingClient.logoUrl ?? '').trim(),
        colors: editingClient.colors || DEFAULT_CLIENT_PALETTE,
        actiu: editingClient.actiu !== false,
        dataActualitzacio: new Date().toISOString()
      };

      await setDoc(docRef, dataToSave, { merge: true });
      setEditingClient(null);
    } catch (err) {
      console.error('Error desant el client exclusiu:', err);
      alert('Error al desar les dades: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (client) => {
    const count = getProductCountForClient(client.id, client.slug);
    const confirmMsg = count > 0 
      ? `Aquest client té ${count} producte(s) assignat(s). Si l'elimines, aquests productes quedaran orfes i no seran visibles al portal. Segur que vols eliminar ${client.nomComercial}?`
      : `Vols eliminar definitivament el portal de ${client.nomComercial}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, 'clients_portals', client.id));
      if (editingClient?.id === client.id) setEditingClient(null);
    } catch (err) {
      console.error('Error eliminant client:', err);
      alert('Error en eliminar: ' + err.message);
    }
  };

  const filteredClients = clients.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.nomComercial && c.nomComercial.toLowerCase().includes(term)) ||
      (c.slug && c.slug.toLowerCase().includes(term)) ||
      (c.emailContacte && c.emailContacte.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Capçalera del mòdul */}
      <div className="bg-surface-container-lowest p-5 md:p-6 rounded-2xl border border-outline/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-primary">Clients & Portals Exclusius</h2>
              <p className="text-xs text-on-surface-variant">
                Gestiona espais personalitzats per a marques i clients amb productes exclusius fora del catàleg obert de Mínim Món.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editingClient && (
            <button
              onClick={() => handleOpenForm()}
              className="px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nou Client Exclusiu</span>
            </button>
          )}
        </div>
      </div>

      {/* FORMULARI DE CREACIÓ / EDICIÓ */}
      {editingClient ? (
        <form onSubmit={handleSave} className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-primary/30 shadow-md space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center pb-4 border-b border-outline/15">
            <div>
              <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-lg">
                {editingClient.slug ? `/?${editingClient.slug}` : 'Nou Portal'}
              </span>
              <h3 className="font-serif text-xl text-primary font-semibold mt-1">
                {clients.some(c => c.id === editingClient.id) ? `Editar Portal: ${editingClient.nomComercial}` : 'Crear Nou Portal de Client'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-xs text-on-surface-variant hover:text-primary px-3 py-2 bg-surface border border-outline/20 rounded-xl cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="submit"
                disabled={isSaving || !!slugError}
                className="px-5 py-2 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary text-xs font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Desant...' : 'Desar Client'}</span>
              </button>
            </div>
          </div>

          {/* Dades Bàsiques: Nom i Slug d'Accés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-bold text-primary mb-1">
                Nom del Client / Marca *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ajuntament de Mataró"
                value={editingClient.nomComercial || ''}
                onChange={(e) => {
                  const name = e.target.value;
                  setEditingClient(prev => ({
                    ...prev,
                    nomComercial: name,
                    // Si és nou i no ha escrit un slug a mà, sincronitzar slug automàtic
                    slug: prev.slug === '' || prev.slug === generateSlugFromName(prev.nomComercial)
                      ? generateSlugFromName(name)
                      : prev.slug
                  }));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline/25 text-sm font-semibold text-primary focus:border-primary outline-none"
              />
              <span className="text-[11px] text-on-surface-variant">Nom que identificarà el client a Mínim Món i a la seva capçalera.</span>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-primary mb-1 flex items-center justify-between">
                <span>URL Directa d'Accés (?slug) *</span>
                {editingClient.slug && (
                  <span className="font-mono text-[10px] text-primary/70">
                    https://minimmon.cat/?{editingClient.slug}
                  </span>
                )}
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-surface-container text-on-surface-variant text-xs font-mono rounded-l-xl border border-r-0 border-outline/25">
                  /?
                </span>
                <input
                  type="text"
                  required
                  placeholder="ajuntament-mataro"
                  value={editingClient.slug || ''}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-r-xl bg-surface border border-outline/25 text-sm font-mono font-bold text-primary focus:border-primary outline-none"
                />
              </div>
              {slugError ? (
                <p className="text-[11px] text-error font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{slugError}</span>
                </p>
              ) : (
                <span className="text-[11px] text-on-surface-variant">L'enllaç net amb el qual el client i els seus usuaris accediran al seu espai.</span>
              )}
            </div>
          </div>

          {/* Logo del Client (Fitxer Local a public/images/clients/ o public/images/) */}
          <div className="bg-surface p-4 rounded-xl border border-outline/15 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-bold text-primary flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-primary" />
                <span>Logotip del Client (Fitxer Local a public/images/clients/)</span>
              </label>
              <span className="text-[10px] font-mono text-outline">
                Carpeta: \public\images\clients\
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="nom-fitxer.png (ex: ajuntament.png o /images/clients/ajuntament.png)"
                  value={editingClient.logoUrl || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, logoUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline/25 text-xs text-primary font-mono focus:border-primary outline-none"
                />
                <p className="text-[11px] text-on-surface-variant mt-1.5 leading-tight">
                  📁 Desa el fitxer (PNG o SVG transparent) al teu ordinador a:<br />
                  <code className="text-primary font-bold">
                    c:\Antigravity\MínimMón\public\images\clients\{editingClient.logoUrl ? editingClient.logoUrl.replace(/^\/images\/(clients\/)?/, '') : 'el-teu-logo.png'}
                  </code>
                </p>
              </div>

              {editingClient.logoUrl ? (
                <div className="w-28 h-14 shrink-0 bg-white dark:bg-black/20 p-1.5 rounded-xl border border-outline/20 flex items-center justify-center overflow-hidden shadow-2xs">
                  <img 
                    src={resolveClientLogoUrl(editingClient.logoUrl)} 
                    alt="Logo Client" 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      if (parent && !parent.querySelector('.err-badge')) {
                        const span = document.createElement('span');
                        span.className = 'err-badge text-[9px] text-amber-700 dark:text-amber-400 font-mono text-center leading-tight';
                        span.innerText = 'Pendent de desar a images/clients/';
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-28 h-14 shrink-0 bg-surface-container rounded-xl border border-dashed border-outline/30 flex items-center justify-center text-[10px] text-outline text-center p-2">
                  Sense fitxer de logo
                </div>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Es mostrarà a la capçalera de la seva pàgina privada en lloc del logotip general de Mínim Món.
            </p>
          </div>

          {/* Textos i Etiquetes de la Capçalera i del Banner (Editables i Opcionals) */}
          <div className="bg-surface p-4 rounded-xl border border-outline/15 space-y-4">
            <div className="flex items-center justify-between border-b border-outline/10 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="text-xs uppercase font-bold text-primary">Etiquetes i Textos de la Capçalera (Editables i Opcionals)</h4>
              </div>
              <span className="text-[10px] font-mono text-on-surface-variant">
                Deixa en blanc qualsevol camp per ocultar-lo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Etiqueta sota el Nom al Logo (Barra Superior) — Opcional
                </label>
                <input
                  type="text"
                  placeholder="Ex: Col·lecció Exclusiva (deixa buit per ocultar)"
                  value={editingClient.etiquetaLogo ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, etiquetaLogo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Píndola / Etiqueta Superior del Banner — Opcional
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fusta de til·ler seleccionada & precisió làser (deixa buit per ocultar)"
                  value={editingClient.etiquetaSuperior ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, etiquetaSuperior: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Títol Principal del Banner — Opcional
                </label>
                <input
                  type="text"
                  placeholder="Ex: Little Spider Homes (deixa buit per ocultar)"
                  value={editingClient.titolCapcalera ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, titolCapcalera: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs font-semibold text-primary focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Subtítol del Banner — Opcional
                </label>
                <input
                  type="text"
                  placeholder="Ex: Terrarios artesanales (deixa buit per ocultar)"
                  value={editingClient.subtitolCapcalera ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, subtitolCapcalera: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                Descripció / Missatge de Benvinguda — Opcional
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Benvinguts al portal exclusiu de productes dissenyats especialment per a la nostra comunitat..."
                value={editingClient.descripcioCapcalera ?? ''}
                onChange={(e) => setEditingClient({ ...editingClient, descripcioCapcalera: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary focus:border-primary outline-none resize-y"
              />
            </div>
          </div>

          {/* Dades de Contacte i Caixetí de Tramitació de Comandes */}
          <div className="bg-surface p-4 rounded-xl border border-outline/15 space-y-4">
            <div className="flex items-center justify-between border-b border-outline/10 pb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <h4 className="text-xs uppercase font-bold text-primary">Contacte i Caixetí d'Informació / Tramitació (Opcional)</h4>
              </div>
              <span className="text-[10px] font-mono text-on-surface-variant">
                Deixa buit per ocultar el caixetí
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Configura les dades de contacte i el caixetí d'avís sota el títol. Tant el títol negreta com el text són editables i opcionals.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Email per rebre sol·licituds / comandes</span>
                </label>
                <input
                  type="email"
                  placeholder="comandes@client.cat"
                  value={editingClient.emailContacte || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, emailContacte: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary font-mono focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>Telèfon / WhatsApp de contacte</span>
                </label>
                <input
                  type="text"
                  placeholder="+34 600 000 000"
                  value={editingClient.telefonContacte || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, telefonContacte: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary font-mono focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Títol del Caixetí d'Informació / Tramitació — Opcional
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tramitació directa amb la marca: (deixa buit per ocultar el títol)"
                  value={editingClient.titolInfoComanda ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, titolInfoComanda: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs font-semibold text-primary focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Text del Caixetí d'Informació / Instruccions de Comanda — Opcional
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Els pagaments i condicions d'enviament es gestionen directament amb la marca (deixa buit per ocultar)."
                  value={editingClient.infoComanda ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, infoComanda: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary focus:border-primary outline-none resize-y"
                />
              </div>
            </div>
          </div>

          {/* Peu de Pàgina Configurable (Footer) */}
          <div className="bg-surface p-4 rounded-xl border border-outline/15 space-y-4">
            <div className="flex items-center justify-between border-b border-outline/10 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h4 className="text-xs uppercase font-bold text-primary">Peu de Pàgina del Portal (Editable i Opcional)</h4>
              </div>
              <span className="text-[10px] font-mono text-on-surface-variant">
                Admet negreta (**text**) i salts de línia
              </span>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                Contingut General / Text Principal del Peu de Pàgina — Opcional
              </label>
              <textarea
                rows={3}
                placeholder="Escriu aquí la informació general, condicions, adreça, xarxes socials o text del peu de pàgina..."
                value={editingClient.peuContingut ?? ''}
                onChange={(e) => setEditingClient({ ...editingClient, peuContingut: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary focus:border-primary outline-none resize-y"
              />
            </div>

            {/* 3 Columnes opcionals per estructurar el peu */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((colNum) => {
                const titolKey = `peuCol${colNum}Titol`;
                const textKey = `peuCol${colNum}Text`;
                return (
                  <div key={colNum} className="p-3 rounded-lg bg-surface-container/50 border border-outline/15 space-y-2">
                    <label className="block text-[10px] uppercase font-mono font-bold text-primary">
                      Columna {colNum} del Peu (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder={`Títol columna ${colNum}...`}
                      value={editingClient[titolKey] ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, [titolKey]: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface border border-outline/20 text-xs font-semibold text-primary focus:border-primary outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder={`Contingut columna ${colNum}...`}
                      value={editingClient[textKey] ?? ''}
                      onChange={(e) => setEditingClient({ ...editingClient, [textKey]: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface border border-outline/20 text-xs text-primary focus:border-primary outline-none resize-y"
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Línia Inferior Esquerra (Copyright) — Opcional
                </label>
                <input
                  type="text"
                  placeholder={`Ex: © ${new Date().getFullYear()} ${editingClient.nomComercial || 'Client'}`}
                  value={editingClient.peuCopyright ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, peuCopyright: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs font-mono text-primary focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-on-surface-variant mb-1">
                  Línia Inferior Dreta (Segell / Crèdit) — Opcional
                </label>
                <input
                  type="text"
                  placeholder="Ex: Artesania en fusta de til·ler per Mínim Món (deixa buit per ocultar)"
                  value={editingClient.peuCredit ?? ''}
                  onChange={(e) => setEditingClient({ ...editingClient, peuCredit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/25 text-xs text-primary focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Paleta de Colors Corporatius */}
          <div className="bg-surface p-4 rounded-xl border border-outline/15 space-y-4">
            <div className="flex items-center justify-between border-b border-outline/10 pb-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h4 className="text-xs uppercase font-bold text-primary">Paleta de Colors Corporativa</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(prev => ({ ...prev, colors: { ...DEFAULT_CLIENT_PALETTE } }))}
                className="text-[11px] text-primary/70 hover:text-primary underline cursor-pointer"
              >
                Restablir per defecte
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-mono text-outline mb-1">Color Primari</label>
                <div className="flex items-center gap-2 bg-surface-container p-2 rounded-lg border border-outline/20">
                  <input
                    type="color"
                    value={editingClient.colors?.primary || DEFAULT_CLIENT_PALETTE.primary}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), primary: e.target.value }
                    })}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={editingClient.colors?.primary || DEFAULT_CLIENT_PALETTE.primary}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), primary: e.target.value }
                    })}
                    className="w-full text-xs font-mono font-bold uppercase bg-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-outline mb-1">Contenidor / Píndoles</label>
                <div className="flex items-center gap-2 bg-surface-container p-2 rounded-lg border border-outline/20">
                  <input
                    type="color"
                    value={editingClient.colors?.primaryContainer || DEFAULT_CLIENT_PALETTE.primaryContainer}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), primaryContainer: e.target.value }
                    })}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={editingClient.colors?.primaryContainer || DEFAULT_CLIENT_PALETTE.primaryContainer}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), primaryContainer: e.target.value }
                    })}
                    className="w-full text-xs font-mono font-bold uppercase bg-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-outline mb-1">Accent / Destacats</label>
                <div className="flex items-center gap-2 bg-surface-container p-2 rounded-lg border border-outline/20">
                  <input
                    type="color"
                    value={editingClient.colors?.accent || DEFAULT_CLIENT_PALETTE.accent}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), accent: e.target.value }
                    })}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={editingClient.colors?.accent || DEFAULT_CLIENT_PALETTE.accent}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), accent: e.target.value }
                    })}
                    className="w-full text-xs font-mono font-bold uppercase bg-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-outline mb-1">Fons Portal</label>
                <div className="flex items-center gap-2 bg-surface-container p-2 rounded-lg border border-outline/20">
                  <input
                    type="color"
                    value={editingClient.colors?.surface || DEFAULT_CLIENT_PALETTE.surface}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), surface: e.target.value }
                    })}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={editingClient.colors?.surface || DEFAULT_CLIENT_PALETTE.surface}
                    onChange={(e) => setEditingClient({
                      ...editingClient,
                      colors: { ...(editingClient.colors || DEFAULT_CLIENT_PALETTE), surface: e.target.value }
                    })}
                    className="w-full text-xs font-mono font-bold uppercase bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Previsualització en viu de la combinació de colors */}
            <div className="p-4 rounded-xl border border-outline/20 space-y-2" style={{ backgroundColor: editingClient.colors?.surface || DEFAULT_CLIENT_PALETTE.surface }}>
              <span className="text-[10px] uppercase font-mono text-outline block">Previsualització d'elements:</span>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  style={{ backgroundColor: editingClient.colors?.primary || DEFAULT_CLIENT_PALETTE.primary, color: '#ffffff' }}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl shadow-xs"
                >
                  Botó Principal
                </button>
                <span
                  style={{ backgroundColor: editingClient.colors?.primaryContainer || DEFAULT_CLIENT_PALETTE.primaryContainer, color: editingClient.colors?.primary || DEFAULT_CLIENT_PALETTE.primary }}
                  className="px-3 py-1 text-xs font-semibold rounded-lg"
                >
                  Píndola de Gamma
                </span>
                <span
                  style={{ color: editingClient.colors?.accent || DEFAULT_CLIENT_PALETTE.accent }}
                  className="font-mono text-sm font-bold"
                >
                  24,90 € (Accent)
                </span>
              </div>
            </div>
          </div>

          {/* Estat Actiu */}
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline/15">
            <label className="flex items-center gap-2.5 text-xs font-bold text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={editingClient.actiu !== false}
                onChange={(e) => setEditingClient({ ...editingClient, actiu: e.target.checked })}
                className="w-4 h-4 rounded text-primary"
              />
              <span>Portal Actiu i Operatiu</span>
            </label>
            <span className="text-[11px] text-on-surface-variant">
              {editingClient.actiu !== false ? 'Accessible a través de la URL' : 'Ocult temporalment'}
            </span>
          </div>

          {/* Botons d'acció inferiors */}
          <div className="flex items-center justify-between pt-4 border-t border-outline/15">
            {clients.some(c => c.id === editingClient.id) ? (
              <button
                type="button"
                onClick={() => handleDelete(editingClient)}
                className="px-3.5 py-2 text-xs text-error hover:bg-error/10 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Portal</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 bg-surface border border-outline/20 hover:bg-surface-container text-xs rounded-xl cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="submit"
                disabled={isSaving || !!slugError}
                className="px-6 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary text-xs font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Desant...' : 'Desar Portal de Client'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* LLISTAT DE CLIENTS */
        <div className="space-y-4">
          {/* Cercador */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Cercar client, slug o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-surface-container-lowest border border-outline/20 text-xs text-primary focus:border-primary outline-none"
              />
              <Building2 className="w-4 h-4 text-outline absolute left-3 top-2.5" />
            </div>

            <span className="text-xs text-on-surface-variant font-mono">
              Total: <strong>{clients.length}</strong> {clients.length === 1 ? 'client' : 'clients'}
            </span>
          </div>

          {filteredClients.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 rounded-2xl border border-outline/15 text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-primary">Cap client registrat</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Crea el primer portal exclusiu per a una empresa o client particular que vulgui tenir productes personalitzats i la seva pròpia pàgina d'accés.
              </p>
              <button
                onClick={() => handleOpenForm()}
                className="mt-2 px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-xl hover:bg-primary-container cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primer Client Exclusiu</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => {
                const prodCount = getProductCountForClient(client.id, client.slug);
                const portalUrl = buildClientPortalUrl(client.slug);
                const isCopied = copiedSlug === client.slug;

                return (
                  <div
                    key={client.id}
                    className="bg-surface-container-lowest rounded-2xl border border-outline/15 overflow-hidden shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-3">
                      {/* Capçalera de la targeta de client */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {client.logoUrl ? (
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-black/20 p-1 border border-outline/15 flex items-center justify-center shrink-0 overflow-hidden">
                              <img src={resolveClientLogoUrl(client.logoUrl)} alt={client.nomComercial} className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                          ) : (
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-2xs notranslate"
                              style={{ backgroundColor: client.colors?.primary || DEFAULT_CLIENT_PALETTE.primary }}
                              translate="no"
                            >
                              {(client.nomComercial || 'C').charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="truncate">
                            <h3 className="font-serif text-base font-bold text-primary truncate notranslate" translate="no">
                              {client.nomComercial}
                            </h3>
                            <span className="font-mono text-[11px] font-bold text-on-surface-variant flex items-center gap-1 notranslate" translate="no">
                              /?{client.slug}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 ${
                          client.actiu !== false 
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30' 
                            : 'bg-surface-container text-outline'
                        }`}>
                          {client.actiu !== false ? 'Actiu' : 'Ocult'}
                        </span>
                      </div>

                      {/* Descripció o subtítol */}
                      <p className="text-xs text-on-surface-variant line-clamp-2 min-h-[2rem]">
                        {client.subtitolCapcalera || client.descripcioCapcalera || 'Sense descripció definida.'}
                      </p>

                      {/* Informació de comandes i contacte */}
                      <div className="pt-2 border-t border-outline/10 space-y-1.5 text-[11px] text-on-surface-variant font-mono">
                        {client.emailContacte && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-outline shrink-0" />
                            <span className="truncate">{client.emailContacte}</span>
                          </div>
                        )}
                        {client.telefonContacte && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3.5 h-3.5 text-outline shrink-0" />
                            <span className="truncate">{client.telefonContacte}</span>
                          </div>
                        )}
                      </div>

                      {/* Paleta i Productes */}
                      <div className="flex items-center justify-between pt-2 border-t border-outline/10 text-xs">
                        <div className="flex items-center gap-1.5" title="Mostra de colors corporatius">
                          <span 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: client.colors?.primary || DEFAULT_CLIENT_PALETTE.primary }} 
                          />
                          <span 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: client.colors?.primaryContainer || DEFAULT_CLIENT_PALETTE.primaryContainer }} 
                          />
                          <span 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: client.colors?.accent || DEFAULT_CLIENT_PALETTE.accent }} 
                          />
                        </div>

                        <div className="flex items-center gap-1.5 font-bold text-primary">
                          <Package className="w-3.5 h-3.5 text-primary" />
                          <span>{prodCount} {prodCount === 1 ? 'producte' : 'productes'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Barra d'accions inferiors */}
                    <div className="p-3 bg-surface-container/40 border-t border-outline/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyLink(client.slug)}
                          className="px-2.5 py-1.5 text-xs bg-surface border border-outline/20 hover:bg-surface-container rounded-lg text-primary font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Copiar URL directa"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Copiat!' : 'Copiar enllaç'}</span>
                        </button>

                        <a
                          href={portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-xs bg-surface border border-outline/20 hover:bg-surface-container rounded-lg text-primary cursor-pointer transition-colors shadow-2xs"
                          title="Obrir portal en una nova pestanya"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        {onManageTaxonomy && (
                          <button
                            onClick={() => onManageTaxonomy(client.id)}
                            className="px-2.5 py-1.5 text-xs bg-surface border border-outline/20 hover:bg-surface-container rounded-lg text-primary font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Gestionar Famílies i Gammes d'aquest client"
                          >
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            <span className="hidden sm:inline">Grups</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenForm(client)}
                          className="px-3 py-1.5 text-xs bg-primary text-on-primary hover:bg-primary-container rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
