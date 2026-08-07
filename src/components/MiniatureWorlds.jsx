import React, { useState } from 'react';
import { MINIATURE_WORLDS } from '../data/mockData';
import ProjectModal from './ProjectModal';
import { Sparkles, Eye, Info, HelpCircle } from 'lucide-react';

export default function MiniatureWorlds({ onOpenWizard }) {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <section id="mons-miniatura" className="section bg-dark-alt">
      <div className="container">
        <div className="badge badge-laser mx-auto mb-2 display-badge">
          <Sparkles size={14} />
          <span>Obres de Petit Format</span>
        </div>
        
        <h2 className="section-title font-serif">Móns en Miniatura</h2>
        <div className="laser-line-accent"></div>
        
        <p className="section-subtitle">
          Cada peça és un petit univers tallat i gravat en fusta. No busquen ser maquetes hiperrealistes, sinó escenaris que evoquen una essència, una idea o un record estimat.
        </p>

        <div className="grid-3">
          {MINIATURE_WORLDS.map((project) => (
            <div 
              key={project.id} 
              className="world-card glass-panel hover-lift"
              onClick={() => setSelectedProject(project)}
            >
              <div className="card-img-wrapper">
                <img src={project.image} alt={project.title} className="card-img" />
                <div className="card-img-badge font-mono">
                  {project.dimensions}
                </div>
                <div className="card-hover-overlay">
                  <span className="btn btn-primary btn-sm">
                    <Eye size={16} />
                    <span>Descobreix els detalls</span>
                  </span>
                </div>
              </div>

              <div className="card-content">
                <h3 className="card-title font-serif">{project.title}</h3>
                <p className="card-subtitle">{project.subtitle}</p>

                <div className="card-why-preview">
                  <div className="why-preview-header font-serif">
                    <HelpCircle size={14} className="text-amber" />
                    <span>El perquè dels detalls:</span>
                  </div>
                  <ul className="why-preview-list">
                    {project.whyDetails.slice(0, 2).map((d, i) => (
                      <li key={i}>• {d.title}</li>
                    ))}
                  </ul>
                </div>

                <div className="card-footer">
                  <span className="text-muted-xs font-mono">
                    {project.materials.slice(0, 2).join(' · ')}
                  </span>
                  <button className="btn-link-amber">
                    <span>Veure història</span>
                    <Info size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProjectModal 
        project={selectedProject} 
        onClose={() => setSelectedProject(null)}
        onOpenWizard={onOpenWizard}
      />

      <style>{`
        .bg-dark-alt {
          background-color: rgba(22, 19, 16, 0.6);
        }

        .display-badge {
          display: table;
          margin-left: auto;
          margin-right: auto;
        }

        .world-card {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
        }

        .card-img-wrapper {
          position: relative;
          height: 240px;
          overflow: hidden;
        }

        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .world-card:hover .card-img {
          transform: scale(1.06);
        }

        .card-img-badge {
          position: absolute;
          bottom: 0.8rem;
          right: 0.8rem;
          background: rgba(18, 16, 14, 0.85);
          color: var(--color-wood-medium);
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          border: 1px solid var(--border-subtle);
        }

        .card-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(18, 16, 14, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .world-card:hover .card-hover-overlay {
          opacity: 1;
        }

        .btn-sm {
          padding: 0.6rem 1.1rem;
          font-size: 0.85rem;
        }

        .card-content {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .card-title {
          font-size: 1.35rem;
          color: var(--color-wood-light);
          margin-bottom: 0.4rem;
        }

        .card-subtitle {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 1.2rem;
        }

        .card-why-preview {
          background: rgba(212, 163, 115, 0.06);
          border: 1px solid rgba(212, 163, 115, 0.12);
          border-radius: var(--radius-sm);
          padding: 0.85rem;
          margin-bottom: 1.2rem;
          margin-top: auto;
        }

        .why-preview-header {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          color: var(--color-amber-accent);
          margin-bottom: 0.35rem;
        }

        .why-preview-list {
          list-style: none;
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .text-muted-xs {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .btn-link-amber {
          background: none;
          border: none;
          color: var(--color-amber-accent);
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          cursor: pointer;
        }

        .btn-link-amber:hover {
          text-decoration: underline;
        }
      `}</style>
    </section>
  );
}
