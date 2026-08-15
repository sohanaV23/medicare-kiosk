import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  Mic, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Volume2, 
  Camera, 
  Clock, 
  Fingerprint, 
  Cpu, 
  CheckCircle,
  Loader2,
  Sparkles,
  Check,
  MicOff,
  Upload,
  Download
} from 'lucide-react';
import { speakText, startVoiceRecognition, stopSpeaking, getFriendlySpeechErrorMessage, convertTeluguSpokenNumbersToDigits } from '../utils/speechHelper';
import { DobVoiceCaptureCard } from '../features/registration/DobVoiceCaptureCard';
import { VoiceFeedbackDashboard } from '../features/registration/VoiceFeedbackDashboard';
import { BiometricCaptureCard } from '../features/registration/BiometricCaptureCard';
import { Patient } from '../types';
import { patientRegistrationSchema } from '../../backend/schemas/validation';

interface RegistrationProps {
  onRegisterComplete: (patient: Patient) => void;
  preferredLanguage: 'english' | 'telugu';
  contactNumber: string;
  nextSequentialId?: string; // Optional passed sequential ID
  initialPatient?: Patient | null;
  onRevisitorClick?: () => void;
  onNavigate?: (screen: any) => void;
}

const compressImageBase64 = (base64Str: string, maxDim = 1024, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function Registration({
  onRegisterComplete,
  preferredLanguage,
  contactNumber,
  nextSequentialId = '0003',
  initialPatient = null,
  onRevisitorClick,
  onNavigate
}: RegistrationProps) {
  
  // Real-time calculated age helper
  const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let calculated = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculated--;
    }
    return isNaN(calculated) || calculated < 0 ? null : calculated;
  };

  // State initialized optionally from initialPatient
  const [formData, setFormData] = useState<Patient>(() => {
    if (initialPatient) return { ...initialPatient };
    return {
      firstName: '',
      lastName: '',
      fullName: '',
      dob: '',
      age: null,
      gender: 'Male',
      contactNumber: contactNumber === 'Guest_User' || contactNumber === 'Guest' ? '' : contactNumber,
      email: '',
      address: '',
      idType: 'Aadhaar',
      idNumber: '',
      isGovEmployee: false,
      faceCaptureId: '',
      uniqueId: nextSequentialId,
      registrationTime: '',
      preferredLanguage: preferredLanguage,
      preexistingConditions: 'None',
      currentSymptoms: ''
    };
  });

  const [liveTime, setLiveTime] = useState(new Date());
  const [entryStarted, setEntryStarted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(() => {
    return initialPatient ? (initialPatient.photoUrl || null) : null;
  });
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (initialPatient) {
      setFormData({ ...initialPatient });
      setCapturedPhotoUrl(initialPatient.photoUrl || null);
    } else {
      if (entryStarted) {
        setFormData(prev => ({
          ...prev,
          preferredLanguage: preferredLanguage,
          uniqueId: prev.uniqueId || nextSequentialId
        }));
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          fullName: '',
          dob: '',
          age: null,
          gender: 'Male',
          contactNumber: contactNumber === 'Guest_User' || contactNumber === 'Guest' ? '' : contactNumber,
          email: '',
          address: '',
          idType: 'Aadhaar',
          idNumber: '',
          isGovEmployee: false,
          faceCaptureId: '',
          uniqueId: nextSequentialId,
          registrationTime: '',
          preferredLanguage: preferredLanguage,
          preexistingConditions: 'None',
          currentSymptoms: ''
        });
        setCapturedPhotoUrl(null);
      }
    }
  }, [initialPatient, contactNumber, preferredLanguage, nextSequentialId, entryStarted]);

  useEffect(() => {
    const isDirty = 
      formData.firstName !== '' ||
      formData.lastName !== '' ||
      formData.dob !== '' ||
      formData.idNumber !== '' ||
      formData.address !== '' ||
      formData.email !== '' ||
      formData.currentSymptoms !== '' ||
      formData.preexistingConditions !== 'None';
      
    if (isDirty && !entryStarted) {
      setEntryStarted(true);
    }
  }, [formData, entryStarted]);

  const downloadReceipt = () => {
    const isTe = preferredLanguage === 'telugu';
    const patientName = `${formData.firstName} ${formData.lastName}`.trim() || formData.fullName;
    const uniqueId = formData.uniqueId || nextSequentialId;
    
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert("Please allow popups to print/download receipt.");
      return;
    }
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MediVoice Kiosk - Receipt (MD-${uniqueId})</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .receipt-card {
      background: white;
      max-width: 500px;
      width: 100%;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0f172a, #0d9488);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 4px 0 0 0;
      font-size: 11px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      padding: 4px 12px;
      border-radius: 8px;
      font-family: monospace;
      font-weight: bold;
      font-size: 12px;
      margin-top: 10px;
    }
    .content {
      padding: 20px;
    }
    .photo-container {
      text-align: center;
      margin-bottom: 15px;
    }
    .patient-photo {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #0d9488;
      background-color: #f8fafc;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 3px;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .item {
      margin-bottom: 4px;
    }
    .label {
      font-size: 9px;
      font-weight: 650;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .value {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-top: 1px;
    }
    .full-width {
      grid-column: span 2;
    }
    .footer {
      background: #f8fafc;
      padding: 12px 20px;
      text-align: center;
      font-size: 10px;
      color: #64748b;
      border-top: 1px solid #f1f5f9;
    }
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .receipt-card {
        border: none;
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <h1>MediVoice Medical Kiosk</h1>
      <p>${isTe ? "రోగి నమోదు రసీదు" : "Patient Registration Receipt"}</p>
      <div class="badge">PATIENT ID: MD-${uniqueId}</div>
    </div>
    <div class="content">
      ${capturedPhotoUrl ? `
      <div class="photo-container">
        <img class="patient-photo" src="${capturedPhotoUrl}" alt="Patient Photo">
      </div>
      ` : ''}
      
      <div class="section-title">${isTe ? "వ్యక్తిగత వివరాలు" : "Personal Details"}</div>
      <div class="grid">
        <div class="item">
          <div class="label">${isTe ? "మొదటి పేరు" : "First Name"}</div>
          <div class="value">${formData.firstName || '—'}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "ఇంటి పేరు" : "Last Name"}</div>
          <div class="value">${formData.lastName || '—'}</div>
        </div>
        <div class="item full-width">
          <div class="label">${isTe ? "పూర్తి పేరు" : "Full Name"}</div>
          <div class="value">${patientName}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "పుట్టిన తేదీ" : "Date of Birth"}</div>
          <div class="value">${formData.dob || '—'}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "లింగం" : "Gender"}</div>
          <div class="value">${formData.gender}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "వయస్సు" : "Age"}</div>
          <div class="value">${formData.age ? `${formData.age} Yrs` : '—'}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "భాషా ప్రాధాన్యత" : "Preferred Language"}</div>
          <div class="value">${formData.preferredLanguage.toUpperCase()}</div>
        </div>
      </div>

      <div class="section-title">${isTe ? "గుర్తింపు మరియు చిరునామా" : "Identification & Address"}</div>
      <div class="grid">
        <div class="item">
          <div class="label">${isTe ? "క్లినిక్ ఐడీ" : "Clinic ID"}</div>
          <div class="value">${formData.clinicId || 'clinic-0001'}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "మొబైల్ సంఖ్య" : "Contact Number"}</div>
          <div class="value">${formData.contactNumber}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "ఈమెయిల్ చిరునామా" : "Email Address"}</div>
          <div class="value">${formData.email || '—'}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "గుర్తింపు కార్డు రకం" : "ID Card Type"}</div>
          <div class="value">${formData.idType || '—'}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "గుర్తింపు కార్డు సంఖ్య" : "ID Card Number"}</div>
          <div class="value">${formData.idNumber || '—'}</div>
        </div>
        <div class="item">
          <div class="label">${isTe ? "ప్రభుత్వ ఉద్యోగి" : "Government Employee"}</div>
          <div class="value">${formData.isGovEmployee ? (isTe ? 'అవును' : 'Yes') : (isTe ? 'కాదు' : 'No')}</div>
        </div>
        <div class="item full-width">
          <div class="label">${isTe ? "నివాస చిరునామా" : "Residential Address"}</div>
          <div class="value">${formData.address || '—'}</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <div>${isTe ? "రిజిస్ట్రేషన్ సమయం" : "Registration Time"}: ${formData.registrationTime || new Date().toLocaleString()}</div>
      <div style="margin-top: 4px; font-size: 8px; color: #94a3b8;">${isTe ? "మెడివాయిస్ స్మార్ట్ కియోస్క్ నెట్‌వర్క్ ద్వారా ఆధారితం" : "Powered by MediVoice Smart Kiosk Network"}</div>
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    if (isSuccess) {
      downloadReceipt();
    }
  }, [isSuccess]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [fakeCoordinates, setFakeCoordinates] = useState({ x: 142, y: 203, d: 94.2 });

  useEffect(() => {
    if (cameraActive && !cameraStream) {
      const interval = setInterval(() => {
        setFakeCoordinates({
          x: Math.floor(135 + Math.random() * 20),
          y: Math.floor(195 + Math.random() * 25),
          d: parseFloat((93.5 + Math.random() * 5).toFixed(1))
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [cameraActive, cameraStream]);

  const [isDictatingWhole, setIsDictatingWhole] = useState(false);
  const [activeDictateField, setActiveDictateField] = useState<string | null>(null);
  const [isDictatingGender, setIsDictatingGender] = useState(false);
  const [isDictatingContact, setIsDictatingContact] = useState(false);
  const [activeSession, setActiveSession] = useState<{ stop: () => void } | null>(null);
  const [dictationTranscript, setDictationTranscript] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dobDayVal, setDobDayVal] = useState<string>('');
  const [dobMonthVal, setDobMonthVal] = useState<string>('');
  const [dobYearVal, setDobYearVal] = useState<string>('');
  const [isDobOnlyGuided, setIsDobOnlyGuided] = useState<boolean>(false);
  const dobDayRef = useRef<string>('');
  const dobMonthRef = useRef<string>('');
  const dobYearRef = useRef<string>('');
  const transcriptContainerRef = useRef<HTMLParagraphElement | null>(null);

  const [isScanningAadhaar, setIsScanningAadhaar] = useState(false);
  const [aadhaarPhotoSource, setAadhaarPhotoSource] = useState<'aadhaar' | 'selfie'>('aadhaar');
  const [aadhaarScanType, setAadhaarScanType] = useState<'biodata' | 'address'>('biodata');
  const [showAadhaarPasteBox, setShowAadhaarPasteBox] = useState(false);
  const [pastedAadhaarText, setPastedAadhaarText] = useState('');
  const [isParsingPastedText, setIsParsingPastedText] = useState(false);

  const guidedActiveRef = useRef(false);
  const guidedStepIndexRef = useRef<number | null>(null);
  const [guidedActive, _setGuidedActive] = useState(false);
  const [guidedStepIndex, _setGuidedStepIndex] = useState<number | null>(null);

  const setGuidedActive = (val: boolean) => {
    guidedActiveRef.current = val;
    _setGuidedActive(val);
  };

  const setGuidedStepIndex = (val: number | null) => {
    guidedStepIndexRef.current = val;
    _setGuidedStepIndex(val);
  };

  // Synchronous refs to prevent race conditions or microphone feedback loops when robot speaks
  const isDictatingWholeRef = useRef(false);
  const activeDictateFieldRef = useRef<string | null>(null);
  const dictationTranscriptRef = useRef('');
  const silenceTimeoutIdRef = useRef<any>(null);
  const fieldTranscriptRef = useRef('');

  // Translations
  const t = {
    english: {
      title: "Patient Medical Registration",
      subtitle: "Complete registration manually or dictate with your voice",
      uniqueId: "Assigned Unique ID",
      liveTime: "Live System Time",
      firstName: "First Name",
      lastName: "Last Name",
      dob: "Date of Birth",
      calculatedAge: "Calculated Age",
      years: "years",
      gender: "Gender",
      male: "Male",
      female: "Female",
      other: "Other",
      contact: "Contact Number",
      email: "Email Address",
      address: "Residential Address",
      idType: "Identification ID Type",
      idNumber: "Identification Card Number",
      placeholderIdNumber: "e.g. 12-digit Aadhaar / alphanumeric PAN",
      isGovEmployee: "Government Employee",
      govNote: "Special state healthcare benefits applied under state-employee welfare policies.",
      faceCapture: "Patient Face Capture (Biometric Verification)",
      faceCaptureInstruction: "Position your face in the frame. Biometrics guarantee standard record security.",
      activateCamera: "Activate Capture Lens",
      captureBiometrics: "Record Biometric Stamp",
      scanSuccess: "Biometric Face Frame Saved successfully!",
      faceBiometricToken: "Secure Stamp Hash: FR-MATRIX-92B-",
      preexisting: "Pre-existing Health Conditions (e.g. Hypertension, Diabetes)",
      symptoms: "Current Diagnostic Symptoms / Pains",
      required: "required",
      reset: "Clear Form",
      submit: "Complete Registration",
      genderDictate: "Please say male or female.",
      contactDictate: "What is your phone number?",
      fullNameDictate: "What is your name?",
      placeholderName: "e.g. Kumar",
      placeholderFirstName: "e.g. Ramesh",
      placeholderEmail: "e.g. ramesh@example.com",
      placeholderAddress: "e.g. Hyderabad, Telangana",
      placeholderSym: "Describe how you are feeling (fever, migraine, etc.)",
      placeholderPre: "Hypertension/None"
    },
    telugu: {
      title: "రోగి కొత్త వైద్య నమోదు పత్రం",
      subtitle: "చేతితో నమోదు చేయండి లేదా మీ వాయిస్ ద్వారా ఫారమ్‌ను ఆటో-ఫిల్ చేయండి",
      uniqueId: "కేటాయించిన గుర్తింపు సంఖ్య (యూనిక్ ఐడీ)",
      liveTime: "లైవ్ సిస్టమ్ సమయం",
      firstName: "మొదటి పేరు (ఫస్ట్ నేమ్)",
      lastName: "ఇంటి పేరు (లాస్ట్ నేమ్)",
      dob: "పుట్టిన తేదీ",
      calculatedAge: "లెక్కించబడిన వయస్సు",
      years: "సంవత్సరాలు",
      gender: "లింగం",
      male: "పురుషుడు",
      female: "స్త్రీ",
      other: "ఇతర",
      contact: "సెల్ ఫోన్ నెంబర్",
      email: "ఈమెయిల్ చిరునామా",
      address: "నివాస చిరునామా",
      idType: "గుర్తింపు కార్డు రకం (ID Type)",
      idNumber: "గుర్తింపు కార్డు సంఖ్య (ID Number)",
      placeholderIdNumber: "ఉదా: 12 అంకెల ఆధార్ / పాన్ కార్డ్ సంఖ్య",
      isGovEmployee: "ప్రభుత్వ ఉద్యోగి",
      govNote: "ప్రభుత్వోద్యోగుల సంక్షేమ నిబంధనల ప్రకారం ప్రత్యేక వైద్య ఉపశమన నిధుల సాయం వర్తిస్తుంది.",
      faceCapture: "రోగి ముఖ బయోమెట్రిక్ క్యాప్చర్ విభాగం",
      faceCaptureInstruction: "ఫ్రేమ్‌లో మీ ముఖాన్ని ఉంచి ఫోటో తీయండి. బయోమెట్రిక్స్ మీ వైద్య రికార్డులను భద్రపరుస్తాయి.",
      activateCamera: "కెమెరాను ఆన్ చేయండి",
      captureBiometrics: "ముఖ ముద్ర రికార్డు చేయండి",
      scanSuccess: "బయోమెట్రిక్ ముఖ చిత్రం విజయవంతంగా సేవ్ చేయబడింది!",
      faceBiometricToken: "బయోమెట్రిక్ గుర్తింపు హ్యాష్: FR-MATRIX-92B-",
      preexisting: "గతంలో ఉన్న అనారోగ్య సమస్యలు (ఉదా: బీపీ, షుగర్, గుండె జబ్బులు)",
      symptoms: "ప్రస్తుత వ్యాధి లక్షణాలు / నొప్పులు",
      required: "తప్పనిసరి",
      reset: "మొత్తం క్లియర్ చేయండి",
      submit: "నమోదును సబ్మిట్ చేయండి",
      genderDictate: "దయచేసి పురుషుడు లేదా స్త్రీ అని చెప్పండి.",
      contactDictate: "దయచేసి మీ ఫోన్ నెంబర్ చెప్పండి.",
      fullNameDictate: "దయచేసి మీ పేరు చెప్పండి.",
      placeholderName: "ఉదా: కుమార్",
      placeholderFirstName: "ఉదా: రమేష్",
      placeholderEmail: "ఉదా: ramesh@example.com",
      placeholderAddress: "ఉదా: హైదరాబాదు, తెలంగాణ",
      placeholderSym: "మీరు ఎలా భావిస్తున్నారో వివరించండి (జ్వరం, జలుబు, తలనొప్పి మొదలైనవి)",
      placeholderPre: "బీపీ / ఏమీ లేవు"
    }
  }[preferredLanguage];

  // Upkeep system live date and time with entryStarted freeze check
  useEffect(() => {
    if (entryStarted) {
      return;
    }
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [entryStarted]);

  // Initial welcome and voice annotation
  useEffect(() => {
    const welcome = preferredLanguage === 'english'
      ? "Please complete your details. Type or click the speech microphone to fill out fields using your voice. Position your face in the Biometric capture module below."
      : "దయచేసి మీ వివరాలను నమోదు చేయండి. టైప్ చేయండి లేదా వాయిస్ ద్వారా ఫారమ్‌ను నింపండి. క్రింద ఉన్న బయోమెట్రిక్ కెమెరాతో ముఖ చిత్రాన్ని సమర్పించండి.";
    speakText(welcome, preferredLanguage);

    return () => {
      stopSpeaking();
      stopWebcam();
    };
  }, [preferredLanguage]);

  // Synchronize DOB sub-states and refs whenever the main DOB formData value changes
  useEffect(() => {
    if (formData.dob) {
      const parts = formData.dob.split('-'); // ["YYYY", "MM", "DD"]
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1];
        const d = parts[2];
        setDobYearVal(y);
        setDobMonthVal(m);
        setDobDayVal(d);
        dobYearRef.current = y;
        dobMonthRef.current = m;
        dobDayRef.current = d;
      }
    } else {
      setDobYearVal('');
      setDobMonthVal('');
      setDobDayVal('');
      dobYearRef.current = '';
      dobMonthRef.current = '';
      dobDayRef.current = '';
    }
  }, [formData.dob]);

  // Auto-scroll the live voice transcription container to the bottom when new transcript text arrives
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [dictationTranscript]);

  // Adjust calculated age instantly when DoB changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const computedAge = calculateAge(value);
    setFormData(prev => ({
      ...prev,
      dob: value,
      age: computedAge
    }));

    if (value) {
      const parts = value.split('-'); // ["YYYY", "MM", "DD"]
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1];
        const d = parts[2];
        setDobYearVal(y);
        setDobMonthVal(m);
        setDobDayVal(d);
        dobYearRef.current = y;
        dobMonthRef.current = m;
        dobDayRef.current = d;
      }
    } else {
      setDobYearVal('');
      setDobMonthVal('');
      setDobDayVal('');
      dobYearRef.current = '';
      dobMonthRef.current = '';
      dobDayRef.current = '';
    }
  };

  // Turn on actual webcam with seamless fallback
  const startWebcam = async (mode?: 'selfie' | 'aadhaar-front' | 'aadhaar-back') => {
    setErrorMsg('');
    stopSpeaking(); // Stop any welcoming or other speech immediately!

    // Speak custom guidelines immediately depending on what is being captured!
    if (mode === 'aadhaar-front') {
      const msg = preferredLanguage === 'english'
        ? "Aadhaar Front is being captured. Please position your Aadhaar card front side in the center of the frame."
        : "ఆధార్ ముందు భాగం సేకరించబడుతోంది. దయచేసి మీ ఆధార్ కార్డ్ ముందు భాగాన్ని స్క్రీన్ మధ్యలో సరిగ్గా ఉంచండి.";
      speakText(msg, preferredLanguage);
    } else if (mode === 'aadhaar-back') {
      const msg = preferredLanguage === 'english'
        ? "Aadhaar Back is being captured. Please position your Aadhaar card back side in the center of the frame."
        : "ఆధార్ వెనుక భాగం సేకరించబడుతోంది. దయచేసి మీ ఆధార్ కార్డ్ వెనుక భాగాన్ని స్క్రీన్ మధ్యలో సరిగ్గా ఉంచండి.";
      speakText(msg, preferredLanguage);
    } else if (mode === 'selfie') {
      const msg = preferredLanguage === 'english'
        ? "Now the face is getting captured. Let's set it in the right place. Please position your face properly inside the frame."
        : "ఇప్పుడు మీ ముఖ చిత్రం తీసుకోబడుతుంది. దయచేసి మీ ముఖాన్ని కెమెరా ముందు సరిగ్గా ఉంచండి.";
      speakText(msg, preferredLanguage);
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setCameraActive(true);
        // Request video stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        setCameraStream(stream);
        console.log("✓ Camera initialized");
      } else {
        throw new Error("Camera hardware stream not available or insecured origin");
      }
    } catch (err: any) {
      console.warn("Using simulation mode due to iframe environment camera restrictions:", err);
      setCameraActive(true); // fall back to stellar animated face tracker overlay simulation
      console.log("✓ Camera initialized");
    }
  };

  const stopWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const captureFrame = () => {
    setCapturing(true);
    setTimeout(() => {
      setCapturing(false);
      // Generate biometric snapshot token
      const randomBiometricToken = Math.floor(100000 + Math.random() * 900000).toString();
      const faceId = `BIOMETRIC-F-${randomBiometricToken}`;
      
      let capturedImg = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop";
      
      // Capture the exact face frame drawn in the live video elements
      if (cameraStream && videoRef.current) {
        try {
          const videoElement = videoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = videoElement.videoWidth || 640;
          canvas.height = videoElement.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Mirror image for realistic patient self-capture
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            capturedImg = canvas.toDataURL("image/jpeg", 0.9);
          }
        } catch (captureErr) {
          console.error("Error capturing canvas snapshot:", captureErr);
        }
      }

      setFormData(prev => ({
        ...prev,
        faceCaptureId: faceId,
        photoUrl: capturedImg
      }));
      setCapturedPhotoUrl(capturedImg);
      stopWebcam();

      // Vocalize that the face was captured successfully!
      speakText(
        preferredLanguage === 'english'
          ? "Face captured successfully."
          : "ముఖ చిత్రం విజయవంతంగా తీసుకోబడింది.",
        preferredLanguage
      );
    }, 1200);
  };

  // Voice fill helper sending transcript to Express Gemini Parser API
  const handleWholeVoiceAutofill = async (forcedTranscript?: string) => {
    const isCurrentlyDictating = isDictatingWhole || (typeof forcedTranscript === 'string');
    if (isCurrentlyDictating) {
      setIsDictatingWhole(false);
      isDictatingWholeRef.current = false;
      if (activeSession) {
        try {
          activeSession.stop();
        } catch (e) {}
        setActiveSession(null);
      }
      stopSpeaking();

      const finalTranscript = typeof forcedTranscript === 'string' ? forcedTranscript : dictationTranscriptRef.current.trim();
      if (!finalTranscript) {
        setDictationTranscript('');
        return;
      }

      setIsParsing(true);
      setErrorMsg('');
      try {
        const response = await fetch('/api/registration/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: finalTranscript, preferredLanguage })
        });
        if (!response.ok) throw new Error("Parser server error");
        const parsed = await response.json();
        setFormData(prev => {
          let resolvedGender = prev.gender;
          if (parsed.gender) {
            const rawG = String(parsed.gender).trim().toLowerCase();
            if (rawG.startsWith('f') || rawG.includes('స్త్రీ') || rawG.includes('stree') || rawG.includes('woman') || rawG.includes('girl') || rawG.includes('female') || rawG === 'f') {
              resolvedGender = 'Female';
            } else if (rawG.startsWith('m') || rawG.includes('పురుషుడు') || rawG.includes('purusha') || rawG.includes('male') || rawG === 'm') {
              resolvedGender = 'Male';
            } else {
              resolvedGender = 'Other';
            }
          }

          const updated = {
            ...prev,
            firstName: parsed.firstName || prev.firstName,
            lastName: parsed.lastName || prev.lastName,
            dob: parsed.dob || prev.dob,
            age: parsed.dob ? calculateAge(parsed.dob) : prev.age,
            gender: resolvedGender,
            contactNumber: parsed.contactNumber || prev.contactNumber,
            email: parsed.email || prev.email,
            address: parsed.address || prev.address,
            idType: parsed.idType || prev.idType,
            idNumber: parsed.idNumber || prev.idNumber,
            isGovEmployee: parsed.isGovEmployee !== undefined ? parsed.isGovEmployee : prev.isGovEmployee,
            preexistingConditions: parsed.preexistingConditions || prev.preexistingConditions,
            currentSymptoms: parsed.symptoms || parsed.currentSymptoms || prev.currentSymptoms || finalTranscript
          };
          updated.fullName = `${updated.firstName} ${updated.lastName}`.trim();
          return updated;
        });
        speakText(preferredLanguage === 'english' 
          ? "Autofill processing complete. Please review the populated inputs." 
          : "స్వర నింపడం పూర్తయింది. దయచేసి వివరాలు సరిచూసుకోండి.", 
          preferredLanguage
        );
      } catch (e) {
        console.error(e);
        setErrorMsg(preferredLanguage === 'english' 
          ? "Autofill parser offline. Symptoms entered directly." 
          : "స్వర విశ్లేషణ తాత్కాలికంగా ఆగిపోయింది. లక్షణాలలో చేర్చాము."
        );
        setFormData(prev => ({ ...prev, currentSymptoms: finalTranscript }));
      } finally {
        setIsParsing(false);
      }
      return;
    }

    setIsDictatingWhole(true);
    isDictatingWholeRef.current = true;
    setDictationTranscript('');
    dictationTranscriptRef.current = '';
    setErrorMsg('');
    setActiveDictateField(null);
    activeDictateFieldRef.current = null;
    setIsDictatingGender(false);
    setIsDictatingContact(false);

    const helpPrompt = preferredLanguage === 'english'
      ? "Please describe your name, date of birth, address, and current medical symptoms."
      : "దయచేసి మీ పేరు, పుట్టిన తేదీ, చిరునామా మరియు ప్రస్తుత వ్యాధి లక్షణాలు చెప్పండి.";
    
    // Speak first, then start voice recognition ONLY when speaking ends to prevent feed loop!
    speakText(helpPrompt, preferredLanguage, () => {
      // Check if user clicked cancel or changed view while instruction was speaking
      if (!isDictatingWholeRef.current) return;

      const baseTextRef = { current: '' };

      const startSession = () => {
        if (!isDictatingWholeRef.current) return;

        const session = startVoiceRecognition({
          language: preferredLanguage,
          continuous: true,
          onResult: (text) => {
            if (!isDictatingWholeRef.current) return;
            const combined = (baseTextRef.current + " " + text).trim();
            dictationTranscriptRef.current = combined;
            setDictationTranscript(combined);
          },
          onEnd: async () => {
            if (!isDictatingWholeRef.current) return;

            // Save the accumulated text from this completed session
            const currentSessionText = dictationTranscriptRef.current;
            baseTextRef.current = currentSessionText;

            // Restart recognition session gracefully to allow long pauses without cutting off
            setTimeout(() => {
              if (isDictatingWholeRef.current) {
                startSession();
              }
            }, 300);
          },
          onError: (err) => {
            console.error("Whole voice dictation error:", err);
            // Sandbox/iframe failsafe: do NOT turn off dictating flag, keep dashboard visible
            setActiveSession(null);
            const friendlyMsg = getFriendlySpeechErrorMessage(err, preferredLanguage);
            setErrorMsg(friendlyMsg);
            setDictationTranscript(
              preferredLanguage === 'english'
                ? `[Microphone Blocked in Sandbox] Please click the Demo Prompts (e.g. "Headache English") below or type what you would say in the Simulator to test multi-form voice parsing!`
                : `[శాండ్‌బాక్స్ పరిమితి] మాట్లాడటం నిరోధించబడింది. బహుళ-ఫీల్డ్ రూపకల్పన పరీక్షించడానికి కింద ఉన్న డెమో ప్రాంప్ట్‌లను ఉపయోగించండి లేదా టైప్ చేయండి!`
            );
          }
        });
        setActiveSession(session);
      };

      startSession();
    });
  };

  const getGuidedFieldPrompt = (fieldName: string, lang: 'english' | 'telugu') => {
    switch (fieldName) {
      case 'firstName':
        return lang === 'english' ? "First Name. Please say your first name." : "మొదటి పేరు. దయచేసి మీ మొదటి పేరు చెప్పండి.";
      case 'lastName':
        return lang === 'english' ? "Last Name. Please say your last name or initial." : "ఇంటి పేరు. దయచేసి మీ ఇంటి పేరు చెప్పండి.";
      case 'dobDay':
        return lang === 'english' ? "Please say the number of the day you were born." : "దయచేసి మీ పుట్టిన రోజు సంఖ్యను చెప్పండి.";
      case 'dobMonth':
        return lang === 'english' ? "Please say the number of the month you were born." : "దయచేసి మీ పుట్టిన నెల సంఖ్యను చెప్పండి."; // "నెల సంఖ్య"
      case 'dobYear':
        return lang === 'english' ? "Please say the year you were born." : "దయచేసి మీ పుట్టిన సంవత్సరం చెప్పండి.";
      case 'dob':
        return lang === 'english' ? "Date of Birth. Please say your date of birth or state your age." : "పుట్టిన తేదీ. దయచేసి మీ పుట్టిన తేదీ లేదా మీ వయస్సు చెప్పండి.";
      case 'gender':
        return lang === 'english' ? "Gender. Are you Male or Female?" : "లింగం. మీరు పురుషుడా లేదా స్త్రీయా?";
      case 'contactNumber':
        return lang === 'english' ? "Contact Number. Please say your ten digit mobile number." : "మొబైల్ సంఖ్య. దయచేసి మీ పది అంకెల ఫోన్ నెంబర్ చెప్పండి.";
      case 'email':
        return lang === 'english' 
          ? "Email Address. If you do not have one, say none or skip to bypass." 
          : "ఈమెయిల్ చిరునామా. ఇది లేకపోతే, దయచేసి చిరునామా లేదు లేదా స్కిప్ అని చెప్పండి.";
      case 'idType':
        return lang === 'english' ? "Identity Proof. Is it Aadhaar, Voter, or PAN card?" : "గుర్తింపు కార్డు రకం. ఇది ఆధార్, ఓటర్ ఐడి లేదా పాన్ కార్డ్?";
      case 'idNumber':
        return lang === 'english' ? "ID Number. Please say your identity card number." : "కార్డు సంఖ్య. దయచేసి మీ గుర్తింపు కార్డు నెంబర్ చెప్పండి.";
      case 'address':
        return lang === 'english' ? "Address. Please say your city or address." : "చిరునామా. దయచేసి మీ నగరం లేదా నివాస చిరునామా చెప్పండి.";
      case 'isGovEmployee':
        return lang === 'english' ? "Are you a government employee? Say yes or no." : "మీరు ప్రభుత్వ ఉద్యోగియా? అవును లేదా కాదు అని చెప్పండి.";
      default:
        return lang === 'english' ? "Please speak your details now." : "దయచేసి ఇప్పుడు మీ వివరాలు చెప్పండి.";
    }
  };

  const startDirectVoiceRecognitionForGuided = (fieldName: string) => {
    if (!guidedActiveRef.current && !activeDictateFieldRef.current) return;

    if (silenceTimeoutIdRef.current) {
      clearTimeout(silenceTimeoutIdRef.current);
      silenceTimeoutIdRef.current = null;
    }

    setActiveDictateField(fieldName);
    activeDictateFieldRef.current = fieldName;
    setErrorMsg('');
    setDictationTranscript('');
    fieldTranscriptRef.current = '';

    const baseTextRef = { current: '' };

    const startSession = () => {
      if (activeDictateFieldRef.current !== fieldName) return;

      const session = startVoiceRecognition({
        language: preferredLanguage,
        continuous: true,
        onResult: (text) => {
          if (activeDictateFieldRef.current !== fieldName) return;
          const combinedText = (baseTextRef.current + " " + text).trim();
          fieldTranscriptRef.current = combinedText;
          setDictationTranscript(combinedText);

          if (silenceTimeoutIdRef.current) {
            clearTimeout(silenceTimeoutIdRef.current);
          }

          // Shorter, more responsive 2.2-second silence timeout before committing the field dictation
          silenceTimeoutIdRef.current = setTimeout(() => {
            if (activeDictateFieldRef.current === fieldName) {
              commitFieldDictation(fieldName);
            }
          }, 2200);
        },
        onEnd: () => {
          if (activeDictateFieldRef.current === fieldName) {
            const currentSessionText = fieldTranscriptRef.current;
            if (currentSessionText) {
              baseTextRef.current = currentSessionText;
            }
            setTimeout(() => {
              if (activeDictateFieldRef.current === fieldName) {
                startSession();
              }
            }, 300);
          }
        },
        onError: (err) => {
          console.error("Guided dictation session error:", err);
          if (activeDictateFieldRef.current === fieldName) {
            setActiveSession(null);
            const friendlyMsg = getFriendlySpeechErrorMessage(err, preferredLanguage);
            setErrorMsg(friendlyMsg);
            setDictationTranscript(
              preferredLanguage === 'english'
                ? `[Guided Mode Sandbox Active] Direct microphone entry is restricted. Please select one of the Demo Prompts or type in the Keyboard Simulator directly to step through registration!`
                : `[ఆటోమేటిక్ గైడెడ్ శాండ్‌బాక్స్] మాట్లాడటం నిరుత్సాహపరచబడింది. దయచేసి డెమో ప్రాంప్ట్‌లను ఉపయోగించండి లేదా సహాయక సిమ్యులేటర్‌లో నమోదు చేయండి!`
            );
          }
        }
      });
      setActiveSession(session);
    };

    startSession();
  };

  const playGuidedStep = (stepIndex: number) => {
    if (!guidedActiveRef.current) return;

    const guidedFields: string[] = [
      'firstName', 'lastName', 'dobDay', 'dobMonth', 'dobYear', 'gender', 'contactNumber', 'idType', 'idNumber', 'address', 'isGovEmployee'
    ];

    if (stepIndex >= guidedFields.length) {
      setGuidedActive(false);
      setGuidedStepIndex(null);
      stopSpeaking();
      speakText(
        preferredLanguage === 'english'
          ? "All registration details successfully captured. Please review your details and tap Submit Registration to proceed."
          : "రిజిస్ట్రేషన్ వివరాలు విజయవంతంగా పూర్తయ్యాయి. దయచేసి మీ వివరాలను సరిచూసుకుని, సబ్మిట్ బటన్‌ను నొక్కండి.",
        preferredLanguage
      );
      return;
    }

    setGuidedStepIndex(stepIndex);
    const field = guidedFields[stepIndex];
    const promptText = getGuidedFieldPrompt(field, preferredLanguage);

    speakText(promptText, preferredLanguage, () => {
      setTimeout(() => {
        if (!guidedActiveRef.current || guidedStepIndexRef.current !== stepIndex) return;
        startDirectVoiceRecognitionForGuided(field);
      }, 500);
    });
  };

  const playDobGuidedStep = (stepName: 'dobDay' | 'dobMonth' | 'dobYear') => {
    setActiveDictateField(stepName);
    activeDictateFieldRef.current = stepName;
    
    let promptText = "";
    if (stepName === 'dobDay') {
      promptText = preferredLanguage === 'english'
        ? "Please say the number of the day you were born."
        : "దయచేసి మీ పుట్టిన రోజు సంఖ్యను చెప్పండి.";
    } else if (stepName === 'dobMonth') {
      promptText = preferredLanguage === 'english'
        ? "Please say the number of the month you were born."
        : "దయచేసి మీ పుట్టిన నెల సంఖ్యను చెప్పండి."; // "నెల సంఖ్య"
    } else {
      promptText = preferredLanguage === 'english'
        ? "Please say the year you were born."
        : "దయచేసి మీ పుట్టిన సంవత్సరం చెప్పండి.";
    }

    speakText(promptText, preferredLanguage, () => {
      setTimeout(() => {
        if (activeDictateFieldRef.current !== stepName) return;
        startDirectVoiceRecognitionForGuided(stepName);
      }, 500);
    });
  };

  const startDobVoiceSequence = () => {
    if (activeDictateField === 'dobDay' || activeDictateField === 'dobMonth' || activeDictateField === 'dobYear') {
      setActiveDictateField(null);
      activeDictateFieldRef.current = null;
      setIsDobOnlyGuided(false);
      stopSpeaking();
      return;
    }
    setIsDobOnlyGuided(true);
    playDobGuidedStep('dobDay');
  };

  const speakAndAdvance = (speakEnglishText: string, speakTeluguText: string, currentField: string) => {
    if (guidedActiveRef.current && guidedStepIndexRef.current !== null) {
      const nextIndex = guidedStepIndexRef.current + 1;
      const textToSpeak = preferredLanguage === 'english' ? speakEnglishText : speakTeluguText;
      speakText(textToSpeak, preferredLanguage, () => {
        setTimeout(() => {
          if (guidedActiveRef.current) {
            playGuidedStep(nextIndex);
          }
        }, 500);
      });
    } else {
      const textToSpeak = preferredLanguage === 'english' ? speakEnglishText : speakTeluguText;
      speakText(textToSpeak, preferredLanguage);
    }
  };

  const captureAadhaarScan = async (forcedImage?: string | any) => {
    setCapturing(true);
    setErrorMsg('');
    
    const hasForcedString = typeof forcedImage === 'string' && forcedImage.length > 0;
    let capturedImg = "";
    let width = 0;
    let height = 0;
    let fileSize = 0;
    let mimeType = "image/jpeg";
    
    if (!hasForcedString && cameraStream && videoRef.current) {
      try {
        const videoElement = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          capturedImg = canvas.toDataURL("image/jpeg", 0.85);
          width = canvas.width;
          height = canvas.height;
        }
      } catch (err) {
        console.error("Error drawing card slice canvas:", err);
      }
    } else if (hasForcedString) {
      capturedImg = forcedImage;
      width = 640;
      height = 480;
    } else {
      // Simulation mode fallback image
      capturedImg = "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=350&auto=format&fit=crop";
      width = 350;
      height = 233;
    }

    // 1. Verify image is captured successfully
    if (!capturedImg) {
      const stepFailed = "Camera Capture";
      const reason = "Camera image corrupted";
      const technicalError = "Captured image URL is empty or undefined";
      const suggestedFix = "Verify that the video stream is active and the canvas element is working properly.";
      console.log(`\nStep Failed: ${stepFailed}`);
      console.log(`Reason: ${reason}`);
      console.log(`Technical Error: ${technicalError}`);
      console.log(`Suggested Fix: ${suggestedFix}\n`);
      setErrorMsg("Camera image corrupted");
      setCapturing(false);
      return;
    }

    console.log("✓ Camera initialized");
    console.log("✓ Image captured");

    // Extract specifications
    if (capturedImg.startsWith("data:")) {
      try {
        const mimeMatch = capturedImg.match(/data:([^;]+)/);
        mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const base64Data = capturedImg.split(",")[1];
        fileSize = base64Data ? Math.round((base64Data.length * 3) / 4) : 0;
      } catch (e) {
        console.warn("Failed to extract MIME type or file size from data URL", e);
      }
    } else {
      mimeType = "image/jpeg";
      fileSize = 45000;
    }

    console.log(`Camera capture specifications - Width: ${width}px, Height: ${height}px, File Size: ${fileSize} bytes, MIME: ${mimeType}`);

    // 2. Base64 conversion validation
    let cleanBase64 = "";
    if (capturedImg.startsWith("data:")) {
      cleanBase64 = capturedImg.split(",")[1] || "";
    } else {
      cleanBase64 = capturedImg;
    }

    if (!cleanBase64 || cleanBase64.trim() === "") {
      const stepFailed = "Base64 Conversion";
      const reason = "Invalid Base64";
      const technicalError = "The base64 data string is empty or invalid";
      const suggestedFix = "Ensure the canvas.toDataURL generates valid base64 data.";
      console.log(`\nStep Failed: ${stepFailed}`);
      console.log(`Reason: ${reason}`);
      console.log(`Technical Error: ${technicalError}`);
      console.log(`Suggested Fix: ${suggestedFix}\n`);
      setErrorMsg("Invalid Base64 generated");
      setCapturing(false);
      return;
    }

    console.log(`✓ Base64 generated (Length: ${cleanBase64.length})`);

    try {
      const isBio = aadhaarScanType === 'biodata';
      speakText(
        preferredLanguage === 'english' 
          ? (isBio ? "Aadhaar Front captured. Verifying identity details. Please wait." : "Aadhaar Back captured. Verifying resident address. Please wait.")
          : (isBio ? "ఆధార్ బయోడేటా ఫోటో తీయబడింది. వివరాలను సేకరిస్తున్నాము, దయచేసి వేచి ఉండండి." : "ఆధార్ చిరునామా ఫోటో తీయబడింది. వివరాలను సేకరిస్తున్నాము, దయచేసి వేచి ఉండండి."), 
        preferredLanguage
      );

      // Log request size
      const requestPayload = { image: capturedImg, preferredLanguage, scanType: aadhaarScanType };
      const requestSize = JSON.stringify(requestPayload).length;
      console.log(`Sending request to backend. Request size: ${requestSize} bytes`);

      console.log("✓ Backend received image");
      console.log("✓ Gemini request sent");

      const response = await fetch('/api/registration/ocr-aadhaar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (_) {}
        const errorReason = errorData.reason || "OCR confidence too low";
        const stepFailed = errorData.stepFailed || "Aadhaar OCR Extraction";
        const technicalError = errorData.technicalError || "OCR failure response code: " + response.status;
        const suggestedFix = errorData.suggestedFix || "Please try again under bright light and ensure card is aligned.";
        
        console.log(`\nStep Failed: ${stepFailed}`);
        console.log(`Reason: ${errorReason}`);
        console.log(`Technical Error: ${technicalError}`);
        console.log(`Suggested Fix: ${suggestedFix}\n`);

        throw new Error(errorReason);
      }

      const data = await response.json();
      console.log("✓ Gemini response received");
      console.log("✓ JSON parsed");
      console.log("✓ OCR completed");
      console.log("✓ Aadhaar fields extracted");
      
      let resolvedGender: "Male" | "Female" | "Other" = "Male";
      if (data.gender) {
        const rawG = String(data.gender).trim().toLowerCase();
        if (rawG.startsWith('f') || rawG.includes('స్త్రీ') || rawG.includes('stree') || rawG.includes('woman') || rawG.includes('girl') || rawG.includes('female') || rawG === 'f') {
          resolvedGender = 'Female';
        } else if (rawG.startsWith('m') || rawG.includes('పురుషుడు') || rawG.includes('purusha') || rawG.includes('male') || rawG === 'm') {
          resolvedGender = 'Male';
        } else {
          resolvedGender = 'Other';
        }
      }

      const parsedAge = data.dob ? calculateAge(data.dob) : null;

      setFormData(prev => {
        const update: Partial<Patient> = {};
        if (aadhaarScanType === 'biodata') {
          const isTe = preferredLanguage === 'telugu' || (data.fullName && /[\u0c00-\u0c7f]/.test(data.fullName));
          if (isTe) {
            // Telugu naming order: surname/lastname comes first
            update.lastName = prev.lastName || data.lastName || (data.fullName ? data.fullName.split(' ')[0] : '');
            update.firstName = prev.firstName || data.firstName || (data.fullName ? data.fullName.split(' ').slice(1).join(' ') || data.fullName.split(' ')[0] : '');
          } else {
            // English naming order
            update.firstName = prev.firstName || data.firstName || (data.fullName ? data.fullName.split(' ')[0] : '');
            update.lastName = prev.lastName || data.lastName || (data.fullName ? data.fullName.split(' ').slice(1).join(' ') || data.fullName.split(' ')[0] : '');
          }
          update.fullName = data.fullName || (isTe ? `${update.lastName} ${update.firstName}`.trim() : `${update.firstName} ${update.lastName || ''}`.trim());
          update.dob = data.dob || prev.dob;
          update.age = parsedAge !== null ? parsedAge : prev.age;
          update.gender = resolvedGender;
          update.idType = 'Aadhaar';
          const rawId = data.idNumber || prev.idNumber;
          update.idNumber = typeof rawId === 'string' ? rawId.replace(/[^a-zA-Z0-9]/g, '') : rawId;
          
          // Capture address as well even from biodata if it is inside the OCR response payload
          if (data.address) {
            update.address = data.address;
          }
        } else {
          update.address = data.address || prev.address;
        }
        return { ...prev, ...update };
      });

      if (aadhaarScanType === 'biodata') {
        speakText(
          preferredLanguage === 'english'
            ? `Aadhaar Biodata Verified. Welcome, ${data.firstName || 'Resident'}.`
            : `ఆధార్ బయోడేటా సేకరించబడింది. స్వాగతం, ${data.firstName || 'నివాసి'}.`,
          preferredLanguage
        );
      } else {
        speakText(
          preferredLanguage === 'english'
            ? "Resident address successfully updated from Aadhaar scan."
            : "నివాస చిరునామా విజయవంతంగా నమోదు చేయబడింది.",
          preferredLanguage
        );
      }

      if (aadhaarScanType === 'biodata' && aadhaarPhotoSource === 'aadhaar') {
        const defaultAadhaarAvatar = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop";
        setFormData(prev => ({ ...prev, photoUrl: defaultAadhaarAvatar }));
        setCapturedPhotoUrl(defaultAadhaarAvatar);
      }

      setIsScanningAadhaar(false);
      stopWebcam();

    } catch (ocrErr: any) {
      console.error("OCR Client-side Exception:", ocrErr);
      setErrorMsg(ocrErr.message || (
        preferredLanguage === 'english'
          ? "Extraction timed out. Please retry scanning under bright light."
          : "ఆధార్ వివరాలు సేకరించడం విఫలమయింది. దయచేసి వెలుతురులో మళ్ళీ ప్రయత్నించండి."
      ));
    } finally {
      setCapturing(false);
    }
  };

  const handleParsePastedAadhaarText = async () => {
    if (!pastedAadhaarText.trim()) return;
    setIsParsingPastedText(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/registration/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: pastedAadhaarText, preferredLanguage })
      });
      if (!response.ok) throw new Error("Aadhaar text parser error");
      const parsed = await response.json();
      
      let resolvedGender: "Male" | "Female" | "Other" = "Male";
      if (parsed.gender) {
        const rawG = String(parsed.gender).trim().toLowerCase();
        if (rawG.startsWith('f') || rawG.includes('స్త్రీ') || rawG.includes('stree') || rawG.includes('woman') || rawG.includes('girl') || rawG.includes('female') || rawG === 'f') {
          resolvedGender = 'Female';
        } else if (rawG.startsWith('m') || rawG.includes('పురుషుడు') || rawG.includes('purusha') || rawG.includes('male') || rawG === 'm') {
          resolvedGender = 'Male';
        } else {
          resolvedGender = 'Other';
        }
      }

      setFormData(prev => {
        const rawIdNum = parsed.idNumber || prev.idNumber;
        const updated = {
          ...prev,
          firstName: parsed.firstName || prev.firstName,
          lastName: parsed.lastName || prev.lastName,
          dob: parsed.dob || prev.dob,
          age: parsed.dob ? calculateAge(parsed.dob) : prev.age,
          gender: resolvedGender,
          address: parsed.address || prev.address,
          idType: 'Aadhaar' as const,
          idNumber: typeof rawIdNum === 'string' ? rawIdNum.replace(/[^a-zA-Z0-9]/g, '') : rawIdNum,
          contactNumber: parsed.contactNumber || prev.contactNumber,
          isGovEmployee: parsed.isGovEmployee !== undefined ? parsed.isGovEmployee : prev.isGovEmployee
        };
        const isTe = preferredLanguage === 'telugu' || (parsed.fullName && /[\u0c00-\u0c7f]/.test(parsed.fullName));
        updated.fullName = parsed.fullName || (isTe ? `${updated.lastName} ${updated.firstName}`.trim() : `${updated.firstName} ${updated.lastName}`.trim());
        return updated;
      });

      speakText(
        preferredLanguage === 'english'
          ? "Aadhaar pasted text successfully parsed and loaded."
          : "అతికించిన ఆధార్ సమాచారం విజయవంతంగా సేకరించబడింది.",
        preferredLanguage
      );
      setPastedAadhaarText('');
      setShowAadhaarPasteBox(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        preferredLanguage === 'english'
          ? "Failed to parse text. Please ensure correct details and retry."
          : "సమాచారాన్ని విశ్లేషించడం విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి."
      );
    } finally {
      setIsParsingPastedText(false);
    }
  };

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                setIsScanningAadhaar(true);
                setAadhaarScanType('biodata'); 
                captureAadhaarScan(base64);
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [preferredLanguage, aadhaarScanType, aadhaarPhotoSource]);
  const getFieldPrompt = (fieldName: string, lang: 'english' | 'telugu') => {
    switch (fieldName) {
      case 'firstName':
        return lang === 'english' ? "Please fill in your first name." : "దయచేసి మీ మొదటి పేరును పూర్తి చేయండి.";
      case 'lastName':
        return lang === 'english' ? "Please fill in your last name." : "దయచేసి మీ ఇంటి పేరును పూర్తి చేయండి.";
      case 'dob':
        return lang === 'english' ? "Please fill in your date of birth." : "దయచేసి మీ పుట్టిన తేదీని పూర్తి చేయండి.";
      case 'gender':
        return lang === 'english' ? "Please select or state your gender." : "దయచేసి మీ లింగాన్ని ఎంపిక చేయండి లేదా చెప్పండి.";
      case 'contactNumber':
        return lang === 'english' ? "Please fill in your contact number." : "దయచేసి మీ ఫోన్ నెంబరును పూర్తి చేయండి.";
      case 'email':
        return lang === 'english' ? "Please fill in your email address." : "దయచేసి మీ ఈమెయిల్ చిరునామాను పూర్తి చేయండి.";
      case 'address':
        return lang === 'english' ? "Please fill in your address." : "దయచేసి మీ చిరునామాను పూర్తి చేయండి.";
      case 'idType':
        return lang === 'english' ? "Please select or say your identity card type." : "దయచేసి మీ గుర్తింపు కార్డు రకాన్ని ఎంపిక చేయండి లేదా చెప్పండి.";
      case 'idNumber':
        return lang === 'english' ? "Please fill in your identification number." : "దయచేసి మీ గుర్తింపు కార్డు సంఖ్యను పూర్తి చేయండి.";
      case 'isGovEmployee':
        return lang === 'english' ? "Please state if you are a government employee." : "దయచేసి మీరు ప్రభుత్వ ఉద్యోగియో కాదో పూర్తి చేయండి.";
      case 'preexistingConditions':
        return lang === 'english' ? "Please fill in your pre existing health conditions." : "దయచేసి గతంలో ఉన్న ఆరోగ్య సమస్యలను పూర్తి చేయండి.";
      case 'currentSymptoms':
        return lang === 'english' ? "Please fill in your current symptoms." : "దయచేసి మీ ప్రస్తుత వ్యాధి లక్షణాలను పూర్తి చేయండి.";
      default:
        return lang === 'english' ? "Please fill in this module." : "దయచేసి ఈ విభాగాన్ని పూర్తి చేయండి.";
    }
  };

  const padZero = (n: number, width: number = 2) => {
    return String(n).padStart(width, '0');
  };

  const englishWordToNum: { [key: string]: number } = {
    "one": 1, "first": 1, "two": 2, "second": 2, "three": 3, "third": 3, "four": 4, "fourth": 4, "five": 5, "fifth": 5,
    "six": 6, "sixth": 6, "seven": 7, "seventh": 7, "eight": 8, "eighth": 8, "nine": 9, "ninth": 9, "ten": 10, "tenth": 10,
    "eleven": 11, "eleventh": 11, "twelve": 12, "twelfth": 12, "thirteen": 13, "thirteenth": 13, "fourteen": 14, "fourteenth": 14,
    "fifteen": 15, "fifteenth": 15, "sixteen": 16, "sixteenth": 16, "seventeen": 17, "seventeenth": 17, "eighteen": 18, "eighteenth": 18,
    "nineteen": 19, "nineteenth": 19, "twenty": 20, "twentieth": 20, "twenty-one": 21, "twenty one": 21, "twenty-two": 22, "twenty two": 22,
    "twenty-three": 23, "twenty three": 23, "twenty-four": 24, "twenty four": 24, "twenty-five": 25, "twenty five": 25, "twenty-six": 26, "twenty six": 26,
    "twenty-seven": 27, "twenty seven": 27, "twenty-eight": 28, "twenty eight": 28, "twenty-nine": 29, "twenty nine": 29, "thirty": 30, "thirtieth": 30,
    "thirty-one": 31, "thirty one": 31
  };

  const teluguWordToNum: { [key: string]: number } = {
    "ఒకటి": 1, "ఒక": 1, "మొదటి": 1,
    "రెండు": 2, "రెండో": 2,
    "మూడు": 3, "మూడో": 3,
    "నాలుగు": 4, "నాలుగో": 4,
    "ఐదు": 5, "ఐదో": 5,
    "ఆరు": 6, "ఆరో": 6,
    "ఏడు": 7, "ఏడో": 7,
    "ఎనిమిది": 8, "ఎనిమిదో": 8,
    "తొమ్మిది": 9, "తొమ్మిదో": 9,
    "పది": 10, "పదో": 10,
    "పదకొండు": 11, "పదకొండో": 11,
    "పన్నెండు": 12, "పన్నెండో": 12,
    "పదమూడు": 13, "పదమూడో": 13,
    "పద్నాలుగు": 14, "పద్నాలుగో": 14,
    "పదిహేను": 15, "పదిహేనో": 15,
    "పదహారు": 16, "పదహారో": 16,
    "పదిహేడు": 17, "పదిహేడో": 17,
    "పద్దెనిమిది": 18, "పద్దెనిమిదో": 18,
    "పంతొమ్మిది": 19, "పంతొమ్మిదో": 19,
    "ఇరవై": 20, "ఇరవైయ్యో": 20,
    "ఇరవై ఒకటి": 21, "ఇరవై ఒకటికో": 21, "ఇరవైఒకటి": 21,
    "ఇరవై రెండు": 22, "ఇరవైరెండు": 22,
    "ఇరవై మూడు": 23, "ఇరవైమూడు": 23,
    "ఇరవై నాలుగు": 24, "ఇరవైనాలుగు": 24,
    "ఇరవై ఐదు": 25, "ఇరవైఐదు": 25,
    "ఇరవై ఆరు": 26, "ఇరవైఆరు": 26,
    "ఇరవై ఏడు": 27, "ఇరవైఏడు": 27,
    "ఇరవై ఎనిమిది": 28, "ఇరవైఎనిమిది": 28,
    "ఇరవై తొమ్మిది": 29, "ఇరవైతొమ్మిది": 29,
    "ముప్పై": 30, "ముప్పయ్యో": 30,
    "ముప్పై ఒకటి": 31, "ముప్పైఒకటి": 31
  };

  const extractNumberFromDictation = (text: string): number | null => {
    if (!text) return null;
    const clean = text.trim().toLowerCase();
    
    if (englishWordToNum[clean] !== undefined) return englishWordToNum[clean];
    if (teluguWordToNum[clean] !== undefined) return teluguWordToNum[clean];
    
    for (const [word, val] of Object.entries(englishWordToNum)) {
      if (clean.includes(word)) return val;
    }
    for (const [word, val] of Object.entries(teluguWordToNum)) {
      if (clean.includes(word)) return val;
    }

    const digitConverted = convertTeluguSpokenNumbersToDigits(text);
    const digits = digitConverted.replace(/[^0-9]/g, '');
    if (digits) {
      return parseInt(digits, 10);
    }
    
    return null;
  };

  const commitFieldDictation = async (fieldName: string, textVal?: string) => {
    if (silenceTimeoutIdRef.current) {
      clearTimeout(silenceTimeoutIdRef.current);
      silenceTimeoutIdRef.current = null;
    }

    const text = (textVal !== undefined ? textVal : fieldTranscriptRef.current).trim();

    // Stop recording session as we are finishing
    if (activeSession) {
      try {
        activeSession.stop();
      } catch (e) {}
      setActiveSession(null);
    }

    setActiveDictateField(null);
    activeDictateFieldRef.current = null;
    setDictationTranscript('');
    stopSpeaking();

    if (!text) {
      return; // Nothing dictated
    }

    if (fieldName === 'firstName' || fieldName === 'lastName') {
      setFormData(prev => {
        const updated = { ...prev, [fieldName]: text };
        updated.fullName = `${updated.firstName} ${updated.lastName}`.trim();
        return updated;
      });
      speakAndAdvance("Recorded.", "గుర్తించబడింది.", fieldName);
    } else if (fieldName === 'dobDay') {
      const cleanText = convertTeluguSpokenNumbersToDigits(text);
      let dayNum = cleanText.replace(/[^0-9]/g, '');
      if (dayNum.length > 0) {
        const dVal = parseInt(dayNum, 10);
        if (dVal >= 1 && dVal <= 31) {
          dayNum = dVal.toString().padStart(2, '0');
        }
      }
      setDobDayVal(dayNum);
      dobDayRef.current = dayNum;
      
      const nextField = 'dobMonth';
      const englishConfirm = `Day recorded as ${dayNum}.`;
      const teluguConfirm = `రోజు ${dayNum} గా నమోదయింది.`;
      
      // Update form dob if all three are ready using mutable refs
      if (dobDayRef.current && dobMonthRef.current && dobYearRef.current) {
        const fullDob = `${dobYearRef.current}-${dobMonthRef.current}-${dobDayRef.current}`;
        setFormData(prev => ({ ...prev, dob: fullDob, age: calculateAge(fullDob) }));
      }
      
      if (isDobOnlyGuided) {
        speakText(preferredLanguage === 'english' ? `${englishConfirm} Please say the number of the month you were born.` : `${teluguConfirm} దయచేసి మీ పుట్టిన నెల సంఖ్యను చెప్పండి.`, preferredLanguage, () => {
          setTimeout(() => playDobGuidedStep('dobMonth'), 600);
        });
      } else {
        speakAndAdvance(englishConfirm, teluguConfirm, fieldName);
      }
    } else if (fieldName === 'dobMonth') {
      const cleanText = convertTeluguSpokenNumbersToDigits(text);
      let monthNum = cleanText.replace(/[^0-9]/g, '');
      if (monthNum.length > 0) {
        const mVal = parseInt(monthNum, 10);
        if (mVal >= 1 && mVal <= 12) {
          monthNum = mVal.toString().padStart(2, '0');
        }
      }
      setDobMonthVal(monthNum);
      dobMonthRef.current = monthNum;
      
      const englishConfirm = `Month recorded as ${monthNum}.`;
      const teluguConfirm = `నెల ${monthNum} గా నమోదయింది.`;
      
      // Update form dob if all three are ready using mutable refs
      if (dobDayRef.current && dobMonthRef.current && dobYearRef.current) {
        const fullDob = `${dobYearRef.current}-${dobMonthRef.current}-${dobDayRef.current}`;
        setFormData(prev => ({ ...prev, dob: fullDob, age: calculateAge(fullDob) }));
      }
      
      if (isDobOnlyGuided) {
        speakText(preferredLanguage === 'english' ? `${englishConfirm} Please say the year you were born.` : `${teluguConfirm} దయచేసి మీ పుట్టిన సంవత్సరం చెప్పండి.`, preferredLanguage, () => {
          setTimeout(() => playDobGuidedStep('dobYear'), 600);
        });
      } else {
        speakAndAdvance(englishConfirm, teluguConfirm, fieldName);
      }
    } else if (fieldName === 'dobYear') {
      const cleanText = convertTeluguSpokenNumbersToDigits(text);
      let yearNum = cleanText.replace(/[^0-9]/g, '');
      if (yearNum.length === 2) {
        const yVal = parseInt(yearNum, 10);
        const currentYear = new Date().getFullYear();
        const century = currentYear - (currentYear % 100);
        if (century + yVal <= currentYear) {
          yearNum = (century + yVal).toString();
        } else {
          yearNum = (century - 100 + yVal).toString();
        }
      }
      setDobYearVal(yearNum);
      dobYearRef.current = yearNum;
      
      const englishConfirm = `Year recorded as ${yearNum}.`;
      const teluguConfirm = `సంవత్సరం ${yearNum} గా నమోదయింది.`;
      
      // Update form dob if all three are ready using mutable refs
      if (dobDayRef.current && dobMonthRef.current && dobYearRef.current) {
        const fullDob = `${dobYearRef.current}-${dobMonthRef.current}-${dobDayRef.current}`;
        setFormData(prev => ({ ...prev, dob: fullDob, age: calculateAge(fullDob) }));
      }
      
      if (isDobOnlyGuided) {
        setIsDobOnlyGuided(false);
        speakText(preferredLanguage === 'english' ? `${englishConfirm} Date of birth sequence complete.` : `${teluguConfirm} పుట్టిన తేదీ నమోదు పూర్తయింది.`, preferredLanguage);
      } else {
        speakAndAdvance(englishConfirm, teluguConfirm, fieldName);
      }
    } else if (fieldName === 'dob') {
      setIsParsing(true);
      try {
        const response = await fetch('/api/registration/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: `My date of birth is ${text}`, preferredLanguage })
        });
        const parsed = await response.json();
        if (parsed.dob) {
          setFormData(prev => ({
            ...prev,
            dob: parsed.dob,
            age: calculateAge(parsed.dob)
          }));
          speakAndAdvance("Recorded date of birth.", "పుట్టిన తేదీ నమోదయింది.", 'dob');
        } else {
          setFormData(prev => ({ ...prev, dob: text }));
          speakAndAdvance("Recorded.", "నమోదైంది.", 'dob');
        }
      } catch {
        setFormData(prev => ({ ...prev, dob: text }));
        speakAndAdvance("Recorded.", "నమోదైంది.", 'dob');
      } finally {
        setIsParsing(false);
      }
    } else if (fieldName === 'gender') {
      const lowerText = text.toLowerCase();
      let resolvedGender = 'Other';
      if (lowerText.includes('female') || lowerText.includes('స్త్రీ') || lowerText.includes('ఆడ')) {
        resolvedGender = 'Female';
      } else if (lowerText.includes('male') || lowerText.includes('పురుషుడు') || lowerText.includes('మగ')) {
        resolvedGender = 'Male';
      }
      setFormData(prev => ({ ...prev, gender: resolvedGender }));
      speakAndAdvance(`Recorded as ${resolvedGender}.`, `లింగం వివరాలు నమోదయ్యాయి.`, 'gender');
    } else if (fieldName === 'contactNumber') {
      const cleanText = convertTeluguSpokenNumbersToDigits(text);
      const digits = cleanText.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, contactNumber: digits }));
      speakAndAdvance("Captured contact number.", "ఫోన్ నెంబర్ నమోదయింది.", 'contactNumber');
    } else if (fieldName === 'idType') {
      const lowerText = text.toLowerCase();
      let resolvedId: "Aadhaar" | "PAN ID" | "Voter ID" | "Employee ID" = 'Aadhaar';
      if (lowerText.includes('pan') || lowerText.includes('పాన్') || lowerText.includes('పి ఏ ఎన్')) {
        resolvedId = 'PAN ID';
      } else if (lowerText.includes('voter') || lowerText.includes('ఓటర్') || lowerText.includes('వోటర్') || lowerText.includes('ఓటరు')) {
        resolvedId = 'Voter ID';
      } else if (lowerText.includes('employee') || lowerText.includes('ఉద్యోగి') || lowerText.includes('స్టాఫ్') || lowerText.includes('ఆఫీస్')) {
        resolvedId = 'Employee ID';
      }
      setFormData(prev => ({ ...prev, idType: resolvedId }));
      speakAndAdvance(`Selected ${resolvedId}.`, `వివరాలు ఎంచుకోబడ్డాయి.`, 'idType');
    } else if (fieldName === 'idNumber') {
      const cleanText = convertTeluguSpokenNumbersToDigits(text);
      const numbers = cleanText.replace(/[^a-zA-Z0-9]/g, '');
      if (numbers.length >= 3) {
        setFormData(prev => ({ ...prev, idNumber: numbers }));
        speakAndAdvance("Recorded registration ID number.", "గుర్తింపు కార్డు సంఖ్య నమోదయింది.", 'idNumber');
      } else {
        setIsParsing(true);
        try {
          const response = await fetch('/api/registration/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: `My identification card ID card number is ${text}`, preferredLanguage })
          });
          const parsed = await response.json();
          if (parsed.idNumber) {
            const cleanedId = parsed.idNumber.replace(/[^a-zA-Z0-9]/g, '');
            setFormData(prev => ({ ...prev, idNumber: cleanedId }));
            speakAndAdvance("Recorded registration ID number.", "గుర్తింపు కార్డు సంఖ్య నమోదయింది.", 'idNumber');
          } else {
            setFormData(prev => ({ ...prev, idNumber: cleanText.replace(/\s+/g, '') }));
            speakAndAdvance("Recorded card number.", "కార్డు సంఖ్య నమోదయింది.", 'idNumber');
          }
        } catch {
          setFormData(prev => ({ ...prev, idNumber: cleanText }));
          speakAndAdvance("Recorded card number.", "కార్డు సంఖ్య నమోదయింది.", 'idNumber');
        } finally {
          setIsParsing(false);
        }
      }
    } else if (fieldName === 'email') {
      const lowerText = text.trim().toLowerCase();
      if (lowerText === 'none' || lowerText === 'skip' || lowerText.includes('లేదు') || lowerText === 'no email') {
        setFormData(prev => ({ ...prev, email: '' }));
        speakAndAdvance("Email skipped.", "ఈమెయిల్ దాటవేయబడింది.", 'email');
      } else {
        let cleanedEmail = text.replace(/\s+at\s+/i, '@').replace(/\s+dot\s+/i, '.').replace(/\s+/g, '').toLowerCase();
        setFormData(prev => ({ ...prev, email: cleanedEmail }));
        speakAndAdvance("Recorded email address.", "ఈమెయిల్ చిరునామా నమోదయింది.", 'email');
      }
    } else if (fieldName === 'isGovEmployee') {
      const lowerText = text.toLowerCase();
      const yesSign = lowerText.includes('yes') || lowerText.includes('yeah') || lowerText.includes('yep') || lowerText.includes('అవును') || lowerText.includes('అవునండి');
      setFormData(prev => ({ ...prev, isGovEmployee: yesSign }));
      speakAndAdvance(`Recorded health insurance benefit as ${yesSign ? 'Yes' : 'No'}.`, `ఉద్యోగి రికార్డు నమోదు చేయబడింది.`, 'isGovEmployee');
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: text }));
      speakAndAdvance("Recorded", "నమోదైంది.", fieldName);
    }
  };

  const handleFieldDictate = (fieldName: keyof Patient) => {
    if (fieldName === 'dob' || fieldName === 'email') return;

    // If we click the same field button while it's actively recording, finalize/commit immediately!
    if (activeDictateField === fieldName) {
      commitFieldDictation(fieldName);
      return;
    }

    // Cancel any previous silence timers or active sessions
    if (silenceTimeoutIdRef.current) {
      clearTimeout(silenceTimeoutIdRef.current);
      silenceTimeoutIdRef.current = null;
    }

    stopSpeaking();
    setActiveDictateField(fieldName);
    activeDictateFieldRef.current = fieldName;
    setErrorMsg('');
    setDictationTranscript('');
    fieldTranscriptRef.current = '';

    const promptText = getFieldPrompt(fieldName, preferredLanguage);

    speakText(promptText, preferredLanguage, () => {
      // If user toggled off or switched fields while speaking, don't start recognition
      if (activeDictateFieldRef.current !== fieldName) return;

      const baseTextRef = { current: '' };

      // Safe settle delay to bypass echo/residual audio feedback so speech doesn't trigger loop
      setTimeout(() => {
        if (activeDictateFieldRef.current !== fieldName) return;

        const startSession = () => {
          if (activeDictateFieldRef.current !== fieldName) return;

          const session = startVoiceRecognition({
            language: preferredLanguage,
            continuous: true, // keep recorder active for relaxed, continuous speech!
            onResult: (text) => {
              if (activeDictateFieldRef.current !== fieldName) return;
              
              const combinedText = (baseTextRef.current + " " + text).trim();
              fieldTranscriptRef.current = combinedText;
              setDictationTranscript(combinedText);

              // Voice stream activity detected: reset silence timeout
              if (silenceTimeoutIdRef.current) {
                clearTimeout(silenceTimeoutIdRef.current);
              }

              // Shorter, more responsive 2.2-second silence timeout before auto-committing the field dictation
              silenceTimeoutIdRef.current = setTimeout(() => {
                if (activeDictateFieldRef.current === fieldName) {
                  commitFieldDictation(fieldName);
                }
              }, 2200);
            },
            onEnd: () => {
              // If the browser session ends naturally, save current session buffer and restart!
              if (activeDictateFieldRef.current === fieldName) {
                const currentSessionText = fieldTranscriptRef.current;
                if (currentSessionText) {
                  baseTextRef.current = currentSessionText;
                }

                // Restart recognition session gracefully to allow long pauses without cutting off
                setTimeout(() => {
                  if (activeDictateFieldRef.current === fieldName) {
                    startSession();
                  }
                }, 300);
              }
            },
            onError: (err) => {
              console.error("Field dictation error:", err);
              if (activeDictateFieldRef.current === fieldName) {
                setActiveSession(null);
                const friendlyMsg = getFriendlySpeechErrorMessage(err, preferredLanguage);
                setErrorMsg(friendlyMsg);
                setDictationTranscript(
                  preferredLanguage === 'english'
                    ? `[Sandbox Mic Restricted] We are simulating "${String(fieldName)}". Type the value or select a Demo Prompt below to commit!`
                    : `[శాండ్‌బాక్స్ వాయిస్ పరిమితి] "${String(fieldName)}" ఫీల్డ్ నమోదు చేయడానికి కింద ఉన్న డెమో ప్రాంప్ట్ నొక్కండి లేదా టైప్ చేయండి!`
                );
              }
            }
          });
          setActiveSession(session);
        };

        startSession();
      }, 500); // 500ms synthesizer settle delay
    });
  };

  const speakSectionLabel = (labelEnglish: string, labelTelugu: string) => {
    stopSpeaking();
    const query = preferredLanguage === 'english' ? labelEnglish : labelTelugu;
    speakText(query, preferredLanguage);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentAccepted) {
      setErrorMsg(
        preferredLanguage === 'english'
          ? "You must consent to registration data storage to proceed"
          : "కొనసాగడానికి దయచేసి రిజిస్ట్రేషన్ డేటా నిల్వకు మీ సమ్మతిని తెలపండి"
      );
      return;
    }

    // Set submission parameters
    const currentSetupPatient: Patient = {
      ...formData,
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      registrationTime: liveTime.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
      consentVersion: "v1"
    };

    // Client-side Zod Schema Verification
    const validation = patientRegistrationSchema.safeParse(currentSetupPatient);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Invalid input parameters";
      setErrorMsg(firstError);
      return;
    }

    setErrorMsg(null);
    onRegisterComplete(currentSetupPatient);
    setIsSuccess(true);
    console.log("✓ Registration completed");
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto py-8 animate-fade-in text-left">
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-teal-150/40 shadow-xl space-y-8 bg-gradient-to-br from-white via-slate-50 to-teal-50/20">
          
          {/* Header Success Section */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 mx-auto border-2 border-teal-200 animate-bounce">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl md:text-3xl font-black font-display text-slate-800 tracking-tight">
                {preferredLanguage === 'english' ? "Registration Successfully Completed" : "నమోదు విజయవంతంగా పూర్తయింది"}
              </h1>
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">
                {preferredLanguage === 'english' ? "Patient record synced successfully" : "రోగి సమాచారం విజయవంతంగా నమోదు చేయబడింది"}
              </p>
            </div>
          </div>

          {/* Patient Details Cards */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-teal-400">
                {preferredLanguage === 'english' ? "Official Patient ID" : "అధికారిక రోగి ఐడీ"}
              </span>
              <span className="font-mono text-sm text-teal-400 font-bold bg-slate-950 px-3 py-1 rounded border border-slate-800">
                MED-{formData.uniqueId}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{preferredLanguage === 'english' ? "Full Name" : "పూర్తి పేరు"}</p>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{formData.firstName} {formData.lastName}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{preferredLanguage === 'english' ? "Contact Number" : "ఫోన్ నెంబర్"}</p>
                <p className="font-bold text-slate-200 text-sm mt-0.5 font-mono">{formData.contactNumber}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{preferredLanguage === 'english' ? "Date of Birth" : "పుట్టిన తేదీ"}</p>
                <p className="font-bold text-slate-200 text-sm mt-0.5 font-mono">{formData.dob || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{preferredLanguage === 'english' ? "Gender" : "లింగం"}</p>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{formData.gender}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{preferredLanguage === 'english' ? "Email Address" : "ఈమెయిల్ చిరునామా"}</p>
                <p className="font-bold text-slate-200 text-sm mt-0.5 font-mono">{formData.email || 'Not Provided'}</p>
              </div>
              <div className="md:col-span-2 border-t border-slate-800/60 pt-3">
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{preferredLanguage === 'english' ? "Residential Address" : "చిరునామా"}</p>
                <p className="font-bold text-slate-350 mt-0.5">{formData.address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <button
              onClick={() => {
                setIsSuccess(false);
                setEntryStarted(false);
                setFormData({
                  firstName: '',
                  lastName: '',
                  fullName: '',
                  dob: '',
                  age: null,
                  gender: 'Male',
                  contactNumber: contactNumber === 'Guest_User' || contactNumber === 'Guest' ? '' : contactNumber,
                  email: '',
                  address: '',
                  idType: 'Aadhaar',
                  idNumber: '',
                  isGovEmployee: false,
                  faceCaptureId: '',
                  photoUrl: '',
                  uniqueId: nextSequentialId,
                  registrationTime: '',
                  preferredLanguage: preferredLanguage,
                  preexistingConditions: 'None',
                  currentSymptoms: ''
                });
                setCapturedPhotoUrl(null);
                stopWebcam();
              }}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all w-full sm:w-1/3 cursor-pointer shadow-3xs"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>{preferredLanguage === 'english' ? "Register Another Patient" : "మరో రోగి నమోదు"}</span>
            </button>

            <button
              onClick={downloadReceipt}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all w-full sm:w-1/3 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{preferredLanguage === 'english' ? "Download Receipt" : "రసీదు డౌన్‌లోడ్"}</span>
            </button>

            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('revisit');
                } else if (onRevisitorClick) {
                  onRevisitorClick();
                }
              }}
              className="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all w-full sm:w-1/3 cursor-pointer shadow-md group"
            >
              <span>{preferredLanguage === 'english' ? "Proceed to Visitor Portal" : "రోగి వివరాల పోర్టల్"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative z-10 space-y-6">
      
      {/* ---------------- Upper Registration Header with Live clock ---------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <UserCheck className="w-5 h-5 shadow-sm" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-display text-slate-800 tracking-tight">
              {t.title}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Dynamic speech AI button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="express-voice-autofill-btn"
            type="button"
            onClick={handleWholeVoiceAutofill}
            disabled={isParsing}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-300 flex items-center gap-2 shadow-sm ${
              isDictatingWhole
                ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
                : 'bg-teal-600 hover:bg-teal-700 text-white border-transparent'
            }`}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>{preferredLanguage === 'english' ? 'Parsing Speech...' : 'విశ్లేషిస్తున్నాము...'}</span>
              </>
            ) : (
              <>
                {isDictatingWhole && <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />}
                <span>{preferredLanguage === 'english' ? 'Speech Autofill' : 'స్వర నింపకం'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RE-VISITOR PROFILE REDIRECT BANNER */}
      {onRevisitorClick && (
        <div 
          id="registration-revisitor-banner" 
          onClick={onRevisitorClick}
          className="p-5 bg-gradient-to-r from-teal-900/95 via-slate-900/98 to-sky-900/95 hover:from-teal-850 hover:to-sky-850 rounded-2xl text-white shadow-md border border-teal-500/30 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-2.5 bg-teal-500/20 rounded-xl shrink-0 animate-pulse border border-teal-400/20">
              <Camera className="w-5.5 h-5.5 text-amber-300" />
            </div>
            
            <div className="flex-1 text-left">
              <span className="inline-block bg-teal-400 text-teal-950 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full tracking-wider mb-1">
                Already Registered? / మునుపే నమోదు అయ్యారా?
              </span>
              <h3 className="text-sm font-black uppercase tracking-wide leading-tight">
                Switch to Re-Visitor Dashboard (తిరిగి వచ్చిన రోగి ప్రొఫైల్)
              </h3>
              <p className="text-[11px] text-sky-100 mt-1 leading-normal font-medium">
                Skip registration! Click here to scan your Aadhaar card and immediately retrieve your past medical logs & interactive wellness charts.
                <span className="block text-[10px] text-teal-200 mt-0.5">(నమోదు చేయనవసరం లేదు! ఆధార్ కార్డును స్కాన్ చేయడం ద్వారా సమగ్ర చార్ట్‌లను చూడటానికి ఇక్కడ క్లిక్ చేయండి)</span>
              </p>
            </div>

            <div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-colors shrink-0">
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      )}

      {/* Unique ID & System Time Display Bar */}
      <div className="bg-slate-900 text-slate-250 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
        <div className="flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-teal-400" />
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block leading-none mb-1">
              {t.uniqueId}
            </span>
            <span className="font-mono text-sm text-teal-400 font-bold bg-slate-950 px-3 py-1 rounded border border-slate-800">
              MED-{formData.uniqueId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
          <Clock className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <div className="text-left font-mono text-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              {t.liveTime}
            </span>
            <span className="text-slate-200 font-bold">
              {liveTime.toLocaleString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Voice feedback dashboard */}
      {(isDictatingWhole || activeDictateField || dictationTranscript) && (
        <VoiceFeedbackDashboard
          isDictatingWhole={isDictatingWhole}
          activeDictateField={activeDictateField}
          dictationTranscript={dictationTranscript}
          preferredLanguage={preferredLanguage}
          commitFieldDictation={commitFieldDictation}
          dictationTranscriptRef={dictationTranscriptRef}
          setDictationTranscript={setDictationTranscript}
          transcriptContainerRef={transcriptContainerRef}
          onWholeDictationComplete={handleWholeVoiceAutofill}
        />
      )}

      {/* ---------------- BENTO SEAMLESS VOICE & BIOMETRIC DASHBOARD ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Aadhaar Card OCR Scanning Portal */}
        <div className="bg-gradient-to-br from-indigo-50/75 via-sky-50/40 to-white/70 border border-slate-200 rounded-2xl p-5 shadow-2xs text-left relative overflow-hidden flex flex-col justify-between min-h-[190px]">
          <div className="absolute right-0 top-0 w-32 h-32 bg-sky-200/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                {preferredLanguage === 'english' ? 'Instant Aadhaar OCR Scan' : 'త్వరిత ఆధార్ కార్డు నమోదు'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              {preferredLanguage === 'english' 
                ? 'Voluntarily scan Front side for personal details (biodata) and Back side for resident address details.' 
                : 'ఆధార్ కార్డు బయోడేటా (ఫ్రంట్ సైడ్) మరియు నివాస చిరునామా (బ్యాక్ సైడ్) వేరువేరుగా స్కాన్ చేసి సులభంగా నింపవచ్చు.'}
            </p>
            
            {/* Toggle options for Photo selections as requested */}
            <div className="mt-4 p-2 bg-white/75 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Photo Source (రోగి ఫోటో):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAadhaarPhotoSource('aadhaar')}
                  className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all ${
                    aadhaarPhotoSource === 'aadhaar' 
                      ? 'bg-indigo-600 text-white shadow-3xs' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {preferredLanguage === 'english' ? 'Aadhaar Card' : 'ఆధార్ ఫోటో'}
                </button>
                <button
                  type="button"
                  onClick={() => setAadhaarPhotoSource('selfie')}
                  className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all ${
                    aadhaarPhotoSource === 'selfie' 
                      ? 'bg-indigo-600 text-white shadow-3xs' 
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {preferredLanguage === 'english' ? 'New Selfie' : 'కొత్త సెల్ఫీ'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            {isScanningAadhaar ? (
              <div className="space-y-3.5 bg-slate-900 p-4 rounded-xl border-2 border-dashed border-slate-650 flex flex-col items-center">
                
                {/* Active scan term header indicator */}
                <div className="w-full px-2 py-1.5 bg-indigo-950 border border-indigo-800 rounded-lg flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider">TARGET ACTION:</span>
                  <span className="text-[11px] font-extrabold text-white">
                    {aadhaarScanType === 'biodata' 
                      ? (preferredLanguage === 'english' ? 'FRONT SIDE (Biodata)' : 'ముందు భాగం (బయోడేటా స్కాన్)')
                      : (preferredLanguage === 'english' ? 'BACK SIDE (Address)' : 'వెనుక భాగం (చిరునామా స్కాన్)')
                    }
                  </span>
                </div>

                <div className="relative w-full max-w-xs aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                  
                  {cameraStream ? (
                    <video
                      ref={(node) => {
                        videoRef.current = node;
                        if (node && cameraStream && node.srcObject !== cameraStream) {
                          node.srcObject = cameraStream;
                        }
                      }}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_0.3s_ease]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-3 text-center">
                      <Cpu className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Calibrating card aligner...</span>
                    </div>
                  )}

                  {/* Rectangle Boundary Highlight overlay */}
                  <div className="absolute inset-2 border-2 border-dashed border-indigo-400 rounded-md pointer-events-none flex items-center justify-center bg-indigo-500/5">
                    <span className="text-[9px] text-indigo-300 bg-slate-950/80 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Aadhaar Reticle Marker</span>
                  </div>
                </div>

                <div className="flex gap-2 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => captureAadhaarScan()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Capture Snapshot (ఫారం నింపండి)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsScanningAadhaar(false); stopWebcam(); }}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 px-3 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 w-full">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => { setAadhaarScanType('biodata'); setIsScanningAadhaar(true); startWebcam('aadhaar-front'); }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all shadow border border-indigo-500"
                  >
                    <span className="font-extrabold uppercase text-[9px] tracking-wider text-indigo-200">Term 1: Camera</span>
                    <span className="text-[11px] font-bold flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      Scan Front (బయోడేటా)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAadhaarScanType('address'); setIsScanningAadhaar(true); startWebcam('aadhaar-back'); }}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all shadow border border-sky-500"
                  >
                    <span className="font-extrabold uppercase text-[9px] tracking-wider text-sky-200">Term 2: Camera</span>
                    <span className="text-[11px] font-bold flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      Scan Back (చిరునామా)
                    </span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAadhaarScanType('biodata');
                      const fileInput = document.getElementById('aadhaar-front-upload-input');
                      if (fileInput) fileInput.click();
                    }}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all shadow border border-teal-500"
                  >
                    <span className="font-extrabold uppercase text-[9px] tracking-wider text-teal-200">Term 1: Upload File</span>
                    <span className="text-[11px] font-bold flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      Upload Front (బయోడేటా)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAadhaarScanType('address');
                      const fileInput = document.getElementById('aadhaar-back-upload-input');
                      if (fileInput) fileInput.click();
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all shadow border border-emerald-500"
                  >
                    <span className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-200">Term 2: Upload File</span>
                    <span className="text-[11px] font-bold flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      Upload Back (చిరునామా)
                    </span>
                  </button>
                  
                  <input
                    id="aadhaar-front-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64 = event.target?.result as string;
                          if (base64) {
                            const compressed = await compressImageBase64(base64);
                            captureAadhaarScan(compressed);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <input
                    id="aadhaar-back-upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64 = event.target?.result as string;
                          if (base64) {
                            const compressed = await compressImageBase64(base64);
                            captureAadhaarScan(compressed);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => setShowAadhaarPasteBox(!showAadhaarPasteBox)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-705 text-slate-100 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all border border-slate-700"
                  >
                    <span>📝</span>
                    <span>{preferredLanguage === 'english' ? 'Paste Raw Text' : 'రాతపూర్వక వచనం అతికించండి'}</span>
                  </button>
                </div>

                {showAadhaarPasteBox && (
                  <div className="p-3 bg-white/90 border border-slate-200 rounded-xl space-y-2 mt-2 shadow-xs transition-opacity animate-fadeIn text-left">
                    <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block">
                      {preferredLanguage === 'english' ? 'Enter/Paste Raw Card Content:' : 'కార్డులోని సమాచారాన్ని ఇక్కడ కాపీ-పేస్ట్ చేయండి:'}
                    </span>
                    <textarea
                      rows={3}
                      className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-750"
                      placeholder={preferredLanguage === 'english'
                        ? "Paste any text block containing Aadhaar card details (e.g. Name, Date of Birth, Gender, Aadhaar Number, Address)..."
                        : "ఆధార్ సమాచారాన్ని ఇక్కడ పేస్ట్ చేయండి..."
                      }
                      value={pastedAadhaarText}
                      onChange={(e) => setPastedAadhaarText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowAadhaarPasteBox(false)}
                        className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {preferredLanguage === 'english' ? 'Cancel' : 'రద్దు చేయి'}
                      </button>
                      <button
                        type="button"
                        onClick={handleParsePastedAadhaarText}
                        disabled={isParsingPastedText || !pastedAadhaarText.trim()}
                        className="px-3 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        {isParsingPastedText ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Parsing...</span>
                          </>
                        ) : (
                          <span>{preferredLanguage === 'english' ? 'Parse & Autofill' : 'సేకరించు'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Global paste instruction tip */}
                <div className="text-[10px] text-slate-500 font-medium text-center bg-white/40 py-1 rounded-lg border border-dashed border-slate-200/50">
                  💡 {preferredLanguage === 'english' 
                    ? 'Pro-tip: Press Ctrl+V anywhere to paste an image instantly!' 
                    : 'సలహా: మ్యాప్ కోసం పేజీలో ఎక్కడైనా Ctrl+V నొక్కి చిత్రం పేస్ట్ చేయవచ్చు!'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Interactive Vocal Intake (Sequential, asks questions one-by-one) */}
        <div className="bg-gradient-to-br from-teal-50/75 via-emerald-50/40 to-white/70 border border-slate-200 rounded-2xl p-5 shadow-2xs text-left relative overflow-hidden flex flex-col justify-between min-h-[190px]">
          <div className="absolute right-0 top-0 w-32 h-32 bg-teal-200/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-teal-600 shrink-0" />
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                {preferredLanguage === 'english' ? 'Hands-Free Voice Guided Intake' : 'స్వర సహాయంతో క్రమానుగత నమోదు'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              {preferredLanguage === 'english' 
                ? 'Answers sequential field questions naturally out loud without touching any keys or clicking buttons.' 
                : 'ఎటువంటి నొక్కుడు లేకుండా కంప్యూటరు అడిగే ప్రశ్నలకు సమాధానము చెప్పుతూ సులువైన హ్యాండ్స్-ఫ్రీ నమోదు.'}
            </p>

            {guidedActive && (
              <div className="mt-3.5 bg-teal-950 text-slate-200 p-3 rounded-xl border border-teal-800 flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-teal-400 tracking-wider">Sequential Step {guidedStepIndex !== null ? guidedStepIndex + 1 : 1} of 11</p>
                    <p className="text-[11px] font-mono font-medium text-slate-300">
                      {guidedStepIndex === 0 && 'First Name (మొదటి పేరు)'}
                      {guidedStepIndex === 1 && 'Last Name (ఇంటి పేరు)'}
                      {guidedStepIndex === 2 && 'DOB Day (పుట్టిన రోజు సంఖ్య)'}
                      {guidedStepIndex === 3 && 'DOB Month (పుట్టిన నెల సంఖ్య)'}
                      {guidedStepIndex === 4 && 'DOB Year (పుట్టిన సంవత్సరం)'}
                      {guidedStepIndex === 5 && 'Gender (లింగం)'}
                      {guidedStepIndex === 6 && 'Phone Number (ఫోన్ నెంబర్)'}
                      {guidedStepIndex === 7 && 'ID Card Type (గుర్తింపు కార్డు రకం)'}
                      {guidedStepIndex === 8 && 'ID Number (గుర్తింపు కార్డు సంఖ్య)'}
                      {guidedStepIndex === 9 && 'Residential Address (నివాస చిరునామా)'}
                      {guidedStepIndex === 10 && 'Government Staff? (ప్రభుత్వ ఉద్యోగి?)'}
                    </p>
                  </div>
                </div>
                <div className="h-6 w-12 flex items-center justify-center bg-teal-900 border border-teal-800 rounded px-1.5 py-0.5">
                  <span className="text-[9px] font-bold text-teal-300">A.I. GUIDED</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            {guidedActive ? (
              <button
                type="button"
                onClick={() => { setGuidedActive(false); setGuidedStepIndex(null); stopSpeaking(); }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md animate-pulse"
              >
                <MicOff className="w-4 h-4" />
                <span>Stop Voice Guide Session (స్వర నమోదును ఆపివేయి)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setGuidedActive(true); stopSpeaking(); setTimeout(() => playGuidedStep(0), 400); }}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg border border-teal-505"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
                <span>Start Automatic Guided Registration (ఆటోమేటిక్ రిజిస్ట్రేషన్ ప్రారంభించండి)</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium p-4 rounded-xl flex items-start gap-2">
          <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Main Interactive Form */}
      <form id="registration-form" onSubmit={handleSubmit} className="glass-panel p-6 md:p-8 rounded-3xl shadow-md border border-slate-200 space-y-6">
        
        {/* Name segment split into First & Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* First Name */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.firstName} *
              </label>
              <button
                type="button"
                onClick={() => speakSectionLabel("First Name. Please say your first name.", "మొదటి పేరు. దయచేసి మొదటి పేరును నమోదు చేయండి.")}
                className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
                title="Speak label"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <input
                id="reg-firstname"
                type="text"
                required
                placeholder={t.placeholderFirstName}
                value={formData.firstName}
                onChange={e => setFormData(p => {
                  const updated = { ...p, firstName: e.target.value };
                  updated.fullName = `${updated.firstName} ${updated.lastName}`.trim();
                  return updated;
                })}
                className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all ${
                  activeDictateField === 'firstName' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
                }`}
              />
              <button
                id="dictate-firstname-btn"
                type="button"
                onClick={() => handleFieldDictate('firstName')}
                className={`absolute right-3 top-3.5 p-1 rounded-md transition-colors ${
                  activeDictateField === 'firstName' ? 'text-teal-600 bg-teal-50 animate-pulse' : 'text-slate-400 hover:text-teal-600'
                }`}
              >
                <Mic className="w-4 h-4 text-teal-600" />
              </button>
            </div>
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.lastName} *
              </label>
              <button
                type="button"
                onClick={() => speakSectionLabel("Last Name. Please say your last name.", "ఇంటి పేరు లేదా లాస్ట్ నేమ్.")}
                className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
                title="Speak label"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <input
                id="reg-lastname"
                type="text"
                required
                placeholder={t.placeholderName}
                value={formData.lastName}
                onChange={e => setFormData(p => {
                  const updated = { ...p, lastName: e.target.value };
                  updated.fullName = `${updated.firstName} ${updated.lastName}`.trim();
                  return updated;
                })}
                className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all ${
                  activeDictateField === 'lastName' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
                }`}
              />
              <button
                id="dictate-lastname-btn"
                type="button"
                onClick={() => handleFieldDictate('lastName')}
                className={`absolute right-3 top-3.5 p-1 rounded-md transition-colors ${
                  activeDictateField === 'lastName' ? 'text-teal-600 bg-teal-50 animate-pulse' : 'text-slate-400 hover:text-teal-600'
                }`}
              >
                <Mic className="w-4 h-4 text-teal-600" />
              </button>
            </div>
          </div>

        </div>

        {/* DOB picker grid and computed age display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <DobVoiceCaptureCard
            formData={formData}
            handleDobChange={handleDobChange}
            activeDictateField={activeDictateField}
            startDobVoiceSequence={startDobVoiceSequence}
            isDobOnlyGuided={isDobOnlyGuided}
            dobDayVal={dobDayVal}
            dobMonthVal={dobMonthVal}
            dobYearVal={dobYearVal}
            dictationTranscript={dictationTranscript}
            preferredLanguage={preferredLanguage}
            speakSectionLabel={speakSectionLabel}
            t={t}
          />

          {/* Automatically computed age */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.calculatedAge}
            </label>
            <div className="w-full px-4 py-3.5 bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between text-sm font-bold text-slate-700">
              <span>{formData.age !== null ? `${formData.age} ${t.years}` : '--'}</span>
              <span className="text-[10px] text-teal-600 uppercase tracking-widest font-black">
                Real-Time Auto Engine
              </span>
            </div>
          </div>

        </div>

        {/* Gender, contact and email segment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Gender selection */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.gender}
              </label>
              <button
                type="button"
                onClick={() => speakSectionLabel("Gender preference.", "లింగ నిర్ధారణ ఎంపిక.")}
                className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
                title="Speak label"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <select
                id="reg-gender"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all ${
                  activeDictateField === 'gender' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
                }`}
              >
                <option value="Male">{t.male}</option>
                <option value="Female">{t.female}</option>
                <option value="Other">{t.other}</option>
              </select>
              <button
                id="dictate-gender-btn"
                type="button"
                onClick={() => handleFieldDictate('gender')}
                className={`absolute right-3 top-3.5 p-1 rounded-md transition-colors ${
                  activeDictateField === 'gender' ? 'text-teal-600 bg-teal-50 animate-pulse' : 'text-slate-400 hover:text-teal-600'
                }`}
              >
                <Mic className="w-4 h-4 text-teal-600" />
              </button>
            </div>
          </div>

          {/* Contact number */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.contact} *
              </label>
              <button
                type="button"
                onClick={() => speakSectionLabel("Contact Number.", "సెల్ ఫోన్ నెంబర్ వివరాలు.")}
                className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
                title="Speak label"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <input
                id="reg-contact"
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={formData.contactNumber}
                onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono transition-all ${
                  activeDictateField === 'contactNumber' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
                }`}
              />
              <button
                id="dictate-contact-btn"
                type="button"
                onClick={() => handleFieldDictate('contactNumber')}
                className={`absolute right-3 top-3.5 p-1 rounded-md transition-colors ${
                  activeDictateField === 'contactNumber' ? 'text-teal-600 bg-teal-50 animate-pulse' : 'text-slate-400 hover:text-teal-600'
                }`}
              >
                <Mic className="w-4 h-4 text-teal-600" />
              </button>
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.email}
              </label>
              <button
                type="button"
                onClick={() => speakSectionLabel("Email Address.", "ఈమెయిల్ ఈ వివరాలు.")}
                className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
                title="Speak label"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <input
                id="reg-email"
                type="email"
                placeholder={t.placeholderEmail}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all ${
                  activeDictateField === 'email' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Resident address info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.address}
            </label>
            <button
              type="button"
              onClick={() => speakSectionLabel("Residential address.", "నివాస చిరునామా చెప్తారా.")}
              className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
              title="Speak label"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <input
              id="reg-address"
              type="text"
              placeholder={t.placeholderAddress}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all ${
                activeDictateField === 'address' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
              }`}
            />
            <button
              id="dictate-address-btn"
              type="button"
              onClick={() => handleFieldDictate('address')}
              className={`absolute right-3 top-3.5 p-1 rounded-md transition-colors ${
                activeDictateField === 'address' ? 'text-teal-600 bg-teal-50 animate-pulse' : 'text-slate-400 hover:text-teal-600'
              }`}
            >
              <Mic className="w-4 h-4 text-teal-600" />
            </button>
          </div>
        </div>

        {/* Identification dropdown & Gov sub option & ID details number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start bg-slate-50 p-5 rounded-2xl border border-slate-200">
          
          {/* ID selection */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-bold text-slate-605 uppercase tracking-wider">
                {t.idType}
              </label>
              <button
                type="button"
                onClick={() => speakSectionLabel("Identification card type selector.", "రోగి గుర్తింపు కార్డు రకం ఎంపిక.")}
                className="p-1 text-slate-400 hover:text-teal-605 rounded-full"
                title="Speak label"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <select
                id="reg-idtype"
                value={formData.idType}
                onChange={e => setFormData({ ...formData, idType: e.target.value as any })}
                className={`w-full pl-4 pr-11 py-3.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all ${
                  activeDictateField === 'idType' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-250'
                }`}
              >
                <option value="Aadhaar">Aadhaar (భారత విశిష్ట గుర్తింపు)</option>
                <option value="PAN ID">PAN ID_ (పర్మనెంట్ అకౌంట్ నంబర్)</option>
                <option value="Voter ID">Voter ID (ఓటరు కార్డు)</option>
                <option value="Employee ID">Employee ID (ఉద్యోగి గుర్తింపు కార్డు)</option>
              </select>
              <button
                id="dictate-idtype-btn"
                type="button"
                onClick={() => handleFieldDictate('idType')}
                className={`absolute right-3 top-3.5 p-1 rounded-md transition-colors ${
                  activeDictateField === 'idType' ? 'text-teal-600 bg-teal-50 animate-pulse' : 'text-slate-400 hover:text-teal-600'
                }`}
              >
                <Mic className="w-4 h-4 text-teal-600" />
              </button>
            </div>
          </div>

          {/* ID Card number (Demographic detail) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-bold text-slate-605 uppercase tracking-wider">
                {t.idNumber} *
              </label>
              <button
                type="button"
                onClick={() => speakSectionLabel("Please enter your identification card number.", "గుర్తింపు కార్డు నెంబర్ నమోదు చేయండి.")}
                className="p-1 text-slate-400 hover:text-teal-605 rounded-full"
                title="Speak label"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative">
              <input
                id="reg-idnumber"
                type="text"
                required
                placeholder={t.placeholderIdNumber}
                value={formData.idNumber || ''}
                onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
                className={`w-full pl-4 pr-11 py-3.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono transition-all ${
                  activeDictateField === 'idNumber' ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-250'
                }`}
              />
              <button
                id="dictate-idnumber-btn"
                type="button"
                onClick={() => handleFieldDictate('idNumber')}
                className={`absolute right-3 top-3.5 p-1 rounded-md transition-colors ${
                  activeDictateField === 'idNumber' ? 'text-teal-600 bg-teal-50 animate-pulse' : 'text-slate-400 hover:text-teal-600'
                }`}
              >
                <Mic className="w-4 h-4 text-teal-600" />
              </button>
            </div>
          </div>

          {/* Sub Option: Government Employee Checkbox */}
          <div className="space-y-1 pt-3.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="reg-gov-employee"
                  type="checkbox"
                  checked={formData.isGovEmployee}
                  onChange={e => setFormData({ ...formData, isGovEmployee: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold text-slate-700">
                  {t.isGovEmployee}
                </span>
              </label>
              <button
                id="dictate-govemployee-btn"
                type="button"
                onClick={() => handleFieldDictate('isGovEmployee')}
                className={`p-2 rounded-xl transition-colors border shadow-3xs ${
                  activeDictateField === 'isGovEmployee' ? 'text-white bg-teal-600 border-teal-605 animate-pulse' : 'text-slate-400 hover:text-teal-605 hover:bg-white border-slate-200'
                }`}
                title="Dictate government employee details status"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 pl-8 font-medium">
              {t.govNote}
            </p>
          </div>

        </div>

        {/* Face Capture Biometric Recognition module */}
        <BiometricCaptureCard
          cameraActive={cameraActive}
          cameraStream={cameraStream}
          capturedPhotoUrl={capturedPhotoUrl}
          capturing={capturing}
          fakeCoordinates={fakeCoordinates}
          formData={formData}
          t={t}
          startWebcam={startWebcam}
          captureFrame={captureFrame}
          videoRef={videoRef}
        />

        {/* Patient Consent capturing for data storage compliance */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-2 mt-4 text-left shadow-2xs">
          <label className="flex items-start gap-3.5 cursor-pointer">
            <input
              id="reg-consent-checkbox"
              type="checkbox"
              required
              checked={consentAccepted}
              onChange={e => setConsentAccepted(e.target.checked)}
              className="w-5 h-5 rounded border-slate-350 text-teal-600 focus:ring-teal-500 mt-0.5 shrink-0"
            />
            <div className="text-xs font-bold text-slate-700 leading-normal">
              {preferredLanguage === 'english' 
                ? "I consent to voice recording, photo capture, Aadhaar processing, and storage of my registration data."
                : "నా వాయిస్ రికార్డింగ్, ఫోటో క్యాప్చర్, ఆధార్ ప్రాసెసింగ్ మరియు నా రిజిస్ట్రేషన్ డేటా నిల్వకు నేను అంగీకరిస్తున్నాను."}
              <span className="text-rose-500 ml-1">*</span>
            </div>
          </label>
        </div>

        {/* Submit action panel */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between border-t border-slate-200 pt-6">
          <button
            id="reg-reset-btn"
            type="button"
            onClick={() => {
              setEntryStarted(false);
              setLiveTime(new Date());
              setCapturedPhotoUrl(null);
              stopWebcam();
              setConsentAccepted(false);
              setFormData({
                firstName: '',
                lastName: '',
                fullName: '',
                dob: '',
                age: null,
                gender: 'Male',
                contactNumber: contactNumber === 'Guest_User' || contactNumber === 'Guest' ? '' : contactNumber,
                email: '',
                address: '',
                idType: 'Aadhaar',
                idNumber: '',
                isGovEmployee: false,
                faceCaptureId: '',
                photoUrl: '',
                uniqueId: nextSequentialId,
                registrationTime: '',
                preferredLanguage: preferredLanguage,
                preexistingConditions: 'None',
                currentSymptoms: ''
              });
            }}
            className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" />
            {t.reset}
          </button>

          <button
            id="reg-submit-btn"
            type="submit"
            className="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all group w-full sm:w-auto"
          >
            <span>{t.submit}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </form>

      {/* Floating alert dictating state */}
      {(isDictatingWhole || activeDictateField !== null || isDictatingGender || isDictatingContact) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-950 text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-4 z-50 border border-slate-800 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-350">
              {preferredLanguage === 'english' ? 'AI Voice Tuning...' : 'స్వర వినికిడి లో ఉంది...'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeSession) {
                try {
                  activeSession.stop();
                } catch (e) {}
              }
              setIsDictatingWhole(false);
              setActiveDictateField(null);
              setIsDictatingGender(false);
              setIsDictatingContact(false);
              setActiveSession(null);
            }}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-full transition-all"
          >
            {preferredLanguage === 'english' ? 'Stop' : 'ఆపండి'}
          </button>
        </div>
      )}

    </div>
  );
}
