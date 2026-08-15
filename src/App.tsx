import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Menu, 
  X, 
  UserPlus, 
  Power, 
  UserCheck, 
  Volume2, 
  KeyRound
} from 'lucide-react';
import { ScreenState, Patient, ConsultHistoryItem } from './types';
import { speakText, stopSpeaking, getVoicePreferences, saveVoicePreferences } from './utils/speechHelper';
import Login from './components/Login';
import LanguageSelect from './components/LanguageSelect';
import Registration from './components/Registration';
import OwnerDashboard from './components/OwnerDashboard';
import RevisitorConsulting from './components/RevisitorConsulting';
import VoiceSettingsModal from './components/VoiceSettingsModal';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('langSelect');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [contactNumber, setContactNumber] = useState('');
  const [globalLanguage, setGlobalLanguage] = useState<'english' | 'telugu'>('english');
  const [logoClicks, setLogoClicks] = useState(0);
  const [loginInitialTab, setLoginInitialTab] = useState<'phone' | 'voice' | 'face'>('phone');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'owner'>('user');
  
  // Real-time patient history list synced with the persistent file-system free backend
  const [historyItems, setHistoryItems] = useState<ConsultHistoryItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [accessToken, setAccessToken] = useState("");
  const [clinicIdFromUrl] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("clinicId") || "";
    } catch(e) { return ""; }
  });

  // Responsive mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Live subtitles stream matching active screen readout audio
  const [activeSpeechSubtitle, setActiveSpeechSubtitle] = useState<string | null>(null);
  const [activeSpeechLang, setActiveSpeechLang] = useState<'english' | 'telugu'>('english');

  // Interactive troubleshooting states for Iframe sandboxes
  const [vocalEngine, setVocalEngine] = useState<'cloud' | 'native'>('cloud');
  const [isIframe, setIsIframe] = useState(false);
  const [showSandboxNotice, setShowSandboxNotice] = useState(true);
  const [isServerWaking, setIsServerWaking] = useState(false);

  // Sync window styling, load existing database values and listen for active audio readouts
  useEffect(() => {
    document.title = "MediVoice Kiosk - Patient Screening";
    
    // Check if running in a sandboxed iframe
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }

    // Initialize voice preference states
    const prefs = getVoicePreferences();
    setVocalEngine(prefs.engine);

    // Load patients database from Express server with wake-up detection
    let initialLoadComplete = false;
    const wakeTimer = setTimeout(() => {
      if (!initialLoadComplete) {
        setIsServerWaking(true);
      }
    }, 1500);

    fetch('/api/patients')
      .then(res => res.json())
      .then(data => {
        initialLoadComplete = true;
        clearTimeout(wakeTimer);
        setIsServerWaking(false);
        if (Array.isArray(data)) {
          setHistoryItems(data);
        }
      })
      .catch(err => {
        initialLoadComplete = true;
        clearTimeout(wakeTimer);
        setIsServerWaking(false);
        console.error("Error fetching patient registrations from database API:", err);
      });

    // Listen for custom TTS audio readout feeds
    const handleSpeak = (e: any) => {
      if (e.detail) {
        setActiveSpeechSubtitle(e.detail.text);
        setActiveSpeechLang(e.detail.language || 'english');
      }
    };
    const handleStop = () => {
      setActiveSpeechSubtitle(null);
    };

    // Listen for vocal preference changes
    const handlePrefChanged = (e: any) => {
      if (e.detail && e.detail.engine) {
        setVocalEngine(e.detail.engine);
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('medi_speak', handleSpeak);
    window.addEventListener('medi_stop', handleStop);
    window.addEventListener('medi_voice_pref_updated', handlePrefChanged);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('medi_speak', handleSpeak);
      window.removeEventListener('medi_stop', handleStop);
      window.removeEventListener('medi_voice_pref_updated', handlePrefChanged);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLanguageChange = (lang: 'english' | 'telugu') => {
    setGlobalLanguage(lang);
    if (patient) {
      setPatient({ ...patient, preferredLanguage: lang });
    }
  };

  const handleLoginSuccess = (phoneNumber: string, method: 'phone' | 'voice' | 'face', matchedPatientId?: string, capturedFaceUrl?: string) => {
    setContactNumber(phoneNumber);
    
    if (method === 'face') {
      // Look up by unique ID or contact number
      const existing = historyItems.find(
        item => (matchedPatientId && item.patient.uniqueId === matchedPatientId) || 
                item.patient.contactNumber === phoneNumber
      );
      if (existing) {
        setPatient({
          ...existing.patient,
          photoUrl: capturedFaceUrl || existing.patient.photoUrl
        });
        setGlobalLanguage(existing.patient.preferredLanguage || 'english');
        setScreen('revisit');
      } else {
        // Build robust simulated patient for instant face demo success
        const demoPatient: Patient = {
          fullName: "Patient",
          firstName: "Patient",
          lastName: "",
          age: 30,
          gender: "Male",
          contactNumber: phoneNumber === 'Guest_User' || phoneNumber === 'Guest' || !phoneNumber ? "" : phoneNumber,
          email: "",
          address: "",
          idType: "Aadhaar",
          idNumber: "",
          isGovEmployee: false,
          uniqueId: matchedPatientId || "",
          preferredLanguage: globalLanguage || "english",
          preexistingConditions: "",
          currentSymptoms: "",
          photoUrl: capturedFaceUrl
        };
        setPatient(demoPatient);
        setScreen('revisit');
      }
    } else {
      // Look up existing records under this contact number, Aadhaar number, or Unique ID
      const cleanedCred = phoneNumber.trim().replace(/^MD-/i, ''); // Strip MD- prefix if present
      const existing = historyItems.find(item => {
        const p = item.patient;
        
        // Clean and compare contactNumber
        const dbPhoneClean = (p.contactNumber || '').replace(/\D/g, '');
        const inputClean = cleanedCred.replace(/\D/g, '');
        
        const matchesPhone = dbPhoneClean.length >= 8 && inputClean.length >= 8 && dbPhoneClean.includes(inputClean);
        
        // Clean and compare Aadhaar
        const dbAadhaarClean = (p.idType === 'Aadhaar' && p.idNumber) ? p.idNumber.replace(/\D/g, '') : '';
        const matchesAadhaar = dbAadhaarClean.length >= 8 && inputClean.length >= 8 && dbAadhaarClean === inputClean;
        
        // Clean and compare uniqueId
        const dbUniqueIdClean = (p.uniqueId || '').replace(/\D/g, '');
        const inputUniqueIdClean = inputClean; // e.g. 0011
        const matchesUniqueId = dbUniqueIdClean && (dbUniqueIdClean === inputUniqueIdClean || p.uniqueId.toLowerCase() === cleanedCred.toLowerCase());
        
        return matchesPhone || matchesAadhaar || matchesUniqueId;
      });

      if (existing) {
        setPatient(existing.patient);
        setGlobalLanguage(existing.patient.preferredLanguage || 'english');
        setScreen('revisit'); // Go to Revisitor Consulting Dashboard directly
      } else {
        setScreen('langSelect'); // Brand new patient, select language to register
      }
    }
  };

  const handleLanguageChosen = (lang: 'english' | 'telugu') => {
    setGlobalLanguage(lang);
    if (patient) {
      setPatient({ ...patient, preferredLanguage: lang });
    }
    setScreen('registration');
  };

  const handleRegistrationComplete = (newPatient: Patient) => {
    // Sync preferred language from registration
    setGlobalLanguage(newPatient.preferredLanguage || 'english');
    const assignedClinicId = newPatient.clinicId || clinicIdFromUrl || 'clinic-0001';
    setPatient({ ...newPatient, clinicId: assignedClinicId });
    
    // Package a pristine registry entry
    const newRecord: ConsultHistoryItem = {
      id: `item-${Date.now()}`,
      clinicId: assignedClinicId,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      language: newPatient.preferredLanguage || 'english',
      patient: { ...newPatient, clinicId: assignedClinicId },
      history: []
    };

    // Save record to the persistent Express backend disk
    fetch('/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newRecord)
    })
    .then(res => res.json())
    .then(saved => {
      // Sync state instantly
      setHistoryItems(prev => {
        const index = prev.findIndex(item => item.id === saved.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = saved;
          return updated;
        } else {
          return [saved, ...prev];
        }
      });
    })
    .catch(err => {
      console.error("Local backup state used. Error calling persistent save api:", err);
      // fallback in-memory state in rare API failure case
      setHistoryItems(prev => [newRecord, ...prev]);
    });

    // Keep them on registration page to review details / print / biometric stamp
    setScreen('registration');
  };

  const handleDeletePatient = (recordId: string) => {
    fetch(`/api/patients/${recordId}`, {
      method: 'DELETE',
      headers: {
        'x-user-role': userRole,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setHistoryItems(prev => prev.filter(item => item.id !== recordId && item.patient?.uniqueId !== recordId));
        if (patient && (patient.uniqueId === recordId || `item-${recordId}` === patient.uniqueId || patient.uniqueId === `item-${recordId}`)) {
          setPatient(null);
        }
      }
    })
    .catch(err => console.error("Error deleting patient record:", err));
  };

  const handleDeduplicatePatients = () => {
    fetch('/api/patients/deduplicate', {
      method: 'POST',
      headers: {
        'x-user-role': userRole,
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.patients) {
        setHistoryItems(data.patients);
      }
    })
    .catch(err => console.error("Error deduplicating patients:", err));
  };

  const getNextSequentialId = () => {
    if (historyItems.length === 0) return '0001';
    
    let maxId = 0;
    historyItems.forEach(item => {
      if (item.patient && item.patient.uniqueId) {
        const idNum = parseInt(item.patient.uniqueId.replace(/\D/g, ''), 10);
        if (!isNaN(idNum) && idNum > maxId) {
          maxId = idNum;
        }
      }
    });
    
    return String(maxId + 1).padStart(4, '0');
  };

  const handleLogout = () => {
    setPatient(null);
    setContactNumber('');
    setUserRole('user');
    setAccessToken('');
    setScreen('login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans transition-all duration-300">
      
      {/* ----------------- TOP SLUSH HEADER (Sleek Interface theme) ----------------- */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-25 shadow-2xs">
        <div className="flex items-center gap-3">
          {screen !== 'login' && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              {isSidebarOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
            </button>
          )}

          {/* Secure click brand logo header to access Owner Registry hidden for normal users */}
          <div 
            onClick={() => {
              setLogoClicks(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setScreen('owner');
                  setIsSidebarOpen(false);
                  return 0;
                }
                return next;
              });
            }}
            className="flex items-center gap-3 cursor-pointer select-none active:scale-95 transition-transform"
            title="Secret Access"
          >
            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center shadow-md">
              <HeartPulse className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-800 uppercase font-display">
              MediVoice <span className="text-sky-505 font-black">Kiosk</span>
            </span>
          </div>
        </div>

        {/* Global info indicators */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* Voice customization controller */}
          <button
            onClick={() => {
              stopSpeaking();
              setShowVoiceSettings(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 md:py-2 bg-slate-100 text-slate-650 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/25 text-xs font-bold rounded-lg border border-slate-220 shadow-2xs transition-all tracking-tight cursor-pointer"
            title={globalLanguage === 'telugu' ? 'స్వర అమరికలను సరిదిద్దండి' : 'Calibrate Speech & Speakers'}
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="hidden sm:inline">
              {globalLanguage === 'telugu' ? 'స్వర అమరికలు' : 'Voice Settings'}
            </span>
          </button>

          {/* Quick Vocal Engine Switcher for Sandbox By-pass with visual notification feedback */}
          <button
            id="vocal-engine-quick-toggle"
            onClick={() => {
              stopSpeaking();
              const nextEngine: 'cloud' | 'native' = vocalEngine === 'cloud' ? 'native' : 'cloud';
              const currentPrefs = getVoicePreferences();
              const updated = { ...currentPrefs, engine: nextEngine };
              saveVoicePreferences(updated);
              setVocalEngine(nextEngine);
              
              // Trigger audio test readouts to prove it works
              speakText(
                globalLanguage === 'telugu' 
                  ? (nextEngine === 'cloud' ? "యాక్టివ్ క్లౌడ్ వాయిస్" : "యాక్టివ్ డివైజ్ వాయిస్")
                  : (nextEngine === 'cloud' ? "Cloud engine active" : "Device engine active"),
                globalLanguage
              );
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 md:py-2 text-[11px] font-bold rounded-lg border shadow-3xs transition-all cursor-pointer ${
              vocalEngine === 'cloud'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-250 hover:bg-emerald-100/50'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100/50'
            }`}
            title="Switch Speech Accent Mode"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 animate-pulse" />
            <span>
              {vocalEngine === 'cloud' ? '🔮 AI Voice' : '💻 Device Voice'}
            </span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-lg text-2xs font-bold gap-1 shadow-inner border border-slate-200">
            <button
              id="global-en-toggle"
              onClick={() => handleLanguageChange('english')}
              className={`px-3 py-1 rounded transition-all ${globalLanguage === 'english' ? 'bg-white shadow-xs text-sky-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
            >
              English
            </button>
            <button
              id="global-te-toggle"
              onClick={() => handleLanguageChange('telugu')}
              className={`px-3 py-1 rounded transition-all ${globalLanguage === 'telugu' ? 'bg-white shadow-xs text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
            >
              తెలుగు
            </button>
          </div>

          {screen !== 'login' && (
            <>
              <div className="h-6 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs shadow-sm uppercase font-display">
                  {patient ? patient.fullName.slice(0, 2) : 'G'}
                </div>
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap hidden md:inline">
                  {patient ? patient.fullName : 'Guest Patient'}
                </span>
              </div>
            </>
          )}

        </div>
      </header>

      {/* Dismissible Iframe Sandboxing Diagnostics Notice */}
      {isIframe && showSandboxNotice && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/50 px-6 py-3 flex items-center justify-between text-xs text-amber-900 shadow-3xs relative z-30 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-505"></span>
            </span>
            <p className="font-semibold leading-relaxed">
              <strong>Iframe Voice Notice:</strong> Some browsers block micro-capturing (STT) and voice synthesize stream (TTS) inside sandboxed preview screens. For fully active microphone input and audio output, click <strong className="text-teal-700 bg-teal-100/60 px-1.5 py-0.5 rounded border border-teal-200">Open in New Tab</strong> at the top-right of your screen. You can also utilize our built-in <strong>Keyboard Voice Simulators</strong> below to fully run the kiosk diagnostics inside this iframe!
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setShowSandboxNotice(false)}
            className="text-amber-600 hover:text-amber-905 hover:bg-amber-100 font-bold px-2.5 py-1 rounded-lg transition-colors ml-4 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Server Warming Up / Wake-up Connection Notice */}
      {isServerWaking && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-200/50 px-6 py-3 flex items-center justify-center text-xs text-teal-900 shadow-3xs relative z-30 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-600"></span>
            </span>
            <p className="font-semibold leading-relaxed">
              {globalLanguage === 'telugu' ? (
                <span>⚙️ <strong>సర్వర్ కనెక్ట్ అవుతోంది:</strong> కియోస్క్ సిద్ధమవుతోంది... దయచేసి 30-45 సెకన్లు వేచి ఉండండి (నిష్క్రియ సమయం తర్వాత మేల్కొలుపు).</span>
              ) : (
                <span>⚙️ <strong>Server Connecting:</strong> Kiosk database is warming up... Please wait 30-45 seconds (waking up from idle state).</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ----------------- CORE PANELS CONTAINER ----------------- */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* SIDEBAR NAVIGATION PANEL (Visible when logged in) */}
        {screen !== 'login' && (
          <aside 
            className={`w-60 bg-slate-900 flex flex-col p-4 shrink-0 transition-all duration-300 z-20 absolute lg:relative inset-y-0 left-0 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <div className="space-y-1.5 pt-4">
              
              {/* Dashboard nav button completely removed as requested */}

              {/* Patient registration */}
              <div className="relative group/side">
                <button
                  id="side-reg-btn"
                  onClick={() => { setScreen('registration'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-colors text-left uppercase tracking-wider pr-10 ${
                    screen === 'registration'
                      ? 'bg-sky-600/15 text-sky-450 border-l-4 border-sky-500 font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4 shrink-0 text-sky-550" />
                  <div>
                    {globalLanguage === 'telugu' ? (
                      <>
                        <span className="text-sm font-semibold tracking-normal normal-case">రోగి కొత్త రిజిస్ట్రేషన్</span>
                        <span className="block text-[9px] text-slate-500 font-semibold tracking-normal lowercase italic">PATIENT REGISTRATION</span>
                      </>
                    ) : (
                      <>
                        <span>New Registration</span>
                        <span className="block text-[9px] text-slate-500 font-semibold tracking-normal lowercase italic">రోగి వైద్య నమోదు</span>
                      </>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopSpeaking();
                    speakText(globalLanguage === 'telugu' ? "రోగి వైద్య నమోదు పత్రం ఫారమ్" : "Patient medical registration form screen", globalLanguage);
                  }}
                  className="absolute right-2 top-3 p-1 text-slate-500 hover:text-sky-400 rounded-md hover:bg-slate-800 transition-colors"
                  title="Speak Registration"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Re-Visitor Aadhaar Check-In Sidebar Access Tab */}
              <div className="relative group/side flex-col">
                <button
                  id="side-revisit-btn"
                  onClick={() => { setLoginInitialTab('face'); setScreen('login'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-colors text-left uppercase tracking-wider pr-10 ${
                    screen === 'login' || screen === 'revisit'
                      ? 'bg-teal-600/15 text-teal-400 border-l-4 border-teal-500 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/10'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0 text-teal-400" />
                  <div>
                    {globalLanguage === 'telugu' ? (
                      <>
                        <span className="text-sm font-semibold tracking-normal normal-case">తిరిగి వచ్చిన రోగి ప్రొఫైల్</span>
                        <span className="block text-[9px] text-slate-500 font-semibold tracking-normal lowercase italic">RE-VISITOR AADHAAR SCAN</span>
                      </>
                    ) : (
                      <>
                        <span>Re-Visitor Profile</span>
                        <span className="block text-[9px] text-slate-500 font-semibold tracking-normal lowercase italic">తిరిగి వచ్చిన రోగి ఆధార్ తనిఖీ</span>
                      </>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopSpeaking();
                    speakText(globalLanguage === 'telugu' ? "ఆధార్ కార్డ్ స్కాన్ ఆధారిత తిరిగి వచ్చిన రోగి తనిఖీ ద్వారా లాగిన్ అవ్వండి" : "Re-visitor Aadhaar card scan check-in profile matching", globalLanguage);
                  }}
                  className="absolute right-2 top-3 p-1 text-slate-500 hover:text-teal-400 rounded-md hover:bg-slate-800 transition-colors"
                  title="Speak Revisitor Sidebar Action"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Owner Portal registry login (only appears if active to maintain secret access for admins) */}
              {screen === 'owner' && (
                <div className="relative group/side">
                  <button
                    id="side-owner-btn"
                    onClick={() => { setScreen('owner'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-colors text-left uppercase tracking-wider pr-10 ${
                      screen === 'owner'
                        ? 'bg-teal-600/15 text-teal-400 border-l-4 border-teal-500 font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/10'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 shrink-0 text-teal-400" />
                    <div>
                      {globalLanguage === 'telugu' ? (
                        <>
                          <span className="text-sm font-semibold tracking-normal normal-case">యజమాని బోర్డు</span>
                          <span className="block text-[9px] text-slate-500 font-semibold tracking-normal lowercase italic">OWNER REGISTRY</span>
                        </>
                      ) : (
                        <>
                          <span>Owner Portal</span>
                          <span className="block text-[9px] text-slate-500 font-semibold tracking-normal lowercase italic">యజమాని బోర్డు</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              )}

            </div>

            {/* Bottom status panel */}
            <div className="mt-auto space-y-4">
              
              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-705">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-black mb-1.5">
                  {globalLanguage === 'telugu' ? 'సిస్టమ్ స్థితి' : 'Kiosk Connectivity'}
                </p>
                {isOnline ? (
                  <div className="flex items-center gap-2 text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></div>
                    {globalLanguage === 'telugu' ? 'క్లౌడ్ డేటాబేస్ ఆన్‌లైన్' : '🟢 Synced'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] text-rose-450 font-bold uppercase tracking-wider">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
                    {globalLanguage === 'telugu' ? 'ఆఫ్‌లైన్ మోడ్' : '🔴 Sync Failed'}
                  </div>
                )}
              </div>

              {/* Patient switch access */}
              <button
                id="side-logout-btn"
                onClick={handleLogout}
                className="w-full flex items-center justify-start gap-2 text-xs font-bold text-rose-450 hover:text-rose-350 transition-colors p-2.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 text-left"
              >
                <Power className="w-4.5 h-4.5 shrink-0" />
                <div>
                  <span className="block">
                    {globalLanguage === 'telugu' ? 'రోగి మార్పు' : 'Exit Kiosk User'}
                  </span>
                </div>
              </button>

            </div>
          </aside>
        )}

        {/* WORKSPACE CONTENT SHELL */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {screen === 'login' && (
            <Login onLoginSuccess={handleLoginSuccess} language={globalLanguage} initialTab={loginInitialTab} />
          )}

          {screen === 'langSelect' && (
            <LanguageSelect 
              onLanguageChosen={handleLanguageChosen} 
              patientName={patient ? patient.fullName : 'Guest'} 
              onRevisitorClick={() => {
                setLoginInitialTab('face');
                setScreen('login');
              }}
            />
          )}

          {screen === 'registration' && (
            <Registration
              onRegisterComplete={handleRegistrationComplete}
              preferredLanguage={globalLanguage}
              contactNumber={contactNumber}
              nextSequentialId={getNextSequentialId()}
              initialPatient={patient}
              onRevisitorClick={() => setScreen('login')}
              onNavigate={(dest) => setScreen(dest)}
            />
          )}

          {screen === 'owner' && (
            <OwnerDashboard
              patient={patient}
              historyItems={historyItems}
              language={globalLanguage}
              onDeletePatient={handleDeletePatient}
              onDeduplicatePatients={handleDeduplicatePatients}
              userRole={userRole}
              onAuthSuccess={(role) => setUserRole(role)}
              onLogout={() => {
                setAccessToken("");
                setScreen('langSelect');
              }}
              accessToken={accessToken}
              setAccessToken={setAccessToken}
            />
          )}

          {screen === 'revisit' && (
            <RevisitorConsulting
              patient={patient}
              historyItems={historyItems}
              language={globalLanguage}
              onBackToKiosk={handleLogout}
              onNavigate={(dest) => setScreen(dest)}
            />
          )}

        </main>

      </div>

      <VoiceSettingsModal 
        isOpen={showVoiceSettings} 
        onClose={() => setShowVoiceSettings(false)} 
        language={globalLanguage} 
      />

      {/* Dynamic Subtitles Overlayer fallback desk */}
      {activeSpeechSubtitle && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/98 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 z-45 max-w-sm sm:max-w-md md:max-w-lg border-l-4 border-l-teal-500 border border-slate-805/70 animate-fade-in backdrop-blur-md">
          <div className="flex h-3 w-3 items-center justify-center shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
          </div>
          <div className="text-left flex-1 min-w-0">
            <span className="text-[9px] uppercase font-black text-teal-400 tracking-widest block mb-0.5">
              {activeSpeechLang === 'telugu' ? "వాయిస్ సహాయకుడు (MediVoice)" : "MediVoice Companion Speaking"}
            </span>
            <p className="text-xs font-semibold leading-relaxed text-slate-200 font-sans">
              "{activeSpeechSubtitle}"
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
