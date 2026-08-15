import React from 'react';
import { Camera, Cpu, CheckCircle, HelpCircle } from 'lucide-react';

interface AadhaarLoginCardProps {
  cameraActive: boolean;
  cameraStream: MediaStream | null;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  capturing: boolean;
  capturedPhotoUrl: string | null;
  showFlash: boolean;
  matchResult: { matched: boolean; fullName?: string; confidenceScore?: number; photoUrl?: string } | null;
  error: string;
  startWebcam: () => void;
  captureAadhaarMatch: () => void;
  stopWebcam: () => void;
}

export const AadhaarLoginCard: React.FC<AadhaarLoginCardProps> = ({
  cameraActive,
  cameraStream,
  videoRef,
  capturing,
  capturedPhotoUrl,
  showFlash,
  matchResult,
  error,
  startWebcam,
  captureAadhaarMatch,
  stopWebcam,
}) => {
  return (
    <div className="space-y-6 text-center">
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center">
        
        {/* Camera view screen with interactive card guide reticle */}
        <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center shadow-inner">
          {cameraActive ? (
            cameraStream ? (
              <video
                ref={(node) => {
                  videoRef.current = node;
                  if (node && cameraStream && node.srcObject !== cameraStream) {
                    node.srcObject = cameraStream;
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              /* Premium Interactive Animated Holographic Live Scanner Feed */
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                <style>{`
                  @keyframes scanline {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                  }
                  .animate-scanline {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: linear-gradient(to right, transparent, #2dd4bf, #14b8a6, #2dd4bf, transparent);
                    box-shadow: 0 0 12px #2dd4bf, 0 0 24px #14b8a6;
                    animation: scanline 2.8s ease-in-out infinite;
                    z-index: 20;
                    pointer-events: none;
                  }
                `}</style>
                
                {/* Rich High-Resolution Simulated Camera Profile Backing */}
                <img
                  src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=400&auto=format&fit=crop"
                  alt="Scan Preview Feed"
                  className="absolute inset-0 w-full h-full object-cover opacity-75 filter brightness-90 animate-[pulse_6s_infinite]"
                />

                {/* Futuristic Holo Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(20,184,166,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(20,184,166,0.1)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none z-10" />
                
                {/* Oscillating laser line scanner sweeping up and down */}
                <div className="animate-scanline" />

                {/* Holographic matrix status values in margin */}
                <div className="absolute top-2 left-2 z-15 font-mono text-[8px] text-teal-400/80 bg-slate-950/70 p-1.5 rounded border border-teal-500/20 text-left pointer-events-none select-none">
                  <div className="text-teal-300 font-bold">AADHAAR_OCR_READY</div>
                  <div>FPS: 60 / LOCK: A</div>
                  <div>DETECT_DIST: --</div>
                </div>

                <div className="absolute top-2 right-2 z-15 font-mono text-[8px] text-teal-400/80 bg-slate-950/70 p-1.5 rounded border border-teal-500/20 text-right pointer-events-none select-none">
                  <div>CARD_DETECT: YES</div>
                  <div>COMP_HZ: 94.2</div>
                  <div className={capturing ? "text-amber-305 animate-pulse font-bold animate-pulse" : "text-emerald-300"}>
                    {capturing ? "SCANNING_NOW..." : "ALIGNMENT_SECURE"}
                  </div>
                </div>

                {/* Center card guide outline box */}
                <div className="absolute inset-x-8 inset-y-8 border-2 border-dashed border-teal-400 bg-teal-500/5 rounded-xl pointer-events-none flex flex-col items-center justify-center">
                  <span className="text-[9px] text-teal-300 font-bold bg-teal-950/80 px-2 py-0.5 rounded uppercase tracking-wider">Position Aadhaar Card Here</span>
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-teal-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-teal-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-teal-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-teal-400" />
                </div>
              </div>
            )
          ) : capturedPhotoUrl ? (
            <img
              src={capturedPhotoUrl}
              alt="Captured signature"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="flex flex-col items-center text-slate-400 p-6">
              <Camera className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-500">Camera stream inactive</span>
              <span className="text-[10px] text-slate-400 mt-1">Activate scanning below to log in</span>
            </div>
          )}

          {/* Bright white camera physical flash override */}
          {showFlash && (
            <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 animate-[fadeOut_0.15s_ease-out_forwards]" />
          )}

          {/* Card outline overlay during scan */}
          {cameraActive && (
            <div className="absolute inset-0 border-2 border-sky-500/30 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-[80%] h-[70%] border-2 border-sky-400 bg-sky-500/5 rounded-xl flex items-center justify-center">
                <span className="text-[9px] text-sky-200 uppercase tracking-widest font-black">Aadhaar Card Guide</span>
              </div>
              {/* Corner guides */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-sky-400" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-sky-400" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-sky-400" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-sky-400" />
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold text-slate-700 mt-4">
          {capturing ? 'Verifying Aadhaar details...' : 'Aadhaar Card Scan Check-In'}
          <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
            {capturing ? '(ఆధార్ కార్డు విశ్లేషణ జరుగుతోంది...)' : '(ఆధార్ కార్డ్ చెక్-ఇన్)'}
          </span>
        </h3>

        {/* UI Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3.5 w-full justify-center mt-5">
          {!cameraActive && !capturing ? (
            <button
              type="button"
              onClick={startWebcam}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera Scanner (కెమెరా ఆన్ చేయి)</span>
            </button>
          ) : cameraActive && !capturing ? (
            <button
              type="button"
              onClick={captureAadhaarMatch}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg animate-pulse"
            >
              <Cpu className="w-4 h-4 animate-spin-slow" />
              <span>Scan Aadhaar Card (ఆధార్ కార్డును స్కాన్ చేయి)</span>
            </button>
          ) : null}

          {cameraActive && (
            <button
              type="button"
              onClick={stopWebcam}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Recognition Match results feedback block */}
        {matchResult && (
          <div className={`mt-4 p-4 rounded-2xl border text-left w-full ${
            matchResult.matched 
              ? 'bg-teal-50 border-teal-100 text-teal-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            <div className="flex items-start gap-2">
              {matchResult.matched ? (
                <>
                  <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">Identification Complete!</h4>
                    <p className="text-xs font-semibold font-display mt-1">Hello back, {matchResult.fullName}</p>
                    <p className="text-[10px] text-teal-600 font-sans mt-0.5">Biometric match confidence: {matchResult.confidenceScore || 98}%</p>
                  </div>
                </>
              ) : (
                <>
                  <HelpCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">Not Scanned or Matches Stalled</h4>
                    <p className="text-xs mt-1">We couldn't match this record to any active biometric descriptors. Please sign in with your mobile number or register as a new client.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 text-red-500 text-xs font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100 w-full">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
