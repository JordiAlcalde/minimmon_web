import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { Star, MessageSquare, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { sendTelegramCommentNotification } from '../utils/telegramUtils';

export function StarRating({ rating = 5, size = "w-4 h-4", interactive = false, onSelect = () => {} }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-0.5 select-none">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = interactive ? (hoverRating || rating) >= star : rating >= star;
        return (
          <button
            key={star}
            type={interactive ? "button" : "button"}
            disabled={!interactive}
            onClick={() => interactive && onSelect(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`transition-transform ${interactive ? 'cursor-pointer hover:scale-110 p-0.5' : 'cursor-default'}`}
          >
            <Star
              className={`${size} ${
                active
                  ? 'fill-amber-500 text-amber-500'
                  : 'fill-transparent text-outline/40'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function CommentsSection({ targetId, targetType = 'peça', targetTitol = '', defaultOpen = false, autoOpenForm = false }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(autoOpenForm || defaultOpen);
  const [isExpanded, setIsExpanded] = useState(defaultOpen || autoOpenForm);

  // Form states
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (autoOpenForm || defaultOpen) {
      setShowForm(true);
      setIsExpanded(true);
    }
  }, [autoOpenForm, defaultOpen]);

  useEffect(() => {
    if (!targetId) return;

    // Carregar valoracions d'aquest target
    const q = query(
      collection(db, "valoracions"),
      where("targetId", "==", String(targetId))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allVals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtrar només aprovades per al públic
      const approvedVals = allVals.filter(v => v.estat === 'aprovat');
      
      // Ordenar per data més recent
      approvedVals.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
      
      setComments(approvedVals);
      setLoading(false);
    }, (err) => {
      console.warn("Error carregant valoracions:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetId]);

  const totalReviews = comments.length;
  const avgRating = totalReviews > 0
    ? (comments.reduce((acc, c) => acc + (Number(c.puntuacio) || 5), 0) / totalReviews).toFixed(1)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    const cleanAutor = author.trim() || 'Anònim';

    try {
      const newDoc = {
        targetId: String(targetId),
        targetType: targetType,
        targetTitol: targetTitol || 'Peça Mínim Món',
        autor: cleanAutor,
        puntuacio: Number(rating) || 5,
        comentari: commentText.trim(),
        estat: 'pendent',
        data: new Date().toISOString()
      };

      await addDoc(collection(db, "valoracions"), newDoc);

      // Notificar a Telegram instantàniament
      sendTelegramCommentNotification({
        autor: cleanAutor,
        puntuacio: rating,
        comentari: commentText.trim(),
        targetTitol: targetTitol || 'Peça Mínim Món',
        targetType: targetType
      });

      setSubmitting(false);
      setSubmittedSuccess(true);
      setCommentText('');
      setAuthor('');
      setTimeout(() => {
        setSubmittedSuccess(false);
        setShowForm(false);
      }, 4000);
    } catch (err) {
      console.error("Error guardant valoració:", err);
      alert("No s'ha pogut enviar la valoració. Torna-ho a intentar.");
      setSubmitting(false);
    }
  };

  return (
    <div id="seccio-comentaris" className="space-y-3 pt-4 border-t border-outline/15">
      {/* Capçalera resum i desglòs d'estrelles */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-surface-container/40 p-3 rounded-xl border border-outline/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <MessageSquare className="w-4 h-4" />
          </div>

          {totalReviews > 0 ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">{avgRating}</span>
              <StarRating rating={Math.round(Number(avgRating))} size="w-3.5 h-3.5" />
              <span className="text-xs text-on-surface-variant font-mono">({totalReviews} {totalReviews === 1 ? 'valoració' : 'valoracions'})</span>
            </div>
          ) : (
            <span className="text-xs text-on-surface-variant font-mono">
              Sigues el primer en valorar aquesta peça.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalReviews > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary hover:text-primary-container font-mono flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline/20 hover:bg-surface transition-all cursor-pointer"
            >
              <span>{isExpanded ? 'Ocultar opinions' : 'Veure opinions'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => { setShowForm(!showForm); setIsExpanded(true); }}
            className="text-xs bg-primary text-on-primary hover:bg-primary-container px-3 py-1.5 rounded-lg font-mono transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <span>{showForm ? 'Cancel·lar' : 'Deixar una opinió'}</span>
          </button>
        </div>
      </div>

      {/* Formulari d'enviament de valoració */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface p-4 rounded-xl border border-primary/30 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex flex-col gap-1.5 pb-2 border-b border-outline/10">
            <div>
              <span className="text-xs text-on-surface-variant font-sans block">
                La teva opinió sobre la peça
              </span>
              {targetTitol && (
                <span className="text-xs font-bold text-primary font-sans block mt-0.5">
                  {targetTitol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-xs text-on-surface-variant font-sans">Puntuació:</span>
              <StarRating rating={rating} size="w-5 h-5" interactive onSelect={setRating} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="El teu nom o àlies (ex: Maria S.)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline/25 rounded-lg px-3 py-2 text-xs text-primary outline-none focus:border-primary font-sans"
            />
          </div>

          <textarea
            rows={3}
            required
            placeholder="Escriu la teva experiència o comentari sobre la peça..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline/25 rounded-lg px-3 py-2 text-xs text-primary outline-none focus:border-primary font-sans resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-on-surface-variant/70 font-mono">
              * Les valoracions es revisen abans de ser visibles públicament.
            </p>
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="bg-primary text-on-primary hover:bg-primary-container px-4 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Enviant...' : 'Enviar opinió'}</span>
            </button>
          </div>

          {submittedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-700 font-mono flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Gràcies per la teva valoració! S'ha enviat correctament i es publicarà un cop revisada.</span>
            </div>
          )}
        </form>
      )}

      {/* Llista de comentaris aprovats */}
      {isExpanded && comments.length > 0 && (
        <div className="space-y-2.5 pt-1 animate-fadeIn">
          {comments.map((item) => (
            <div key={item.id} className="p-3 bg-surface border border-outline/15 rounded-xl space-y-1.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary font-body-md">{item.autor || 'Anònim'}</span>
                  <StarRating rating={Number(item.puntuacio) || 5} size="w-3 h-3" />
                </div>
                {item.data && (
                  <span className="text-[10px] text-on-surface-variant/60 font-mono">
                    {new Date(item.data).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant leading-relaxed font-sans italic">
                "{item.comentari}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
