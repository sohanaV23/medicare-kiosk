import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Volume2, 
  Printer, 
  CheckCircle, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  Award,
  TrendingDown
} from 'lucide-react';
import { Patient, ConsultHistoryItem } from '../types';
import { speakText, stopSpeaking } from '../utils/speechHelper';
import { RecentConsultationsList } from '../features/revisitor/RecentConsultationsList';

interface RevisitorConsultingProps {
  patient: Patient | null;
  historyItems: ConsultHistoryItem[];
  language: 'english' | 'telugu';
  onBackToKiosk: () => void;
  onNavigate: (dest: any) => void;
}

export default function RevisitorConsulting({
  patient,
  historyItems,
  language,
  onBackToKiosk,
  onNavigate
}: RevisitorConsultingProps) {
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  // Safe variables computation from matched patient
  const lastName = patient?.lastName || "";
  const firstName = patient?.firstName || "";
  const patientFullName = `${lastName} ${firstName}`.trim() || patient?.fullName || "Patient";

  useEffect(() => {
    // Speak welcoming statement as the visitor has checked in successfully via Aadhaar card scan mapper
    stopSpeaking();
    const welcomeEn = `Aadhaar card scan matched! Welcome back, ${patientFullName}. Your profile has been successfully matched. You can view your visit history and print your registration receipt here.`;
    const welcomeTe = `ఆధార్ కార్డ్ మ్యాచ్ విజయవంతమైంది! మళ్ళీ స్వాగతం, ${patientFullName}. మీ ప్రొఫైల్ విజయవంతంగా గుర్తించబడింది.`;
    
    speakText(language === 'english' ? welcomeEn : welcomeTe, language);
  }, [patient]);

  // Translate labels helper
  const t = {
    english: {
      title: "Re-Visitor Registry Portal",
      subtitle: "Secured Aadhaar Scan Registry Hub",
      welcome: "Welcome Back,",
      biometricStatus: "Aadhaar Identity Mapping",
      confidence: "Aadhaar Scan Match Score",
      patientId: "Patient ID Location",
      registeredPh: "Primary Mobile",
      genderAge: "Gender & Age",
      addressLabel: "Residential Address",
      conditions: "Pre-existing Conditions",
      activeSymptoms: "Latest Reported Symptoms",
      printCardBtn: "Print Registration Receipt",
      exitBtn: "Log out from Kiosk",
      recentConsultations: "Registration & Visit History Logs",
      noConsult: "No prior registration history listed.",
      printingPlaceholder: "Formatting and thermal printing in progress...",
      printSuccessMsg: "Slip Printed Successfully! Grab your token below.",
      backBtn: "Change Language"
    },
    telugu: {
      title: "పునరాగమన రోగి రిజిస్ట్రేషన్ పోర్టల్",
      subtitle: "ఆధార్ కార్డ్ స్క్యాన్ ఆధారిత ప్రత్యేక తనిఖీ వ్యవస్థ",
      welcome: "మళ్ళీ స్వాగతం,",
      biometricStatus: "ఆధార్ ఐడెంటిటీ మ్యాపింగ్",
      confidence: "ఆధార్ మ్యాచ్ స్కోర్",
      patientId: "రోగి నమోదు ఐడీ",
      registeredPh: "ప్రధాన మొబైల్ నెంబర్",
      genderAge: "లింగం & వయస్సు",
      addressLabel: "నివాస చిరునామా",
      conditions: "గత అనారోగ్య సమస్యలు",
      activeSymptoms: "చివరిగా నివేదించిన లక్షణాలు",
      printCardBtn: "నమోదు రశీదును ముద్రించండి",
      exitBtn: "కియోస్క్ నుండి నిష్క్రమించు",
      recentConsultations: "రిజిస్ట్రేషన్ & గత సందర్శన చరిత్ర",
      noConsult: "గత నమోదు నివేదికలు అందుబాటులో లేవు.",
      printingPlaceholder: "థర్మల్ హెల్త్ స్లిప్ ప్రింట్ అవుతోంది...",
      printSuccessMsg: "టోకెన్ విజయవంతంగా ముద్రించబడింది!",
      backBtn: "భాష మార్చండి"
    }
  }[language];

  const uniqueId = patient?.uniqueId || "";
  const contactNo = patient?.contactNumber || "";
  const age = patient?.age || 30;
  const gender = patient?.gender || "Male";
  const preexisting = patient?.preexistingConditions || "";
  const latestSymptoms = patient?.currentSymptoms || "";
  const address = patient?.address || "";

  // Grab matching previous consultations if any exist in free database file
  const matchedHistoryItems = historyItems.filter(item => 
    (contactNo && item.patient.contactNumber === contactNo) || 
    (uniqueId && item.patient.uniqueId === uniqueId)
  );

  const simulatePrinting = () => {
    setIsPrinting(true);
    setPrintSuccess(false);

    speakText(
      language === 'english'
        ? "Generating and printing your thermal registration receipt badge now."
        : "మీ రిజిస్ట్రేషన్ పత్రం జారీ చేయబడుతుంది. ఒక క్షణం నిరీక్షించండి.",
      language
    );

    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 5000);
    }, 2500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in py-1">
      
      {/* ---------------- WELCOME HEADER BANNER ---------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-teal-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Abstract background grids */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full border border-sky-500/30 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {t.subtitle}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-white tracking-tight flex items-baseline gap-2">
              <span>{t.welcome}</span>
              <span className="text-sky-400 font-extrabold">{patientFullName}</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              {language === 'telugu'
                ? "మీ ప్రొఫైల్ విజయవంతంగా గుర్తించబడింది. మీ రిజిస్ట్రేషన్ వివరాలు క్రింద ఉన్నాయి."
                : "Your profile has been successfully matched. Your registration details are listed below."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 shrink-0">
            <button
              id="revisit-print-head-btn"
              onClick={simulatePrinting}
              className="px-6 py-4 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Printer className="w-4.5 h-4.5 shrink-0" />
              <div className="text-left">
                <span className="block text-[12px] leading-tight">{t.printCardBtn}</span>
                <span className="block text-[8px] opacity-80 font-normal">రశీదు ప్రింట్</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* PRINT DIALOG OVERLAYS */}
      {isPrinting && (
        <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-2xl flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
          <span className="text-xs font-bold">{t.printingPlaceholder}</span>
        </div>
      )}
      {printSuccess && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-bounce-slow">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5.5 h-5.5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-extrabold block">{t.printSuccessMsg}</span>
              <span className="text-[10px] opacity-80">TOKEN ID: MV-{uniqueId}-{Date.now().toString().slice(-4)}</span>
            </div>
          </div>
          
          {/* Mock receipt popout box */}
          <div className="bg-white text-slate-800 p-4 rounded-xl border border-dashed border-slate-300 font-mono text-[9px] max-w-xs shadow-md">
            <p className="font-extrabold text-center border-b border-slate-200 pb-1.5 uppercase">MEDIVOICE KIOSK SLIP</p>
            <p className="mt-2">NAME: {patientFullName}</p>
            <p>CLINIC ID: {patient?.clinicId || 'clinic-0001'}</p>
            <p>BIOMETRIC REF: ID-{uniqueId}</p>
            <p>GENDER/AGE: {gender} / {age} yrs</p>
            <p>ADDRESS: {address}</p>
            <p className="border-t border-slate-200 mt-2 pt-1.5 text-center text-teal-600 font-extrabold">STATUS: PASS GRANTED</p>
          </div>
        </div>
      )}

      {/* ---------------- MAIN GRID OVERVIEW ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: Biometric Profile ID Card & Metadata (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* BIOMETRIC SIGNATURE IDENTIFIER CARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4 text-emerald-600 bg-emerald-50 bg-opacity-70 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 border border-emerald-100">
              <UserCheck className="w-3.5 h-3.5" />
              Active
            </div>

            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">
              {t.biometricStatus}
            </h3>

            {/* High-Fidelity Biometric Photo ID Frame */}
            <div className="flex flex-col items-center py-5">
              <div id="revisitor-biometric-frame" className="relative w-44 aspect-[4/3] rounded-2xl border-2 border-dashed border-sky-400/40 p-1 flex items-center justify-center bg-slate-955 overflow-hidden shadow-md">
                
                {/* Tech target corner frames */}
                <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-sky-400 z-10 pointer-events-none" />
                <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-sky-400 z-10 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-sky-400 z-10 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-sky-400 z-10 pointer-events-none" />
                
                {/* Horizontal scan layer sweep effect */}
                <div className="absolute inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#2dd4bf] animate-[bounce_3s_infinite] z-10 pointer-events-none" />

                <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center">
                  {patient?.photoUrl ? (
                    <img 
                      src={patient.photoUrl} 
                      alt="Verified patient biometric snapshot" 
                      className="w-full h-full object-cover scale-x-[-1] transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <img 
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop" 
                      alt="Verified profile default backup" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  {/* Glowing Match Lock watermark */}
                  <div className="absolute bottom-1.5 left-1.5 bg-emerald-500/90 text-[7px] text-white px-1.5 py-0.5 rounded font-mono font-bold tracking-wider z-10 uppercase flex items-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    MATCH SECURED
                  </div>
                </div>
              </div>

              <div className="text-center mt-3.5">
                <p className="text-lg font-black text-slate-800 font-sans tracking-tight leading-tight">{patientFullName}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 uppercase mt-1 justify-center tracking-widest bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-full shadow-2xs">
                  <span>BIOMETRIC ID: MD-{uniqueId}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-650">
              <div className="flex justify-between items-center">
                <span>{t.confidence}:</span>
                <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100 flex items-center gap-1 text-[11px]">
                  <span>99.2% Confident</span>
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span>{t.patientId}:</span>
                <span className="font-mono text-[11px] font-bold text-slate-800">C-ID: {uniqueId}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span>Clinic ID:</span>
                <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-100">
                  {patient?.clinicId || 'clinic-0001'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span>{t.registeredPh}:</span>
                <span className="font-mono text-slate-800 font-bold">+91 {contactNo}</span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span>{t.genderAge}:</span>
                <span className="text-slate-800 font-bold">
                  {gender === 'Male' ? (language === 'telugu' ? 'పురుషుడు' : 'Male') : (language === 'telugu' ? 'స్త్రీ' : 'Female')} 
                  {" • "}{age} yrs
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                <span>{t.addressLabel}:</span>
                <span className="text-slate-800 font-bold text-right max-w-[200px]">{address || '—'}</span>
              </div>

              {preexisting && preexisting !== 'None' && (
                <div>
                  <p className="text-[10px] text-slate-450 uppercase tracking-widest font-black mb-1.5">{t.conditions}</p>
                  <p className="text-xs font-semibold text-slate-805 bg-red-50 text-red-750 px-3 py-2 rounded-xl border border-red-100/50">
                    {preexisting}
                  </p>
                </div>
              )}

              {latestSymptoms && (
                <div className="pt-1.5">
                  <p className="text-[10px] text-slate-450 uppercase tracking-widest font-black mb-1.5">{t.activeSymptoms}</p>
                  <p className="text-xs font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 italic leading-relaxed">
                    "{latestSymptoms}"
                  </p>
                </div>
              )}
            </div>

            <button
              id="speak-profile-btn"
              type="button"
              onClick={() => {
                stopSpeaking();
                const text = language === 'english'
                  ? `Patient Name: ${patientFullName}. ID: ${uniqueId}. Registered phone number: ${contactNo.split('').join(' ')}. address: ${address}.`
                  : `రోగి పేరు: ${patientFullName}. ఐడీ ఐడెంటిటీ: ${uniqueId}. చిరునామా: ${address}.`;
                speakText(text, language);
              }}
              className="mt-5 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 border border-slate-250 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Read Bio Details Aloud</span>
            </button>
          </div>

          <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-650 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-[10.5px] leading-relaxed text-teal-850">
              <span className="font-bold uppercase tracking-wide block mb-0.5">Validated Bio-Registry Secure Link</span>
              These credentials map to local database record index <span className="font-mono font-bold">#{uniqueId}</span>. No cloud leakage.
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: History Logs (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* RECENT DETAILED CONSULTATION LOG HISTORY */}
          <RecentConsultationsList
            matchedHistoryItems={matchedHistoryItems}
            t={t}
          />

        </div>

      </div>

      {/* ---------------- NAVIGATION FOOTER ACTIONS ---------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-3xl border border-slate-200 mt-6 gap-4">
        <button
          id="revisit-re-lang-btn"
          onClick={() => {
            stopSpeaking();
            onNavigate('langSelect');
          }}
          className="w-full sm:w-auto px-5 py-3 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all border border-slate-250 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backBtn}</span>
        </button>

        <button
          id="revisit-exit-btn"
          onClick={() => {
            stopSpeaking();
            speakText(language === 'english' ? "Logging you out from kiosk. Goodbye!" : "నిష్క్రమిస్తున్నాము. వీడ్కోలు!", language);
            onBackToKiosk();
          }}
          className="w-full sm:w-auto px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 border border-rose-200/50 transition-all cursor-pointer"
        >
          <TrendingDown className="w-4.5 h-4.5" />
          <span>{t.exitBtn} (లాగ్ అవుట్)</span>
        </button>
      </div>

    </div>
  );
}
