import React from 'react';
import { Fingerprint, Mic, Volume2, ArrowRight } from 'lucide-react';
import { speakText, startVoiceRecognition, stopSpeaking } from '../../utils/speechHelper';

interface PhoneLoginFormProps {
  phone: string;
  setPhone: React.Dispatch<React.SetStateAction<string>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  handlePhoneSubmit: (e: React.FormEvent) => void;
  language: 'english' | 'telugu';
  t: any;
}

export const PhoneLoginForm: React.FC<PhoneLoginFormProps> = ({
  phone,
  setPhone,
  error,
  setError,
  handlePhoneSubmit,
  language,
  t,
}) => {
  return (
    <form id="phone-login-form" onSubmit={handlePhoneSubmit} className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Enter Mobile Number <span className="text-teal-600 text-[10px] font-medium font-sans block mt-0.5">(మొబైల్ నెంబర్ నమోదు చేయండి)</span>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                speakText("Enter Mobile Number. దయచేసి మొబైల్ నెంబర్ నమోదు చేయండి.", "english", () => {
                  speakText("దయచేసి మొబైల్ నెంబర్ నమోదు చేయండి.", "telugu");
                });
              }}
              className="p-1 text-slate-400 hover:text-teal-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Read field label"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
            <Fingerprint className="w-5 h-5 text-teal-600/70" />
          </span>
          <input
            id="phone-input"
            type="text"
            required
            placeholder={t.mobilePlaceholder}
            value={phone}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 15);
              setPhone(clean);
              setError('');
            }}
            className="w-full pl-12 pr-11 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-base tracking-widest text-slate-800"
          />
          <button
            id="dictate-login-phone-btn"
            type="button"
            onClick={() => {
              stopSpeaking();
              setError('');
              speakText("Please say your phone number, Aadhaar number, or unique ID clearly.", "english", () => {
                startVoiceRecognition({
                  language: 'english',
                  continuous: true,
                  onResult: (text) => {
                    const cleanVal = text.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 15);
                    if (cleanVal.length > 0) {
                      setPhone(cleanVal);
                      speakText(`Recorded ID ${cleanVal.split('').join(' ')}`, "english");
                    } else {
                      setError('Could not extract credentials. Please type or speak again.');
                      speakText("We could not extract credentials. Please say it again.", "english");
                    }
                  },
                  onEnd: () => {},
                  onError: () => {
                    setError('Voice capture stopped.');
                  }
                });
              });
            }}
            className="absolute right-3 top-3.5 p-1 text-slate-400 hover:text-teal-600 rounded-md transition-colors"
            title="Speak to enter mobile number"
          >
            <Mic className="w-4 h-4 text-teal-600 animate-pulse" />
          </button>
        </div>
        <p className="mt-1 text-[10px] text-slate-400 font-medium">
          {t.mobileDesc}
        </p>
      </div>

      {error && (
        <div className="text-red-650 text-xs font-semibold bg-red-50 p-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <button
        id="phone-submit-btn"
        type="submit"
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg"
      >
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold flex items-center gap-1">
            Continue to Selection <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
          <span className="text-[9px] opacity-75">(ఎంపిక కోసం కొనసాగించండి)</span>
        </div>
      </button>
    </form>
  );
};
