import React from 'react';
import { Mic, Volume2, Sparkles } from 'lucide-react';
import { speakText, stopSpeaking } from '../../utils/speechHelper';
import AudioVisualizer from '../../components/AudioVisualizer';

interface VoiceLoginCardProps {
  isListening: boolean;
  handleStartVoiceLogin: () => void;
  voiceInstruction: string;
  spokenTranscript: string;
  loginTranscriptContainerRef: React.RefObject<HTMLParagraphElement | null>;
  error: string;
  onLoginSuccess: (phoneNumber: string, loginMethod: 'phone' | 'voice' | 'face' | 'aadhaar', matchedPatientId?: string, capturedFaceUrl?: string) => void;
  setSpokenTranscript: React.Dispatch<React.SetStateAction<string>>;
  setVoiceInstruction: React.Dispatch<React.SetStateAction<string>>;
}

export const VoiceLoginCard: React.FC<VoiceLoginCardProps> = ({
  isListening,
  handleStartVoiceLogin,
  voiceInstruction,
  spokenTranscript,
  loginTranscriptContainerRef,
  error,
  onLoginSuccess,
  setSpokenTranscript,
  setVoiceInstruction,
}) => {
  return (
    <div className="space-y-6 text-center">
      <div className="bg-slate-50 hover:bg-slate-100 transition-colors p-5 rounded-2xl border border-slate-100 flex flex-col items-center">
        <button
          id="mic-login-btn"
          type="button"
          onClick={handleStartVoiceLogin}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md relative transition-transform hover:scale-105 ${
            isListening 
              ? 'bg-rose-600 text-white animate-pulse' 
              : 'bg-white text-teal-600 hover:text-teal-700 border border-slate-200'
          }`}
        >
          {isListening ? (
            <div className="absolute inset-0 rounded-full border-4 border-rose-200 animate-ping" />
          ) : null}
          <Mic className="w-10 h-10" />
        </button>
        
        <h3 className="text-sm font-semibold text-slate-700 mt-4">
          {isListening ? 'Stop Recording & Submit' : 'Start Voice Login'}
          <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
            {isListening ? '(ఆపి లాగిన్ చేయండి)' : '(స్వర లాగిన్‌ను ప్రారంభించండి)'}
          </span>
        </h3>
        <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-2xs mt-2 text-slate-500 text-xs leading-relaxed max-w-xs justify-center">
          <span>{voiceInstruction}</span>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              speakText(voiceInstruction, "english");
            }}
            className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
            title="Read message"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {spokenTranscript && (
        <div className="bg-teal-50/50 border border-teal-100/50 rounded-xl p-4 text-left">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest block mb-1">
            Transcribed Text <span className="inline-block text-[9px] text-slate-500 lowercase">-(రికార్డ్ అయిన స్వర పాఠం)</span>
          </span>
          <p 
            ref={loginTranscriptContainerRef}
            className="text-slate-600 font-mono text-sm italic max-h-24 overflow-y-auto scroll-smooth"
          >
            "{spokenTranscript}"
          </p>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-xs font-semibold bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      <AudioVisualizer isActive={isListening} color="teal" />

      {/* Iframe Speech Simulator for Login */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 mt-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-sm uppercase tracking-wider font-mono">
            💡 Sandbox Simulator
          </span>
          <span className="text-[10px] text-slate-400">If mic is blocked by iframe, type here:</span>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="text" 
            id="sandbox-login-sim-input"
            className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-700 placeholder-slate-400 shadow-3xs"
            placeholder='e.g., "9876543210" or "Express Guest Login"'
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const txt = (e.target as HTMLInputElement).value;
                if (txt.trim()) {
                  setSpokenTranscript(txt);
                  const cleanDigits = txt.replace(/\D/g, '');
                  if (cleanDigits.length >= 8) {
                    setVoiceInstruction(`Simulated number: ${cleanDigits}. Logging in...`);
                    speakText(`Thank you. Logging in with simulated number ${cleanDigits.split('').join(' ')}`, "english", () => {
                      onLoginSuccess(cleanDigits, 'voice');
                    });
                  } else if (txt.toLowerCase().includes('guest') || txt.toLowerCase().includes('express') || txt.toLowerCase().includes('login')) {
                    setVoiceInstruction("Simulated logging in as Express Guest...");
                    speakText("Express Guest Selected. Logging in.", "english", () => {
                      onLoginSuccess('Guest_User', 'voice');
                    });
                  } else {
                    setVoiceInstruction(`Spoken Simulation: "${txt}". Try a number or "guest"`);
                  }
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("sandbox-login-sim-input") as HTMLInputElement;
              if (el && el.value.trim()) {
                const txt = el.value.trim();
                setSpokenTranscript(txt);
                const cleanDigits = txt.replace(/\D/g, '');
                if (cleanDigits.length >= 8) {
                  setVoiceInstruction(`Simulated number: ${cleanDigits}. Logging in...`);
                  speakText(`Thank you. Logging in with simulated number ${cleanDigits.split('').join(' ')}`, "english", () => {
                    onLoginSuccess(cleanDigits, 'voice');
                  });
                } else if (txt.toLowerCase().includes('guest') || txt.toLowerCase().includes('express') || txt.toLowerCase().includes('login')) {
                  setVoiceInstruction("Simulated logging in as Express Guest...");
                  speakText("Express Guest Selected. Logging in.", "english", () => {
                    onLoginSuccess('Guest_User', 'voice');
                  });
                } else {
                  setVoiceInstruction(`Spoken Simulation: "${txt}". Try a number or "guest"`);
                }
                el.value = "";
              }
            }}
            className="px-4 py-2 bg-teal-650 hover:bg-teal-700 font-bold text-xs text-white rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            Simulate Voice
          </button>
        </div>
        
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button 
            type="button"
            onClick={() => {
              const text = "Express Guest Login";
              setSpokenTranscript(text);
              setVoiceInstruction("Simulated logging in as Express Guest...");
              speakText("Express Guest Selected. Logging in.", "english", () => {
                onLoginSuccess('Guest_User', 'voice');
              });
            }}
            className="text-[10px] px-2.5 py-1 bg-white hover:bg-teal-50 text-slate-700 font-bold rounded-lg border border-slate-200 shadow-3xs transition-all"
          >
            Demo Intent: "Express Guest Login"
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-50 py-2.5 rounded-xl border border-dashed border-slate-200">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        Telugu or English voice signals recognized
        <span className="block text-[9px] text-teal-600 font-sans">(తెలుగు & ఇంగ్లీష్ స్వర సంకేతాలు రికార్డ్ అవుతాయి)</span>
      </div>
    </div>
  );
};
