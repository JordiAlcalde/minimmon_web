import fs from 'fs';

const content = fs.readFileSync('src/components/PrivateAreaSection.jsx', 'utf8');
const lines = content.split('\n');

console.log("=== OCURRÈNCIES A PrivateAreaSection.jsx ===");
lines.forEach((line, idx) => {
  if (line.includes('Regals / Productes') || 
      line.includes('regal al web') || 
      line.includes('(Regal)') || 
      line.includes('de regal)') ||
      line.includes('nom del regal') ||
      line.includes('primer regal')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
