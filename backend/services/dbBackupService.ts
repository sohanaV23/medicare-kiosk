import fs from "fs";
import path from "path";
import { db } from "../config/firebase";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

const DATABASE_FILE = path.join(process.cwd(), "patients_database.json");

// Helper to load patients
export function loadPatientsFromDisk(): any[] {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      const content = fs.readFileSync(DATABASE_FILE, "utf-8");
      const list = JSON.parse(content || "[]");
      return Array.isArray(list) 
        ? list.filter((item: any) => item && !item.deleted && !(item.patient && item.patient.deleted))
        : [];
    }
  } catch (err) {
    console.error("Error reading patients database file:", err);
  }
  
  // Return default mock records if file doesn't exist / corrupt
  const defaultMock: any[] = [];
  
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(defaultMock, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write initial default mock database file:", err);
  }
  return defaultMock;
}

// Unified helper to load patients dynamically, checking Firestore first, then falling back to disk
export async function getPatientsLatestList(): Promise<any[]> {
  try {
    if (db) {
      const q = collection(db, "patients");
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && !data.deleted && !(data.patient && data.patient.deleted)) {
          items.push(data);
        }
      });

      if (items.length > 0) {
        // Sort newest first
        items.sort((a: any, b: any) => {
          const timeA = a.patient?.registrationTime ? new Date(a.patient.registrationTime).getTime() : 0;
          const timeB = b.patient?.registrationTime ? new Date(b.patient.registrationTime).getTime() : 0;
          if (timeA && timeB) return timeB - timeA;
          return String(b.id).localeCompare(String(a.id));
        });

        // Deduplicate in memory (preserving the newest record)
        const uniquePatientsMap = new Map<string, any>();
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          if (item && item.patient) {
            const key = item.patient.uniqueId || item.patient.contactNumber;
            if (key) {
              uniquePatientsMap.set(key, item);
            }
          }
        }
        return Array.from(uniquePatientsMap.values()).reverse();
      }
    }
  } catch (error) {
    console.error("[MediVoice Server] Firestore fetch failed within helper:", error);
  }
  const diskList = loadPatientsFromDisk();
  return diskList.filter((item: any) => item && !item.deleted && !(item.patient && item.patient.deleted));
}

// Database Deduplication function
export async function deduplicateDatabase() {
  try {
    let records: any[] = [];

    // 1. Fetch from Firestore if active
    if (db) {
      try {
        const q = collection(db, "patients");
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          records.push(docSnap.data());
        });
      } catch (fErr) {
        console.error("[MediVoice Server] Failed to fetch Firestore patients for deduplication:", fErr);
      }
    }

    // 2. Load from local disk if Firestore is empty or inactive
    if (records.length === 0) {
      if (fs.existsSync(DATABASE_FILE)) {
        const content = fs.readFileSync(DATABASE_FILE, "utf-8");
        records = JSON.parse(content || "[]");
      }
    }

    if (!Array.isArray(records) || records.length === 0) return;

    const uniquePatientsMap = new Map<string, any>();
    const duplicatesToDelete: string[] = [];

    // Sort oldest first so that the newest ones overwrite the older ones in the Map,
    // and we collect the older duplicates' IDs to delete.
    const sortedRecords = [...records].sort((a: any, b: any) => {
      const timeA = a.patient?.registrationTime ? new Date(a.patient.registrationTime).getTime() : 0;
      const timeB = b.patient?.registrationTime ? new Date(b.patient.registrationTime).getTime() : 0;
      return timeA - timeB; // oldest first
    });

    // Filter out demo patients first
    const cleanRecords: any[] = [];
    for (const record of sortedRecords) {
      if (record && record.patient) {
        const fullNameLower = (record.patient.fullName || '').toLowerCase();
        if (fullNameLower.includes('johnathan doe') || fullNameLower.includes('srinivas rao') || fullNameLower.includes('demo patient') || fullNameLower.includes('test patient')) {
          duplicatesToDelete.push(record.id);
          continue;
        }
        cleanRecords.push(record);
      }
    }

    for (const record of cleanRecords) {
      let uniqueKey = "";
      if (record.patient.idType === 'Aadhaar' && record.patient.idNumber) {
        uniqueKey = "aadhaar-" + record.patient.idNumber.replace(/\D/g, '');
      } else if (record.patient.contactNumber) {
        uniqueKey = "phone-" + record.patient.contactNumber.replace(/\D/g, '');
      } else {
        uniqueKey = "name-" + (record.patient.fullName || '').toLowerCase().trim();
      }

      if (uniqueKey) {
        if (uniquePatientsMap.has(uniqueKey)) {
          const olderRecord = uniquePatientsMap.get(uniqueKey);
          duplicatesToDelete.push(olderRecord.id);
        }
        uniquePatientsMap.set(uniqueKey, record);
      }
    }

    const deduplicatedRecords = Array.from(uniquePatientsMap.values()).reverse(); // newest first

    fs.writeFileSync(DATABASE_FILE, JSON.stringify(deduplicatedRecords, null, 2), "utf-8");
    console.log(`[MediVoice Server] Local database deduplication completed: preserved ${deduplicatedRecords.length} unique profiles.`);

    // 3. If Firestore is active and has duplicate/demo documents, delete them
    if (db && duplicatesToDelete.length > 0) {
      const { deleteDoc, doc: fDoc } = await import("firebase/firestore");
      let deleteAllowed = true;
      for (const dupId of duplicatesToDelete) {
        if (!deleteAllowed) break;
        try {
          await deleteDoc(fDoc(db, "patients", dupId));
          console.log(`[MediVoice Server] Deleted duplicate/demo document ${dupId} from Cloud Firestore.`);
        } catch (fErr: any) {
          const errMsg = String(fErr.message || fErr);
          if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("permission-denied") || errMsg.includes("permissions")) {
            console.warn("[MediVoice Server] Cloud Firestore write/delete permission is restricted. Skipping cloud deduplication. Local database remains fully optimized.");
            deleteAllowed = false;
          } else {
            console.error(`[MediVoice Server] Failed to delete duplicate/demo document ${dupId} from Firestore:`, fErr);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error during database deduplication:", err);
  }
}

// Helper to save a single patient record
import { uploadBase64Image } from "./storageService";

export async function savePatientRecord(newRecord: any) {
  // If patient has a base64 photoUrl, upload it to Firebase Storage first
  if (newRecord.patient && newRecord.patient.photoUrl && newRecord.patient.photoUrl.startsWith("data:")) {
    const destinationPath = `patients/${newRecord.id}/selfie.jpg`;
    const downloadUrl = await uploadBase64Image(newRecord.patient.photoUrl, destinationPath);
    if (downloadUrl) {
      newRecord.patient.photoUrl = downloadUrl;
      console.log(`[MediVoice Server] Patient selfie uploaded to Firebase Storage: ${downloadUrl}`);
    }
  }

  if (db) {
    try {
      await setDoc(doc(db, "patients", newRecord.id), newRecord);
      console.log(`[MediVoice Server] Patient record ${newRecord.id} persisted to Cloud Firestore.`);
    } catch (fError) {
      console.error("[MediVoice Server] Firestore store failed, using disk:", fError);
    }
  }

  const currentList = loadPatientsFromDisk();
  const index = currentList.findIndex((item: any) => item.id === newRecord.id);
  if (index >= 0) {
    currentList[index] = newRecord;
  } else {
    currentList.unshift(newRecord);
  }

  fs.writeFileSync(DATABASE_FILE, JSON.stringify(currentList, null, 2), "utf-8");
}

// Helper to soft-delete a patient record
export async function softDeletePatientRecord(recordId: string, deletedBy: string = "system") {
  const deletedAt = new Date().toISOString();
  if (db) {
    try {
      const { updateDoc, doc: fDoc } = await import("firebase/firestore");
      await updateDoc(fDoc(db, "patients", recordId), {
        deleted: true,
        deletedAt,
        deletedBy,
        "patient.deleted": true,
        "patient.deletedAt": deletedAt,
        "patient.deletedBy": deletedBy
      });
      console.log(`[MediVoice Server] Soft-deleted patient record ${recordId} in Cloud Firestore.`);
    } catch (fErr) {
      console.error("Failed to soft-delete in Firestore:", fErr);
    }
  }

  const currentList = loadPatientsFromDisk();
  const updatedList = currentList.map((item: any) => {
    if (item.id === recordId || item.patient?.uniqueId === recordId) {
      return {
        ...item,
        deleted: true,
        deletedAt,
        deletedBy,
        patient: {
          ...item.patient,
          deleted: true,
          deletedAt,
          deletedBy
        }
      };
    }
    return item;
  });

  fs.writeFileSync(DATABASE_FILE, JSON.stringify(updatedList, null, 2), "utf-8");
}

// Helper to restore a soft-deleted patient record
export async function restorePatientRecord(recordId: string) {
  if (db) {
    try {
      const { updateDoc, doc: fDoc } = await import("firebase/firestore");
      await updateDoc(fDoc(db, "patients", recordId), {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        "patient.deleted": false,
        "patient.deletedAt": null,
        "patient.deletedBy": null
      });
      console.log(`[MediVoice Server] Restored patient record ${recordId} in Cloud Firestore.`);
    } catch (fErr) {
      console.error("Failed to restore in Firestore:", fErr);
    }
  }

  const currentList = loadPatientsFromDisk();
  const updatedList = currentList.map((item: any) => {
    if (item.id === recordId || item.patient?.uniqueId === recordId) {
      return {
        ...item,
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        patient: {
          ...item.patient,
          deleted: false,
          deletedAt: null,
          deletedBy: null
        }
      };
    }
    return item;
  });

  fs.writeFileSync(DATABASE_FILE, JSON.stringify(updatedList, null, 2), "utf-8");
}

const AUDIT_LOGS_FILE = path.join(process.cwd(), "audit_logs.json");

// Helper to save an audit log record
export async function saveAuditLog(log: any) {
  const logWithId = { id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...log };
  if (db) {
    try {
      await setDoc(doc(db, "audit_logs", logWithId.id), logWithId);
      console.log(`[MediVoice Server] Audit log ${logWithId.id} persisted to Cloud Firestore.`);
    } catch (fError) {
      console.error("[MediVoice Server] Firestore audit log failed:", fError);
    }
  }

  let logs: any[] = [];
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const content = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
      logs = JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("Error reading audit logs:", err);
  }
  logs.unshift(logWithId);
  try {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write audit logs to disk:", err);
  }
}

// Helper to load audit logs
export async function getAuditLogs(): Promise<any[]> {
  if (db) {
    try {
      const q = collection(db, "audit_logs");
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach((docSnap) => {
        items.push(docSnap.data());
      });
      if (items.length > 0) {
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return items;
      }
    } catch (e) {
      console.error("[MediVoice Server] Firestore load audit logs failed:", e);
    }
  }

  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const content = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("Error reading audit logs from disk:", err);
  }
  return [];
}

