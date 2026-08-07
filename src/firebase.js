import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuració de Firebase per al projecte Mínim Món
// (Pots substituir els valors següents per les claus reals de la teva Consola de Firebase)
const firebaseConfig = {
  apiKey: "AIzaSy_CONFIGURA_LA_TEVA_API_KEY",
  authDomain: "minimmon-web.firebaseapp.com",
  projectId: "minimmon-web",
  storageBucket: "minimmon-web.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

// Inicialització de l'aplicació i de la base de dades Cloud Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
