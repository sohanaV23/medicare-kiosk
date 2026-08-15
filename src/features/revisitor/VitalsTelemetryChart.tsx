import React from 'react';
import { Info, TrendingUp } from 'lucide-react';

interface VitalsTelemetryChartProps {
  activeTab: 'vitals' | 'recovery' | 'bp';
  setActiveTab: (tab: 'vitals' | 'recovery' | 'bp') => void;
  hoveredPoint: number | null;
  setHoveredPoint: (idx: number | null) => void;
  visitsDataset: any[];
  t: any;
}

export const VitalsTelemetryChart: React.FC<VitalsTelemetryChartProps> = ({
  activeTab,
  setActiveTab,
  hoveredPoint,
  setHoveredPoint,
  visitsDataset,
  t,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-display">
            {t.progressTitle}
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {t.progressSub}
          </p>
        </div>

        {/* Selector Tabs for Graph types */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-bold uppercase tracking-wider gap-0.5">
          <button
            id="tab-graph-vitals"
            onClick={() => setActiveTab('vitals')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'vitals' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Heart Rate (BPM)
          </button>
          <button
            id="tab-graph-recovery"
            onClick={() => setActiveTab('recovery')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'recovery' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Wellness Index
          </button>
          <button
            id="tab-graph-bp"
            onClick={() => setActiveTab('bp')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'bp' ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Blood Pressure
          </button>
        </div>
      </div>

      {/* TAB GRAPH EXPLANATIONS */}
      <div className="mb-4 bg-slate-50 p-3 rounded-2xl flex items-start gap-2 border border-slate-150 text-slate-600 text-xs">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <div>
          {activeTab === 'vitals' && (
            <p><strong>{t.heartRateTitle}</strong>: {t.heartRateSub}. Lower resting heart rate signifies superior cardiovascular stability.</p>
          )}
          {activeTab === 'recovery' && (
            <p><strong>{t.recoveryScore}</strong>: {t.recoverySub}. Progress calculated based on symptom severity alleviation scores.</p>
          )}
          {activeTab === 'bp' && (
            <p><strong>{t.bpTitle}</strong>: {t.bpSub}. Diastolic/Systolic progression charts.</p>
          )}
        </div>
      </div>

      {/* HIGH-FIDELITY INTERACTIVE SVG PLOTTED GRAPH */}
      <div className="relative bg-slate-50/50 p-6 rounded-2xl border border-slate-150 h-64 flex flex-col justify-between overflow-hidden">
        <div className="absolute top-3 right-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Bio-Analytics Map</span>
        </div>

        {/* Gridlines overlay */}
        <div className="absolute inset-x-8 top-8 bottom-12 flex flex-col justify-between pointer-events-none opacity-50">
          <div className="border-b border-dashed border-slate-200 w-full h-0" />
          <div className="border-b border-dashed border-slate-200 w-full h-0" />
          <div className="border-b border-dashed border-slate-200 w-full h-0" />
          <div className="border-b border-dashed border-slate-200 w-full h-0" />
        </div>

        {/* SVG Canvas Area */}
        <div className="flex-1 w-full flex items-stretch">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 540 180" preserveAspectRatio="none">
            
            {/* VITALS TYPE LINE (HEART RATE) */}
            {activeTab === 'vitals' && (
              <>
                {/* Gradient def */}
                <defs>
                  <linearGradient id="hr-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {/* Shaded Area */}
                <path 
                  d="M 40 160 L 40 100 L 130 80 L 220 68 L 310 60 L 400 45 L 490 50 L 490 160 Z" 
                  fill="url(#hr-gradient)" 
                  className="transition-all duration-500" 
                />
                {/* Line Path */}
                <path 
                  d="M 40 100 L 130 80 L 220 68 L 310 60 L 400 45 L 490 50" 
                  fill="none" 
                  stroke="#0ea5e9" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  className="transition-all duration-500" 
                />
                {/* Render Circle Markers */}
                {[
                  { x: 40, y: 100, val: "88" },
                  { x: 130, y: 80, val: "82" },
                  { x: 220, y: 68, val: "78" },
                  { x: 310, y: 60, val: "75" },
                  { x: 400, y: 45, val: "70" },
                  { x: 490, y: 50, val: "72" }
                ].map((p, i) => (
                  <g 
                    key={i} 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={hoveredPoint === i ? "6.5" : "4.5"} 
                      fill="#0ea5e9" 
                      stroke="#ffffff" 
                      strokeWidth={hoveredPoint === i ? "2.5" : "1.5"} 
                      className="transition-all duration-200"
                    />
                    <text x={p.x} y={p.y - 10} fill="#0369a1" fontSize="8.5" fontWeight="black" textAnchor="middle">{p.val}</text>
                  </g>
                ))}
              </>
            )}

            {/* RECOVERY SCORE OPTION */}
            {activeTab === 'recovery' && (
              <>
                <defs>
                  <linearGradient id="rec-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <path 
                  d="M 40 160 L 40 130 L 130 115 L 220 95 L 310 80 L 400 55 L 490 35 L 490 160 Z" 
                  fill="url(#rec-gradient)" 
                  className="transition-all duration-500" 
                />
                <path 
                  d="M 40 130 L 130 115 L 220 95 L 310 80 L 400 55 L 490 35" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  className="transition-all duration-500" 
                />
                {[
                  { x: 40, y: 130, val: "65%" },
                  { x: 130, y: 115, val: "72%" },
                  { x: 220, y: 95, val: "80%" },
                  { x: 310, y: 80, val: "85%" },
                  { x: 400, y: 55, val: "92%" },
                  { x: 490, y: 35, val: "97%" }
                ].map((p, i) => (
                  <g 
                    key={i} 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={hoveredPoint === i ? "6.5" : "4.5"} 
                      fill="#10b981" 
                      stroke="#ffffff" 
                      strokeWidth={hoveredPoint === i ? "2.5" : "1.5"} 
                      className="transition-all duration-200"
                    />
                    <text x={p.x} y={p.y - 10} fill="#047857" fontSize="8.5" fontWeight="black" textAnchor="middle">{p.val}</text>
                  </g>
                ))}
              </>
            )}

            {/* BLOOD PRESSURE progression (Double Plot) */}
            {activeTab === 'bp' && (
              <>
                {/* Systolic Line (Violet) */}
                <path 
                  d="M 40 70 L 130 84 L 220 90 L 310 98 L 400 102 L 490 104" 
                  fill="none" 
                  stroke="#8b5cf6" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />
                {/* Diastolic Line (Pink) */}
                <path 
                  d="M 40 120 L 130 124 L 220 128 L 310 132 L 400 136 L 490 138" 
                  fill="none" 
                  stroke="#ec4899" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
                {/* Systolic Markers (Purple) */}
                {[
                  { x: 40, y: 70, val: "135" },
                  { x: 130, y: 84, val: "128" },
                  { x: 220, y: 90, val: "125" },
                  { x: 310, y: 98, val: "121" },
                  { x: 400, y: 102, val: "119" },
                  { x: 490, y: 104, val: "118" }
                ].map((p, i) => (
                  <g key={`sys-${i}`} className="cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.5" />
                    <text x={p.x} y={p.y - 10} fill="#6d28d9" fontSize="8.5" fontWeight="black" textAnchor="middle">{p.val}</text>
                  </g>
                ))}
                {/* Diastolic Markers (Pink) */}
                {[
                  { x: 40, y: 120, val: "88" },
                  { x: 130, y: 124, val: "84" },
                  { x: 220, y: 128, val: "82" },
                  { x: 310, y: 132, val: "80" },
                  { x: 400, y: 136, val: "78" },
                  { x: 490, y: 138, val: "77" }
                ].map((p, i) => (
                  <g key={`dia-${i}`} className="cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#ec4899" stroke="#ffffff" strokeWidth="1.5" />
                    <text x={p.x} y={p.y + 13} fill="#be185d" fontSize="8.5" fontWeight="black" textAnchor="middle">{p.val}</text>
                  </g>
                ))}
              </>
            )}

          </svg>
        </div>

        {/* X Axis Labels */}
        <div className="flex justify-between items-center px-4 pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
          {visitsDataset.map((v, i) => (
            <span 
              key={i} 
              className={`transition-colors duration-200 ${hoveredPoint === i ? 'text-sky-600 scale-110 font-black' : ''}`}
            >
              {v.month}
            </span>
          ))}
        </div>
      </div>

      {/* Hover details display card */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visitsDataset.map((v, i) => (
          <div 
            key={i} 
            onClick={() => setHoveredPoint(i)}
            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
              hoveredPoint === i 
                ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-100 shadow-sm' 
                : 'bg-white border-slate-150 hover:border-slate-300'
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold font-mono block mb-1">{v.month} Check-In</span>
            <p className="text-sm font-black text-slate-800 leading-none">
              {activeTab === 'vitals' && `${v.heartRate} BPM`}
              {activeTab === 'recovery' && `${v.recovery}% Health`}
              {activeTab === 'bp' && `${v.bpSystolic}/${v.bpDiastolic}`}
            </p>
            <span className="text-[9px] text-teal-600 block mt-1 leading-tight font-serif">{v.status}</span>
          </div>
        ))}
      </div>
      
      <p className="text-[10px] text-center text-slate-400 font-medium font-sans mt-3">
        * {t.pointDetails}
      </p>

    </div>
  );
};
