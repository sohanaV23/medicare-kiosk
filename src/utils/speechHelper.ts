/**
 * Elegant, fallback-safe browser SpeechSynthesis and SpeechRecognition wrappers
 * optimized for multi-lingual medical registration (English & Telugu).
 */

// Extend window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

/**
 * Checks if Speech Recognition is supported in the browser.
 */
// Safe tracker to avoid concurrent recognition sessions throwing Aborted or Permission errors
let currentActiveRecognition: any = null;

// Prevent SpeechSynthesisUtterance from being garbage collected in Chrome/Safari before firing onend
const activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

// Track any currently playing cloud/natural HTMLAudioElement to avoid overlaps
let currentAudio: HTMLAudioElement | null = null;

// Track active speech session sequences globally to prevent stale overlapped speech runs
let globalSpeechId = 0;

// Warm up and cache browser SpeechSynthesis voices immediately, and listen for updates
let systemVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  try {
    systemVoices = window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        systemVoices = window.speechSynthesis.getVoices();
      };
    }
  } catch (e) {
    console.error("Failed to initialize voices list:", e);
  }

  // Automatic Audio and speech synthesis engine unlocker on first user gesture
  const unlockAudioAndSpeech = () => {
    try {
      // 1. Play a tiny white noise silent wave to unlock HTML5 Audio Context
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      silentAudio.volume = 0;
      silentAudio.play().catch(() => {});

      // 2. Queue a silent SpeechSynthesis utterance to warm up browser synthesis context
      if (window.speechSynthesis) {
        const silentUtterance = new SpeechSynthesisUtterance("");
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      }
    } catch (e) {
      console.warn("Speech auto-warmup bypassed:", e);
    }

    window.removeEventListener('click', unlockAudioAndSpeech);
    window.removeEventListener('touchstart', unlockAudioAndSpeech);
    window.removeEventListener('keydown', unlockAudioAndSpeech);
  };

  window.addEventListener('click', unlockAudioAndSpeech);
  window.addEventListener('touchstart', unlockAudioAndSpeech);
  window.addEventListener('keydown', unlockAudioAndSpeech);
}

/**
 * Utility helper to chunk large strings into fragments smaller than Google TTS character limit (~180 chars).
 */
function chunkText(text: string, maxLen: number = 180): string[] {
  const chunks: string[] = [];
  let current = "";
  
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if ((current + word).length > maxLen) {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = word;
    } else {
      current += word;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  return chunks;
}

/**
 * Robustly transliterates Telugu Unicode script into a phonetic Romanized equivalent.
 * Used as a high-fidelity fallback if a browser lacks a native Telugu SpeechSynthesis voice.
 */
export function transliterateTeluguToEnglish(text: string): string {
  if (!text) return "";

  // Perfect preset mappings for common static prompts to ensure gorgeous pronunciation
  const staticMap: { [key: string]: string } = {
    "దయచేసి మీ భాషను ఎంచుకోండి. ఇంగ్లీష్ కొరకు ఇంగ్లీష్ కార్డుపై, లేదా తెలుగు కొరకు తెలుగు కార్డుపై నొక్కండి.": 
      "Dayachesi mee bhashanu enchukondi. English koraku English card-pai, leda Telugu koraku Telugu card-pai nokkandi.",
    "తెలుగు ఎంచుకోబడింది. మీ సంప్రదింపు డెస్క్ సిద్ధంగా ఉంది.": 
      "Telugu enchukobadindi. Mee sampradimpu desk siddhangaa undi.",
    "తెలుగు. మీ వివరాలను, వ్యాధి లక్షణాలను తెలుగులో మాట్లాడి నమోదు చేసుకోండి. పూర్తి సహాయం లభిస్తుంది.": 
      "Telugu. Mee vivaralanu, vyaadhi lakshanalanu Telugu-lo maatlaadi namodu chesukondi. Poorthi sahaayam labhistundi.",
    "మీరు మీ స్వంత భాష మరియు స్వరంలో సలహా పొందవచ్చు.": 
      "Meeru mee swantha bhasha mariyu swaramlo salaha pondavachhu.",
    "స్వరం ద్వారా సులువైన వైద్య నిర్ధారణ శోధన సేవ.": 
      "Swaram dwara suluvaina vaidya nirdhaarana shodhana seva.",
    "దయచేసి మొబైల్ నెంబర్ నమోదు చేయండి.": 
      "Dayachesi mobile number namodu cheyandi.",
    "ముఖ్యాంశాల బోర్డు": 
      "Mukhyamshala board",
    "రోగి వైద్య నమోదు పత్రం ఫారమ్": 
      "Rogi vaidya namodu patra form"
  };

  if (staticMap[text]) {
    return staticMap[text];
  }

  // Quick exits if no Telugu characters are detected
  if (!/[\u0C00-\u0C7F]/.test(text)) {
    return text;
  }

  // Unicode character mappings for Telugu block (0x0C05 - 0x0C39)
  const vowels: { [key: number]: string } = {
    0x0C05: 'a', 0x0C06: 'aa', 0x0C07: 'i', 0x0C08: 'ee', 0x0C09: 'u', 0x0C0A: 'oo',
    0x0C0B: 'ru', 0x0C0E: 'e', 0x0C0F: 'ae', 0x0C10: 'ai', 0x0C12: 'o', 0x0C13: 'oo', 0x0C14: 'au'
  };

  const consonants: { [key: number]: string } = {
    0x0C15: 'ka', 0x0C16: 'kha', 0x0C17: 'ga', 0x0C18: 'gha', 0x0C19: 'gna',
    0x0C1A: 'cha', 0x0C1B: 'chha', 0x0C1C: 'ja', 0x0C1D: 'jha', 0x0C1E: 'nya',
    0x0C1F: 'ta', 0x0C20: 'tha', 0x0C21: 'da', 0x0C22: 'dha', 0x0C23: 'na',
    0x0C24: 'tha', 0x0C25: 'thha', 0x0C26: 'dha', 0x0C27: 'dhha', 0x0C28: 'na',
    0x0C2A: 'pa', 0x0C2B: 'pha', 0x0C2C: 'ba', 0x0C2D: 'bha', 0x0C2E: 'ma',
    0x0C2F: 'ya', 0x0C30: 'ra', 0x0C31: 'ra', 0x0C32: 'la', 0x0C33: 'la',
    0x0C35: 'va', 0x0C36: 'sha', 0x0C37: 'sha', 0x0C38: 'sa', 0x0C39: 'ha'
  };

  const matras: { [key: number]: string } = {
    0x0C3E: 'aa', 0x0C3F: 'i', 0x0C40: 'ee', 0x0C41: 'u', 0x0C42: 'oo', 0x0C43: 'ru',
    0x0C46: 'e', 0x0C47: 'ae', 0x0C48: 'ai', 0x0C4A: 'o', 0x0C4B: 'oo', 0x0C4C: 'au'
  };

  const anusvara = 0x0C02; // ం
  const visarga = 0x0C03;  // ః
  const virama = 0x0C4D;   // ్

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (code >= 0x0C00 && code <= 0x0C7F) {
      if (vowels[code]) {
        result += vowels[code];
      } else if (consonants[code]) {
        let base = consonants[code];
        const nextCode = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
        
        if (nextCode === virama) {
          // Mute trailing inherent 'a' sound for virama (్)
          base = base.slice(0, -1);
          i++;
        } else if (nextCode >= 0x0C3E && nextCode <= 0x0C4C && matras[nextCode]) {
          // Replace trailing inherent 'a' sound with the relevant vowel sign
          base = base.slice(0, -1) + matras[nextCode];
          i++;
        } else if (nextCode === anusvara) {
          // Intelligently decide between phonetic 'n' and 'm' sound for the anusvara (ం)
          const afterAnusvaraCode = i + 2 < text.length ? text.charCodeAt(i + 2) : 0;
          const isNCandidate = [0x0C1A, 0x0C1C, 0x0C1F, 0x0C21, 0x0C24, 0x0C26, 0x0C28, 0x0C38].includes(afterAnusvaraCode);
          base = base.slice(0, -1) + (isNCandidate ? 'an' : 'am');
          i++;
        } else if (nextCode === visarga) {
          base = base + 'ha';
          i++;
        }
        result += base;
      } else if (code === anusvara) {
        result += 'm';
      } else if (code === visarga) {
        result += 'ha';
      } else if (code === virama) {
        // standalone virama, skip
      } else {
        // Other telugu symbols (punctuations/numerals)
        result += text[i];
      }
    } else {
      result += text[i];
    }
  }

  // Clean double letters and double spaces gracefully
  return result.replace(/\s+/g, ' ');
}

/**
 * Warm up the browser SpeechSynthesis voices immediately on module load
 */
if (typeof window !== 'undefined' && window.speechSynthesis) {
  try {
    window.speechSynthesis.getVoices();
  } catch (e) {}
}

/**
 * Checks if Speech Recognition is supported in the browser.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Interface for active speech recognition session.
 */
export interface SpeechRecognitionSession {
  stop: () => void;
}

/**
 * Starts a Speech Recognition session with designated language.
 */
export function startVoiceRecognition({
  language,
  onResult,
  onEnd,
  onError,
  continuous = false
}: {
  language: 'english' | 'telugu';
  onResult: (text: string) => void;
  onEnd: () => void;
  onError: (err: any) => void;
  continuous?: boolean;
}): SpeechRecognitionSession {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    onError(new Error("Speech recognition is not supported in this browser. Please type."));
    return { stop: () => {} };
  }

  // Abort any currently running recognition session to prevent hardware access clashes
  if (currentActiveRecognition) {
    try {
      currentActiveRecognition.onresult = null;
      currentActiveRecognition.onerror = null;
      currentActiveRecognition.onend = null;
      currentActiveRecognition.abort();
    } catch (e) {
      // Safe catch
    }
  }

  const recognition = new SpeechRecognition();
  currentActiveRecognition = recognition;
  
  recognition.continuous = continuous;
  recognition.interimResults = true;
  recognition.lang = language === 'telugu' ? 'te-IN' : 'en-IN';
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    if (event.results) {
      let accumulated = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i] && event.results[i][0]) {
          accumulated += event.results[i][0].transcript + ' ';
        }
      }
      onResult(accumulated.trim());
    } else {
      onError(new Error("No voice detected. Please try again."));
    }
  };

  recognition.onerror = (event: any) => {
    console.error("Speech recognition error event:", event);
    if (event.error === 'aborted') {
      // Ignore abort errors caused by us stopping a previous instance
      return;
    }
    onError(event);
  };

  recognition.onend = () => {
    if (currentActiveRecognition === recognition) {
      currentActiveRecognition = null;
    }
    onEnd();
  };

  try {
    recognition.start();
  } catch (error) {
    onError(error);
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch (e) {
        // Safe catch
      }
    }
  };
}

export interface VoicePreferences {
  engine: 'cloud' | 'native';
  rate: number;         // 0.5 to 2.0 (default 0.95)
  pitch: number;        // 0.5 to 2.0 (default 1.0)
  englishVoiceName: string; // Native voice name, e.g. "Google US English"
  teluguVoiceName: string;  // Native voice name, e.g. "Google తెలుగు"
}

export function getVoicePreferences(): VoicePreferences {
  if (typeof window === 'undefined') {
    return { engine: 'cloud', rate: 0.95, pitch: 1.0, englishVoiceName: '', teluguVoiceName: '' };
  }
  const saved = localStorage.getItem('medi_voice_pref');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed;
    } catch (e) {}
  }
  return {
    engine: 'cloud',
    rate: 0.95,
    pitch: 1.0,
    englishVoiceName: '',
    teluguVoiceName: ''
  };
}

let cachedDefaultEnglishVoiceName = "";
let cachedDefaultTeluguVoiceName = "";

export function saveVoicePreferences(pref: VoicePreferences): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('medi_voice_pref', JSON.stringify(pref));
  }
  // Reset runtime caches so new settings take effect immediately
  cachedDefaultEnglishVoiceName = "";
  cachedDefaultTeluguVoiceName = "";
}

export function getAvailableSystemVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch (e) {
    return [];
  }
}

/**
 * Plays cloud-synthesized high-articulation text-to-speech using standard HTMLAudioElement.
 */
function speakWithGoogleTTS(
  text: string, 
  langCode: string, 
  mySpeechId: number,
  onEnd?: () => void
): Promise<boolean> {
  const prefs = getVoicePreferences();
  return new Promise((resolve) => {
    const chunks = chunkText(text, 180);
    if (chunks.length === 0) {
      if (mySpeechId === globalSpeechId && onEnd) onEnd();
      resolve(true);
      return;
    }

    let index = 0;

    const playNext = () => {
      if (mySpeechId !== globalSpeechId) {
        resolve(false);
        return;
      }
      if (index >= chunks.length) {
        if (mySpeechId === globalSpeechId && onEnd) onEnd();
        resolve(true);
        return;
      }

      const chunk = chunks[index];
      const encodedChunk = encodeURIComponent(chunk);
      // Routed through our backend TTS proxy to bypass browser-specific CORS/Referer locks
      const url = `/api/tts?tl=${langCode}&q=${encodedChunk}`;
      
      const audio = new Audio();
      try {
        (audio as any).referrerPolicy = "no-referrer";
      } catch (e) {}
      audio.volume = 1.0;
      currentAudio = audio;
      audio.src = url;
      
      // Control cloud voice speed directly using standard HTML5 audio playback rates!
      audio.playbackRate = prefs.rate;

      audio.onended = () => {
        if (mySpeechId !== globalSpeechId) return;
        if (currentAudio === audio) {
          index++;
          playNext();
        }
      };

      audio.onerror = (e) => {
        if (mySpeechId !== globalSpeechId) return;
        console.warn("Google cloud speech synthesis stream failed, triggering failover synthesis.", e);
        if (currentAudio === audio) {
          currentAudio = null;
        }
        resolve(false);
      };

      try {
        audio.play().catch((err) => {
          if (mySpeechId !== globalSpeechId) return;
          console.warn("Browser block prevented auto-audible playback. Will fallback.", err);
          if (currentAudio === audio) {
            currentAudio = null;
          }
          resolve(false);
        });
      } catch (playErr) {
        if (mySpeechId !== globalSpeechId) return;
        resolve(false);
      }
    };

    playNext();
  });
}

/**
 * Speaks text using HTML5 browser-native client-side SpeechSynthesis.
 * Optimally configures pronunciation with transliteration filters when needed.
 */
function runNativeSpeechSynthesisFallback(
  text: string, 
  language: 'english' | 'telugu',
  mySpeechId: number,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (mySpeechId === globalSpeechId && onEnd) onEnd();
    return;
  }

  const prefs = getVoicePreferences();

  // Find all available voices
  let voices = systemVoices.length > 0 ? systemVoices : window.speechSynthesis.getVoices();
  
  // Custom picker for native Telugu voice
  const findTeluguVoice = (voiceList: SpeechSynthesisVoice[]) => {
    if (cachedDefaultTeluguVoiceName) {
      const cached = voiceList.find(v => v.name === cachedDefaultTeluguVoiceName);
      if (cached) return cached;
    }

    const msTelugu = voiceList.find(v => 
      v.name.toLowerCase().includes('shruti') || 
      v.name.toLowerCase().includes('mohan')
    );
    if (msTelugu) {
      cachedDefaultTeluguVoiceName = msTelugu.name;
      return msTelugu;
    }

    const googleTelugu = voiceList.find(v => 
      v.name.toLowerCase().includes('telugu') && 
      (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('online'))
    );
    if (googleTelugu) {
      cachedDefaultTeluguVoiceName = googleTelugu.name;
      return googleTelugu;
    }

    const fallback = voiceList.find((v: any) => 
      v.lang.startsWith('te') || 
      v.lang.toLowerCase().includes('telugu') ||
      v.name.toLowerCase().includes('telugu')
    );
    if (fallback) {
      cachedDefaultTeluguVoiceName = fallback.name;
      return fallback;
    }
    return null;
  };

  // Custom picker for native English voice with deep Indian English focus
  const findEnglishVoice = (voiceList: SpeechSynthesisVoice[]) => {
    if (cachedDefaultEnglishVoiceName) {
      const cached = voiceList.find(v => v.name === cachedDefaultEnglishVoiceName);
      if (cached) return cached;
    }

    const msNeerja = voiceList.find(v => v.name.toLowerCase().includes('neerja'));
    if (msNeerja) {
      cachedDefaultEnglishVoiceName = msNeerja.name;
      return msNeerja;
    }

    const msNaturalIndian = voiceList.find(v => 
      v.name.toLowerCase().includes('natural') && 
      (v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'))
    );
    if (msNaturalIndian) {
      cachedDefaultEnglishVoiceName = msNaturalIndian.name;
      return msNaturalIndian;
    }

    const msIndian = voiceList.find(v => 
      v.name.toLowerCase().includes('microsoft') && 
      (v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'))
    );
    if (msIndian) {
      cachedDefaultEnglishVoiceName = msIndian.name;
      return msIndian;
    }

    const anyIndian = voiceList.find(v => 
      v.lang.toLowerCase().includes('en-in') || 
      v.name.toLowerCase().includes('india') ||
      v.name.toLowerCase().includes('indian')
    );
    if (anyIndian) {
      cachedDefaultEnglishVoiceName = anyIndian.name;
      return anyIndian;
    }

    const generalFallback = voiceList.find((v: any) => v.lang.startsWith('en'));
    if (generalFallback) {
      cachedDefaultEnglishVoiceName = generalFallback.name;
      return generalFallback;
    }
    return null;
  };

  let resolvedText = text;
  let resolvedLang = language === 'telugu' ? 'te-IN' : 'en-IN';
  let resolvedRate = prefs.rate;
  let resolvedPitch = prefs.pitch;
  let chosenVoice: SpeechSynthesisVoice | null = null;

  if (language === 'telugu') {
    if (prefs.teluguVoiceName) {
      chosenVoice = voices.find(v => v.name === prefs.teluguVoiceName) || null;
    }

    if (chosenVoice) {
      resolvedLang = chosenVoice.lang;
    } else {
      const nativeTeVoice = findTeluguVoice(voices);
      if (nativeTeVoice) {
        chosenVoice = nativeTeVoice;
        resolvedLang = chosenVoice.lang;
      } else {
        // TELUGU SPEECH FALLBACK: Transliterate to phonetic roman script & read using Indian-English or general voice
        console.log("[MediVoice Speech] Native Telugu voice pack not detected in this browser. Activating high-fidelity Indian-Phonetic English fallback.");
        resolvedText = transliterateTeluguToEnglish(text);
        resolvedLang = 'en-IN';

        chosenVoice = findEnglishVoice(voices);
        if (chosenVoice) {
          resolvedLang = chosenVoice.lang;
        }
      }
    }
  } else {
    // English language configuration
    if (prefs.englishVoiceName) {
      chosenVoice = voices.find(v => v.name === prefs.englishVoiceName) || null;
    }

    if (chosenVoice) {
      resolvedLang = chosenVoice.lang;
    } else {
      chosenVoice = findEnglishVoice(voices);
      if (chosenVoice) {
         resolvedLang = chosenVoice.lang;
      }
    }
  }

  // Create utterance with final synthesized text
  const utterance = new SpeechSynthesisUtterance(resolvedText);
  utterance.lang = resolvedLang;
  utterance.rate = resolvedRate;
  utterance.pitch = resolvedPitch;
  utterance.volume = 1.0;
  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }

  // Track utterance reference globally to avoid early GC
  activeUtterances.add(utterance);

  let finished = false;
  
  // Failsafe timeout based on text length to prevent indefinite browser hangs if onend/onerror is missed
  const estimatedSpeakDuration = Math.min(15000, Math.max(3000, resolvedText.length * 85 + 2000));
  
  const failsafeTimer = setTimeout(() => {
    if (!finished) {
      console.warn("SpeechSynthesis onend was bypassed via failsafe timeout.");
      cleanup();
    }
  }, estimatedSpeakDuration);

  const cleanup = () => {
    if (finished) return;
    finished = true;
    clearTimeout(failsafeTimer);
    activeUtterances.delete(utterance);
    if (mySpeechId === globalSpeechId && onEnd) {
      onEnd();
    }
  };

  utterance.onend = () => {
    cleanup();
  };

  utterance.onerror = (e) => {
    console.error("SpeechSynthesis error:", e);
    // Silent recovery - trigger cleanup to not block screen state
    cleanup();
  };

  try {
    if (mySpeechId === globalSpeechId) {
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.error("Failed to execute speak commands on SpeechSynthesis:", err);
    cleanup();
  }
}

/**
 * Speaks text using a robust Dual-Channel Text-To-Speech engine.
 * Primarily attempts high-fidelity Google TTS over HTML Audio, seamlessly falling back
 * to browser-native Synthesis for zero-dependency offline resilience.
 */
export function speakText(
  text: string, 
  language: 'english' | 'telugu',
  onEnd?: () => void
): void {
  if (typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  // 1. Force halt any previous/concurrent speakers first
  stopSpeaking();

  // Abort any active speech recognition session to prevent hardware clashes and echo feedback loops
  if (currentActiveRecognition) {
    try {
      currentActiveRecognition.onresult = null;
      currentActiveRecognition.onerror = null;
      currentActiveRecognition.onend = null;
      currentActiveRecognition.abort();
    } catch (e) {}
    currentActiveRecognition = null;
  }

  globalSpeechId++;
  const mySpeechId = globalSpeechId;

  const prefs = getVoicePreferences();
  const langCode = language === 'telugu' ? 'te' : 'en-in';

  // Dispatch custom event for visual speech reader overlays
  window.dispatchEvent(new CustomEvent('medi_speak', { detail: { text, language } }));

  const wrappedOnEnd = () => {
    if (mySpeechId === globalSpeechId) {
      window.dispatchEvent(new CustomEvent('medi_stop'));
    }
    if (onEnd) onEnd();
  };

  // If user selected Native Browser Engine, bypass Google translation engine completely
  if (prefs.engine === 'native') {
    runNativeSpeechSynthesisFallback(text, language, mySpeechId, wrappedOnEnd);
    return;
  }

  // 2. Play with studio-grade Cloud TTS, fall back to native SpeechSynthesis if needed
  speakWithGoogleTTS(text, langCode, mySpeechId, wrappedOnEnd)
    .then((success) => {
      if (mySpeechId !== globalSpeechId) return;
      if (success) {
        return;
      }
      runNativeSpeechSynthesisFallback(text, language, mySpeechId, wrappedOnEnd);
    })
    .catch((err) => {
      if (mySpeechId !== globalSpeechId) return;
      console.warn("Cloud TTS playback error, utilizing native speech engines:", err);
      runNativeSpeechSynthesisFallback(text, language, mySpeechId, wrappedOnEnd);
    });
}

/**
 * Force stop all speaking voices (both active HTML5 Audio streams and Web Synthesis engines)
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch (e) {}
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('medi_stop'));
  }
}

/**
 * Maps technical speech recognition errors to descriptive, user-friendly feedback in English/Telugu.
 */
export function getFriendlySpeechErrorMessage(event: any, language: 'english' | 'telugu'): string {
  const isTe = language === 'telugu';
  if (!event) {
    return isTe ? "వాయిస్ కనెక్షన్ ఆగిపోయింది." : "Voice entry interrupted.";
  }
  
  // Extract error string if passed event object or string directly
  const errorType = (typeof event === 'string') 
    ? event 
    : (event.error || (event.message ? 'custom' : ''));
  
  switch (errorType) {
    case 'not-allowed':
      return isTe 
        ? "మైక్రోఫోన్ అనుమతి నిరాకరించబడింది! దయచేసి టాప్-రైట్ లో ఉన్న 'న్యూ ట్యాబ్ లో ఓపెన్ చేయి' ఆప్షన్ క్లిక్ చేయండి, లేదా బ్రౌజర్ అడ్రస్ బార్‌లో మైక్ ఐకాన్ క్లిక్ చేసి అనుమతించండి."
        : "Microphone permission was denied! If running inside an iframe, please click the 'Open in New Tab' button at the top-right of your screen or look for the micro icon in your address bar.";
    case 'no-speech':
      return isTe
        ? "ఎటువంటి శబ్దం వినపడలేదు! దయచేసి మైక్ దగ్గరగా స్పష్టంగా మాట్లాడండి."
        : "No voice was detected. Please ensure your microphone is active and repeat your statement clearly.";
    case 'language-not-supported':
      return isTe
        ? "ఈ డివైస్/బ్రౌజర్‌లో తెలుగు వాయిస్ రికగ్నిషన్ లభ్యం కాలేదు. గూగుల్ క్రోమ్ ఉపయోగించండి."
        : "Voice localization is not supported by your current browser. Please utilize Google Chrome for full accuracy.";
    case 'audio-capture':
      return isTe
        ? "మైక్రోఫోన్ హార్డ్‌వేర్ దొరకలేదు. కనెక్షన్ పరీక్షించండి."
        : "Microphone hardware was not detected. Please verify your mic connection or device.";
    case 'network':
      return isTe
        ? "నెట్‌వర్క్ సమస్యగా ఉంది! వాయిస్ సేవ కోసం ఇంటర్నెట్ అవసరం."
        : "A network issue occurred. Dynamic speech-to-text requires an active internet connection.";
    default:
      const rawMsg = event.message || event.error || String(event);
      if (rawMsg.includes("not supported")) {
        return isTe
          ? "ఈ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ కి సపోర్ట్ లేదు. దయచేసి టైప్ చేయండి లేదా క్రోమ్ వాడండి."
          : "Speech recognition is not supported in this browser environment. Please typed manually or run on Google Chrome.";
      }
      return isTe
        ? `వాయిస్ లోపం: ${rawMsg}. దయచేసి మళ్ళీ ప్రయత్నించండి లేదా టైప్ చేయండి.`
        : `Microphone issue: ${rawMsg}. Please retry speaking or type manually.`;
  }
}

/**
 * Robustly converts spoken Telugu numbers or Telugu digit words/numerals into standard ASCII digits.
 * Useful for fields like phone number and ID card numbers.
 */
/**
 * Converts both English and Telugu spoken digits, numeral words, and modifiers
 * (such as "double seven" or "triple nine") into clean ASCII digits.
 * Eliminates spacing between adjacent digits automatically to allow direct form validation.
 */
export function convertSpokenWordsToDigits(text: string): string {
  if (!text) return "";
  
  let result = text.toLowerCase();
  
  // 0. Pre-process multi-word English spoken numbers (up to 31)
  result = result.replace(/\btwenty[ -\s]*first\b/g, "21");
  result = result.replace(/\btwenty[ -\s]*second\b/g, "22");
  result = result.replace(/\btwenty[ -\s]*third\b/g, "23");
  result = result.replace(/\btwenty[ -\s]*fourth\b/g, "24");
  result = result.replace(/\btwenty[ -\s]*fifth\b/g, "25");
  result = result.replace(/\btwenty[ -\s]*sixth\b/g, "26");
  result = result.replace(/\btwenty[ -\s]*seventh\b/g, "27");
  result = result.replace(/\btwenty[ -\s]*eighth\b/g, "28");
  result = result.replace(/\btwenty[ -\s]*ninth\b/g, "29");
  result = result.replace(/\btwenty[ -\s]*one\b/g, "21");
  result = result.replace(/\btwenty[ -\s]*two\b/g, "22");
  result = result.replace(/\btwenty[ -\s]*three\b/g, "23");
  result = result.replace(/\btwenty[ -\s]*four\b/g, "24");
  result = result.replace(/\btwenty[ -\s]*five\b/g, "25");
  result = result.replace(/\btwenty[ -\s]*six\b/g, "26");
  result = result.replace(/\btwenty[ -\s]*seven\b/g, "27");
  result = result.replace(/\btwenty[ -\s]*eight\b/g, "28");
  result = result.replace(/\btwenty[ -\s]*nine\b/g, "29");
  result = result.replace(/\bthirty[ -\s]*first\b/g, "31");
  result = result.replace(/\bthirty[ -\s]*one\b/g, "31");
  
  // Strip ordinal suffixes from raw numbers (e.g. 25th -> 25)
  result = result.replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1");

  // 1. Map Telugu numeral characters (౦ to ౯)
  const teluguDigits = ["౦", "౧", "౨", "౩", "౪", "౫", "౬", "౭", "౮", "౯"];
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(teluguDigits[i], String(i));
  }

  // 2. Map spoken words for both English and Telugu
  const digitMap: { [key: string]: string } = {
    // English words
    "zero": "0", "oh": "0", "love": "0",
    "one": "1", "won": "1", "single": "1", "first": "1",
    "two": "2", "too": "2", "to": "2", "second": "2",
    "three": "3", "tree": "3", "free": "3", "third": "3",
    "four": "4", "for": "4", "fore": "4", "fourth": "4",
    "five": "5", "fifth": "5",
    "six": "6", "sex": "6", "sixth": "6",
    "seven": "7", "seventh": "7",
    "eight": "8", "ate": "8", "eighth": "8",
    "nine": "9", "ninth": "9",
    "ten": "10", "tenth": "10",
    "eleven": "11", "eleventh": "11",
    "twelve": "12", "twelfth": "12",
    "thirteen": "13", "thirteenth": "13",
    "fourteen": "14", "fourteenth": "14",
    "fifteen": "15", "fifteenth": "15",
    "sixteen": "16", "sixteenth": "16",
    "seventeen": "17", "seventeenth": "17",
    "eighteen": "18", "eighteenth": "18",
    "nineteen": "19", "nineteenth": "19",
    "twenty": "20", "twentieth": "20",
    "thirty": "30", "thirtieth": "30",
    // Telugu words
    "సున్నా": "0", "జీరో": "0", "జెరో": "0",
    "ఒకటి": "1", "ఒక": "1", "వన్": "1", "వన్‌": "1",
    "రెండు": "2", "రెం": "2", "టూ": "2", "టు": "2",
    "మూడు": "3", "త్రీ": "3", "త్రి": "3",
    "నాలుగు": "4", "నాలుగ": "4", "ఫోర్": "4", "ఫోరు": "4",
    "ఐదు": "5", "ఐద": "5", "ఫైవ్": "5", "ఫైవు": "5",
    "ఆరు": "6", "సిక్స్": "6", "సిక్సు": "6",
    "ఏడు": "7", "సెవెన్": "7", "సెవెం": "7",
    "ఎనిమిది": "8", "ఎనిమిద": "8", "ఎయిట్": "8", "ఎయిటు": "8",
    "తొమ్మిది": "9", "తొమ్మిద": "9", "నైన్": "9", "నైను": "9"
  };

  const tokens = result.split(/[\s,\-\.\/]+/);
  const processedTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;

    const lowerToken = token.toLowerCase();

    if ((lowerToken === "double" || lowerToken === "డబుల్") && i + 1 < tokens.length) {
      const nextToken = tokens[i + 1].trim();
      const mappedVal = digitMap[nextToken] || nextToken;
      if (mappedVal.length === 1 && /[0-9]/.test(mappedVal)) {
        processedTokens.push(mappedVal, mappedVal);
        i++; // skip
        continue;
      }
    }

    if ((lowerToken === "triple" || lowerToken === "ట్రిపుల్") && i + 1 < tokens.length) {
      const nextToken = tokens[i + 1].trim();
      const mappedVal = digitMap[nextToken] || nextToken;
      if (mappedVal.length === 1 && /[0-9]/.test(mappedVal)) {
        processedTokens.push(mappedVal, mappedVal, mappedVal);
        i++; // skip
        continue;
      }
    }

    if (digitMap[lowerToken]) {
      processedTokens.push(digitMap[lowerToken]);
    } else {
      processedTokens.push(token);
    }
  }

  let combined = processedTokens.join(" ");

  // Safety inline replacement of remainders
  for (const [key, value] of Object.entries(digitMap)) {
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'g');
    combined = combined.replace(regex, value);
  }

  // Auto merge spacing between digits
  let cleaned = "";
  for (let i = 0; i < combined.length; i++) {
    const char = combined[i];
    if (char === ' ') {
      const prevIsDigit = i > 0 && /[0-9]/.test(combined[i - 1]);
      const nextIsDigit = i + 1 < combined.length && /[0-9]/.test(combined[i + 1]);
      if (prevIsDigit && nextIsDigit) {
        continue; // omit spaces between adjacent numbers
      }
    }
    cleaned += char;
  }

  return cleaned.trim();
}

/**
 * Retains backward-compatible alias export pointing to the dual English/Telugu converter.
 */
export function convertTeluguSpokenNumbersToDigits(text: string): string {
  return convertSpokenWordsToDigits(text);
}

