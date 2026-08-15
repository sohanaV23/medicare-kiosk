import React, { useState, useEffect } from 'react';
import { X, Volume2, Sparkles, RefreshCw, Play, Settings, Sliders, Check } from 'lucide-react';
import { 
  getVoicePreferences, 
  saveVoicePreferences, 
  getAvailableSystemVoices, 
  speakText, 
  stopSpeaking,
  VoicePreferences 
} from '../utils/speechHelper';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'english' | 'telugu';
}

export default function VoiceSettingsModal({ isOpen, onClose, language }: VoiceSettingsModalProps) {
  const [prefs, setPrefs] = useState<VoicePreferences>({
    engine: 'native',
    rate: 0.95,
    pitch: 1.0,
    englishVoiceName: '',
    teluguVoiceName: ''
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Load preferences and available voices
  useEffect(() => {
    if (isOpen) {
      setPrefs(getVoicePreferences());
      
      // Load system voices
      const sysVoices = getAvailableSystemVoices();
      setVoices(sysVoices);

      // WebSpeechSynthesis voices are loaded asynchronously in many browsers
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoices(window.speechSynthesis.getVoices());
        };
      }
    }
    return () => {
      stopSpeaking();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (updated: VoicePreferences) => {
    setPrefs(updated);
    saveVoicePreferences(updated);
  };

  const handleResetDefaults = () => {
    const defaults: VoicePreferences = {
      engine: 'native',
      rate: 0.95,
      pitch: 1.0,
      englishVoiceName: '',
      teluguVoiceName: ''
    };
    handleSave(defaults);
    stopSpeaking();
    
    // Audibly notify
    speakText(
      language === 'telugu' ? "స్వర అమరికలు విజయవంతంగా రీసెట్ చేయబడ్డాయి." : "Voice preferences restored to factory defaults.",
      language
    );
  };

  const handleTestVoice = () => {
    stopSpeaking();
    setIsPlayingTest(true);
    
    const testText = language === 'telugu' 
      ? "మెడివాయిస్ స్మార్ట్ కియోస్క్ గొంతు పరీక్ష విజయవంతమైంది. ఈ వాయిస్ మీకు నచ్చిందా?"
      : "Vocal testing successful. Welcome to your custom MediVoice consultation desk.";
      
    speakText(testText, language, () => {
      setIsPlayingTest(false);
    });
  };

  // Filter voices by language and sort Indian English voices at the top
  const englishVoices = voices.filter(v => 
    v.lang.toLowerCase().startsWith('en') || 
    v.lang.toLowerCase().includes('en-')
  ).sort((a, b) => {
    const aIsInd = a.lang.toLowerCase().includes('in') || a.name.toLowerCase().includes('india');
    const bIsInd = b.lang.toLowerCase().includes('in') || b.name.toLowerCase().includes('india');
    if (aIsInd && !bIsInd) return -1;
    if (!aIsInd && bIsInd) return 1;
    return a.name.localeCompare(b.name);
  });

  const teluguVoices = voices.filter(v => 
    v.lang.toLowerCase().startsWith('te') || 
    v.lang.toLowerCase().includes('te-') ||
    v.name.toLowerCase().includes('telugu')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        id="voice-settings-dialog"
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col transform transition-all animate-scale-up"
      >
        {/* Header strip */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 leading-tight">
                {language === 'telugu' ? 'వాయిస్ & స్వర కస్టమైజేషన్' : 'Speech & Voice Control'}
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                {language === 'telugu' ? 'గొంతు వేగం, శైలిని మీ ఇష్టప్రకారం మార్చుకోండి' : 'Configure kiosk audio accents, gender and speed'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { stopSpeaking(); onClose(); }}
            className="p-1 px-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
          
          {/* Engine selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {language === 'telugu' ? 'స్వర ఇంజిన్ రకం / Voice Engine' : 'Audio generation engine'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Cloud Engine */}
              <button
                type="button"
                onClick={() => handleSave({ ...prefs, engine: 'cloud' })}
                className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between h-24 ${
                  prefs.engine === 'cloud'
                    ? 'bg-sky-50/50 border-sky-400 ring-1 ring-sky-450'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${prefs.engine === 'cloud' ? 'text-sky-700' : 'text-slate-405'}`}>
                    {language === 'telugu' ? 'క్లౌడ్ స్మార్ట్ వాయిస్' : 'Cloud Neural AI'}
                  </span>
                  {prefs.engine === 'cloud' && <Check className="w-4 h-4 text-sky-600" />}
                </div>
                <p className="text-[11px] text-slate-450 leading-snug">
                  {language === 'telugu' ? 'స్పష్టమైన డిక్షన్, స్వచ్ఛమైన యాసలు.' : 'Highly consistent, highly articulate professional accents.'}
                </p>
              </button>

              {/* Native Engine */}
              <button
                type="button"
                onClick={() => handleSave({ ...prefs, engine: 'native' })}
                className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between h-24 ${
                  prefs.engine === 'native'
                    ? 'bg-purple-50/50 border-purple-400 ring-1 ring-purple-450'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${prefs.engine === 'native' ? 'text-purple-700' : 'text-slate-405'}`}>
                    {language === 'telugu' ? 'డివైస్ లోకల్ వాయిస్' : 'Device Local TTS'}
                  </span>
                  {prefs.engine === 'native' && <Check className="w-4 h-4 text-purple-600" />}
                </div>
                <p className="text-[11px] text-slate-450 leading-snug">
                  {language === 'telugu' ? 'ఆఫ్‌లైన్ సపోర్ట్, శీఘ్ర ప్రతిస్పందన.' : 'Zero internet latency, utilizing your device’s voice actors.'}
                </p>
              </button>
            </div>
          </div>

          {/* Vocal Gender Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {language === 'telugu' ? 'స్వర లింగ రకం (Male/Female Preset)' : 'Vocal Gender Preset'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Male Preset */}
              <button
                type="button"
                onClick={() => {
                  const updated = { ...prefs };
                  // 1. Set deeper pitch
                  updated.pitch = 0.85;
                  
                  // 2. If native engine, select a male voice from the list
                  if (updated.engine === 'native') {
                    const maleEng = englishVoices.find(v => 
                      v.name.toLowerCase().includes('david') || 
                      v.name.toLowerCase().includes('mohan') ||
                      v.name.toLowerCase().includes('ravi') ||
                      v.name.toLowerCase().includes('male') ||
                      v.name.toLowerCase().includes('george')
                    );
                    if (maleEng) updated.englishVoiceName = maleEng.name;
                    
                    const maleTel = teluguVoices.find(v => 
                      v.name.toLowerCase().includes('mohan') ||
                      v.name.toLowerCase().includes('ravi') ||
                      v.name.toLowerCase().includes('male')
                    );
                    if (maleTel) updated.teluguVoiceName = maleTel.name;
                  }
                  
                  handleSave(updated);
                  stopSpeaking();
                  speakText(
                    language === 'telugu' ? "పురుష స్వరం సెట్ చేయబడింది." : "Male voice preset applied.",
                    language
                  );
                }}
                className={`p-3.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 font-bold text-xs cursor-pointer ${
                  prefs.pitch < 0.95
                    ? 'bg-sky-50/50 border-sky-400 text-sky-700'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-650'
                }`}
              >
                <span>👨</span>
                <span>{language === 'telugu' ? 'పురుష స్వరం (Male Preset)' : 'Male Voice Preset'}</span>
              </button>

              {/* Female Preset */}
              <button
                type="button"
                onClick={() => {
                  const updated = { ...prefs };
                  // 1. Set higher pitch
                  updated.pitch = 1.05;
                  
                  // 2. If native engine, select a female voice from the list
                  if (updated.engine === 'native') {
                    const femaleEng = englishVoices.find(v => 
                      v.name.toLowerCase().includes('zira') || 
                      v.name.toLowerCase().includes('neerja') ||
                      v.name.toLowerCase().includes('hazel') ||
                      v.name.toLowerCase().includes('female') ||
                      v.name.toLowerCase().includes('shruti') ||
                      v.name.toLowerCase().includes('online') ||
                      v.name.toLowerCase().includes('google')
                    );
                    if (femaleEng) updated.englishVoiceName = femaleEng.name;
                    
                    const femaleTel = teluguVoices.find(v => 
                      v.name.toLowerCase().includes('shruti') ||
                      v.name.toLowerCase().includes('female') ||
                      v.name.toLowerCase().includes('online') ||
                      v.name.toLowerCase().includes('google')
                    );
                    if (femaleTel) updated.teluguVoiceName = femaleTel.name;
                  }
                  
                  handleSave(updated);
                  stopSpeaking();
                  speakText(
                    language === 'telugu' ? "స్త్రీ స్వరం సెట్ చేయబడింది." : "Female voice preset applied.",
                    language
                  );
                }}
                className={`p-3.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 font-bold text-xs cursor-pointer ${
                  prefs.pitch >= 0.95
                    ? 'bg-purple-50/50 border-purple-400 text-purple-700'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-655'
                }`}
              >
                <span>👩</span>
                <span>{language === 'telugu' ? 'స్త్రీ స్వరం (Female Preset)' : 'Female Voice Preset'}</span>
              </button>
            </div>
          </div>

          {/* Native voice selectors (only active if Native chosen) */}
          {prefs.engine === 'native' && (
            <div className="space-y-4 p-4.5 bg-slate-50 border border-slate-150 rounded-2xl animate-fade-in">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-650 uppercase tracking-wide">
                  {language === 'telugu' ? 'వ్యక్తిగత పరికరం గొంతులు' : 'Select Voice Character'}
                </h4>
              </div>

              {/* English Voice Choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">
                  {language === 'telugu' ? 'ఇంగ్లీష్ వాయిస్ ఎంపిక:' : 'English Voice Actor:'}
                </label>
                {englishVoices.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No English voices found on your device.</p>
                ) : (
                  <select
                    value={prefs.englishVoiceName}
                    onChange={(e) => handleSave({ ...prefs, englishVoiceName: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-slate-700"
                  >
                    <option value="">-- Device Default English Speaker --</option>
                    {englishVoices.map((v, i) => (
                      <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Telugu Voice Choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">
                  {language === 'telugu' ? 'తెలుగు వాయిస్ ఎంపిక:' : 'Telugu Voice Actor:'}
                </label>
                {teluguVoices.length === 0 ? (
                  <div className="p-2 py-1.5 bg-yellow-50 border border-yellow-100 rounded-lg text-[10px] text-amber-700 leading-normal">
                    {language === 'telugu' 
                      ? 'మీ డివైస్‌లో స్వచ్ఛమైన తెలుగు ప్యాక్ దొరకనందున, మన కియోస్క్ హై-ఫిడెలిటీ ఫోనెటిక్ రోమనైజ్డ్ ఇండియన్-ఇంగ్లీష్ సాయంతో అద్భుతంగా పలుకుతుంది.' 
                      : 'No native Telugu pack detected on your browser. The kiosk fallback engine will automatically code phonetic transliterations.'}
                  </div>
                ) : (
                  <select
                    value={prefs.teluguVoiceName}
                    onChange={(e) => handleSave({ ...prefs, teluguVoiceName: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-slate-700"
                  >
                    <option value="">-- Device Default Telugu Speaker --</option>
                    {teluguVoices.map((v, i) => (
                      <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Sliders: Rate & Pitch */}
          <div className="space-y-4 p-4.5 bg-slate-50/50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-1">
              <Sliders className="w-3.5 h-3.5 text-slate-505" />
              <h4 className="text-xs font-bold text-slate-650 uppercase tracking-wide">
                {language === 'telugu' ? 'వేగం మరియు హావభావాలు' : 'Calibrate Speech pace & depth'}
              </h4>
            </div>

            {/* Speaking Rate speed slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">
                  {language === 'telugu' ? 'మాట్లాడే గొంతు వేగం (Speed)' : 'Speech Velocity (Speed)'}
                </span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                  {prefs.rate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={prefs.rate}
                onChange={(e) => handleSave({ ...prefs, rate: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{language === 'telugu' ? 'నిదానంగా' : 'Slow, Safe'}</span>
                <span>{language === 'telugu' ? 'సాధారణంగా' : 'Normal'}</span>
                <span>{language === 'telugu' ? 'శీఘ్రంగా' : 'Super Fast'}</span>
              </div>
            </div>

            {/* Speaking Pitch slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">
                  {language === 'telugu' ? 'ధ్వని స్థాయి శైలి (Pitch)' : 'Tone / Vocal Resonance (Pitch)'}
                </span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                  {prefs.pitch.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={prefs.pitch}
                onChange={(e) => handleSave({ ...prefs, pitch: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{language === 'telugu' ? 'గీర గొంతు (Deep)' : 'Resonant Male'}</span>
                <span>{language === 'telugu' ? 'సాధారణం' : 'Standard'}</span>
                <span>{language === 'telugu' ? 'సన్నని గొంతు (High)' : 'Soprano Female'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-150/75 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === 'telugu' ? 'సాధారణ స్థితికి తెమ్ము' : 'Defaults'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={isPlayingTest}
              className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-xl border transition-all ${
                isPlayingTest 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-3xs'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-655" />
              <span>
                {isPlayingTest 
                  ? (language === 'telugu' ? 'ధ్వనిస్తోంది...' : 'Speaking...') 
                  : (language === 'telugu' ? 'స్పేకర్ టెస్ట్ చేయి' : 'Test Tone')
                }
              </span>
            </button>

            <button
              type="button"
              onClick={() => { stopSpeaking(); onClose(); }}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-550 active:bg-sky-750 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              {language === 'telugu' ? 'అమరింది' : 'Apply Settings'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
