/**
 * Highly structured types for the MediVoice Medical Kiosk interfaces.
 */

export type ScreenState = 
  | 'login'
  | 'langSelect'
  | 'registration'
  | 'voiceConsult'
  | 'report'
  | 'history'
  | 'owner'
  | 'revisit';

export interface Patient {
  clinicId?: string; // Multi-clinic tenant isolation reference
  firstName?: string;
  lastName?: string;
  fullName: string; // Combined for backward compatibility
  dob?: string;
  age: number | null;
  gender: string;
  contactNumber: string;
  email?: string;
  address?: string;
  idType?: 'Aadhaar' | 'PAN ID' | 'Voter ID' | 'Employee ID';
  idNumber?: string;
  isGovEmployee?: boolean;
  faceCaptureId?: string; // Biometric reference ID
  photoUrl?: string; // Captured patient face photo (Base64 data / remote URL)
  uniqueId?: string; // Sequential 4-digit ID (e.g. 0001)
  registrationTime?: string; // Live registration timestamp
  preferredLanguage: 'english' | 'telugu';
  preexistingConditions: string;
  currentSymptoms: string;
  consentGiven?: boolean;
  consentTimestamp?: string;
  consentVersion?: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface Message {
  sender: 'doctor' | 'patient';
  text: string;
  timestamp: string;
}

export interface ConsultReport {
  suspectedDiagnosis: string;
  urgencyLevel: 'Low' | 'Moderate' | 'High';
  explanation: string;
  precautions: string[];
  exercises: string[];
  remedies: string[];
  specialist: string;
  icdCode?: string;
  asanas?: string[];
  motivationalTasks?: string[];
  feelings?: string;
  riskIndicators?: { factor: string; score: number }[];
}

export interface ConsultHistoryItem {
  id: string;
  clinicId?: string; // Multi-clinic tenant isolation reference
  date: string;
  language: 'english' | 'telugu';
  patient: Patient;
  history?: Message[];
  report?: ConsultReport | null;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}
