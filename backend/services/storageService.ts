import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

/**
 * Uploads a base64 image (either data URL or raw base64) to Firebase Storage.
 * Returns the public download URL, or null if the upload fails.
 */
export async function uploadBase64Image(base64Data: string, destinationPath: string): Promise<string | null> {
  if (!storage) {
    console.warn("[Storage Service] Firebase Storage is not initialized. Using database fallback.");
    return null;
  }
  try {
    const storageRef = ref(storage, destinationPath);
    let dataUrlStr = base64Data;
    if (!base64Data.startsWith("data:")) {
      dataUrlStr = `data:image/jpeg;base64,${base64Data}`;
    }
    
    await uploadString(storageRef, dataUrlStr, "data_url");
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn("[Storage Service] Failed to upload image to Firebase Storage, falling back to direct storage:", error);
    return null;
  }
}
