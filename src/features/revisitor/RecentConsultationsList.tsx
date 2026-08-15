import React from 'react';
import { ClipboardList, Clock } from 'lucide-react';

interface RecentConsultationsListProps {
  matchedHistoryItems: any[];
  t: any;
}

export const RecentConsultationsList: React.FC<RecentConsultationsListProps> = ({
  matchedHistoryItems,
  t,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-teal-650" />
          <h3 className="text-base font-bold text-slate-800 font-display">
            {t.recentConsultations}
          </h3>
        </div>
        <span className="text-2xs bg-slate-100 text-slate-500 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Registry Match
        </span>
      </div>

      {/* VISIT LISTING */}
      <div className="space-y-3">
        {matchedHistoryItems.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">No previous registration history found.</span>
          </div>
        ) : (
          matchedHistoryItems.map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-50 hover:bg-slate-100/50 transition-colors rounded-2xl border border-slate-200 flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center border border-teal-100">
                  <Clock className="w-4 h-4 text-teal-650" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block">RECORD #{item.id?.slice(-6).toUpperCase() || 'NEW'}</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    Visit Date & Time: {item.patient?.registrationTime || item.date || '—'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-150 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                Checked In
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

