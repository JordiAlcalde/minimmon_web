import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Escolta en temps real una col·lecció de Producc a Firestore.
 * Si la col·lecció està buida i hi ha dades inicials, s'inicialitzen a Firestore automàticament.
 */
export function subscribeProduccCollection(collectionName, initialData = [], onUpdate) {
  const colRef = collection(db, collectionName);

  const unsubscribe = onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty && initialData && initialData.length > 0) {
      // Inicialització automàtica a Firestore
      try {
        const batch = writeBatch(db);
        initialData.forEach((item) => {
          const docRef = doc(db, collectionName, String(item.id));
          batch.set(docRef, item);
        });
        await batch.commit();
      } catch (err) {
        console.warn(`Error inicialitzant col·lecció ${collectionName} a Firestore:`, err);
      }
    } else {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      onUpdate(items);
    }
  }, (error) => {
    console.error(`Error escoltant ${collectionName} a Firestore:`, error);
    if (initialData && initialData.length > 0) {
      onUpdate(initialData);
    }
  });

  return unsubscribe;
}

/**
 * Guarda o actualitza un document a Firestore
 */
export async function saveProduccDocument(collectionName, item) {
  try {
    if (!item.id) {
      throw new Error(`L'element a ${collectionName} no té ID.`);
    }
    const docRef = doc(db, collectionName, String(item.id));
    await setDoc(docRef, item, { merge: true });
    return true;
  } catch (err) {
    console.error(`Error desant document a ${collectionName} (${item.id}):`, err);
    throw err;
  }
}

/**
 * Elimina un document de Firestore
 */
export async function deleteProduccDocument(collectionName, itemId) {
  try {
    const docRef = doc(db, collectionName, String(itemId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error eliminant document de ${collectionName} (${itemId}):`, err);
    throw err;
  }
}

/**
 * Reinicialitza la col·lecció a Firestore amb les dades de fàbrica inicials
 */
export async function resetProduccCollectionToSeed(collectionName, initialData = []) {
  try {
    const batch = writeBatch(db);
    initialData.forEach((item) => {
      const docRef = doc(db, collectionName, String(item.id));
      batch.set(docRef, item);
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.error(`Error reinicialitzant ${collectionName}:`, err);
    throw err;
  }
}
