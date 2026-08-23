import React from 'react';
import { Sparkles, MessageSquare, Compass, ArrowRight } from 'lucide-react';

export default function Hero({ onOpenWizard }) {
  return (
    <section className="hero-section">
      <div className="hero-background">
        <div className="hero-overlay"></div>
        <img src="/images/hero.jpg" alt="Taller Mínim Món diorama en miniatura" className="hero-img" />
      </div>

      <div className="container hero-container">
        <div className="hero-badge badge badge-laser mb-4">
          <Sparkles size={14} />
          <span>Atelier privat de precisió i calidesa</span>
        </div>

        <h1 className="hero-title">
          Mons en miniatura que simbolitzen una essència, gravats en fusta.
        </h1>

        <p className="hero-description">
          No són simples maquetes. Són petites recreacions d'espais, idees o vivències singulars que intenten capturar un esperit. Creats peça a peça amb marcatge làser, impressió 3D de detall i la calidesa de materials naturals.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onOpenWizard}>
            <MessageSquare size={18} />
            <span>Dissenyem el teu Món</span>
          </button>
          <a href="#mons-miniatura" className="btn btn-secondary">
            <span>Explorar projectes</span>
            <ArrowRight size={16} />
          </a>
        </div>

        <div className="hero-highlights grid-3">
          <div className="highlight-card glass-panel">
            <div className="highlight-icon">01</div>
            <div>
              <h4 className="highlight-title font-serif">Essència en Miniatura</h4>
              <p className="highlight-text">Escenaris simbòlics que transmeten un record, una professió o un estat d'ànim.</p>
            </div>
          </div>

          <div className="highlight-card glass-panel">
            <div className="highlight-icon">02</div>
            <div>
              <h4 className="highlight-title font-serif">Fusta i Làser de Precisió</h4>
              <p className="highlight-text">Gravats d'alta resolució sobre fustes nobles amb la calidesa de l'acabat manual.</p>
            </div>
          </div>

          <div className="highlight-card glass-panel">
            <div className="highlight-icon">03</div>
            <div>
              <h4 className="highlight-title font-serif">Diàleg i Personalització</h4>
              <p className="highlight-text">Parlar amb tu per entendre què vols crear és tan valuós com el resultat final.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding-top: 7rem;
          padding-bottom: 5rem;
          overflow: hidden;
        }

        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
        }

        .hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: brightness(0.8) contrast(1.05);
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, 
            rgba(18, 16, 14, 0.35) 0%, 
            rgba(18, 16, 14, 0.5) 60%, 
            var(--bg-dark) 100%
          );
          z-index: 2;
        }

        .hero-container {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .hero-title {
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 700;
          color: var(--color-wood-light);
          line-height: 1.15;
          max-width: 960px;
          margin-top: 1rem;
          margin-bottom: 1.5rem;
          text-shadow: 0 4px 20px rgba(0,0,0,0.6);
        }

        .hero-description {
          font-size: 1.15rem;
          color: var(--text-secondary);
          max-width: 720px;
          margin-bottom: 2.5rem;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          gap: 1.25rem;
          margin-bottom: 4.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .hero-highlights {
          width: 100%;
          max-width: 1100px;
        }

        .highlight-card {
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          text-align: left;
        }

        .highlight-icon {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--color-laser-bright);
          background: rgba(231, 111, 81, 0.1);
          padding: 0.4rem 0.6rem;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(231, 111, 81, 0.2);
        }

        .highlight-title {
          font-size: 1.05rem;
          color: var(--color-wood-light);
          margin-bottom: 0.35rem;
        }

        .highlight-text {
          font-size: 0.88rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </section>
  );
}
