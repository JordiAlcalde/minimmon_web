// Catàleg mestre inicial de tasques per al taller (Projectes i Productes)
export const INITIAL_MESTRE_TASQUES = [
  // Tasques de Projectes
  { id: 'task_disseny_3d', tipus: 'projecte', nom: 'Estudi previ i Disseny 3D / CAD', descripcio: 'Modelat 3D, presa de mides, renderitzat i validació de proporcions' },
  { id: 'task_prototip', tipus: 'projecte', nom: 'Prototipatge inicial', descripcio: 'Proves d\'escala, assajos d\'encaixos i validació estructural' },
  { id: 'task_mecanitzat', tipus: 'projecte', nom: 'Mecanitzat Làser / CNC / Fusteria', descripcio: 'Tall, gravat, fresat i preparació de peces de fusta i materials' },
  { id: 'task_muntatge', tipus: 'projecte', nom: 'Muntatge, Ajust i Encolat', descripcio: 'Encaix de peces, encolat de precisió i integració de components' },
  { id: 'task_electricitat', tipus: 'projecte', nom: 'Instal·lació elèctrica / Il·luminació LED', descripcio: 'Cablejat, soldadures, micro-LEDs i interruptors' },
  { id: 'task_acabats', tipus: 'projecte', nom: 'Acabats, Poliment i Pintura', descripcio: 'Poliment fi, vernissos, tints, pàtines i detalls manuals' },
  { id: 'task_qualitat', tipus: 'projecte', nom: 'Control de Qualitat i Embalatge', descripcio: 'Revisió final de detalls, prova de llums i protecció per al lliurament' },

  // Tasques de Productes de Catàleg
  { id: 'task_concepte', tipus: 'producte', nom: 'Conceptualització i Disseny per a Fabricació', descripcio: 'Adaptació del model per a optimització de material i temps de sèrie' },
  { id: 'task_fitxer_matriu', tipus: 'producte', nom: 'Creació de Matrius i Fitxers de Producció', descripcio: 'Parametrització de talls làser, optimització de plans de tall (nesting)' },
  { id: 'task_mostra_zero', tipus: 'producte', nom: 'Fabricació de Mostra Zero', descripcio: 'Elaboració de la primera unitat de sèrie per cronometratge i validació' },
  { id: 'task_ajust_parametres', tipus: 'producte', nom: 'Ajust de Paràmetres de Maquinària i Utillatges', descripcio: 'Creació de plantilles de muntatge ràpid i calibratge d\'eines' },
  { id: 'task_guia_muntatge', tipus: 'producte', nom: 'Elaboració de Guia de Muntatge i Escandall Final', descripcio: 'Documentació del mètode de fabricació i tancament d\'escandall' }
];

export const DEFAULT_TASKS_PROJECTE = INITIAL_MESTRE_TASQUES.filter(t => t.tipus === 'projecte');
export const DEFAULT_TASKS_PRODUCTE = INITIAL_MESTRE_TASQUES.filter(t => t.tipus === 'producte');

// Helper per formatar dates en format DD-MM-AAAA
export function formatDateDMY(dateInput) {
  if (!dateInput) return '';
  try {
    const str = String(dateInput).trim();
    // Si ve en format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.substring(0, 10).split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Si és una data vàlida
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return str;
  } catch (e) {
    return String(dateInput);
  }
}

// Helper per formatar segons a format HH:MM:SS
export function formatSecondsToHMS(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Helper per formatar segons a format llegible "Xh Ym" o "Xm Ys"
export function formatSecondsHuman(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

// Helper per generar IDs únics nets
export function generateProjeccId(prefix = 'proj') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${randomStr}`;
}

// Helper per comprimir imatges client-side abans de desar a Firestore
export function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.65) {
  return new Promise((resolve) => {
    // Si no és una imatge, retornem com a DataURL directament
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar com JPEG comprimit
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        resolve(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
