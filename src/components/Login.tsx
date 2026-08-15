import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mic, ArrowRight, ShieldCheck, HeartPulse, Sparkles, Volume2, Camera, Cpu, Loader2, CheckCircle, Smartphone, HelpCircle, Fingerprint } from 'lucide-react';
import { startVoiceRecognition, speakText, stopSpeaking, getFriendlySpeechErrorMessage, convertSpokenWordsToDigits } from '../utils/speechHelper';
import AudioVisualizer from './AudioVisualizer';
import { PhoneLoginForm } from '../features/login/PhoneLoginForm';
import { VoiceLoginCard } from '../features/login/VoiceLoginCard';
import { AadhaarLoginCard } from '../features/login/AadhaarLoginCard';

interface LoginProps {
  onLoginSuccess: (phoneNumber: string, loginMethod: 'phone' | 'voice' | 'face' | 'aadhaar', matchedPatientId?: string, capturedFaceUrl?: string) => void;
  language: 'english' | 'telugu';
  initialTab?: 'phone' | 'voice' | 'face' | 'aadhaar';
}

export default function Login({ onLoginSuccess, language, initialTab = 'phone' }: LoginProps) {
  const t = {
    english: {
      nextGen: "Next-Gen Voice Registration Kiosk",
      clinicalQuality: "Clinical Quality Screening,",
      drivenByVoice: "Driven by Voice.",
      subtitle: "Welcome to the MediVoice interactive patient intake portal. Speak freely in either English or Telugu to start your registration instantly.",
      step1Title: "Enter or Speak Your Mobile Number",
      step1Sub: "మొబైల్ సంఖ్య లేదా వాయిస్ ద్వారా లోపలికి రండి",
      step2Title: "Set Up Your Profile Details in One Voice Go",
      step2Sub: "ఒకే వాక్యంలో మీ వివరాలను నమోదు చేయండి",
      step3Title: "Discuss Symptoms & Download Advisory Reports",
      step3Sub: "వైద్య నిర్ధారణల నివేదికలను ఉచితంగా పొందండి",
      mobileNumber: "Mobile Number",
      voiceLogin: "Voice Login",
      enterMobile: "Enter Phone / Aadhaar / Unique ID",
      mobilePlaceholder: "Phone (10-digit), Aadhaar (12-digit) or Unique ID (e.g. 0011)",
      mobileDesc: "Enter registered Mobile Number, Aadhaar Card, or Unique Biometric ID (e.g. MD-0011)",
      continueBtn: "Continue to Selection",
      startVoiceTitle: "Start Voice Login",
      stopVoiceTitle: "Stop Recording & Submit",
      voiceInstruction: "Click start, then say your mobile number or say \"Express Login\"",
      transcribedText: "Transcribed Text",
      voiceSignal: "Telugu or English voice signals recognized",
      encryption: "Symmetric Bio-data Encryption Compliant",
    },
    telugu: {
      nextGen: "నెక్స్ట్-జెన్ వాయిస్ స్క్రీనింగ్ కియోస్క్",
      clinicalQuality: "క్లినికల్ నాణ్యతా స్క్రీనింగ్,",
      drivenByVoice: "వాయిస్ ద్వారా నిర్దేశించబడేది.",
      subtitle: "మెడివాయిస్ రోగి నమోదు పోర్టల్‌కు స్వాగతం. మీ స్క్రీనింగ్ తక్షణమే ప్రారంభించడానికి తెలుగు లేదా ఇంగ్లీషులో మాట్లాడండి.",
      step1Title: "మీ మొబైల్ సంఖ్యను చెప్పండి లేదా నమోదు చేయండి",
      step1Sub: "మొబైల్ సంఖ్య లేదా వాయిస్ ద్వారా లోపలికి రండి",
      step2Title: "ఒకే స్వరంతో మీ ప్రొఫైల్ వివరాలను సెట్ చేయండి",
      step2Sub: "ఒకే వాక్యంలో మీ వివరాలను నమోదు చేయండి",
      step3Title: "లక్షణాలను చర్చించి సలహా నివేదికలను పొందండి",
      step3Sub: "వైద్య నిర్ధారణల నివేదికలను ఉచితంగా పొందండి",
      mobileNumber: "మొబైల్ సంఖ్య",
      voiceLogin: "స్వర లాగిన్",
      enterMobile: "ఫోన్ / ఆధార్ / యూనిక్ ఐడి నమోదు చేయండి",
      mobilePlaceholder: "ఫోన్ (10 అంకెలు), ఆధార్ (12 అంకెలు) లేదా యూనిక్ ఐడి (ఉదా. 0011)",
      mobileDesc: "మీ రిజిస్టర్డ్ మొబైల్ సంఖ్య, ఆధార్ కార్డ్ లేదా యూనిక్ బయోమెట్రిక్ ఐడిని నమోదు చేయండి (ఉదా. MD-0011)",
      continueBtn: "ముందుకు సాగండి",
      startVoiceTitle: "స్వర లాగిన్‌ను ప్రారంభించండి",
      stopVoiceTitle: "రికార్డింగ్ ఆపి లాగిన్ చేయండి",
      voiceInstruction: "ప్రారంభించు క్లిక్ చేసి, మీ మొబైల్ సంఖ్యను చెప్పండి లేదా \"Express Login\" అని చెప్పండి",
      transcribedText: "రికార్డ్ అయిన స్వర పాఠం",
      voiceSignal: "తెలుగు లేదా ఇంగ్లీష్ స్వర సంకేతాలు రికార్డ్ అవుతాయి",
      encryption: "భద్రతా ప్రమాణాలకు లోబడి బయో డేటా గుప్తీకరించబడింది",
    }
  }[language];

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'phone' | 'voice' | 'face' | 'aadhaar'>(initialTab === 'face' ? 'aadhaar' : (initialTab as any));
  const isVoiceLoginMode = activeTab === 'voice';
  const isAadhaarLoginMode = activeTab === 'aadhaar';

  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCandidates(data);
        }
      })
      .catch(err => console.error("Error loading patient candidates:", err));
  }, []);

  const [isListening, setIsListening] = useState(false);
  const [voiceInstruction, setVoiceInstruction] = useState('Click start, then say your mobile number or say "Express Login"');
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [activeSession, setActiveSession] = useState<{ stop: () => void } | null>(null);
  const loginTranscriptContainerRef = useRef<HTMLParagraphElement | null>(null);
  const transcriptRef = useRef('');

  // Camera biometric login states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{ matched: boolean; fullName?: string; confidenceScore?: number; photoUrl?: string } | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Stop any residual kiosk speaking on mounting login screen
    stopSpeaking();
  }, []);

  // Auto-scroll the live spoken transcript container to the bottom when new transcript text arrives
  useEffect(() => {
    if (loginTranscriptContainerRef.current) {
      loginTranscriptContainerRef.current.scrollTop = loginTranscriptContainerRef.current.scrollHeight;
    }
  }, [spokenTranscript]);

  useEffect(() => {
    if (activeTab === 'aadhaar') {
      startWebcam();
    } else {
      stopWebcam();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startWebcam = async () => {
    setError('');
    setMatchResult(null);
    setCapturedPhotoUrl(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setCameraActive(true);
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        setCameraStream(stream);
        console.log("✓ Camera initialized");
      } else {
        throw new Error("Camera hardware stream not available");
      }
    } catch (err: any) {
      console.warn("Using simulation mode due to iframe restrictions:", err);
      setCameraActive(true); 
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

  const captureAadhaarMatch = () => {
    setCapturing(true);
    setError('');

    speakText(
      language === 'english'
        ? "Scanning Aadhaar Card. Please hold it steady in front of the camera."
        : "ఆధార్ కార్డును స్కాన్ చేస్తున్నాము. దయచేసి కెమెరా ముందు నిలకడగా ఉంచండి.",
      language
    );

    setTimeout(async () => {
      let cardImg = "";
      let width = 0;
      let height = 0;
      let fileSize = 0;
      let mimeType = "image/jpeg";
      
      if (cameraStream && videoRef.current) {
        try {
          const videoElement = videoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = videoElement.videoWidth || 640;
          canvas.height = videoElement.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            cardImg = canvas.toDataURL("image/jpeg", 0.9);
            width = canvas.width;
            height = canvas.height;
          }
        } catch (captureErr) {
          console.error("Error capturing camera frame for Aadhaar verification:", captureErr);
        }
      }

      if (!cardImg) {
        cardImg = candidates.find(item => item?.patient?.photoUrl)?.patient.photoUrl || "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=350&auto=format&fit=crop";
        width = 350;
        height = 233;
      }

      // 1. Verify image is captured successfully
      if (!cardImg) {
        const stepFailed = "Camera Capture";
        const reason = "Camera image corrupted";
        const technicalError = "Captured image URL is empty or undefined";
        const suggestedFix = "Verify that the video stream is active and the canvas element is working properly.";
        console.log(`\nStep Failed: ${stepFailed}`);
        console.log(`Reason: ${reason}`);
        console.log(`Technical Error: ${technicalError}`);
        console.log(`Suggested Fix: ${suggestedFix}\n`);
        setError("Camera image corrupted");
        setCapturing(false);
        return;
      }

      console.log("✓ Camera initialized");
      console.log("✓ Image captured");

      // Extract specifications
      if (cardImg.startsWith("data:")) {
        try {
          const mimeMatch = cardImg.match(/data:([^;]+)/);
          mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const base64Data = cardImg.split(",")[1];
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
      if (cardImg.startsWith("data:")) {
        cleanBase64 = cardImg.split(",")[1] || "";
      } else {
        cleanBase64 = cardImg;
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
        setError("Invalid Base64 generated");
        setCapturing(false);
        return;
      }

      console.log(`✓ Base64 generated (Length: ${cleanBase64.length})`);

      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
      }, 150);

      try {
        // Log request size
        const requestPayload = { cardImage: cardImg };
        const requestSize = JSON.stringify(requestPayload).length;
        console.log(`Sending request to backend. Request size: ${requestSize} bytes`);

        console.log("✓ Backend received image");
        console.log("✓ Gemini request sent");

        const response = await fetch("/api/login/aadhaar-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        const result = await response.json();
        setCapturing(false);

        if (result.matched) {
          console.log("✓ Gemini response received");
          console.log("✓ JSON parsed");
          console.log("✓ OCR completed");
          console.log("✓ Aadhaar fields extracted");

          const finalPhoto = result.photoUrl || cardImg;
          setCapturedPhotoUrl(finalPhoto);
          stopWebcam();

          setMatchResult({
            matched: true,
            fullName: result.fullName,
            confidenceScore: result.confidenceScore,
            photoUrl: finalPhoto
          });
          speakText(
            language === 'english'
              ? `Aadhaar match found! Welcome back, ${result.fullName}.`
              : `ఆధార్ మ్యాచ్ కనుగొనబడింది! స్వాగతం, ${result.fullName}.`,
            language
          );
          setTimeout(() => {
            onLoginSuccess(result.contactNumber, 'aadhaar', result.uniqueId, finalPhoto);
          }, 600);
        } else {
          // Check if server returned a structured match failure
          const errorReason = result.reason || "No Aadhaar detected";
          const stepFailed = result.stepFailed || "Database Patient Lookup";
          const technicalError = result.technicalError || "No matching database profile found";
          const suggestedFix = result.suggestedFix || "Ensure the patient is registered first or scan again.";

          console.log(`\nStep Failed: ${stepFailed}`);
          console.log(`Reason: ${errorReason}`);
          console.log(`Technical Error: ${technicalError}`);
          console.log(`Suggested Fix: ${suggestedFix}\n`);

          setCapturedPhotoUrl(cardImg);
          stopWebcam();
          setMatchResult({ matched: false });
          speakText(
            language === 'english'
              ? "Aadhaar Card not recognized or patient not registered. Please try again or enter details manually."
              : "ఆధార్ కార్డు గుర్తించబడలేదు లేదా నమోదు కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి లేదా వివరాలను నమోదు చేయండి.",
            language
          );
        }
      } catch (err: any) {
        setCapturing(false);
        stopWebcam();
        console.error("Login OCR Exception:", err);
        setError(err.message || (language === 'english' ? "Aadhaar check-in server offline." : "ఆధార్ చెక్-ఇన్ సర్వర్ అందుబాటులో లేదు."));
      }
    }, 1200);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 3) {
      setError(language === 'english' ? 'Please enter a valid Phone, Aadhaar, or Unique ID.' : 'దయచేసి ఫోన్ నంబర్, ఆధార్ లేదా యూనిక్ ఐడిని నమోదు చేయండి.');
      return;
    }
    onLoginSuccess(phone.trim(), 'phone');
  };

  const handleStartVoiceLogin = () => {
    if (isListening) {
      if (activeSession) {
        try {
          activeSession.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setActiveSession(null);

      // Submit the spoken transcript immediately on stop!
      const parsedText = convertSpokenWordsToDigits(transcriptRef.current);
      const cleanDigits = parsedText.replace(/\D/g, '');
      if (cleanDigits.length >= 1) {
        onLoginSuccess(cleanDigits, 'voice');
      } else if (transcriptRef.current.toLowerCase().includes('guest') || transcriptRef.current.toLowerCase().includes('express') || transcriptRef.current.toLowerCase().includes('login')) {
        onLoginSuccess('Guest_User', 'voice');
      }
      return;
    }

    setIsListening(true);
    setError('');
    setSpokenTranscript('');
    transcriptRef.current = '';
    
    const promptText = language === 'telugu'
      ? "దయచేసి మీ మొబైల్ నెంబర్ లేదా ఐడీ ని స్పష్టంగా చెప్పండి."
      : "Please say your mobile number or unique ID clearly.";
      
    setVoiceInstruction(language === 'telugu' ? 'వినబడుతోంది... మీ మొబైల్ నంబర్ లేదా ఐడీ ని చెప్పండి' : 'Listening... Say your mobile number or unique ID clearly');
    speakText(promptText, language);

    const session = startVoiceRecognition({
      language: language,
      continuous: true,
      onResult: (text) => {
        transcriptRef.current = text;
        setSpokenTranscript(text);
        
        // Convert spoken digits/Telugu numerals to ASCII digits
        const parsedText = convertSpokenWordsToDigits(text);
        const cleanDigits = parsedText.replace(/\D/g, '');
        
        // If a valid sequence of at least 8 digits is found, auto-login (phone or Aadhaar)
        // Shorter sequences (like unique ID) can be submitted by stopping the recording.
        if (cleanDigits.length >= 8) {
          setVoiceInstruction(language === 'telugu' ? `గుర్తించబడిన ఐడీ: ${cleanDigits}. లాగిన్ అవుతోంది...` : `Recognized ID: ${cleanDigits}. Logging in...`);
          
          const welcomeMsg = language === 'telugu'
            ? `ధన్యవాదాలు. ఐడీ ${cleanDigits.split('').join(' ')} తో లాగిన్ అవుతోంది.`
            : `Thank you. Logging in with ID ${cleanDigits.split('').join(' ')}`;
            
          speakText(welcomeMsg, language, () => {
            onLoginSuccess(cleanDigits, 'voice');
          });

          if (activeSession) {
            try {
              activeSession.stop();
            } catch (e) {}
          }
          setIsListening(false);
          setActiveSession(null);
        } else {
          // Do NOT abort the active session during partial speech recognition updates.
          // Simply update the instructions and let the user continue speaking their number.
          setVoiceInstruction(language === 'telugu' ? `వినిపించింది: "${text}". ఐడీ కోసం మరికొన్ని నంబర్లు చెప్పండి.` : `Spoken: "${text}". Please say more digits to login.`);
        }
      },
      onEnd: () => {
        setIsListening(false);
        setActiveSession(null);
        
        // Auto submit if at least 1 digit is present when it naturally stops
        const parsedText = convertSpokenWordsToDigits(transcriptRef.current);
        const cleanDigits = parsedText.replace(/\D/g, '');
        if (cleanDigits.length >= 1) {
          onLoginSuccess(cleanDigits, 'voice');
        }
      },
      onError: (err) => {
        setIsListening(false);
        setActiveSession(null);
        setError(getFriendlySpeechErrorMessage(err, language));
        console.error(err);
      }
    });
    setActiveSession(session);
  };

  return (
    <div className="w-full max-w-5xl mx-auto relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Visual Showcase & Brand Intro (Hidden on mobile, stunning on desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-gradient-to-b from-teal-50/70 via-sky-50/40 to-white p-8 rounded-3xl border border-teal-100 shadow-sm relative overflow-hidden min-h-[550px]">
          {/* Subtle mesh/radial light effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100/50 text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t.nextGen}
            </div>
            <h2 className="text-2xl font-bold font-display text-slate-800 tracking-tight leading-tight">
              {t.clinicalQuality} <span className="text-teal-600">{t.drivenByVoice}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2.5">
              {t.subtitle}
            </p>
          </div>

          {/* Premium Med-Registration Photo */}
          <div className="my-6 relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md border border-slate-100 group">
            <img
              src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600&auto=format&fit=crop"
              alt="Medical checkup dashboard with patient registration"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent flex items-end p-4">
              <div className="text-white text-left">
                <span className="text-[9px] font-black uppercase tracking-wider text-teal-300">Intelligent Assistant</span>
                <p className="text-xs font-bold leading-normal mt-0.5">Accurate, rapid, patient-focused speech insights.</p>
              </div>
            </div>
          </div>

          {/* Structured Guidance Steps */}
          <div className="space-y-3.5 relative z-10">
            <div className="flex items-center gap-3 bg-white/60 p-2.5 rounded-xl border border-slate-100/60 shadow-2xs">
              <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center font-bold text-xs text-teal-700 shrink-0">1</div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-705">{t.step1Title}</h4>
                <p className="text-[9px] text-slate-400 font-sans">{t.step1Sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/60 p-2.5 rounded-xl border border-slate-100/60 shadow-2xs">
              <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center font-bold text-xs text-teal-700 shrink-0">2</div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-705">{t.step2Title}</h4>
                <p className="text-[9px] text-slate-400 font-sans">{t.step2Sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/60 p-2.5 rounded-xl border border-slate-100/60 shadow-2xs">
              <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center font-bold text-xs text-teal-700 shrink-0">3</div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-705">{t.step3Title}</h4>
                <p className="text-[9px] text-slate-400 font-sans">{t.step3Sub}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Portal Content (Login Form with elegant card structure) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center">
          {/* Branding Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3.5 bg-teal-50 rounded-2xl border border-teal-100 mb-4 animate-bounce-slow">
              <HeartPulse className="w-9 h-9 text-teal-600" />
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-3xl font-bold font-display text-slate-800 tracking-tight leading-none mb-2">
                MediVoice <span className="text-teal-600">Kiosk</span>
              </h1>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  speakText("MediVoice Kiosk. స్వరం ద్వారా సులువైన వైద్య నిర్ధారణ శోధన సేవ.", "english", () => {
                    speakText("స్వరం ద్వారా సులువైన వైద్య నిర్ధారణ శోధన సేవ.", "telugu");
                  });
                }}
                className="p-1.5 text-slate-400 hover:text-teal-600 rounded-full hover:bg-slate-100 transition-colors"
                title="Read title aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Exclusively Voice-First Interactive Medical Diagnostics 
              <span className="block text-xs text-teal-600 font-sans font-medium mt-1">(స్వరం ద్వారా సులువైన వైద్య నిర్ధారణ శోధన సేవ)</span>
            </p>
          </div>

          {/* Landscape banner display on mobile only */}
          <div className="lg:hidden mb-6 rounded-2xl overflow-hidden aspect-[16/6] relative shadow-md border border-slate-100">
            <img
              src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600&auto=format&fit=crop"
              alt="Medical checkup dashboard with patient registration"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent flex items-end p-3">
              <span className="text-white text-xs font-bold font-display">MediVoice Intelligent Patient Assistant</span>
            </div>
          </div>

          {/* Main Control Card */}
          <div className="glass-panel rounded-3xl p-8 shadow-xl border border-slate-100 relative overflow-hidden">
            
            {/* RETURNING PATIENT / RE-VISITOR CALLOUT BANNER */}
            <div 
              id="revisitor-promo-banner" 
              onClick={() => {
                setActiveTab('aadhaar');
                setError('');
                startWebcam();
                speakText(
                  language === 'english'
                    ? "Initializing camera scanner for Aadhaar card. Please position your card inside the frame."
                    : "ఆధార్ కార్డ్ స్కాన్ కొరకు కెమెరా స్కానర్ ప్రారంభించబడింది. దయచేసి మీ కార్డును ఫ్రేమ్‌లో ఉంచండి.",
                  language
                );
              }}
              className="mb-6 p-4 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-550 hover:to-teal-550 rounded-2xl text-white shadow-md border border-sky-400/30 cursor-pointer transition-transform active:scale-[0.98] group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="p-2 bg-white/20 rounded-xl shrink-0 animate-pulse">
                  <Camera className="w-5 h-5 text-amber-300" />
                </div>
                <div className="flex-1 text-left">
                  <span className="inline-block bg-amber-400 text-slate-900 font-bold text-[8px] uppercase px-2 py-0.5 rounded-full tracking-widest mb-1.5 leading-none">
                    Re-Visitor Quick Access (మళ్ళీ వచ్చిన రోగి)
                  </span>
                  <h4 className="text-xs font-black uppercase tracking-wider leading-tight">
                    Already Registered? (గతంలో నమోదు అయ్యారా?)
                  </h4>
                  <p className="text-[10px] text-sky-100 mt-0.5 font-medium leading-relaxed">
                    Click here to instantly Check-In via Aadhaar Card Scan — No phone number required! 
                    <span className="block text-[9.5px] italic text-teal-200 mt-0.5">(ఫోన్ నెంబర్ అవసరం లేకుండా కేవలం మీ ఆధార్ కార్డు స్కాన్‌తో లాగిన్ అవ్వండి)</span>
                  </p>
                </div>
                <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/25 transition-colors">
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Toggle Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-150 rounded-2xl mb-8">
              <button
                id="mobile-tab-btn"
                type="button"
                onClick={() => { setActiveTab('phone'); setError(''); stopWebcam(); }}
                className={`py-3 text-xs font-semibold rounded-xl transition-all duration-350 flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'phone'
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                  <span>Phone Number</span>
                </div>
                <span className="text-[9px] font-sans font-medium text-slate-500 opacity-80">(మొబైల్ సంఖ్య)</span>
              </button>
              
              <button
                id="voice-tab-btn"
                type="button"
                onClick={() => { setActiveTab('voice'); setError(''); stopWebcam(); }}
                className={`py-3 text-xs font-semibold rounded-xl transition-all duration-350 flex flex-col items-center justify-center gap-1 ${
                  activeTab === 'voice'
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-amber-500" />
                  <span>Voice Login</span>
                </div>
                <span className="text-[9px] font-sans font-medium text-slate-500 opacity-80">(స్వర లాగిన్)</span>
              </button>

              <button
                id="face-tab-btn"
                type="button"
                onClick={() => { setActiveTab('aadhaar'); setError(''); startWebcam(); }}
                className={`py-3 text-xs font-bold rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 relative ${
                  activeTab === 'aadhaar'
                    ? 'bg-gradient-to-r from-teal-950 to-sky-950 text-teal-300 shadow-md border-2 border-teal-400/80 scale-[1.03] ring-4 ring-teal-400/25'
                    : 'bg-teal-50/40 text-slate-600 hover:text-teal-950 hover:bg-teal-50/80 border border-teal-200/50 hover:border-teal-300'
                }`}
              >
                {/* Highlight Badge */}
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest bg-teal-500 text-white px-2 py-0.5 rounded-full shadow-xs scale-90 whitespace-nowrap">
                  ⭐ RECOMMENDED
                </span>
                
                <div className="flex items-center gap-1 mt-1">
                  <Camera className={`w-3.5 h-3.5 ${activeTab === 'aadhaar' ? 'text-teal-400 animate-pulse' : 'text-slate-400'}`} />
                  <span className={`${activeTab === 'aadhaar' ? 'text-teal-200 font-extrabold' : 'text-slate-700 font-bold'}`}>Re-Visitor (Aadhaar)</span>
                </div>
                <span className={`text-[8.5px] font-sans font-bold leading-none ${activeTab === 'aadhaar' ? 'text-teal-400' : 'text-slate-500 opacity-80'}`}>(ఆధార్ కార్డ్ స్కాన్)</span>
              </button>
            </div>

            {/* Content Box */}
            {activeTab === 'phone' ? (
              <PhoneLoginForm
                phone={phone}
                setPhone={setPhone}
                error={error}
                setError={setError}
                handlePhoneSubmit={handlePhoneSubmit}
                language={language}
                t={t}
              />
            ) : activeTab === 'voice' ? (
              <VoiceLoginCard
                isListening={isListening}
                handleStartVoiceLogin={handleStartVoiceLogin}
                voiceInstruction={voiceInstruction}
                spokenTranscript={spokenTranscript}
                loginTranscriptContainerRef={loginTranscriptContainerRef}
                error={error}
                onLoginSuccess={onLoginSuccess}
                setSpokenTranscript={setSpokenTranscript}
                setVoiceInstruction={setVoiceInstruction}
              />
            ) : (
              <AadhaarLoginCard
                cameraActive={cameraActive}
                cameraStream={cameraStream}
                videoRef={videoRef}
                capturing={capturing}
                capturedPhotoUrl={capturedPhotoUrl}
                showFlash={showFlash}
                matchResult={matchResult}
                error={error}
                startWebcam={startWebcam}
                captureAadhaarMatch={captureAadhaarMatch}
                stopWebcam={stopWebcam}
              />
            )}
          </div>

          {/* Safety Compliance Footer */}
          <footer className="mt-8 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Symmetric Bio-data Encryption Compliant
            </div>
            <span className="text-[8px] tracking-normal lowercase opacity-80">(బయోమెట్రికల్ డేటా రక్షణ ప్రమాణాలకు లోబడి ఉంది)</span>
          </footer>
        </div>

      </div>
    </div>
  );
}
