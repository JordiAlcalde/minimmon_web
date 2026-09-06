import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNdiZmlhYEAvMDsJWiD8XW-cAQJwQ_Er8",
  authDomain: "minimmon-web.firebaseapp.com",
  projectId: "minimmon-web",
  storageBucket: "minimmon-web.firebasestorage.app",
  messagingSenderId: "28312425135",
  appId: "1:28312425135:web:c6f515c618cc7f37df3a5a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_PROJECT_IDS = [
  'esperit-masia',
  'records-mar',
  'llum-ombra',
  'essencia-vida',
  'taller-oblidat',
  'visions-emporda'
];

const MOCK_TITLES = [
  "L'esperit de la Masia",
  "Records de Mar",
  "Llum i Ombra",
  "L'Essència d'una Vida",
  "El Taller Oblidat",
  "Visions de l'Empordà"
];

async function run() {
  const snap = await getDocs(collection(db, "projectes"));
  console.log(`Trobat un total de ${snap.size} projectes a Firestore 'projectes':\n`);

  for (const d of snap.docs) {
    const data = d.data();
    const titol = data.titol || data.title || data.nom || '';
    const isMock = MOCK_PROJECT_IDS.includes(d.id) || MOCK_TITLES.some(m => titol.toLowerCase().includes(m.toLowerCase()));

    console.log(`- ID: "${d.id}" | Títol: "${titol}" | Mock?: ${isMock ? 'SI (ESBORRANT)' : 'NO (MANTENIR)'}`);

    if (isMock) {
      await deleteDoc(doc(db, "projectes", d.id));
      console.log(`  -> Esborrat document "${d.id}" correctament.`);
    }
  }

  console.log("\nVerificant projectes restants a Firestore:");
  const snapAfter = await getDocs(collection(db, "projectes"));
  snapAfter.docs.forEach(d => {
    console.log(`  * ${d.id}: "${d.data().titol || d.data().title || d.data().nom}"`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error("Error executant script:", e);
  process.exit(1);
});
