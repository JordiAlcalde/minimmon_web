import fs from 'fs';
import path from 'path';

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      walk(fullPath, results);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('src');
console.log("Cercant etiquetes de 'regal/producte' a src/...");
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('Regals / Productes') || 
        line.includes('Regals/Productes') ||
        line.includes('Nou Regal') ||
        line.includes('Nou Producte (Regal)') ||
        line.includes('de regal)') ||
        line.includes('Fitxa Estàndard de regal')) {
      console.log(`${f}:${idx + 1} -> ${line.trim()}`);
    }
  });
});
