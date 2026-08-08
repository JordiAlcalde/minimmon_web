import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNdiZmlhYEAvMDsJWiD8XW-cAQJwQ_Er8",
  authDomain: "minimmon-web.firebaseapp.com",
  projectId: "minimmon-web",
  storageBucket: "minimmon-web.firebasestorage.app",
  messagingSenderId: "28312425135",
  appId: "1:28312425135:web:c6f515c618cc7f37df3a5a",
  measurementId: "G-R3GJSC068E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

const DEFAULT_ACCESS_KEY = "jac58webDB";

/**
 * Obté la clau d'accés des de Firestore (col·lecció 'config', document 'access')
 * Si no existeix a Firestore, la crea inicialment amb 'jac58webDB'.
 */
export async function getAccessKeyFromFirestore() {
  try {
    const docRef = doc(db, "config", "access");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data()?.key) {
      return docSnap.data().key;
    } else {
      // Inicialitzar document a Firestore amb la clau per defecte
      await setDoc(docRef, { key: DEFAULT_ACCESS_KEY, updated: new Date() });
      return DEFAULT_ACCESS_KEY;
    }
  } catch (err) {
    console.warn("Nota: No s'ha pogut consultar la clau a Firestore, s'utilitza la clau per defecte.", err);
    return DEFAULT_ACCESS_KEY;
  }
}

/**
 * Actualitza la clau d'accés a Firestore
 */
export async function updateAccessKeyInFirestore(newKey) {
  const docRef = doc(db, "config", "access");
  await setDoc(docRef, { key: newKey, updated: new Date() });
}
