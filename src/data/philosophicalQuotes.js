// Col·lecció de Frases Solemnes i Filosofia de Mínim Món
export const PHILOSOPHICAL_QUOTES = [
  {
    id: 'quote-1',
    quote: "La repetició és el verí de l'originalitat.",
    author: "Mínim Món",
    context: "Filosofia del taller i l'artesania única"
  },
  {
    id: 'quote-2',
    quote: "La veritat del resultat val més que la perfecció de la màquina.",
    author: "Mínim Món",
    context: "L'autenticitat del treball artesanal enfront de l'automatització frívola"
  }
];

/**
 * Obté una frase sollemne atzarosa de la col·lecció
 */
export function getRandomPhilosophicalQuote() {
  if (!PHILOSOPHICAL_QUOTES || PHILOSOPHICAL_QUOTES.length === 0) {
    return {
      quote: "La repetició és el verí de l'originalitat.",
      author: "Mínim Món"
    };
  }
  const idx = Math.floor(Math.random() * PHILOSOPHICAL_QUOTES.length);
  return PHILOSOPHICAL_QUOTES[idx];
}

/**
 * Obté la següent frase sollemne en ordre cíclic
 */
export function getNextPhilosophicalQuote(currentIndex = 0) {
  if (!PHILOSOPHICAL_QUOTES || PHILOSOPHICAL_QUOTES.length === 0) return null;
  const nextIndex = (currentIndex + 1) % PHILOSOPHICAL_QUOTES.length;
  return { quote: PHILOSOPHICAL_QUOTES[nextIndex], index: nextIndex };
}
