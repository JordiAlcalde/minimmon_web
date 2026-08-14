// Col·lecció de Frases Solemnes i Filosofia de Mínim Món
export const PHILOSOPHICAL_QUOTES = [
  {
    id: 'quote-1',
    quote: "La repetició és el verí de l'originalitat.",
    author: "Mínim Món",
    context: "Filosofia del taller i l'artesania única"
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
