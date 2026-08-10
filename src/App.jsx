import React, { useState } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('inici');
  const [catalogResetKey, setCatalogResetKey] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [legalTitle, setLegalTitle] = useState(null);

  const handleSelectTab = (tabId) => {
    if (tabId === 'regals' && activeTab === 'regals') {
      setCatalogResetKey(prev => prev + 1);
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <BudgetProvider>
      <div className="min-h-screen flex flex-col relative bg-surface text-on-surface">
      {/* Texture overlay */}
      <div className="fixed inset-0 wood-texture-overlay z-0 pointer-events-none"></div>

      {/* Header */}
      <Header activeTab={activeTab} setActiveTab={handleSelectTab} />

      {/* Main Content Area */}
      <main className="flex-grow z-10">
        {activeTab === 'inici' && (
          <IniciSection 
            setActiveTab={handleSelectTab} 
            onSelectProject={(project) => setSelectedProject(project)} 
          />
        )}

        {activeTab === 'mons' && (
          <MonsMinimsSection 
            setActiveTab={handleSelectTab}
            onSelectProject={(project) => setSelectedProject(project)} 
          />
        )}

        {activeTab === 'regals' && (
          <RegalsCatalogSection 
            setActiveTab={handleSelectTab} 
            catalogResetKey={catalogResetKey}
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

        {activeTab === 'privat' && (
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
  );
}
