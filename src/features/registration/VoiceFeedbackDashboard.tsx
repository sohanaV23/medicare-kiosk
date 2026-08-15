import React from 'react';
import { Sparkles, Mic } from 'lucide-react';
import AudioVisualizer from '../../components/AudioVisualizer';

interface VoiceFeedbackDashboardProps {
  isDictatingWhole: boolean;
  activeDictateField: string | null;
  dictationTranscript: string;
  preferredLanguage: 'english' | 'telugu';
  commitFieldDictation: (fieldName: string, textVal?: string) => void;
  dictationTranscriptRef: React.MutableRefObject<string>;
  setDictationTranscript: React.Dispatch<React.SetStateAction<string>>;
  transcriptContainerRef: React.RefObject<HTMLParagraphElement | null>;
  onWholeDictationComplete?: (forcedTranscript?: string) => void;
}

export const VoiceFeedbackDashboard: React.FC<VoiceFeedbackDashboardProps> = ({
  isDictatingWhole,
  activeDictateField,
  dictationTranscript,
  preferredLanguage,
  commitFieldDictation,
  dictationTranscriptRef,
  setDictationTranscript,
  transcriptContainerRef,
  onWholeDictationComplete,
}) => {
  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-55 rounded-2xl p-5 border border-teal-100/50 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100/50 pb-2">
        <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          {activeDictateField ? (
            <span>
              {preferredLanguage === 'english' 
                ? `Simulating Voice for Field: [${String(activeDictateField)}]` 
                : `ఫీల్డ్ కొరకు వాయిస్ సిమ్యులేషన్: [${String(activeDictateField)}]`}
            </span>
          ) : (
            <span>{preferredLanguage === 'english' ? 'Voice Transcription Feed' : 'లైవ్ వాయిస్ రికార్డ్ ఫీడ్'}</span>
          )}
        </h4>
        <span className="text-[10px] text-teal-650 bg-teal-150 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
          ⚡ Iframe Sandbox Assist active
        </span>
      </div>
      
      <AudioVisualizer isActive={isDictatingWhole || !!activeDictateField} color="teal" />
      
      {dictationTranscript ? (
        <p 
          ref={transcriptContainerRef}
          className="text-xs font-mono text-slate-650 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 max-h-28 overflow-y-auto scroll-smooth"
        >
          "{dictationTranscript}"
        </p>
      ) : (
        <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-100/50 text-center">
          {activeDictateField ? (
            preferredLanguage === 'english' 
              ? `Listening for field [${String(activeDictateField)}]... type in simulator below to submit directly.` 
              : `ఫీల్డ్ [${String(activeDictateField)}] కొరకు వేచి ఉంది... కింద సహాయక సిమ్యులేటర్‌లో టైప్ చేయండి.`
          ) : (
            preferredLanguage === 'english' 
              ? "Listening... start speaking or utilize the type simulator below." 
              : "వాయిస్ రికార్డ్ అవుతుంది... మాట్లాడండి లేదా కింద ఉన్న టెక్స్ట్ సిమ్యులేటర్ ఉపయోగించండి."
          )}
        </p>
      )}

      {/* Elegant Sandbox Simulator input fallback */}
      <div className="pt-2 text-left space-y-2 border-t border-dashed border-teal-150">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {preferredLanguage === 'english' ? "Keyboard Speech Simulator Fallback:" : "వాయిస్ సహాయ సిమ్యులేటర్:"}
        </p>
        <div className="flex gap-2.5">
          <input 
            type="text" 
            id="sandbox-voice-sim-input"
            className="flex-1 text-xs p-2.5 bg-white border border-teal-200/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-slate-700 placeholder-slate-400 shadow-3xs"
            placeholder={
              activeDictateField 
                ? (preferredLanguage === 'english' ? `Type value for ${String(activeDictateField)}` : `ఫీల్డ్ ${String(activeDictateField)} విలువ రాయండి...`)
                : (preferredLanguage === 'english' ? "Type what you would say, e.g. 'My name is Sai...'" : "మీరు చెప్పాలనుకున్న వివరాలను ఇక్కడ టైప్ చేయండి...")
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const txt = (e.target as HTMLInputElement).value;
                if (txt.trim()) {
                  if (activeDictateField) {
                    commitFieldDictation(activeDictateField, txt);
                  } else {
                    dictationTranscriptRef.current = txt;
                    setDictationTranscript(txt);
                    if (onWholeDictationComplete) {
                      onWholeDictationComplete(txt);
                    }
                  }
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("sandbox-voice-sim-input") as HTMLInputElement;
              if (el && el.value.trim()) {
                const txt = el.value;
                if (activeDictateField) {
                  commitFieldDictation(activeDictateField, txt);
                } else {
                  dictationTranscriptRef.current = txt;
                  setDictationTranscript(txt);
                  if (onWholeDictationComplete) {
                    onWholeDictationComplete(txt);
                  }
                }
                el.value = "";
              }
            }}
            className="px-4 py-2 bg-teal-650 hover:bg-teal-700 font-bold text-xs text-white rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            {preferredLanguage === 'english' ? 'Set Transcript' : 'సెట్ చేయి'}
          </button>
        </div>
      </div>
    </div>
  );
};
