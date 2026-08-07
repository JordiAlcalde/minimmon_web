import React, { useState } from 'react';
import { GIFT_PRODUCTS } from '../data/mockData';
import { Gift, Sliders, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

export default function GiftsCatalog({ onOpenWizard }) {
  const [activeFilter, setActiveFilter] = useState('Tots');

  const categories = ['Tots', 'Clauers', 'Punts de llibre', 'Pins i Complements', 'Marcs de fotos'];

  const filteredProducts = activeFilter === 'Tots' 
    ? GIFT_PRODUCTS 
    : GIFT_PRODUCTS.filter(p => p.subcategory === activeFilter);

  return (
    <section id="regals" className="section">
      <div className="container">
        <div className="badge badge-laser display-badge mb-2">
          <Gift size={14} />
          <span>Detalls Artesans</span>
        </div>

        <h2 className="section-title font-serif">Catàleg de Regals Personalitzables</h2>
        <div className="laser-line-accent"></div>

        <p className="section-subtitle">
          Petites peces de tall i gravat làser en fustes seleccionades. Clauers, pins, punts de llibre o marcs. Tot és adaptable: gravats personalitzats, frases o formes úniques.
        </p>

        {/* Filter bar */}
        <div className="filter-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="gift-card glass-panel">
              <div className="gift-img-side">
                <img src={product.image} alt={product.title} className="gift-img" />
                <div className="gift-badge-custom font-mono">
                  <Sparkles size={12} />
                  100% Personalitzable
                </div>
              </div>

              <div className="gift-info-side">
                <div className="gift-category font-mono">{product.subcategory}</div>
                <h3 className="gift-title font-serif">{product.title}</h3>
                <p className="gift-desc">{product.description}</p>

                <div className="gift-options">
                  <span className="options-title">Opcions de personalització:</span>
                  <ul className="options-list">
                    {product.customizableOptions.map((opt, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={13} className="text-laser" />
                        <span>{opt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="gift-actions">
                  <button 
                    className="btn btn-outline-amber w-full"
                    onClick={() => onOpenWizard(product.title)}
                  >
                    <MessageSquare size={16} />
                    <span>Personalitza aquesta peça</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .filter-bar {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          background: rgba(28, 25, 22, 0.6);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 0.6rem 1.25rem;
          border-radius: 50px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .filter-btn:hover {
          color: var(--color-wood-light);
          border-color: var(--color-wood-medium);
        }

        .filter-btn.active {
          background: rgba(231, 111, 81, 0.15);
          color: var(--color-laser-bright);
          border-color: var(--color-laser-glow);
          font-weight: 600;
        }

        .gift-card {
          display: flex;
          overflow: hidden;
          height: 100%;
        }

        .gift-img-side {
          position: relative;
          width: 40%;
          min-width: 180px;
        }

        .gift-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .gift-badge-custom {
          position: absolute;
          top: 0.8rem;
          left: 0.8rem;
          background: rgba(18, 16, 14, 0.85);
          backdrop-filter: blur(6px);
          color: var(--color-amber-accent);
          border: 1px solid rgba(233, 196, 106, 0.3);
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-sm);
          font-size: 0.72rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .gift-info-side {
          padding: 1.5rem;
          width: 60%;
          display: flex;
          flex-direction: column;
        }

        .gift-category {
          font-size: 0.75rem;
          color: var(--color-laser-bright);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .gift-title {
          font-size: 1.25rem;
          color: var(--color-wood-light);
          margin-bottom: 0.6rem;
          line-height: 1.3;
        }

        .gift-desc {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 1.2rem;
        }

        .gift-options {
          background: rgba(212, 163, 115, 0.05);
          border-radius: var(--radius-sm);
          padding: 0.85rem;
          margin-bottom: 1.2rem;
          margin-top: auto;
        }

        .options-title {
          display: block;
          font-size: 0.78rem;
          color: var(--color-wood-medium);
          font-weight: 600;
          margin-bottom: 0.4rem;
        }

        .options-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .options-list li {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .w-full {
          width: 100%;
        }

        @media (max-width: 768px) {
          .gift-card {
            flex-direction: column;
          }
          .gift-img-side {
            width: 100%;
            height: 200px;
          }
          .gift-info-side {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
