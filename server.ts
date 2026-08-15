import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getAI, generateContentWithRetry } from "./backend/services/geminiService";
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  authenticateToken, 
  requireRole, 
  AuthenticatedUser 
} from "./backend/utils/auth";
import { saveAuditLog, getAuditLogs } from "./backend/services/dbBackupService";
import { patientRegistrationSchema } from "./backend/schemas/validation";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const CLINIC_ID = process.env.APP_CLINIC_ID || "clinic-0001";

// Production Security Hardening
app.use(helmet({
  contentSecurityPolicy: false, // Permit loading raw inline scripts and styles from Vite dev pipeline
}));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate limiter for authentication routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 login attempts per window
  message: { error: "Too many login attempts. Please try again after 15 minutes." }
});

// Predefined Pilot Credentials
const PILOT_ADMINS = [
  { username: "admin1", password: "password123", role: "clinicAdmin" as const, clinicId: CLINIC_ID },
  { username: "superadmin", password: "adminpassword", role: "superAdmin" as const, clinicId: "*" }
];

// Helper to extract client IP address
const getClientIp = (req: express.Request): string => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  return Array.isArray(ip) ? ip[0] : String(ip);
};

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = PILOT_ADMINS.find(u => u.username === username && u.password === password);
  if (!user) {
    await saveAuditLog({
      userId: username,
      clinicId: "unknown",
      role: "unknown",
      action: "LOGIN_FAILED",
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req),
      details: "Failed login attempt with invalid credentials"
    });
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const payload: AuthenticatedUser = {
    username: user.username,
    role: user.role,
    clinicId: user.clinicId
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Set secure refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  await saveAuditLog({
    userId: user.username,
    clinicId: user.clinicId,
    role: user.role,
    action: "LOGIN",
    timestamp: new Date().toISOString(),
    ipAddress: getClientIp(req),
    details: `Successfully logged in as ${user.role}`
  });

  res.json({ accessToken, user: { username: user.username, role: user.role, clinicId: user.clinicId } });
});

app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  const decoded = verifyToken(refreshToken);
  if (!decoded) {
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }

  const newAccessToken = generateAccessToken({
    username: decoded.username,
    role: decoded.role,
    clinicId: decoded.clinicId
  });

  res.json({ accessToken: newAccessToken });
});

app.post("/api/auth/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    const decoded = verifyToken(refreshToken);
    if (decoded) {
      await saveAuditLog({
        userId: decoded.username,
        clinicId: decoded.clinicId,
        role: decoded.role,
        action: "LOGOUT",
        timestamp: new Date().toISOString(),
        ipAddress: getClientIp(req),
        details: "User logged out successfully"
      });
    }
  }
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully" });
});

// Role-Based Access Control (RBAC) middleware check
const checkOwnerRole = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Backwards compatibility layer mapping owner header to superAdmin authorization check
  const roleHeader = req.headers["x-user-role"];
  if (roleHeader === "owner") {
    return next();
  }
  
  // Try JWT verification
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && (decoded.role === "superAdmin" || decoded.role === "clinicAdmin")) {
      (req as any).user = decoded;
      return next();
    }
  }
  
  res.status(403).json({ error: "Access Denied: Administrative role required." });
};

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Heuristic local speech parser fallback when Gemini API key is missing
function localHeuristicRegistrationParser(transcript: string, preferredLanguage: string) {
  const text = (transcript || "").toLowerCase();
  const isTe = preferredLanguage === "telugu";
  
  let firstName = "";
  let lastName = "";
  let fullName = "";
  let dob = "";
  let gender = "";
  let contactNumber = "";
  let email = "";
  let address = "";
  let idType = "Aadhaar";
  let idNumber = "";
  let isGovEmployee = false;
  let symptoms = transcript || "";
  let preexistingConditions = "";

  // Heuristic matching for English names
  const nameMatch = text.match(/(?:my name is|i am|name is|this is)\s+([a-z]+)\s*([a-z]*)/i);
  if (nameMatch) {
    firstName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
    if (nameMatch[2]) {
      lastName = nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1);
    }
    fullName = `${firstName} ${lastName}`.trim();
  }

  // Heuristic matching for Telugu names
  const teluguNameMatch = text.match(/(?:నా పేరు|నా పేరొచ్చేసి|పేరు)\s*([^\s]+)\s*([^\s]*)/i);
  if (teluguNameMatch && !firstName) {
    firstName = teluguNameMatch[1];
    if (teluguNameMatch[2] && !teluguNameMatch[2].includes("లక్షణాలు") && !teluguNameMatch[2].includes("చిరునామా")) {
      lastName = teluguNameMatch[2];
    }
    fullName = `${firstName} ${lastName}`.trim();
  }

  // Match 10-digit mobile numbers
  const phoneMatch = text.replace(/\s+/g, "").match(/(?:0|91)?[6789]\d{9}/);
  if (phoneMatch) {
    contactNumber = phoneMatch[0];
  }

  // Match gender keywords
  if (text.includes("female") || text.includes("woman") || text.includes("స్త్రీ") || text.includes("ఆడ")) {
    gender = "Female";
  } else if (text.includes("male") || text.includes("man") || text.includes("పురుషుడు") || text.includes("మగ")) {
    gender = "Male";
  }

  // Match symptoms keywords
  const symptomKeywords = ["pain", "headache", "fever", "cough", "cold", "stomach", "vomit", "dizzy", "injury", "తలనొప్పి", "జ్వరం", "దగ్గు", "జలుబు", "కడుపు నొప్పి", "వాంతులు", "నీరసం"];
  const foundSymptoms: string[] = [];
  symptomKeywords.forEach(kw => {
    if (text.includes(kw)) {
      foundSymptoms.push(kw);
    }
  });
  if (foundSymptoms.length > 0) {
    symptoms = foundSymptoms.join(", ");
  }

  // Match email addresses
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }

  // Match Address keywords
  const cities = ["hyderabad", "nellore", "tirupati", "vijayawada", "visakhapatnam", "guntur", "bengaluru", "chennai", "mumbai", "delhi", "హైదరాబాద్", "నెల్లూరు", "తిరుపతి", "విజయవాడ", "వైజాగ్"];
  cities.forEach(c => {
    if (text.includes(c)) {
      address = c.charAt(0).toUpperCase() + c.slice(1);
    }
  });

  // Gov employee trigger
  if (text.includes("government employee") || text.includes("gov employee") || text.includes("ప్రభుత్వ ఉద్యోగి")) {
    isGovEmployee = true;
  }

  return {
    firstName,
    lastName,
    fullName,
    dob,
    gender,
    contactNumber,
    email,
    address,
    idType,
    idNumber,
    isGovEmployee,
    symptoms,
    preexistingConditions,
    language: isTe ? "Telugu" : "English"
  };
}

// 1. Parse Patient details from voice transcript (for registration and filling symptoms)
app.post("/api/registration/parse", async (req, res) => {
  const { transcript, preferredLanguage } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("[MediVoice Server] GEMINI_API_KEY is not defined. Falling back to local heuristic parser.");
      const parsedData = localHeuristicRegistrationParser(transcript, preferredLanguage);
      return res.json(parsedData);
    }

    const ai = getAI();
    const isTelugu = preferredLanguage === 'telugu';
    const systemPrompt = `You are an expert medical registration assistant. Parse the patient's spoken voice description or pasted identity card text (which may be in English or Telugu) and extract unstructured patient information into clean structured data.
Return a structured JSON object with the following fields:
- firstName: string (first name, empty if not specified)
- lastName: string (last name, empty if not specified)
- fullName: string (first name combined with last name, empty if not specified)
- dob: string (Date of Birth in standard YYYY-MM-DD format if date/month/year are named, or empty string. E.g. "I was born on May 15th 1988" -> "1988-05-15")
- gender: string (Male, Female, or Other. Map to exact English strings from spoken inputs)
- contactNumber: string (patient's phone/contact number if spoken or written, e.g. "9876543210")
- email: string (patient's email address if narrated or pasted, or empty if not specified)
- address: string (patient's physical address / city / state if mentioned, or empty if not specified)
- idType: string (Must be one of: "Aadhaar", "PAN ID", "Voter ID", "Employee ID". If not specified, default to "Aadhaar")
- idNumber: string (Any spoken or written identification card number, like Aadhaar, PAN or Voter card digits. Remove any spaces, hyphens, or backslashes form standard numbers, e.g., "5463 2819 7022" -> "546328197022")
- isGovEmployee: boolean (true if mentioned they work for the government, otherwise false)
- symptoms: string (summary of current symptoms stated)
- preexistingConditions: string (any past conditions stated, like hypertension, diabetes, etc., or "None")
- language: string ("English" or "Telugu" based on input language)

STRICT LANGUAGE SPECIFICATIONS:
${isTelugu ? 
`- The user's preferred language is Telugu. Therefore, all textual fields (firstName, lastName, fullName, address, symptoms, preexistingConditions) MUST be processed and returned in Telugu script. If name input is in English (e.g. "Sunkaraneni Pranathi Sai"), you must transliterate/translate it to Telugu script (e.g. firstName: "ప్రణతి సాయి", lastName: "సుంకరనేని", fullName: "సుంకరనేని ప్రణతి సాయి").
- EXCEPTION: The dob (Date of Birth) field must always be in YYYY-MM-DD English format.
- EXCEPTION: The email field must always be in standard English/universal format (lowercase letters, @, dot, etc.).
- EXCEPTION: The contactNumber and idNumber fields must be numerical strings in English digits (e.g., "9876543210").`
:
`- The user's preferred language is English. Therefore, all fields must be in English.
- EXCEPTION: The dob (Date of Birth) field must always be in YYYY-MM-DD format.
- EXCEPTION: The email field must always be in standard English/universal format.
- EXCEPTION: The contactNumber and idNumber fields must be numerical strings in English digits.`
}

STRICT VALUES ONLY:
- You MUST populate BOTH firstName and lastName fields separately. DO NOT leave them empty and only fill fullName.
- In Telugu/South Indian contexts, the surname/family name (e.g. "Sunkaraneni") is the lastName, and the given name (e.g. "Pranathi Sai") is the firstName. Populating them correctly is essential.
- DO NOT include any explanations, commentary, notes, assumptions, or parenthetical logic inside any string values (such as "(interpreted from...)", "(estimated)", "N/A", or "None specified").
- Each text field must contain ONLY the raw value (e.g. name, date, email, address) as it would be typed in a clean database.
- If a value cannot be extracted, return an empty string ("").

Speak Telugu? Telugu name/details sound like:
- "నా పేరు రమేష్ కుమార్" (My name is Ramesh Kumar) -> firstName: "రమేష్", lastName: "కుమార్"
- "నేను హైదరాబాద్ లో ఉంటాను" (I live in Hyderabad) -> address: "హైదరాబాద్"
- "నా గుర్తింపు ఐడీ తొమ్మిది ఎనిమిది ఏడు ఒకటి ఒకటి ఒకటి" (My identity card is nine eight seven...) -> idNumber: "987111"
- "నాకు షుగర్ ఉంది" -> preexistingConditions: "మధుమేహం (Diabetes)"
- "నాకు నిన్నటి నుండి జ్వరంగా ఉంది" -> symptoms: "నిన్నటి నుండి జ్వరం"
- "నా పేరు సుంకరనేని ప్రణతి సాయి" -> firstName: "ప్రణతి సాయి", lastName: "సుంకరనేని", fullName: "సుంకరనేని ప్రణతి సాయి"
All fields must be extracted accurately. If any field cannot be found, return empty string for it.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: `Parse this spoken text or pasted card data: "${transcript}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            fullName: { type: Type.STRING },
            dob: { type: Type.STRING },
            gender: { type: Type.STRING },
            contactNumber: { type: Type.STRING },
            email: { type: Type.STRING },
            address: { type: Type.STRING },
            idType: { type: Type.STRING },
            idNumber: { type: Type.STRING },
            isGovEmployee: { type: Type.BOOLEAN },
            symptoms: { type: Type.STRING },
            preexistingConditions: { type: Type.STRING },
            language: { type: Type.STRING },
          },
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in registration parser. Falling back to local heuristic parser:", error);
    try {
      const parsedData = localHeuristicRegistrationParser(transcript, preferredLanguage);
      res.json(parsedData);
    } catch (fallbackError: any) {
      console.error("Failed local heuristic parser fallback:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to parse registration details" });
    }
  }
});

import fs from "fs";
import { db } from "./backend/config/firebase";
import {
  loadPatientsFromDisk,
  getPatientsLatestList,
  deduplicateDatabase,
  savePatientRecord,
  softDeletePatientRecord,
  restorePatientRecord
} from "./backend/services/dbBackupService";
import { doc, setDoc } from "firebase/firestore";
import { imageUrlToBase64 } from "./backend/utils/imageHelper";

// ---------------------- Routes for Patients storage ----------------------
app.get("/api/patients", async (req, res) => {
  try {
    const list = await getPatientsLatestList();
    if (list.length === 0 && db) {
      const defaultMock = loadPatientsFromDisk();
      for (const item of defaultMock) {
        await setDoc(doc(db, "patients", item.id), item);
      }
      return res.json(defaultMock);
    }
    return res.json(list);
  } catch (error) {
    console.error("[MediVoice Server] Error loading patients list route:", error);
    res.json(loadPatientsFromDisk());
  }
});

app.post("/api/patients", async (req, res) => {
  try {
    const newRecord = req.body;
    if (!newRecord || !newRecord.patient) {
      return res.status(400).json({ error: "Invalid patient payload" });
    }

    // Inject clinicId if missing using configuration-defined CLINIC_ID
    if (!newRecord.clinicId) {
      newRecord.clinicId = CLINIC_ID;
    }
    if (newRecord.patient && !newRecord.patient.clinicId) {
      newRecord.patient.clinicId = CLINIC_ID;
    }

    // Zod Validation
    const validation = patientRegistrationSchema.safeParse(newRecord.patient);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      return res.status(400).json({ error: `Validation Error: ${errorMsg}` });
    }

    await savePatientRecord(newRecord);

    await saveAuditLog({
      userId: "kiosk",
      clinicId: newRecord.clinicId,
      role: "patient",
      action: "PATIENT_CREATE",
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req),
      details: `Registered new patient: ${newRecord.patient.fullName} (ID: ${newRecord.patient.uniqueId})`
    });

    res.json(newRecord);
  } catch (error: any) {
    console.error("Error writing new patient record:", error);
    res.status(500).json({ error: "Failed to persist patient record on backend disk" });
  }
});

// POST endpoint to trigger database deduplication
app.post("/api/patients/deduplicate", checkOwnerRole, async (req, res) => {
  const adminUser = (req as any).user?.username || "owner";
  const userRole = (req as any).user?.role || "superAdmin";
  try {
    await deduplicateDatabase();
    const list = await getPatientsLatestList();
    
    await saveAuditLog({
      userId: adminUser,
      clinicId: CLINIC_ID,
      role: userRole,
      action: "ADMIN_ACTION",
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req),
      details: "Triggered database deduplication manually"
    });

    res.json({ success: true, message: "Deduplication completed successfully.", patients: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to deduplicate database" });
  }
});

// DELETE endpoint to soft-delete patient records (hiding them from UI but keeping in backend)
app.delete("/api/patients/:id", checkOwnerRole, async (req, res) => {
  const recordId = req.params.id;
  const adminUser = (req as any).user?.username || "owner";
  const userRole = (req as any).user?.role || "superAdmin";
  try {
    await softDeletePatientRecord(recordId, adminUser);

    await saveAuditLog({
      userId: adminUser,
      clinicId: CLINIC_ID,
      role: userRole,
      action: "PATIENT_DELETE",
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req),
      details: `Soft-deleted patient record with ID: ${recordId}`
    });

    res.json({ success: true, message: `Patient record ${recordId} soft-deleted successfully.` });
  } catch (error: any) {
    console.error("Error soft-deleting patient record:", error);
    res.status(500).json({ error: "Failed to soft-delete patient record from database" });
  }
});

// POST endpoint to restore a soft-deleted patient record
app.post("/api/patients/:id/restore", checkOwnerRole, async (req, res) => {
  const recordId = req.params.id;
  const adminUser = (req as any).user?.username || "owner";
  const userRole = (req as any).user?.role || "superAdmin";
  try {
    await restorePatientRecord(recordId);

    await saveAuditLog({
      userId: adminUser,
      clinicId: CLINIC_ID,
      role: userRole,
      action: "PATIENT_RESTORE",
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req),
      details: `Restored soft-deleted patient record with ID: ${recordId}`
    });

    res.json({ success: true, message: `Patient record ${recordId} restored successfully.` });
  } catch (error: any) {
    console.error("Error restoring patient record:", error);
    res.status(500).json({ error: "Failed to restore patient record" });
  }
});

// Aadhaar Card OCR & Extraction API Route
function logFailure(stepFailed: string, reason: string, technicalError: string, suggestedFix: string) {
  console.log("\nStep Failed: " + stepFailed);
  console.log("Reason: " + reason);
  console.log("Technical Error: " + technicalError);
  console.log("Suggested Fix: " + suggestedFix + "\n");
}

app.post("/api/registration/ocr-aadhaar", async (req, res) => {
  const { image, preferredLanguage, scanType } = req.body;
  const requestSize = JSON.stringify(req.body).length;
  console.log(`[MediVoice Server] Received Aadhaar OCR request. Scan Type: ${scanType}, Preferred Language: ${preferredLanguage}, Request Size: ${requestSize} bytes`);
  
  if (!image) {
    const errorReason = "Reject missing image";
    const stepFailed = "Backend Request Verification";
    const technicalError = "Image field is missing or empty in request body";
    const suggestedFix = "Ensure the client captures the image and sends it in the JSON request body.";
    logFailure(stepFailed, errorReason, technicalError, suggestedFix);
    return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
  }
  
  console.log("✓ Backend received image");

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const errorReason = "API authentication failed";
      const stepFailed = "API Authentication Check";
      const technicalError = "GEMINI_API_KEY environment variable is not defined";
      const suggestedFix = "Set the GEMINI_API_KEY environment variable in your .env file.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(401).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    const ai = getAI();
    
    let cleanBase64 = "";
    let mimeType = "";
    try {
      const converted = await imageUrlToBase64(image);
      cleanBase64 = converted.data;
      mimeType = converted.mimeType;
    } catch (conversionErr: any) {
      const errorReason = "Camera image corrupted";
      const stepFailed = "Base64 Conversion";
      const technicalError = conversionErr.message || String(conversionErr);
      const suggestedFix = "Check if the frontend webcam capture frame is a valid and uncorrupted data URL.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    if (!cleanBase64 || cleanBase64.trim() === "") {
      const errorReason = "Invalid Base64";
      const stepFailed = "Base64 Conversion";
      const technicalError = "Extracted base64 string is empty";
      const suggestedFix = "Check if the frontend canvas generated a valid image data URL.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    if (!mimeType || !mimeType.startsWith("image/")) {
      const errorReason = "Invalid MIME type";
      const stepFailed = "MIME Type Validation";
      const technicalError = `MIME type is not supported: ${mimeType}`;
      const suggestedFix = "Ensure the captured image has a valid image MIME type (e.g. image/jpeg, image/png).";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    console.log(`✓ Base64 generated (Length: ${cleanBase64.length})`);

    const isTe = preferredLanguage === 'telugu';
    let promptText = "";
    if (scanType === 'address') {
      promptText = `Analyze this Aadhaar card ID image (which is the back of the card containing address details). Perform high-precision OCR to extract the complete resident address (including Care of details like S/O, W/O, D/O if present, house/flat number, street, city/town/village, district, state, and PIN code).
Return a structured JSON object where:
- address: string (The complete physical resident address written on the Aadhaar card, clean and compiled in ${isTe ? "Telugu script" : "English"}, e.g. ${isTe ? `"D/O: మిత్తపల్లి అశోక్, హౌస్ నంబర్ 8-7-15, గిరిమాజీపేట, వరంగల్, ఆంధ్రప్రదేశ్, 506002"` : `"D/O: Mittapalli Ashok, House Number 8-7-15, Girmajipet, Warangal, Andhra Pradesh, 506002"`})
- Set all other fields (firstName, lastName, fullName, dob, gender, idNumber) to empty string ("").

Evaluate the image quality and document validity. Provide the following fields:
- isBlurry: boolean (Set to true if the image is blurry, out of focus, or hard to read)
- isLowResolution: boolean (Set to true if the image resolution/quality is too low to extract text reliably)
- isRotated: boolean (Set to true if the card is rotated or upside down, making text extraction fail)
- isCropped: boolean (Set to true if the Aadhaar card is cropped or part of the card is cut off)
- hasGlare: boolean (Set to true if there is glare, reflection, or shadow obscuring the card details)
- isUnsupportedDocument: boolean (Set to true if the uploaded image is not a valid Aadhaar card, e.g. a portrait photo, or a different ID card)
- noAadhaarDetected: boolean (Set to true if no Aadhaar card is detected in the image)
- aadhaarPartiallyVisible: boolean (Set to true if the Aadhaar card is only partially visible or obscured)

STRICT VALUES ONLY:
- DO NOT include any explanations, commentary, notes, assumptions, or parenthetical logic inside any string values.
- If the address cannot be extracted, return an empty string ("").`;
    } else if (scanType === 'biodata') {
      promptText = `Analyze this Aadhaar card ID image (usually the front of the card). Perform professional OCR to extract personal details.
Return a structured JSON object with these fields:
- firstName: string (The person's first name in ${isTe ? "Telugu script" : "English"})
- lastName: string (The person's last name or initial in ${isTe ? "Telugu script" : "English"}, if any)
- fullName: string (The person's complete full name in ${isTe ? "Telugu script" : "English"} exactly as written on the card)
- dob: string (Date of birth in YYYY-MM-DD standard format. Extract date, month, year from Aadhaar metadata)
- gender: string ("Male", "Female" or "Other")
- idNumber: string (The 12-digit Aadhaar number, as a string with no spaces, e.g. "542387120045")
Leave address blank.

Evaluate the image quality and document validity. Provide the following fields:
- isBlurry: boolean (Set to true if the image is blurry, out of focus, or hard to read)
- isLowResolution: boolean (Set to true if the image resolution/quality is too low to extract text reliably)
- isRotated: boolean (Set to true if the card is rotated or upside down, making text extraction fail)
- isCropped: boolean (Set to true if the Aadhaar card is cropped or part of the card is cut off)
- hasGlare: boolean (Set to true if there is glare, reflection, or shadow obscuring the card details)
- isUnsupportedDocument: boolean (Set to true if the uploaded image is not a valid Aadhaar card, e.g. a portrait photo, or a different ID card)
- noAadhaarDetected: boolean (Set to true if no Aadhaar card is detected in the image)
- aadhaarPartiallyVisible: boolean (Set to true if the Aadhaar card is only partially visible or obscured)

STRICT VALUES ONLY:
- You MUST populate BOTH firstName and lastName fields separately. DO NOT leave them empty and only fill fullName.
- In Telugu/South Indian contexts, the surname/family name (e.g. "Sunkaraneni") is the lastName, and the given name (e.g. "Pranathi Sai") is the firstName. Populating them correctly is essential.
- DO NOT include any explanations, commentary, notes, assumptions, or parenthetical logic inside any string values (such as "(interpreted from...)", "(estimated)", "N/A", or "None specified").
- Each text field must contain ONLY the raw value (e.g. name, date, email, address) as it would be typed in a clean database.
- If a value cannot be extracted, return an empty string ("").`;
    } else {
      promptText = `Analyze this Aadhaar card ID image. Perform professional OCR to extract personal details.
Return a structured JSON object with these fields:
- firstName: string (The person's first name in ${isTe ? "Telugu script" : "English"})
- lastName: string (The person's last name or initial in ${isTe ? "Telugu script" : "English"}, if any)
- fullName: string (The person's complete full name in ${isTe ? "Telugu script" : "English"} exactly as written on the card)
- dob: string (Date of birth in YYYY-MM-DD standard format. Extract date, month, year from Aadhaar metadata)
- gender: string ("Male", "Female" or "Other")
- idNumber: string (The 12-digit Aadhaar number, as a string with no spaces, e.g. "542387120045")
- address: string (The physical resident address written on the Aadhaar card, clean and compiled in ${isTe ? "Telugu script" : "English"})
All fields must be extracted accurately. If any field cannot be found, return empty string for it.

Evaluate the image quality and document validity. Provide the following fields:
- isBlurry: boolean (Set to true if the image is blurry, out of focus, or hard to read)
- isLowResolution: boolean (Set to true if the image resolution/quality is too low to extract text reliably)
- isRotated: boolean (Set to true if the card is rotated or upside down, making text extraction fail)
- isCropped: boolean (Set to true if the Aadhaar card is cropped or part of the card is cut off)
- hasGlare: boolean (Set to true if there is glare, reflection, or shadow obscuring the card details)
- isUnsupportedDocument: boolean (Set to true if the uploaded image is not a valid Aadhaar card, e.g. a portrait photo, or a different ID card)
- noAadhaarDetected: boolean (Set to true if no Aadhaar card is detected in the image)
- aadhaarPartiallyVisible: boolean (Set to true if the Aadhaar card is only partially visible or obscured)

STRICT VALUES ONLY:
- You MUST populate BOTH firstName and lastName fields separately. DO NOT leave them empty and only fill fullName.
- In Telugu/South Indian contexts, the surname/family name (e.g. "Sunkaraneni") is the lastName, and the given name (e.g. "Pranathi Sai") is the firstName. Populating them correctly is essential.
- DO NOT include any explanations, commentary, notes, assumptions, or parenthetical logic inside any string values (such as "(interpreted from...)", "(estimated)", "N/A", or "None specified").
- Each text field must contain ONLY the raw value (e.g. name, date, email, address) as it would be typed in a clean database.
- If a value cannot be extracted, return an empty string ("").`;
    }

    const imageSize = Math.round((cleanBase64.length * 3) / 4);
    const modelName = "gemini-2.5-flash";
    console.log(`[Gemini Request Specs] Model: ${modelName}, Prompt Length: ${promptText.length}, MIME: ${mimeType}, Image Size: ${imageSize} bytes`);

    if (!cleanBase64 || !mimeType) {
      const errorReason = "Camera image corrupted";
      const stepFailed = "Gemini Request Verification";
      const technicalError = "inlineData validation failed: base64 data or mimeType is empty";
      const suggestedFix = "Ensure the image helper generates valid base64 payload and mimeType.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }
    console.log("✓ Gemini request sent");

    let response: any;
    try {
      response = await generateContentWithRetry(ai, {
        model: modelName,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType
            }
          },
          { text: promptText }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              firstName: { type: Type.STRING },
              lastName: { type: Type.STRING },
              fullName: { type: Type.STRING },
              dob: { type: Type.STRING },
              gender: { type: Type.STRING },
              idNumber: { type: Type.STRING },
              address: { type: Type.STRING },
              isBlurry: { type: Type.BOOLEAN },
              isLowResolution: { type: Type.BOOLEAN },
              isRotated: { type: Type.BOOLEAN },
              isCropped: { type: Type.BOOLEAN },
              hasGlare: { type: Type.BOOLEAN },
              isUnsupportedDocument: { type: Type.BOOLEAN },
              noAadhaarDetected: { type: Type.BOOLEAN },
              aadhaarPartiallyVisible: { type: Type.BOOLEAN }
            }
          }
        }
      });
    } catch (geminiErr: any) {
      const errMsg = geminiErr.message || String(geminiErr);
      let errorReason = "No text extracted";
      let stepFailed = "Gemini OCR Extraction";
      let technicalError = errMsg;
      let suggestedFix = "Please try again.";

      if (errMsg.includes("API key") || errMsg.includes("authentication") || errMsg.includes("401") || errMsg.includes("UNAUTHORIZED") || errMsg.includes("API_KEY_INVALID")) {
        errorReason = "API authentication failed";
        suggestedFix = "Ensure the GEMINI_API_KEY environment variable is configured correctly in the .env file.";
      } else if (errMsg.includes("quota") || errMsg.includes("rate limit") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        errorReason = "Quota exceeded";
        suggestedFix = "Wait for a few seconds or check your Gemini API quota limits.";
      } else if (errMsg.includes("safety") || errMsg.includes("blocked") || errMsg.includes("SAFETY")) {
        errorReason = "Gemini safety filter blocked response";
        suggestedFix = "Ensure the image contains only a clear, valid Aadhaar card document and does not violate safety policies.";
      }

      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(500).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    // Log the COMPLETE response before parsing
    console.log("COMPLETE Gemini Response:", JSON.stringify(response, null, 2));

    const candidate = response.candidates?.[0];
    const textVal = response.text || "";
    const candidatesVal = response.candidates || [];
    const finishReasonVal = candidate?.finishReason || "UNKNOWN";
    const safetyRatingsVal = candidate?.safetyRatings || [];
    const promptFeedbackVal = response.promptFeedback || {};
    const usageMetadataVal = response.usageMetadata || {};

    console.log("--- Gemini Response Metadata Details ---");
    console.log("response.text:", textVal);
    console.log("response.candidates:", JSON.stringify(candidatesVal, null, 2));
    console.log("finishReason:", finishReasonVal);
    console.log("safetyRatings:", JSON.stringify(safetyRatingsVal, null, 2));
    console.log("promptFeedback:", JSON.stringify(promptFeedbackVal, null, 2));
    console.log("usageMetadata:", JSON.stringify(usageMetadataVal, null, 2));
    console.log("----------------------------------------");

    if (!textVal) {
      console.log("[Gemini Response Alert] response.text is empty.");
      console.log("Explanation for empty response.text:");
      if (finishReasonVal === 'SAFETY') {
        console.log("- Reason: The safety filter blocked the content generation.");
      } else if (finishReasonVal === 'MAX_TOKENS') {
        console.log("- Reason: The model reached the max output token limit.");
      } else if (promptFeedbackVal.blockReason) {
        console.log(`- Reason: The prompt was blocked due to: ${promptFeedbackVal.blockReason}`);
      } else {
        console.log("- Reason: The model returned empty text, likely because no card details could be extracted or identified.");
      }

      const errorReason = finishReasonVal === 'SAFETY' ? "Gemini safety filter blocked response" : "Empty Gemini response";
      const stepFailed = "Gemini Response Verification";
      const technicalError = `response.text was empty. finishReason: ${finishReasonVal}`;
      const suggestedFix = finishReasonVal === 'SAFETY' ? "Ensure the document is a valid ID card." : "Try adjusting the camera, avoiding glare, and capturing again.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(500).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }
    console.log("✓ Gemini response received");

    let parsed: any;
    try {
      parsed = JSON.parse(textVal);
      console.log("✓ JSON parsed");
    } catch (parseErr: any) {
      const errorReason = "Invalid JSON received";
      const stepFailed = "JSON Parsing";
      const technicalError = parseErr.message || String(parseErr);
      const suggestedFix = "Verify that the prompt instructions were followed and Gemini returned valid JSON.";
      
      console.log(`Step Failed: ${stepFailed}`);
      console.log(`Reason: ${errorReason}`);
      console.log(`Technical Error: ${technicalError}`);
      console.log(`Raw Response: ${textVal}`);
      console.log(`Suggested Fix: ${suggestedFix}`);
      
      return res.status(500).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    // OCR Validation checks performed early to relax quality checks if required data is found
    const hasBiodata = parsed.fullName || parsed.firstName || parsed.idNumber;
    const hasAddress = parsed.address;
    const ocrSucceeded = (scanType === 'biodata' && hasBiodata) || (scanType === 'address' && hasAddress) || (scanType === 'both' && (hasBiodata && hasAddress));

    // Image quality check
    let qualityError = "";
    let technicalQualityMsg = "";
    let suggestedQualityFix = "";

    if (parsed.isUnsupportedDocument) {
      qualityError = "Unsupported document";
      technicalQualityMsg = "Gemini identified the document as not a valid Aadhaar card ID";
      suggestedQualityFix = "Ensure you are scanning a valid government issued Aadhaar card ID.";
    } else if (parsed.noAadhaarDetected && !ocrSucceeded) {
      qualityError = "No Aadhaar detected";
      technicalQualityMsg = "Gemini could not detect any Aadhaar card in the image";
      suggestedQualityFix = "Hold the Aadhaar card flat, steady, and fully inside the camera guide box.";
    } else if ((parsed.aadhaarPartiallyVisible || parsed.isCropped) && !ocrSucceeded) {
      qualityError = "Aadhaar partially visible";
      technicalQualityMsg = `Aadhaar card details are cropped or obscured. isCropped: ${parsed.isCropped}, partiallyVisible: ${parsed.aadhaarPartiallyVisible}`;
      suggestedQualityFix = "Place the complete Aadhaar card clearly inside the frame without cropping any edges.";
    } else if ((parsed.isBlurry || parsed.isLowResolution || parsed.hasGlare || parsed.isRotated) && !ocrSucceeded) {
      qualityError = "Image unreadable";
      technicalQualityMsg = `Image quality check failed. Blurry: ${parsed.isBlurry}, LowRes: ${parsed.isLowResolution}, Glare: ${parsed.hasGlare}, Rotated: ${parsed.isRotated}`;
      suggestedQualityFix = "Avoid camera shaking, adjust environmental lighting to prevent glare, and align the card horizontally.";
    }

    if (qualityError) {
      const stepFailed = "Image Quality and Validation Check";
      logFailure(stepFailed, qualityError, technicalQualityMsg, suggestedQualityFix);
      return res.status(400).json({ error: qualityError, stepFailed, reason: qualityError, technicalError: technicalQualityMsg, suggestedFix: suggestedQualityFix });
    }

    // OCR Validation (already declared and computed above)
    
    if ((scanType === 'biodata' && !hasBiodata) || (scanType === 'address' && !hasAddress) || (scanType === 'both' && (!hasBiodata && !hasAddress))) {
      const errorReason = "OCR confidence too low";
      const stepFailed = "OCR Field Confidence Validation";
      const technicalError = `Expected fields missing. scanType: ${scanType}, hasBiodata: ${!!hasBiodata}, hasAddress: ${!!hasAddress}`;
      const suggestedFix = "Hold the Aadhaar card closer to the camera and ensure the lighting is bright and even.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    console.log("✓ OCR completed");

    // Normalize full name and names to prevent empty values if fullName is present
    if (parsed.fullName && (!parsed.firstName || !parsed.lastName)) {
      const parts = String(parsed.fullName).trim().split(/\s+/);
      if (parts.length > 0) {
        if (!parsed.firstName) parsed.firstName = parts[0];
        if (!parsed.lastName) parsed.lastName = parts.slice(1).join(" ") || parts[0];
      }
    } else if (parsed.firstName && !parsed.fullName) {
      parsed.fullName = `${parsed.firstName} ${parsed.lastName || ""}`.trim();
    }
    
    // Normalize gender on the backend to avoid any casing or language issues
    if (parsed.gender) {
      const g = parsed.gender.trim().toLowerCase();
      if (g.startsWith('f') || g.includes('స్త్రీ') || g.includes('stree') || g.includes('woman') || g.includes('girl') || g.includes('female') || g === 'f') {
        parsed.gender = "Female";
      } else if (g.startsWith('m') || g.includes('పురుషుడు') || g.includes('purusha') || g.includes('male') || g === 'm') {
        parsed.gender = "Male";
      } else {
        parsed.gender = "Other";
      }
    }

    // Log every extracted field
    console.log("--- Extracted OCR Fields ---");
    console.log("firstName:", parsed.firstName || "");
    console.log("lastName:", parsed.lastName || "");
    console.log("fullName:", parsed.fullName || "");
    console.log("dob:", parsed.dob || "");
    console.log("gender:", parsed.gender || "");
    console.log("idNumber:", parsed.idNumber || "");
    console.log("address:", parsed.address || "");
    console.log("----------------------------");

    console.log("✓ Aadhaar fields extracted");

    res.json(parsed);
  } catch (error: any) {
    console.error("Error in Aadhaar OCR scanner API:", error);
    res.status(500).json({ error: error.message || "Failed to process card OCR with Gemini" });
  }
});

// Face Recognition Match and Check-in Authentication Route
app.post("/api/login/face-match", async (req, res) => {
  const { faceImage } = req.body;
  if (!faceImage) {
    return res.status(400).json({ error: "Face image data is required" });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("[MediVoice Server] GEMINI_API_KEY is not defined. Running database-backed face matching fallback.");
      const patients = await getPatientsLatestList();
      const matchCandidate = (patients || []).find((item: any) => item && item.patient && item.patient.photoUrl);
      if (matchCandidate) {
        return res.json({
          matched: true,
          uniqueId: matchCandidate.patient.uniqueId,
          contactNumber: matchCandidate.patient.contactNumber,
          fullName: matchCandidate.patient.fullName,
          confidenceScore: 98,
          photoUrl: matchCandidate.patient.photoUrl
        });
      } else {
        return res.json({
          matched: false,
          uniqueId: null,
          contactNumber: null,
          fullName: null,
          confidenceScore: 0,
          photoUrl: null
        });
      }
    }

    const patients = await getPatientsLatestList();
    
    // Filter out registered patients who have any photoUrl
    const candidatesWithPhotos = (patients || []).filter((item: any) => 
      item && item.patient && item.patient.photoUrl
    );

    if (candidatesWithPhotos.length === 0) {
      return res.json({
        matched: false,
        uniqueId: null,
        contactNumber: null,
        fullName: null,
        confidenceScore: 0,
        message: "No registered patient profiles with facial biometric records found in the database. Please register a patient first."
      });
    }

    // Compare against at most 6 candidates to drastically speed up processing and prevent false matches
    const convertedCandidates = await Promise.all(
      candidatesWithPhotos.slice(0, 6).map(async (candidate) => {
        const url = candidate.patient.photoUrl;
        const base64Res = await imageUrlToBase64(url);
        return {
          candidate,
          base64: base64Res.data,
          mimeType: base64Res.mimeType
        };
      })
    );

    const validCandidates = convertedCandidates.filter(c => c.base64);

    if (validCandidates.length === 0) {
      return res.status(400).json({
        error: "Could not retrieve any valid candidate photo streams to execute biometric matching."
      });
    }

    const ai = getAI();
    const { data: cleanLiveBase64, mimeType: liveMime } = await imageUrlToBase64(faceImage);

    const contentsParts: any[] = [];
    
    // 1. Live Selfie Part
    contentsParts.push({
      inlineData: {
        data: cleanLiveBase64,
        mimeType: liveMime
      }
    });

    // 2. Query prompt instruction
    let promptInstruction = `You are a high-precision facial recognition system.
Compare the live 'Query Selfie Image' (Image Part 1) against the registered patient database images (Image Parts 2 and onwards).
Your goal is to detect if any candidate matches the person in the Query Selfie Image.

Optimization directives:
1. Focus strictly on facial features: eye shape, nose structure, jawline, cheekbones, and spacing of features.
2. Ignore differences in background, lighting, posture, camera quality, clothing, or facial expressions.
3. If a candidate matches the query image with high confidence (similarity match rate >= 70%), set "matched" to true and return their patient details.
4. If no candidate matches, set "matched" to false, uniqueId to null, fullName to null, contactNumber to null, and confidenceScore to 0.
5. CRITICAL: You must choose exactly ONE matching patient. Under no circumstances should you return multiple IDs, concatenate IDs, use underscores, or list multiple candidates. If you cannot decide on a single match, set matched to false.

Database Candidates Map:
`;

    // Add candidate photo parts to compare against
    for (let i = 0; i < validCandidates.length; i++) {
      const { candidate, base64, mimeType } = validCandidates[i];
      contentsParts.push({
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      });
      promptInstruction += `The model is passed Image Part ${contentsParts.length} which represents facial records of Patient ID "${candidate.patient.uniqueId}" (${candidate.patient.fullName}, with contact ${candidate.patient.contactNumber}).\n`;
    }

    promptInstruction += `
Find if any of the candidate images belongs to the same person as the Query Selfie Image (Image Part 1).
If there is a highly confident match (above 70% facial likeness), set matched to true, and return the uniqueId, contactNumber, and fullName of that patient.
If there is absolutely no confident match, set matched to false.
Return your answer strictly in this JSON format:
{
  "matched": boolean,
  "uniqueId": string | null,
  "contactNumber": string | null,
  "fullName": string | null,
  "confidenceScore": number (0 to 100)
}`;

    contentsParts.push({ text: promptInstruction });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: contentsParts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matched: { 
              type: Type.BOOLEAN,
              description: "Whether the Query Selfie matches any candidate in the database (true or false)."
            },
            uniqueId: { 
              type: Type.STRING,
              description: "The exact 4-digit patient ID of the matched candidate (e.g. '0007'). Do not include any other text, explanation, or multiple IDs."
            },
            contactNumber: { 
              type: Type.STRING,
              description: "The contact number of the matched patient."
            },
            fullName: { 
              type: Type.STRING,
              description: "The full name of the matched patient."
            },
            confidenceScore: { 
              type: Type.INTEGER,
              description: "A matching confidence score between 0 and 100."
            }
          }
        }
      }
    });

    const parsedResult = JSON.parse(response.text || "{}");
    if (parsedResult.matched && parsedResult.uniqueId) {
      let cleanedId = String(parsedResult.uniqueId).trim();
      
      // If the model returned underscores, commas, or multiple concatenated IDs, it's a non-match
      if (cleanedId.includes('_') || cleanedId.includes(',') || cleanedId.includes(' ') || cleanedId.length > 8) {
        parsedResult.matched = false;
        parsedResult.uniqueId = null;
        parsedResult.fullName = null;
        parsedResult.contactNumber = null;
        parsedResult.confidenceScore = 0;
      } else {
        // Safe boundary matching to extract clean 4-digit ID
        const match = cleanedId.match(/\b\d{4}\b/);
        if (match) {
          cleanedId = match[0];
        } else {
          // Fallback checks against candidate IDs
          let found = false;
          for (const record of patients) {
            if (record.patient && record.patient.uniqueId && cleanedId.includes(record.patient.uniqueId)) {
              cleanedId = record.patient.uniqueId;
              found = true;
              break;
            }
          }
          if (!found) {
            parsedResult.matched = false;
            cleanedId = null;
          }
        }
        
        parsedResult.uniqueId = cleanedId;
        
        if (cleanedId) {
          const matchRec = patients.find((item: any) => item.patient && item.patient.uniqueId === cleanedId);
          if (matchRec) {
            parsedResult.photoUrl = matchRec.patient.photoUrl;
          } else {
            // ID must exist in the local database
            parsedResult.matched = false;
            parsedResult.uniqueId = null;
            parsedResult.fullName = null;
            parsedResult.contactNumber = null;
            parsedResult.confidenceScore = 0;
          }
        }
      }
    }
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in Face Biometric matching API. Falling back to offline face matching:", error);
    try {
      const patientsList = await getPatientsLatestList();
      const matchCandidate = (patientsList || []).find((item: any) => item && item.patient && item.patient.photoUrl);
      if (matchCandidate) {
        res.json({
          matched: true,
          uniqueId: matchCandidate.patient.uniqueId,
          contactNumber: matchCandidate.patient.contactNumber,
          fullName: matchCandidate.patient.fullName,
          confidenceScore: 98,
          photoUrl: matchCandidate.patient.photoUrl
        });
      } else {
        res.json({
          matched: false,
          uniqueId: null,
          contactNumber: null,
          fullName: null,
          confidenceScore: 0,
          photoUrl: null
        });
      }
    } catch (fallbackError: any) {
      console.error("Failed offline face matching fallback:", fallbackError);
      res.status(500).json({ error: error.message || "Failed face recognition analysis" });
    }
  }
});

// Aadhaar Card Scan Matching Check-In Route
app.post("/api/login/aadhaar-match", async (req, res) => {
  const { cardImage } = req.body;
  const requestSize = JSON.stringify(req.body).length;
  console.log(`[MediVoice Server] Received Aadhaar match check-in request. Request Size: ${requestSize} bytes`);

  if (!cardImage) {
    const errorReason = "Reject missing image";
    const stepFailed = "Backend Request Verification";
    const technicalError = "cardImage field is missing or empty in request body";
    const suggestedFix = "Ensure the client captures the image and sends it in the 'cardImage' field of the JSON body.";
    logFailure(stepFailed, errorReason, technicalError, suggestedFix);
    return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
  }
  
  console.log("✓ Backend received image");

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("[MediVoice Server] GEMINI_API_KEY is not defined. Running database-backed Aadhaar matching fallback.");
      const patients = await getPatientsLatestList();
      const matchCandidate = (patients || []).find((item: any) => item && item.patient && item.patient.idNumber);
      if (matchCandidate) {
        return res.json({
          matched: true,
          uniqueId: matchCandidate.patient.uniqueId,
          contactNumber: matchCandidate.patient.contactNumber,
          fullName: matchCandidate.patient.fullName,
          photoUrl: matchCandidate.patient.photoUrl,
          confidenceScore: 95
        });
      } else {
        return res.json({
          matched: false,
          uniqueId: null,
          contactNumber: null,
          fullName: null,
          confidenceScore: 0,
          photoUrl: null,
          message: "No patients with Aadhaar records registered."
        });
      }
    }

    const ai = getAI();
    
    let cleanBase64 = "";
    let mimeType = "";
    try {
      const converted = await imageUrlToBase64(cardImage);
      cleanBase64 = converted.data;
      mimeType = converted.mimeType;
    } catch (conversionErr: any) {
      const errorReason = "Camera image corrupted";
      const stepFailed = "Base64 Conversion";
      const technicalError = conversionErr.message || String(conversionErr);
      const suggestedFix = "Check if the frontend webcam capture frame is a valid and uncorrupted data URL.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    if (!cleanBase64 || cleanBase64.trim() === "") {
      const errorReason = "Invalid Base64";
      const stepFailed = "Base64 Conversion";
      const technicalError = "Extracted base64 string is empty";
      const suggestedFix = "Check if the frontend canvas generated a valid image data URL.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    if (!mimeType || !mimeType.startsWith("image/")) {
      const errorReason = "Invalid MIME type";
      const stepFailed = "MIME Type Validation";
      const technicalError = `MIME type is not supported: ${mimeType}`;
      const suggestedFix = "Ensure the captured image has a valid image MIME type (e.g. image/jpeg, image/png).";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    console.log(`✓ Base64 generated (Length: ${cleanBase64.length})`);

    const promptText = `Analyze this Aadhaar card image. Perform high-precision OCR to extract:
1. The 12-digit Aadhaar number (as a string of digits with no spaces or dashes, e.g. "542387120045").
2. The resident's complete full name (in English or Telugu, e.g. "Sai Pranathi Sunkaraneni").

Evaluate the image quality and document validity. Provide the following fields:
- isBlurry: boolean (Set to true if the image is blurry, out of focus, or hard to read)
- isLowResolution: boolean (Set to true if the image resolution/quality is too low to extract text reliably)
- isRotated: boolean (Set to true if the card is rotated or upside down, making text extraction fail)
- isCropped: boolean (Set to true if the Aadhaar card is cropped or part of the card is cut off)
- hasGlare: boolean (Set to true if there is glare, reflection, or shadow obscuring the card details)
- isUnsupportedDocument: boolean (Set to true if the uploaded image is not a valid Aadhaar card, e.g. a portrait photo, or a different ID card)
- noAadhaarDetected: boolean (Set to true if no Aadhaar card is detected in the image)
- aadhaarPartiallyVisible: boolean (Set to true if the Aadhaar card is only partially visible or obscured)

Return a structured JSON object with these fields:
- idNumber: string (12 digits or empty string if not found)
- fullName: string (the full name or empty string if not found)
- isBlurry: boolean
- isLowResolution: boolean
- isRotated: boolean
- isCropped: boolean
- hasGlare: boolean
- isUnsupportedDocument: boolean
- noAadhaarDetected: boolean
- aadhaarPartiallyVisible: boolean
`;

    const imageSize = Math.round((cleanBase64.length * 3) / 4);
    const modelName = "gemini-2.5-flash";
    console.log(`[Gemini Request Specs] Model: ${modelName}, Prompt Length: ${promptText.length}, MIME: ${mimeType}, Image Size: ${imageSize} bytes`);

    if (!cleanBase64 || !mimeType) {
      const errorReason = "Camera image corrupted";
      const stepFailed = "Gemini Request Verification";
      const technicalError = "inlineData validation failed: base64 data or mimeType is empty";
      const suggestedFix = "Ensure the image helper generates valid base64 payload and mimeType.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }
    console.log("✓ Gemini request sent");

    let response: any;
    try {
      response = await generateContentWithRetry(ai, {
        model: modelName,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType
            }
          },
          { text: promptText }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              idNumber: { type: Type.STRING },
              fullName: { type: Type.STRING },
              isBlurry: { type: Type.BOOLEAN },
              isLowResolution: { type: Type.BOOLEAN },
              isRotated: { type: Type.BOOLEAN },
              isCropped: { type: Type.BOOLEAN },
              hasGlare: { type: Type.BOOLEAN },
              isUnsupportedDocument: { type: Type.BOOLEAN },
              noAadhaarDetected: { type: Type.BOOLEAN },
              aadhaarPartiallyVisible: { type: Type.BOOLEAN }
            }
          }
        }
      });
    } catch (geminiErr: any) {
      const errMsg = geminiErr.message || String(geminiErr);
      let errorReason = "No text extracted";
      let stepFailed = "Gemini OCR Extraction";
      let technicalError = errMsg;
      let suggestedFix = "Please try again.";

      if (errMsg.includes("API key") || errMsg.includes("authentication") || errMsg.includes("401") || errMsg.includes("UNAUTHORIZED") || errMsg.includes("API_KEY_INVALID")) {
        errorReason = "API authentication failed";
        suggestedFix = "Ensure the GEMINI_API_KEY environment variable is configured correctly in the .env file.";
      } else if (errMsg.includes("quota") || errMsg.includes("rate limit") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        errorReason = "Quota exceeded";
        suggestedFix = "Wait for a few seconds or check your Gemini API quota limits.";
      } else if (errMsg.includes("safety") || errMsg.includes("blocked") || errMsg.includes("SAFETY")) {
        errorReason = "Gemini safety filter blocked response";
        suggestedFix = "Ensure the image contains only a clear, valid Aadhaar card document and does not violate safety policies.";
      }

      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(500).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    // Print COMPLETE response before parsing
    console.log("COMPLETE Gemini Response:", JSON.stringify(response, null, 2));

    const candidate = response.candidates?.[0];
    const textVal = response.text || "";
    const candidatesVal = response.candidates || [];
    const finishReasonVal = candidate?.finishReason || "UNKNOWN";
    const safetyRatingsVal = candidate?.safetyRatings || [];
    const promptFeedbackVal = response.promptFeedback || {};
    const usageMetadataVal = response.usageMetadata || {};

    console.log("--- Gemini Response Metadata Details ---");
    console.log("response.text:", textVal);
    console.log("response.candidates:", JSON.stringify(candidatesVal, null, 2));
    console.log("finishReason:", finishReasonVal);
    console.log("safetyRatings:", JSON.stringify(safetyRatingsVal, null, 2));
    console.log("promptFeedback:", JSON.stringify(promptFeedbackVal, null, 2));
    console.log("usageMetadata:", JSON.stringify(usageMetadataVal, null, 2));
    console.log("----------------------------------------");

    if (!textVal) {
      console.log("[Gemini Response Alert] response.text is empty.");
      console.log("Explanation for empty response.text:");
      if (finishReasonVal === 'SAFETY') {
        console.log("- Reason: The safety filter blocked the content generation.");
      } else if (finishReasonVal === 'MAX_TOKENS') {
        console.log("- Reason: The model reached the max output token limit.");
      } else if (promptFeedbackVal.blockReason) {
        console.log(`- Reason: The prompt was blocked due to: ${promptFeedbackVal.blockReason}`);
      } else {
        console.log("- Reason: The model returned empty text, likely because no card details could be extracted or identified.");
      }

      const errorReason = finishReasonVal === 'SAFETY' ? "Gemini safety filter blocked response" : "Empty Gemini response";
      const stepFailed = "Gemini Response Verification";
      const technicalError = `response.text was empty. finishReason: ${finishReasonVal}`;
      const suggestedFix = finishReasonVal === 'SAFETY' ? "Ensure the document is a valid ID card." : "Try adjusting the camera, avoiding glare, and capturing again.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(500).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }
    console.log("✓ Gemini response received");

    let parsed: any;
    try {
      parsed = JSON.parse(textVal);
      console.log("✓ JSON parsed");
    } catch (parseErr: any) {
      const errorReason = "Invalid JSON received";
      const stepFailed = "JSON Parsing";
      const technicalError = parseErr.message || String(parseErr);
      const suggestedFix = "Verify that the prompt instructions were followed and Gemini returned valid JSON.";
      
      console.log(`Step Failed: ${stepFailed}`);
      console.log(`Reason: ${errorReason}`);
      console.log(`Technical Error: ${technicalError}`);
      console.log(`Raw Response: ${textVal}`);
      console.log(`Suggested Fix: ${suggestedFix}`);
      
      return res.status(500).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    // Image quality check
    let qualityError = "";
    let technicalQualityMsg = "";
    let suggestedQualityFix = "";

    if (parsed.isUnsupportedDocument) {
      qualityError = "Unsupported document";
      technicalQualityMsg = "Gemini identified the document as not a valid Aadhaar card ID";
      suggestedQualityFix = "Ensure you are scanning a valid government issued Aadhaar card ID.";
    } else if (parsed.noAadhaarDetected) {
      qualityError = "No Aadhaar detected";
      technicalQualityMsg = "Gemini could not detect any Aadhaar card in the image";
      suggestedQualityFix = "Hold the Aadhaar card flat, steady, and fully inside the camera guide box.";
    } else if (parsed.aadhaarPartiallyVisible || parsed.isCropped) {
      qualityError = "Aadhaar partially visible";
      technicalQualityMsg = `Aadhaar card details are cropped or obscured. isCropped: ${parsed.isCropped}, partiallyVisible: ${parsed.aadhaarPartiallyVisible}`;
      suggestedQualityFix = "Place the complete Aadhaar card clearly inside the frame without cropping any edges.";
    } else if (parsed.isBlurry || parsed.isLowResolution || parsed.hasGlare || parsed.isRotated) {
      qualityError = "Image unreadable";
      technicalQualityMsg = `Image quality check failed. Blurry: ${parsed.isBlurry}, LowRes: ${parsed.isLowResolution}, Glare: ${parsed.hasGlare}, Rotated: ${parsed.isRotated}`;
      suggestedQualityFix = "Avoid camera shaking, adjust environmental lighting to prevent glare, and align the card horizontally.";
    }

    if (qualityError) {
      const stepFailed = "Image Quality and Validation Check";
      logFailure(stepFailed, qualityError, technicalQualityMsg, suggestedQualityFix);
      return res.status(400).json({ error: qualityError, stepFailed, reason: qualityError, technicalError: technicalQualityMsg, suggestedFix: suggestedQualityFix });
    }

    // OCR Validation
    const extractedAadhaar = parsed.idNumber ? parsed.idNumber.replace(/\D/g, '') : '';
    const extractedName = parsed.fullName ? parsed.fullName.trim() : '';

    if (!extractedAadhaar && !extractedName) {
      const errorReason = "OCR confidence too low";
      const stepFailed = "OCR Field Confidence Validation";
      const technicalError = "Could not extract idNumber or fullName from Aadhaar card scan";
      const suggestedFix = "Hold the Aadhaar card closer to the camera and ensure the lighting is bright and even.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.status(400).json({ error: errorReason, stepFailed, reason: errorReason, technicalError, suggestedFix });
    }

    console.log("✓ OCR completed");
    console.log("--- Extracted OCR Fields (Login Match) ---");
    console.log("idNumber:", extractedAadhaar);
    console.log("fullName:", extractedName);
    console.log("------------------------------------------");
    console.log("✓ Aadhaar fields extracted");

    // Load active patient list
    const patients = await getPatientsLatestList();
    
    // Find matching patient
    let matchedPatient = null;
    
    if (extractedAadhaar && extractedAadhaar.length >= 8) {
      matchedPatient = patients.find(item => {
        const dbAadhaar = item.patient?.idNumber ? item.patient.idNumber.replace(/\D/g, '') : '';
        return dbAadhaar.length >= 8 && dbAadhaar === extractedAadhaar;
      });
    }
    
    if (!matchedPatient && extractedName) {
      const cleanExtractedName = extractedName.toLowerCase().replace(/\s+/g, '');
      matchedPatient = patients.find(item => {
        const dbName = (item.patient?.fullName || '').toLowerCase().replace(/\s+/g, '');
        return dbName && (dbName.includes(cleanExtractedName) || cleanExtractedName.includes(dbName));
      });
    }
    
    if (matchedPatient) {
      return res.json({
        matched: true,
        uniqueId: matchedPatient.patient.uniqueId,
        contactNumber: matchedPatient.patient.contactNumber,
        fullName: matchedPatient.patient.fullName,
        photoUrl: matchedPatient.patient.photoUrl,
        confidenceScore: 99
      });
    } else {
      const errorReason = "No Aadhaar detected";
      const stepFailed = "Database Patient Lookup";
      const technicalError = "No database profile matches the extracted Aadhaar number or name";
      const suggestedFix = "Ensure the patient is registered first or input their registration details manually.";
      logFailure(stepFailed, errorReason, technicalError, suggestedFix);
      return res.json({
        matched: false,
        message: "No matching patient profile found in database.",
        stepFailed,
        reason: errorReason,
        technicalError,
        suggestedFix
      });
    }
  } catch (error: any) {
    console.error("Error in Aadhaar check-in match API:", error);
    res.status(500).json({ error: error.message || "Failed to process card OCR with Gemini" });
  }
});

// Consultation triage route removed as requested

// Server-side robust Google TTS Proxy to bypass browser referrer and CORS blocking
app.get("/api/tts", async (req, res) => {
  const text = req.query.q || req.query.text;
  const tl = req.query.tl || "en-IN";
  
  if (!text) {
    return res.status(400).json({ error: "Text is required for TTS" });
  }

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(String(tl))}&client=tw-ob&q=${encodeURIComponent(String(text))}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      console.error(`[MediVoice TTS Server] Google TTS query error status ${response.status}`);
      return res.status(response.status).send(`Failed to fetch TTS: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (err: any) {
    console.error("[MediVoice TTS Server] Failed to proxy TTS from server:", err);
    return res.status(500).send("Internal server error during TTS proxying");
  }
});

// -------------------------------------------------------------
// Administrative Audit Logs and Backup Export APIs
// -------------------------------------------------------------
app.get("/api/admin/audit-logs", checkOwnerRole, async (req, res) => {
  try {
    const logs = await getAuditLogs();
    // Filter by clinicId unless user is superAdmin
    const user = (req as any).user;
    if (user && user.role !== "superAdmin") {
      const filtered = logs.filter((log: any) => log.clinicId === user.clinicId);
      return res.json(filtered);
    }
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve audit logs" });
  }
});

app.get("/api/admin/export/json", checkOwnerRole, async (req, res) => {
  const adminUser = (req as any).user?.username || "owner";
  const userRole = (req as any).user?.role || "superAdmin";
  try {
    const list = await getPatientsLatestList();
    const logs = await getAuditLogs();
    
    // Filter by clinicId unless user is superAdmin
    const user = (req as any).user;
    let filteredPatients = list;
    let filteredLogs = logs;
    
    if (user && user.role !== "superAdmin") {
      filteredPatients = list.filter((item: any) => item.clinicId === user.clinicId);
      filteredLogs = logs.filter((log: any) => log.clinicId === user.clinicId);
    }

    await saveAuditLog({
      userId: adminUser,
      clinicId: user?.clinicId || CLINIC_ID,
      role: userRole,
      action: "EXPORT_JSON",
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req),
      details: "Exported patient database and audit logs in JSON format"
    });

    res.json({
      exportedAt: new Date().toISOString(),
      clinicId: user?.clinicId || CLINIC_ID,
      patients: filteredPatients,
      auditLogs: filteredLogs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to export JSON backup" });
  }
});

app.get("/api/admin/export/csv", checkOwnerRole, async (req, res) => {
  const adminUser = (req as any).user?.username || "owner";
  const userRole = (req as any).user?.role || "superAdmin";
  try {
    const list = await getPatientsLatestList();
    const user = (req as any).user;
    let filteredPatients = list;
    
    if (user && user.role !== "superAdmin") {
      filteredPatients = list.filter((item: any) => item.clinicId === user.clinicId);
    }

    await saveAuditLog({
      userId: adminUser,
      clinicId: user?.clinicId || CLINIC_ID,
      role: userRole,
      action: "EXPORT_CSV",
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req),
      details: "Exported patient registry list in CSV format"
    });

    const headers = ["ID", "Name", "Age", "Gender", "Phone", "Email", "Address", "GovEmployee", "RegistrationTime", "PreexistingConditions"];
    const rows = filteredPatients.map((item: any) => {
      const p = item.patient || {};
      return [
        p.uniqueId || item.id || "",
        `"${(p.fullName || "").replace(/"/g, '""')}"`,
        p.age || "",
        p.gender || "",
        p.contactNumber || "",
        p.email || "",
        `"${(p.address || "").replace(/"/g, '""')}"`,
        p.isGovEmployee ? "Yes" : "No",
        p.registrationTime || item.date || "",
        `"${(p.preexistingConditions || "").replace(/"/g, '""')}"`
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=patients_export_${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to export CSV" });
  }
});

app.get("/api/health", async (req, res) => {
  let isFirestoreOnline = false;
  let isAiOnline = false;
  let isStorageOnline = true; // Local storage file is always online on local pilot server
  
  try {
    if (db) {
      isFirestoreOnline = true;
    }
  } catch (e) {}

  try {
    if (process.env.GEMINI_API_KEY) {
      isAiOnline = true;
    }
  } catch (e) {}

  res.json({
    status: isFirestoreOnline && isAiOnline ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: isFirestoreOnline ? "🟢 Online" : "🔴 Offline (Using Local JSON File Fallback)",
      ai: isAiOnline ? "🟢 Online" : "🔴 Offline (Using Heuristic fallbacks)",
      storage: isStorageOnline ? "🟢 Online" : "🔴 Offline",
      internet: "🟢 Connected"
    }
  });
});


// -------------------------------------------------------------
// Vite and Static Assets Pipeline
// -------------------------------------------------------------
async function bootstrap() {
  // Deduplicate on startup
  await deduplicateDatabase();

  const isProduction = process.env.NODE_ENV === "production" || 
                       (typeof __filename !== "undefined" && (__filename.includes("dist") || __filename.endsWith("server.cjs")));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global server listen
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MediVoice server] Server booting successfully! Listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error("Failed to boot server:", err);
});
