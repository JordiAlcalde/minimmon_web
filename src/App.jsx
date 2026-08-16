import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import IniciSection from './components/IniciSection';
import MonsMinimsSection from './components/MonsMinimsSection';
import RegalsCatalogSection from './components/RegalsCatalogSection';
import ElTallerSection from './components/ElTallerSection';
import ContacteSection from './components/ContacteSection';
import PrivateAreaSection from './components/PrivateAreaSection';
import ProjectModal from './components/ProjectModal';
import LegalModal from './components/LegalModal';
import { FloatingWhatsApp } from './components/WhatsAppButton';
import { BudgetProvider } from './context/BudgetContext';
import BudgetDrawer from './components/BudgetDrawer';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { STITCH_PROJECTS } from './data/stitchData';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error global de renderitzat:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface text-on-surface">
          <div className="max-w-xl w-full bg-surface-container-lowest p-8 rounded-2xl border border-error/30 shadow-xl text-center space-y-4">
            <h2 className="font-serif text-xl font-semibold text-primary">S'ha produït un error de lectura de dades</h2>
            <p className="text-xs text-on-surface-variant">
              Hi ha hagut un detall de dades incompatible al navegar per aquesta secció.
            </p>
            {this.state.error && (
              <div className="text-left bg-error/5 p-4 rounded-xl border border-error/20 space-y-2 overflow-hidden">
                <p className="font-mono text-xs font-bold text-error">{this.state.error.message || String(this.state.error)}</p>
                {this.state.error.stack && (
                  <pre className="font-mono text-[10px] text-error/80 overflow-x-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer shadow-md"
            >
              Recarregar la pàgina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('inici');
  const [catalogResetKey, setCatalogResetKey] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [legalTitle, setLegalTitle] = useState(null);

  useEffect(() => {
    // Gestió d'enllaços directes per a màrqueting (?projecte=... / ?producte=... / ?seccio=...)
    const processDeepLink = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      const projectId = urlParams.get('projecte') || (hash.startsWith('#projecte-') ? hash.replace('#projecte-', '') : null);
      const productId = urlParams.get('producte') || (hash.startsWith('#producte-') ? hash.replace('#producte-', '') : null);
      const seccioParam = urlParams.get('seccio') || (hash.startsWith('#seccio-') ? hash.replace('#seccio-', '') : null);

      if (projectId) {
        setActiveTab('mons');
        // Netejar hash per evitar que popstate o actualitzacions d'estat posteriors re-executin la navegació
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        try {
          const docRef = doc(db, "projectes", projectId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSelectedProject({ id: docSnap.id, ...docSnap.data() });
          } else {
            const found = STITCH_PROJECTS.find(p => p.id === projectId);
            if (found) setSelectedProject(found);
          }
        } catch (e) {
          const found = STITCH_PROJECTS.find(p => p.id === projectId);
          if (found) setSelectedProject(found);
        }
      } else if (productId) {
        setActiveTab('regals');
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        setTimeout(() => {
          const el = document.getElementById(`producte-${productId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-primary/50', 'transition-all');
            setTimeout(() => el.classList.remove('ring-4', 'ring-primary/50'), 3500);
          }
        }, 600);
      } else if (seccioParam) {
        setActiveTab(seccioParam);
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    };

    processDeepLink();
    window.addEventListener('popstate', processDeepLink);
    return () => window.removeEventListener('popstate', processDeepLink);
  }, []);

  const handleSelectTab = (tabId) => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (tabId === 'regals' && activeTab === 'regals') {
      setCatalogResetKey(prev => prev + 1);
    } else {
      setActiveTab(tabId);
    }
  };

  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  return (
    <GlobalErrorBoundary>
      <BudgetProvider>
        <div className="min-h-screen flex flex-col relative bg-surface text-on-surface">
        {/* Texture overlay */}
        <div className="fixed inset-0 wood-texture-overlay z-0 pointer-events-none"></div>

        {/* Header */}
        <Header 
          activeTab={activeTab} 
          setActiveTab={handleSelectTab} 
          catalogSearchQuery={catalogSearchQuery}
          setCatalogSearchQuery={setCatalogSearchQuery}
        />

        {/* Main Content Area */}
        <main className="flex-grow z-10">
        {activeTab === 'inici' && (
          <IniciSection 
            setActiveTab={handleSelectTab} 
            onSelectProject={(project, opts) => setSelectedProject(project ? { ...project, ...(opts || {}) } : null)} 
          />
        )}

        {activeTab === 'mons' && (
          <MonsMinimsSection 
            setActiveTab={handleSelectTab}
            onSelectProject={(project, opts) => setSelectedProject(project ? { ...project, ...(opts || {}) } : null)} 
          />
        )}

        {activeTab === 'regals' && (
          <RegalsCatalogSection 
            setActiveTab={handleSelectTab} 
            catalogResetKey={catalogResetKey}
            catalogSearchQuery={catalogSearchQuery}
            setCatalogSearchQuery={setCatalogSearchQuery}
          />
        )}

        {activeTab === 'taller' && (
          <ElTallerSection 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'contacte' && (
          <ContacteSection />
        )}

        {(activeTab === 'privat' || activeTab === 'privada') && (
          <PrivateAreaSection setActiveTab={setActiveTab} />
        )}
      </main>

      {/* Footer */}
      <Footer 
        setActiveTab={setActiveTab} 
        onOpenLegal={(title) => setLegalTitle(title)} 
      />

      {/* Modals */}
      <ProjectModal 
        project={selectedProject} 
        onClose={() => setSelectedProject(null)} 
        setActiveTab={setActiveTab}
      />

      <LegalModal 
        title={legalTitle} 
        onClose={() => setLegalTitle(null)} 
      />

      {/* Floating WhatsApp Button */}
      <FloatingWhatsApp />

      {/* Budget Cart Drawer */}
      <BudgetDrawer />
    </div>
    </BudgetProvider>
    </GlobalErrorBoundary>
  );
}
