function generateShuffledDeck(length, lastElement = null) {
  const deck = Array.from({ length }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (lastElement !== null && deck.length > 1 && deck[0] === lastElement) {
    const swapIdx = 1 + Math.floor(Math.random() * (deck.length - 1));
    [deck[0], deck[swapIdx]] = [deck[swapIdx], deck[0]];
  }
  return deck;
}

// Test 10,000 cycles of length 10
let totalCycles = 10000;
let last = null;
let consecutiveDuplicates = 0;
let invalidSetSize = 0;

for (let c = 0; c < totalCycles; c++) {
  const deck = generateShuffledDeck(10, last);
  
  // Check all 10 unique
  const set = new Set(deck);
  if (set.size !== 10) invalidSetSize++;

  // Check boundary
  if (last !== null && deck[0] === last) {
    consecutiveDuplicates++;
  }

  last = deck[deck.length - 1];
}

console.log('Results over 10,000 cycles:');
console.log('Invalid sets (duplicates within a cycle):', invalidSetSize);
console.log('Boundary consecutive duplicates (last of cycle == first of next):', consecutiveDuplicates);
