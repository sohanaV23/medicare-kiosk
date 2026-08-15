import React from 'react';
import { Volume2, Mic } from 'lucide-react';
import { Patient } from '../../types';

interface DobVoiceCaptureCardProps {
  formData: Patient;
  handleDobChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeDictateField: string | null;
  startDobVoiceSequence: () => void;
  isDobOnlyGuided: boolean;
  dobDayVal: string;
  dobMonthVal: string;
  dobYearVal: string;
  dictationTranscript: string;
  preferredLanguage: 'english' | 'telugu';
  speakSectionLabel: (en: string, te: string) => void;
  t: any;
}

export const DobVoiceCaptureCard: React.FC<DobVoiceCaptureCardProps> = ({
  formData,
  handleDobChange,
  activeDictateField,
  startDobVoiceSequence,
  isDobOnlyGuided,
  dobDayVal,
  dobMonthVal,
  dobYearVal,
  dictationTranscript,
  preferredLanguage,
  speakSectionLabel,
  t,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
          {t.dob} *
        </label>
        <button
          type="button"
          onClick={() => speakSectionLabel("Date of Birth picker.", "రోగి పుట్టిన తేదీ ఎంపిక.")}
          className="p-1 text-slate-400 hover:text-teal-600 rounded-full"
          title="Speak label"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          id="reg-dob"
          type="date"
          required
          value={formData.dob}
          onChange={handleDobChange}
          max={new Date().toISOString().split('T')[0]}
          className={`flex-1 pl-4 pr-4 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium transition-all ${
            (activeDictateField === 'dob' || activeDictateField === 'dobDay' || activeDictateField === 'dobMonth' || activeDictateField === 'dobYear')
              ? 'border-teal-500 ring-2 ring-teal-100' 
              : 'border-slate-200'
          }`}
        />
        <button
          id="dictate-dob-btn"
          type="button"
          onClick={startDobVoiceSequence}
          className={`p-3.5 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${
            (activeDictateField === 'dobDay' || activeDictateField === 'dobMonth' || activeDictateField === 'dobYear')
              ? 'text-teal-600 bg-teal-50 border-teal-300 animate-pulse ring-2 ring-teal-100' 
              : 'text-slate-500 bg-slate-50 border-slate-200 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50/30'
          }`}
          title="Dictate DOB Step-by-Step"
        >
          <Mic className="w-5 h-5 text-teal-600" />
        </button>
      </div>

      {/* Live voice capture helper for DOB steps */}
      {(isDobOnlyGuided || activeDictateField === 'dobDay' || activeDictateField === 'dobMonth' || activeDictateField === 'dobYear' || dobDayVal || dobMonthVal || dobYearVal) && (
        <div className="mt-2.5 p-3.5 bg-teal-50/40 border border-teal-100 rounded-2xl text-xs flex flex-col gap-2 animate-fade-in text-left">
          <div className="flex items-center justify-between text-teal-900 font-bold">
            <span className="flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-teal-600 animate-pulse animate-duration-1000" />
              DOB Voice Capture Status / పుట్టిన తేదీ వాయిస్ నివేదిక
            </span>
            {isDobOnlyGuided && (
              <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider animate-pulse">
                Guided Active / స్వరం ఆన్‌లో ఉంది
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-2.5 text-center mt-1">
            <div className={`p-2 rounded-xl border transition-all ${activeDictateField === 'dobDay' ? 'bg-teal-100/75 border-teal-400 text-teal-950 font-extrabold shadow-xs scale-102 ring-2 ring-teal-400/20' : 'bg-white border-slate-150 text-slate-600'}`}>
              <span className="block text-[8px] uppercase tracking-wider text-slate-455 font-bold">Day / రోజు</span>
              <span className="font-mono text-sm block mt-0.5">{dobDayVal || '--'}</span>
            </div>
            <div className={`p-2 rounded-xl border transition-all ${activeDictateField === 'dobMonth' ? 'bg-teal-100/75 border-teal-400 text-teal-950 font-extrabold shadow-xs scale-102 ring-2 ring-teal-400/20' : 'bg-white border-slate-150 text-slate-600'}`}>
              <span className="block text-[8px] uppercase tracking-wider text-slate-455 font-bold">Month / నెల</span>
              <span className="font-mono text-sm block mt-0.5">{dobMonthVal || '--'}</span>
            </div>
            <div className={`p-2 rounded-xl border transition-all ${activeDictateField === 'dobYear' ? 'bg-teal-100/75 border-teal-400 text-teal-950 font-extrabold shadow-xs scale-102 ring-2 ring-teal-400/20' : 'bg-white border-slate-150 text-slate-600'}`}>
              <span className="block text-[8px] uppercase tracking-wider text-slate-455 font-bold">Year / సంవత్సరం</span>
              <span className="font-mono text-sm block mt-0.5">{dobYearVal || '----'}</span>
            </div>
          </div>

          {dictationTranscript && (activeDictateField === 'dobDay' || activeDictateField === 'dobMonth' || activeDictateField === 'dobYear') && (
            <div className="mt-1 bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col gap-0.5">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Live Hearing / వినబడుతున్న పదం:</span>
              <p className="text-[11px] font-semibold text-slate-700 italic">
                "{dictationTranscript}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
