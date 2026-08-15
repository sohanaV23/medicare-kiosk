import React, { useEffect } from 'react';
import { Languages, Globe, ArrowRight, HeartPulse, Volume2 } from 'lucide-react';
import { speakText, stopSpeaking } from '../utils/speechHelper';

interface LanguageSelectProps {
  onLanguageChosen: (lang: 'english' | 'telugu') => void;
  patientName: string;
  onRevisitorClick?: () => void;
}

export default function LanguageSelect({ onLanguageChosen, patientName, onRevisitorClick }: LanguageSelectProps) {
  useEffect(() => {
    // Audio Guidance as soon as language select screen appears
    speakText(
      "Please select your language preference. Select English for English consultation, or select Telugu for Telugu voice consultation.", 
      "english",
      () => {
        speakText("దయచేసి మీ భాషను ఎంచుకోండి. ఇంగ్లీష్ కొరకు ఇంగ్లీష్ కార్డుపై, లేదా తెలుగు కొరకు తెలుగు కార్డుపై నొక్కండి.", "telugu");
      }
    );

    return () => {
      stopSpeaking();
    };
  }, []);

  const handleSelect = (lang: 'english' | 'telugu') => {
    stopSpeaking();
    if (lang === 'english') {
      speakText("English Selected. Loading your consultation desk.", "english");
    } else {
      speakText("తెలుగు ఎంచుకోబడింది. మీ సంప్రదింపు డెస్క్ సిద్ధంగా ఉంది.", "telugu");
    }
    onLanguageChosen(lang);
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative z-10 animate-fade-in">
      
      {/* Visual greeting card */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-teal-50 border border-teal-100/75 rounded-full text-xs font-semibold text-teal-700 uppercase tracking-widest shadow-sm mb-3">
          <Globe className="w-3.5 h-3.5 animate-spin-slow" />
          Kiosk language setup / భాషా ఎంపిక
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-slate-800 tracking-tight leading-tighter">
            Select Your Preferred Language
          </h1>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              speakText("Please select your language. దయచేసి మీ భాషను ఎంచుకోండి.", "english", () => {
                speakText("దయచేసి మీ భాషను ఎంచుకోండి.", "telugu");
              });
            }}
            className="p-1.5 text-slate-450 hover:text-teal-600 rounded-full hover:bg-slate-100 transition-colors"
            title="Read title aloud"
          >
            <Volume2 className="w-4 h-4 text-teal-500" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-1.5 font-medium">
          మీకు అనుకూలమైన భాషను ఎంచుకోండి
        </p>
      </div>

      {/* Language Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* English Selection Card */}
        <div
          id="lang-en-btn"
          role="button"
          tabIndex={0}
          onClick={() => handleSelect('english')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect('english');
            }
          }}
          className="group bg-white hover:bg-slate-50 text-left p-8 rounded-3xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 flex flex-col justify-between h-64 relative cursor-pointer"
        >
          <div className="space-y-4 w-full">
            <div className="flex justify-between items-center w-full">
              <span className="text-xs font-bold text-teal-500 uppercase tracking-widest bg-teal-50 px-2.5 py-1 rounded-md">
                English
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stopSpeaking();
                  speakText("English. Experience the direct diagnostic consultation in standard English with automated vocal prompts.", "english");
                }}
                className="p-1.5 text-slate-400 hover:text-teal-600 rounded-xl hover:bg-slate-100 transition-colors"
                title="Speak English Description"
              >
                <Volume2 className="w-4 h-4 text-teal-600" />
              </button>
            </div>
            <h2 className="text-3xl font-bold font-display text-slate-800 group-hover:text-teal-600 transition-colors">
              English
            </h2>
            <p className="text-sm text-slate-450 font-medium leading-relaxed">
              Experience the direct diagnostic consultation in standard English with automated vocal prompts.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-750 border-t border-slate-100 pt-4 w-full">
            Proceed with English
            <ArrowRight className="w-4 h-4 text-teal-500 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        {/* Telugu Selection Card */}
        <div
          id="lang-te-btn"
          role="button"
          tabIndex={0}
          onClick={() => handleSelect('telugu')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect('telugu');
            }
          }}
          className="group bg-white hover:bg-slate-50 text-left p-8 rounded-3xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 flex flex-col justify-between h-64 relative cursor-pointer"
        >
          <div className="space-y-4 w-full">
            <div className="flex justify-between items-center w-full">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-md">
                Telugu / తెలుగు
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stopSpeaking();
                  speakText("తెలుగు. మీ వివరాలను, వ్యాధి లక్షణాలను తెలుగులో మాట్లాడి నమోదు చేసుకోండి. పూర్తి సహాయం లభిస్తుంది.", "telugu");
                }}
                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-xl hover:bg-slate-100 transition-colors"
                title="Speak Telugu Description"
              >
                <Volume2 className="w-4 h-4 text-amber-600" />
              </button>
            </div>
            <h2 className="text-3xl font-bold font-display text-slate-800 group-hover:text-amber-600 transition-colors">
              తెలుగు
            </h2>
            <p className="text-sm text-slate-450 font-medium leading-relaxed">
              మీ వివరాలను, వ్యాధి లక్షణాలను తెలుగులో మాట్లాడి నమోదు చేసుకోండి. పూర్తి సహాయం లభిస్తుంది.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-750 border-t border-slate-100 pt-4 w-full">
            తెలుగులో కొనసాగండి
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

      </div>

      {/* RE-VISITOR PROFILE DIRECT ENTRY BANNER */}
      {onRevisitorClick && (
        <div 
          id="lang-revisitor-link-box" 
          onClick={onRevisitorClick}
          className="mb-6 p-5 bg-gradient-to-r from-teal-900 to-sky-900 hover:from-teal-850 hover:to-sky-850 rounded-3xl text-white shadow-md border border-teal-500/30 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group relative overflow-hidden"
        >
          {/* Circular highlight shape */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 animate-pulse">
              <Languages className="w-6 h-6 text-yellow-300" />
            </div>
            
            <div className="flex-1 text-left">
              <span className="inline-block bg-teal-400 text-teal-950 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full tracking-wider mb-1">
                Already Registered? / మునుపే నమోదైన రోగులు
              </span>
              <h3 className="text-sm font-black uppercase tracking-wide leading-tight">
                Re-Visitor Aadhaar Scan Check-In (మళ్ళీ వచ్చిన రోగి - ఆధార్ కార్డ్ స్కాన్)
              </h3>
              <p className="text-[11px] text-sky-100 mt-1 leading-normal font-medium">
                Click here to scan your Aadhaar card and instantly view your diagnostic charts & consult reports. No forms or phone numbers required!
                <span className="block text-[10px] text-teal-200 mt-0.5">(ఫోన్ నంబర్ లేకుండా, కేవలం మీ ఆధార్ కార్డును స్కాన్ చేయడం ద్వారా గత నివేదికలు మరియు చార్ట్‌లను చూడటానికి ఇక్కడ క్లిక్ చేయండి)</span>
              </p>
            </div>

            <div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-colors">
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant banner */}
      <div className="bg-slate-50 border border-slate-205 rounded-2xl p-4 flex items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
            <Languages className="w-5 h-5 shadow-sm" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-700">Multi-lingual AI Engine Ready / బహుభాషా సంప్రదింపు సేవలు</h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              The MediVoice Kiosk recognizes regional accents and dialects beautifully. (మీరు మీ స్వంత భాష మరియు స్వరంలో సలహా పొందవచ్చు)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            stopSpeaking();
            speakText("Multi-lingual AI Engine Ready. The MediVoice Kiosk recognizes regional accents and dialects beautifully. మీరు మీ స్వంత భాష మరియు స్వరంలో సలహా పొందవచ్చు.", "english", () => {
              speakText("మీరు మీ స్వంత భాష మరియు స్వరంలో సలహా పొందవచ్చు.", "telugu");
            });
          }}
          className="p-1.5 text-slate-400 hover:text-teal-600 rounded-full hover:bg-white border border-slate-100 shadow-2xs transition-colors shrink-0"
          title="Speak info block"
        >
          <Volume2 className="w-3.5 h-3.5 text-teal-500" />
        </button>
      </div>

    </div>
  );
}
