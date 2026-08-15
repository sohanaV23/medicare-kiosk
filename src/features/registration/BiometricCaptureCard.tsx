import React from 'react';
import { Camera, Check, CheckCircle, Loader2, Cpu } from 'lucide-react';
import { Patient } from '../../types';

interface BiometricCaptureCardProps {
  cameraActive: boolean;
  cameraStream: MediaStream | null;
  capturedPhotoUrl: string | null;
  capturing: boolean;
  fakeCoordinates: { x: number; y: number; d: number };
  formData: Patient;
  t: any;
  startWebcam: (mode: 'selfie') => void;
  captureFrame: () => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
}

export const BiometricCaptureCard: React.FC<BiometricCaptureCardProps> = ({
  cameraActive,
  cameraStream,
  capturedPhotoUrl,
  capturing,
  fakeCoordinates,
  formData,
  t,
  startWebcam,
  captureFrame,
  videoRef,
}) => {
  return (
    <div className="space-y-3 bg-gradient-to-r from-teal-50/40 via-sky-50/40 to-white/40 border border-slate-250 rounded-2xl p-5">
      <div className="flex items-center justify-between border-b border-slate-200/55 pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-teal-600 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
            {t.faceCapture}
          </h3>
        </div>
        {formData.faceCaptureId && (
          <span className="bg-teal-100 text-teal-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 shadow-3xs">
            <Check className="w-3 h-3 text-teal-700" /> Secure Bind Active
          </span>
        )}
      </div>
      
      <p className="text-xs text-slate-500 font-medium">
        {t.faceCaptureInstruction}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Visual camera container */}
        <div className="md:col-span-6 relative aspect-video bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col items-center justify-center p-4">
          
          {/* Actual physical Camera Feed */}
          {cameraActive && cameraStream && (
            <video 
              ref={(node) => {
                videoRef.current = node;
                if (node && cameraStream && node.srcObject !== cameraStream) {
                  node.srcObject = cameraStream;
                }
              }} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0"
            />
          )}

          {/* High Fidelity Animated Biometric Simulator in Sandbox (when cameraStream is null but camera is active) */}
          {cameraActive && !cameraStream && (
            <div className="absolute inset-0 z-0 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
              {/* Grid overlay background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none" />
              
              {/* Glowing visual scanning face representation */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <svg className="w-24 h-24 text-teal-500/80 animate-[pulse_2s_infinite]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {/* Human profile layout */}
                  <path d="M50,15 C28,15 28,50 28,65 C28,80 38,90 50,90 C62,90 72,80 72,65 C72,50 72,15 50,15 Z" strokeDasharray="3,3" />
                  {/* Reticle grid */}
                  <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(20,184,166,0.1)" strokeWidth="1" />
                  <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(20,184,166,0.1)" strokeWidth="1" />
                  {/* Blinking eyes tracking indicators */}
                  <circle cx="38" cy="45" r="3.5" className="fill-teal-400 stroke-teal-300 animate-ping" />
                  <circle cx="38" cy="45" r="2" className="fill-teal-400" />
                  <circle cx="62" cy="45" r="3.5" className="fill-teal-400 stroke-teal-300 animate-ping" />
                  <circle cx="62" cy="45" r="2" className="fill-teal-400" />
                  <path d="M30,45 L46,45" stroke="rgba(20,184,166,0.3)" />
                  <path d="M54,45 L70,45" stroke="rgba(20,184,166,0.3)" strokeWidth="1" />
                  {/* Forehead biometric mapping dots */}
                  <circle cx="50" cy="28" r="1.5" className="fill-emerald-400" />
                  <circle cx="42" cy="30" r="1" className="fill-cyan-400" />
                  <circle cx="58" cy="30" r="1" className="fill-cyan-400" />
                  {/* Mouth and smile tracking line */}
                  <path d="M41,68 Q50,74 59,68" stroke="rgba(20,184,166,0.6)" strokeWidth="1.5" />
                  {/* Interactive Bounding box anchors */}
                  <path d="M22,25 L22,18 L29,18" stroke="#14b8a6" strokeWidth="2" />
                  <path d="M78,25 L78,18 L71,18" stroke="#14b8a6" strokeWidth="2" />
                  <path d="M22,75 L22,82 L29,82" stroke="#14b8a6" strokeWidth="2" />
                  <path d="M78,75 L78,82 L71,82" stroke="#14b8a6" strokeWidth="2" />
                </svg>

                {/* Scanning feedback badge */}
                <div className="mt-3 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center gap-2 shadow-2xs">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[9px] uppercase tracking-widest font-mono font-bold text-teal-400">
                    DETECTING PATIENT FACE...
                  </span>
                </div>
              </div>

              {/* Real-time coordinates telemetry readout */}
              <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end z-10 font-mono text-[8px] text-teal-400">
                <div className="space-y-0.5 bg-slate-950/80 p-1 rounded border border-slate-800">
                  <p className="text-slate-500 text-[7px] uppercase font-bold">TRACKER NODES</p>
                  <p>FOCUS.X: <span className="text-white">{fakeCoordinates.x}px</span></p>
                  <p>FOCUS.Y: <span className="text-white">{fakeCoordinates.y}px</span></p>
                  <p>FIDELITY: <span className="text-white">{fakeCoordinates.d}%</span></p>
                </div>
                <div className="text-right bg-slate-950/80 p-1 rounded border border-slate-800">
                  <p className="text-slate-500 text-[7px] uppercase font-bold">IFRAME PREVIEW MODE</p>
                  <p className="text-amber-400">CAMERA STREAM CONTEXT REPLACED</p>
                  <p className="text-slate-400">OPEN IN NEW TAB FOR LIVE DEVICE</p>
                </div>
              </div>
            </div>
          )}

          {/* High fidelity scanner lens overlay when active (shows on top of physical/simulated feed) */}
          {cameraActive && (
            <div className="absolute inset-0 border border-teal-500/20 pointer-events-none flex flex-col justify-between p-4 z-10">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-l-2 border-teal-400/80" />
                <span className="w-4 h-4 border-t-2 border-r-2 border-teal-400/80" />
              </div>
              {/* Glowing scan horizontal line scanning recursively */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_10px_#14b8a6] animate-[bounce_2.5s_infinite]" />
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-l-2 border-teal-400/80" />
                <span className="w-4 h-4 border-b-2 border-r-2 border-teal-400/80" />
              </div>
            </div>
          )}

          {/* Standby Placeholder */}
          {!cameraActive && !capturedPhotoUrl && (
            <div className="text-center space-y-2.5 p-6 text-slate-500 z-10 transition-all duration-300 animate-[fadeIn_0.5s_ease-out]">
              <Camera className="w-9 h-9 text-slate-400 mx-auto opacity-70 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-350">Biometrics Scanner Standby</p>
              <p className="text-[11px] text-slate-400 max-w-[210px] mx-auto leading-normal">
                Activate the capture lens to generate secure biometric patient identification.
              </p>
            </div>
          )}

          {/* Captured Photo */}
          {capturedPhotoUrl && !cameraActive && (
            <img 
              src={capturedPhotoUrl} 
              alt="Biometric Capture" 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Captured verification success mark */}
          {capturedPhotoUrl && !cameraActive && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-10">
              <div className="text-center bg-white/90 p-4 rounded-xl border border-teal-200 shadow-xl max-w-xs transform scale-95 duration-300">
                <CheckCircle className="w-8 h-8 text-teal-600 mx-auto" />
                <p className="text-xs font-black text-teal-800 uppercase mt-2 tracking-wider">{t.scanSuccess}</p>
                <span className="text-[10px] font-mono font-bold text-slate-500 block break-all mt-1">
                  {t.faceBiometricToken}{formData.faceCaptureId?.split('-').pop()}
                </span>
              </div>
            </div>
          )}

          {/* Dictation processing loader - customized with elegant high-visibility transparency */}
          {capturing && (
            <div className="absolute inset-0 bg-teal-500/10 backdrop-blur-3xs border-2 border-teal-400 animate-[pulse_1.5s_infinite] flex flex-col items-center justify-center z-25">
              <div className="bg-slate-950/90 px-4 py-3 rounded-xl border border-teal-500/20 flex flex-col items-center text-center shadow-lg transform scale-95">
                <Loader2 className="w-7 h-7 text-teal-400 animate-spin" />
                <span className="text-[10px] text-teal-300 font-extrabold uppercase mt-2.5 tracking-[0.1em]">Digitizing Facial Biometrics...</span>
                <span className="text-[8px] text-slate-400 block mt-1">Keep still. Mapping biophase coordinates...</span>
              </div>
            </div>
          )}

        </div>

        {/* Webcam activation buttons */}
        <div className="md:col-span-6 space-y-3">
          {!cameraActive ? (
            <button
              type="button"
              onClick={() => startWebcam('selfie')}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Camera className="w-4 h-4 text-teal-400" />
              {t.activateCamera}
            </button>
          ) : (
            <button
              type="button"
              onClick={captureFrame}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm animate-pulse"
            >
              <Cpu className="w-4 h-4 text-white" />
              {t.captureBiometrics}
            </button>
          )}

          {formData.faceCaptureId && (
            <div className="bg-white/80 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-teal-605 block">System Bound Token</span>
                <span className="text-xs font-mono font-bold text-slate-650">{formData.faceCaptureId}</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
