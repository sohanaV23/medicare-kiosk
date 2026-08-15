import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

let db: any = null;
let storage: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    storage = getStorage(firebaseApp);
    console.log("[MediVoice Server] Free cloud database and storage initialized successfully.");
  }
} catch (e) {
  console.error("Failed to initialize Firebase on the server:", e);
}

export { db, storage };
