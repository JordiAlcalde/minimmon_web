import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function run() {
  const snap = await getDocs(collection(db, "posting_planificacio"));
  console.log("Total docs:", snap.docs.length);
  for (const d of snap.docs) {
    const data = d.data();
    if (d.id === '6Hi98DJT8pnT2fOYCXvN') {
      console.log("FULL DOC CONTENT FOR 6Hi98DJT8pnT2fOYCXvN:");
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
