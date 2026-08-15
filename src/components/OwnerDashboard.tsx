import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Lock, 
  Terminal, 
  Users, 
  CheckCircle, 
  Flame, 
  FileCheck, 
  Globe, 
  Database, 
  Code2, 
  Layers, 
  TrendingUp, 
  Check, 
  Calendar,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Download,
  Search,
  Activity,
  Eye,
  EyeOff,
  Power
} from 'lucide-react';
import { ConsultHistoryItem, Patient } from '../types';

interface OwnerDashboardProps {
  patient: Patient | null;
  historyItems: ConsultHistoryItem[];
  language: 'english' | 'telugu';
  onDeletePatient?: (id: string) => void;
  onDeduplicatePatients?: () => void;
  userRole?: 'user' | 'owner';
  onAuthSuccess?: (role: 'user' | 'owner') => void;
  onLogout?: () => void;
  accessToken: string;
  setAccessToken: (token: string) => void;
}

export default function OwnerDashboard({ 
  patient, 
  historyItems, 
  language,
  onDeletePatient,
  onDeduplicatePatients,
  userRole = 'user',
  onAuthSuccess,
  onLogout,
  accessToken,
  setAccessToken
}: OwnerDashboardProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [adminUser, setAdminUser] = useState<any>(null);
  
  const isAuthenticated = !!accessToken;
  const [activeTab, setActiveTab] = useState<'realtime' | 'logs' | 'trash'>('realtime');
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Search, audit log and health status states
  const [searchQuery, setSearchQuery] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch health diagnostics
      fetch("/api/health")
        .then(res => res.json())
        .then(data => setHealthStatus(data))
        .catch(() => {});

      // Fetch audit logs
      fetch("/api/admin/audit-logs", {
        headers: { "Authorization": `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAuditLogs(data);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, accessToken]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
      }
      setAccessToken(data.accessToken);
      setAdminUser(data.user);
      onAuthSuccess?.('owner');
    } catch (err) {
      // Offline fallback verification when network is disconnected or server is offline
      if (username === "admin1" && password === "password123") {
        setAccessToken("offline-access-token-admin1");
        setAdminUser({ username: "admin1", role: "clinicAdmin", clinicId: "clinic-0001" });
        onAuthSuccess?.('owner');
      } else if (username === "superadmin" && password === "adminpassword") {
        setAccessToken("offline-access-token-superadmin");
        setAdminUser({ username: "superadmin", role: "superAdmin", clinicId: "*" });
        onAuthSuccess?.('owner');
      } else {
        setAuthError("Server connection lost & invalid offline credentials");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { 
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
    } catch(e) {}
    setAccessToken("");
    setAdminUser(null);
    onAuthSuccess?.('user');
    onLogout?.();
  };

  const handleDeduplicate = async () => {
    if (!onDeduplicatePatients) return;
    setIsDeduplicating(true);
    try {
      await onDeduplicatePatients();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeduplicating(false);
    }
  };

  const handleExportCSV = () => {
    // Escaping helper that can force text formatting in Excel to prevent data distortion (e.g. scientific notation, date bugs, dropping leading zeros)
    const escapeCSV = (val: any, forceText = false) => {
      if (val === null || val === undefined) return '';
      let str = String(val).trim();
      
      if (forceText && str !== '') {
        // Double internal double quotes inside the Excel formula ="value"
        str = str.replace(/"/g, '""');
        return `="${str}"`;
      }
      
      // Standard CSV escaping
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = `"${str}"`;
      }
      return str;
    };

    // Columns headers
    const headers = [
      "Patient ID",
      "Full Name",
      "First Name",
      "Last Name",
      "DOB",
      "Age",
      "Gender",
      "Contact Number",
      "Email",
      "Address",
      "ID Document Type",
      "ID Document Number",
      "Government Employee Status",
      "Pre-existing Conditions",
      "Registration Date",
      "Total Visits",
      "Last Visit Date"
    ];

    // Build rows
    const rows = historyItems.map(item => {
      const p = item.patient;
      const totalVisits = historyItems.filter(h => h.patient.uniqueId === p.uniqueId).length;
      
      // Grab last consultation details if they exist
      const lastReport = item.report;
      const lastDiagnosis = lastReport?.suspectedDiagnosis || "";
      const lastSpecialist = lastReport?.specialist || "";
      const lastUrgency = lastReport?.urgencyLevel || "";
      
      const advisoriesList: string[] = [];
      if (lastReport?.remedies) advisoriesList.push(...lastReport.remedies);
      if (lastReport?.precautions) advisoriesList.push(...lastReport.precautions);
      const advisories = advisoriesList.join("; ");

      return [
        escapeCSV(p.uniqueId || "", true),          // Patient ID (force text to preserve leading zeros)
        escapeCSV(p.fullName || ""),
        escapeCSV(p.firstName || ""),
        escapeCSV(p.lastName || ""),
        escapeCSV(p.dob || "", true),               // DOB (force text to prevent conversion that renders as ###)
        escapeCSV(p.age !== null && p.age !== undefined ? String(p.age) : ""),
        escapeCSV(p.gender || ""),
        escapeCSV(p.contactNumber || "", true),     // Contact Number (force text to prevent scientific notation)
        escapeCSV(p.email || ""),
        escapeCSV(p.address || ""),
        escapeCSV(p.idType || "Aadhaar"),
        escapeCSV(p.idNumber || "", true),          // ID Document Number (force text to prevent scientific notation)
        escapeCSV(p.isGovEmployee ? "Yes" : "No"),
        escapeCSV(p.preexistingConditions || ""),
        escapeCSV(p.registrationTime || item.date || ""),
        escapeCSV(String(totalVisits)),
        escapeCSV(item.date || "")
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create Blob and download with UTF-8 BOM
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MediVoice_Kiosk_Registry_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (!onDeletePatient) return;
    if (window.confirm(language === 'telugu' ? 'ఈ రోగి రికార్డును తొలగించాలనుకుంటున్నారా?' : 'Are you sure you want to delete this patient record? (It will be soft-deleted and can be restored from the Trash Bin)')) {
      setDeletingId(id);
      try {
        // Pass the auth token dynamically via headers from App.tsx handler
        await onDeletePatient(id);
      } catch (e) {
        console.error(e);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      const res = await fetch(`/api/patients/${id}/restore`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to restore record");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRestoringId(null);
    }
  };

  // Internal monthly registry state
  const [selectedMonth, setSelectedMonth] = useState<string>("All Months");

  // Helper to extract long month and year
  const getRegistrationMonth = (item: ConsultHistoryItem) => {
    const dateStr = item.patient.registrationTime || item.date || "";
    if (!dateStr) return "May 2026";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    } catch (e) {}

    const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 0; i < 12; i++) {
      if (dateStr.includes(monthsList[i]) || dateStr.includes(shortMonths[i])) {
        const yearMatch = dateStr.match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
        return `${monthsList[i]} ${year}`;
      }
    }

    // fallback custom parser for "5/30/2026"
    const parts = dateStr.split("/");
    if (parts.length >= 3) {
      const mIdx = parseInt(parts[0], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        const year = parts[2].split(",")[0].trim();
        return `${monthsList[mIdx]} ${year}`;
      }
    }
    return "May 2026";
  };

  // Stats & Tabs Filtering logic
  const activeItems = historyItems.filter(h => !h.deleted && !(h.patient && h.patient.deleted));
  const trashItems = historyItems.filter(h => h.deleted || (h.patient && h.patient.deleted));

  const totalPatientsCount = activeItems.length;

  const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const todaysRegistrationsCount = activeItems.filter(h => {
    const regTime = h.patient.registrationTime || h.date || "";
    return regTime.includes(todayStr) || h.date === todayStr;
  }).length;

  const uniqueActiveIds = new Set(activeItems.map(h => h.patient.uniqueId).filter(Boolean));
  const returningCount = Array.from(uniqueActiveIds).filter(uid => {
    return historyItems.filter(h => h.patient.uniqueId === uid).length > 1;
  }).length;

  const totalConsultationsCount = historyItems.length;

  // Monthly breakdown keys
  const months = ["All Months", ...Array.from(new Set(activeItems.map(getRegistrationMonth)))];

  // Base list depending on active sub-tab
  const baseItemsList = activeTab === 'trash' ? trashItems : activeItems;

  const monthlyFiltered = selectedMonth === "All Months" 
    ? baseItemsList 
    : baseItemsList.filter(item => getRegistrationMonth(item) === selectedMonth);

  // Real-time search query filter matching Name, Phone, Aadhaar, or Patient ID
  const filteredItems = monthlyFiltered.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const p = item.patient;
    const matchesName = (p.fullName || "").toLowerCase().includes(q) || 
                        (p.firstName || "").toLowerCase().includes(q) || 
                        (p.lastName || "").toLowerCase().includes(q);
    const matchesPhone = (p.contactNumber || "").includes(q);
    const matchesAadhaar = (p.idNumber || "").includes(q);
    const matchesId = (p.uniqueId || "").toLowerCase().includes(q) || 
                      (p.uniqueId ? `med-${p.uniqueId}`.toLowerCase().includes(q) : false);
    return matchesName || matchesPhone || matchesAadhaar || matchesId;
  });

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-12 animate-fade-in">
        <div className="glass-panel p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-rose-600 mx-auto border border-slate-800">
            <Lock className="w-8 h-8 animate-pulse text-amber-500" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold font-display text-slate-800 tracking-tight">
              {language === 'telugu' ? 'యజమాని లాగిన్ (Owner Secure Access)' : 'Owner / Admin Portal'}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {language === 'telugu' ? 'నిర్వహణ ఆధారాలు సమర్పించండి' : 'Enter administrative credentials to unlock Live Registry'}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Username</label>
              <input
                type="text"
                required
                placeholder="admin1"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm font-medium"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-[10px] text-rose-500 font-bold animate-shake uppercase tracking-wider text-center">
                ❌ {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer mt-2"
            >
              Verify Administrative Credentials
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in relative z-10">
      
      {/* Owner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-teal-600" />
            <span className="bg-teal-50 text-teal-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
              Kiosk Registry Panel
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display text-slate-800 tracking-tight mt-1">
            Registered Patients Database Monitor
          </h1>
        </div>

        {/* Status Indicators & Deduplicate/Export Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>{language === 'telugu' ? 'ఎక్సెల్ డౌన్‌లోడ్' : 'Export to Excel'}</span>
          </button>
          <button
            onClick={handleDeduplicate}
            disabled={isDeduplicating}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>{isDeduplicating ? (language === 'telugu' ? 'శుద్ధిచేస్తోంది...' : 'Deduplicating...') : (language === 'telugu' ? 'నకిలీల తొలగింపు' : 'Deduplicate Database')}</span>
          </button>
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Local Database Stream Connected
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Power className="w-3.5 h-3.5 text-white" />
            <span>{language === 'telugu' ? 'లాగ్అవుట్' : 'Logout Admin'}</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Patients */}
        <div className="bg-slate-900 text-slate-50 p-5 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-md text-left">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-teal-450">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">
              Active Patients
            </span>
            <span className="text-2xl font-bold font-mono text-teal-400">
              {String(totalPatientsCount).padStart(4, '0')}
            </span>
          </div>
        </div>

        {/* Card 2: Today's Registrations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm text-left">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Today's Registrations
            </span>
            <span className="text-2xl font-extrabold font-mono text-slate-800">
              {todaysRegistrationsCount}
            </span>
          </div>
        </div>

        {/* Card 3: Returning Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm text-left">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
            <RefreshCw className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Returning Patients
            </span>
            <span className="text-2xl font-extrabold font-mono text-slate-800">
              {returningCount}
            </span>
          </div>
        </div>

        {/* Card 4: Total Consultations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm text-left">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Total Sessions Run
            </span>
            <span className="text-2xl font-extrabold font-mono text-slate-800">
              {totalConsultationsCount}
            </span>
          </div>
        </div>

      </div>

      {/* System Diagnostics Health Status (Feature 12) */}
      {healthStatus && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700 shadow-2xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
            <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500">System Diagnostics:</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>Database: <span className="font-bold">{healthStatus.services?.database}</span></div>
            <div>AI Service: <span className="font-bold">{healthStatus.services?.ai}</span></div>
            <div>Storage Provider: <span className="font-bold">{healthStatus.services?.storage}</span></div>
            <div>Network: <span className="font-bold">{healthStatus.services?.internet}</span></div>
          </div>
        </div>
      )}

      {/* Active Patient Session Profile Card (Moved from Dashboard) */}
      {patient && (
        <div className="bg-gradient-to-r from-sky-900 to-teal-900 text-white p-6 rounded-3xl border border-teal-800 shadow-md animate-fade-in relative overflow-hidden text-left my-6">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-md text-teal-200">
                  Active Kiosk Session Profile
                </span>
                <h3 className="text-lg font-bold font-display text-white tracking-tight mt-1">
                  {patient.fullName}
                </h3>
              </div>
              <span className="text-[10px] bg-teal-500/30 text-teal-200 font-bold px-2 py-1 rounded border border-teal-500/20 font-mono">
                MED-{patient.uniqueId || 'ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {patient.photoUrl ? (
                    <img 
                      src={patient.photoUrl} 
                      alt={patient.fullName} 
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-teal-600 font-black text-lg flex items-center justify-center shadow-md">
                      {patient.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-teal-300 uppercase font-bold tracking-wider">Contact Number</p>
                    <p className="text-sm font-bold font-mono">{patient.contactNumber}</p>
                    <p className="text-[10px] text-teal-200/80 font-mono font-medium">{patient.email || 'No email registered'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-[9px] text-teal-300 uppercase font-bold tracking-wider">Age / Sex</p>
                  <p className="font-bold text-white mt-0.5">{patient.age || '—'} years / {patient.gender}</p>
                </div>
                <div>
                  <p className="text-[9px] text-teal-300 uppercase font-bold tracking-wider">Preferred Language</p>
                  <p className="font-bold text-teal-200 uppercase tracking-wider mt-0.5">{patient.preferredLanguage}</p>
                </div>
                <div>
                  <p className="text-[9px] text-teal-300 uppercase font-bold tracking-wider">Gov Employee</p>
                  <p className="font-bold text-teal-200 mt-0.5">{patient.isGovEmployee ? 'Yes (Welfare Match)' : 'No'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-teal-300 uppercase font-bold tracking-wider">ID Document Reference</p>
                  <p className="font-bold text-white mt-0.5 font-mono">{patient.idType || 'Aadhaar'}: {patient.idNumber || '—'}</p>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[9px] text-teal-300 uppercase font-bold tracking-wider block">
                    Pre-existing Conditions
                  </span>
                  <p className="text-xs text-white/95 font-semibold mt-0.5">{patient.preexistingConditions || 'None registered'}</p>
                </div>
                <div>
                  <span className="text-[9px] text-teal-300 uppercase font-bold tracking-wider block">
                    Stated Symptoms
                  </span>
                  <p className="text-xs text-teal-105 italic font-medium mt-0.5">"{patient.currentSymptoms || 'None described'}"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tabs Selector and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('realtime'); setSelectedMonth('All Months'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'realtime'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Live Registry ({activeItems.length})
          </button>
          
          <button
            onClick={() => { setActiveTab('logs'); setSelectedMonth('All Months'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'logs'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>

          <button
            onClick={() => { setActiveTab('trash'); setSelectedMonth('All Months'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              activeTab === 'trash'
                ? 'bg-rose-900 border-rose-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash Bin ({trashItems.length})</span>
          </button>
        </div>

        {/* Search input with live filter updates (Feature 6) */}
        {activeTab !== 'logs' && (
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search Name, Phone, Aadhaar, ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium text-slate-800 shadow-3xs"
            />
          </div>
        )}
      </div>

      {/* Monthly wise layout selector */}
      {activeTab !== 'logs' && (
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Monthly Intake Records Organizer
          </h3>

          <div className="flex flex-wrap gap-2 pb-1">
            {months.map(m => {
              const count = m === "All Months" 
                ? baseItemsList.length 
                : baseItemsList.filter(item => getRegistrationMonth(item) === m).length;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                    selectedMonth === m
                      ? 'bg-teal-600 border-teal-600 text-white shadow-sm font-extrabold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 shadow-3xs'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{m}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                    selectedMonth === m ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          
          {/* Render Active Patients Table / Trash Bin */}
          {activeTab !== 'logs' ? (
            <>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  {activeTab === 'trash' ? (
                    <>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>{language === 'telugu' ? 'తొలగించబడిన రికార్డులు (Trash Bin)' : 'Soft-Deleted Patient Records'}</span>
                    </>
                  ) : (
                    <span>{selectedMonth === "All Months" ? "All Patient Entries List" : `Recordings Filed in ${selectedMonth}`}</span>
                  )}
                </h2>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-1 rounded">
                  {filteredItems.length} patient{filteredItems.length !== 1 ? 's' : ''} listed
                </span>
              </div>

              <div className="overflow-x-auto text-left">
                <table className="w-full text-xs font-medium">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                      <th className="py-3 px-5">ID</th>
                      <th className="py-3 px-5">Name</th>
                      <th className="py-3 px-5">Clinic ID</th>
                      <th className="py-3 px-5">Age / Birth</th>
                      <th className="py-3 px-5">ID Ref Choices</th>
                      <th className="py-3 px-5">State Worker</th>
                      <th className="py-3 px-5">Registration Date / System Time</th>
                      <th className="py-3 px-5">Stated Symptoms</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item, index) => {
                      const patientObj = item.patient;
                      const customSequentialId = patientObj.uniqueId || `000${index + 1}`.slice(-4);
                      const formattedDate = item.date || 'Today';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-5 font-mono text-teal-605 font-bold whitespace-nowrap">
                            MED-{customSequentialId}
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">
                            <div className="flex items-center gap-3">
                              {patientObj.photoUrl ? (
                                <img 
                                  src={patientObj.photoUrl} 
                                  alt={patientObj.fullName} 
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-3xs"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold font-sans">
                                  {patientObj.fullName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span>{patientObj.fullName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap font-mono">
                            <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded text-[10px] font-bold border border-sky-100">
                              {patientObj.clinicId || 'clinic-0001'}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div>
                              {patientObj.age ? `${patientObj.age} yrs` : '--'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {patientObj.dob || 'N/A'}
                            </div>
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span className="bg-slate-105 text-slate-700 px-2 py-1 rounded text-[10px] font-bold font-mono border border-slate-205">
                              {patientObj.idType || 'Aadhaar'}
                            </span>
                          </td>
                          <td className="py-4 px-5 lowercase whitespace-nowrap">
                            {patientObj.isGovEmployee ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                Yes (Welfare Match)
                              </span>
                            ) : (
                              <span className="text-slate-455 text-[11px]">No</span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-slate-500 whitespace-nowrap">
                            <div className="flex items-center gap-1 font-mono">
                              <span>{patientObj.registrationTime || formattedDate}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-slate-550 max-w-xs truncate" title={patientObj.currentSymptoms}>
                            {patientObj.currentSymptoms}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {activeTab === 'trash' ? (
                              <button
                                onClick={() => handleRestore(item.id)}
                                disabled={restoringId === item.id}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition-colors border border-emerald-200 cursor-pointer disabled:bg-emerald-100/50 flex items-center gap-1.5 ml-auto"
                                title="Restore Patient Record"
                              >
                                {restoringId === item.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                <span>Restore</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-200 cursor-pointer disabled:bg-rose-100/50"
                                title="Delete Record"
                              >
                                {deletingId === item.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredItems.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    No patient entries found.
                  </div>
                )}
              </div>
            </>
          ) : (
            // Render Audit Logs List (Feature 3)
            <>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-teal-650" />
                  <span>Security & Action Audit Trail Logs</span>
                </h2>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-1 rounded">
                  {auditLogs.length} events logged
                </span>
              </div>

              <div className="overflow-x-auto text-left">
                <table className="w-full text-xs font-medium">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                      <th className="py-3 px-5">Timestamp</th>
                      <th className="py-3 px-5">User</th>
                      <th className="py-3 px-5">Clinic</th>
                      <th className="py-3 px-5">Role</th>
                      <th className="py-3 px-5">Action</th>
                      <th className="py-3 px-5">Details</th>
                      <th className="py-3 px-5 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => {
                      let actionColor = "bg-slate-100 text-slate-700";
                      if (log.action === "LOGIN" || log.action === "PATIENT_RESTORE") actionColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                      if (log.action === "LOGIN_FAILED" || log.action === "PATIENT_DELETE") actionColor = "bg-rose-100 text-rose-800 border-rose-200";
                      if (log.action.startsWith("EXPORT")) actionColor = "bg-amber-100 text-amber-800 border-amber-200";

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-800">{log.userId}</td>
                          <td className="py-4 px-5 font-mono text-[10px] text-slate-600">{log.clinicId}</td>
                          <td className="py-4 px-5 text-slate-650">{log.role}</td>
                          <td className="py-4 px-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border font-mono ${actionColor}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-slate-700 leading-normal max-w-sm truncate" title={log.details}>
                            {log.details}
                          </td>
                          <td className="py-4 px-5 text-right font-mono text-slate-500 whitespace-nowrap">{log.ipAddress}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {auditLogs.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    No security audit logs recorded yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

    </div>
  );
}
