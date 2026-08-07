import React from 'react';
import { WORKSHOP_INFO } from '../data/mockData';
import { Cpu, Wrench, Heart, Compass, CheckCircle } from 'lucide-react';

export default function AboutWorkshop() {
  return (
    <section id="el-taller" className="section bg-dark-alt">
      <div className="container">
        <div className="grid-2 align-center">
          <div className="workshop-img-container glass-panel">
            <img src="/images/workshop.jpg" alt="Taller Mínim Món de marcatge làser i fusta" className="workshop-img" />
            <div className="workshop-experience-badge glass-panel font-mono">
              <div className="exp-icon">
                <Compass size={22} className="text-laser" />
              </div>
              <div>
                <span className="exp-title">Llarga experiència professional</span>
                <span className="exp-sub">Disseny Industrial · Programació · Làser</span>
              </div>
            </div>
          </div>

          <div className="workshop-text-side">
            <div className="badge badge-laser mb-2">
              <span>L'Artesà i la Filosofia</span>
            </div>

            <h2 className="section-title font-serif text-left">
              Un petit taller on cada línia gravada té un sentit.
            </h2>

            <p className="workshop-paragraph lead-p">
              {WORKSHOP_INFO.experienceSummary}
            </p>

            <p className="workshop-paragraph">
              {WORKSHOP_INFO.philosophy}
            </p>

            <div className="infrastructure-box glass-panel mt-4">
              <h4 className="infra-title font-serif">
                <Wrench size={16} className="text-amber" />
                <span>Infraestructura i eines de treball</span>
              </h4>
              <ul className="infra-list">
                {WORKSHOP_INFO.machinery.map((item, i) => (
                  <li key={i}>
                    <CheckCircle size={14} className="text-laser" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .align-center {
          align-items: center;
        }

        .text-left {
          text-align: left;
        }

        .workshop-img-container {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          padding: 0.5rem;
        }

        .workshop-img {
          width: 100%;
          height: 480px;
          object-fit: cover;
          border-radius: var(--radius-md);
        }

        .workshop-experience-badge {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          right: 2rem;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(18, 16, 14, 0.88);
          border: 1px solid var(--border-active);
        }

        .exp-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(231, 111, 81, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .exp-title {
          display: block;
          font-size: 0.95rem;
          color: var(--color-wood-light);
          font-weight: 600;
        }

        .exp-sub {
          display: block;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .lead-p {
          font-size: 1.1rem;
          color: var(--color-wood-medium);
          font-weight: 500;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .workshop-paragraph {
          color: var(--text-secondary);
          line-height: 1.7;
          margin-bottom: 1rem;
        }

        .infrastructure-box {
          padding: 1.25rem;
          background: rgba(212, 163, 115, 0.05);
        }

        .infra-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-wood-light);
          font-size: 1rem;
          margin-bottom: 0.75rem;
        }

        .infra-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .infra-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .workshop-img {
            height: 340px;
          }
        }
      `}</style>
    </section>
  );
}
