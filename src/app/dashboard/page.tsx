"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  FlaskConical, 
  Settings, 
  Plus,
  MessageSquare,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Bell,
  ChevronRight,
  FileText,
  MapPin,
  Stethoscope,
  RefreshCw,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  Filter,
  Download,
  Eye
} from "lucide-react";
import { INDIAN_TRIALS, INDIAN_PATIENTS, ClinicalTrial, Patient } from "@/lib/clinicalData";

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: string;
}

interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  submittedAt: string;
  status: "pending" | "processing" | "completed";
}

interface MatchedPatient {
  id: string;
  patientId: string;
  patientName: string;
  matchCount: number;
  topMatch: {
    trialId: string;
    trialName: string;
    confidence: number;
  };
  processedAt: string;
}

const mockStats: StatCard[] = [
  {
    title: "Active Trials",
    value: INDIAN_TRIALS.length,
    change: "+5",
    changeType: "up",
    icon: <FlaskConical className="w-6 h-6" strokeWidth={3} />,
    color: "#A7F3D0"
  },
  {
    title: "Patients in Database",
    value: INDIAN_PATIENTS.length,
    change: "+15",
    changeType: "up",
    icon: <Users className="w-6 h-6" strokeWidth={3} />,
    color: "#FFD700"
  },
  {
    title: "Successful Matches",
    value: 12,
    change: "-2",
    changeType: "down",
    icon: <CheckCircle className="w-6 h-6" strokeWidth={3} />,
    color: "#FF6B6B"
  },
  {
    title: "Pending Analysis",
    value: 34,
    change: "+8",
    changeType: "up",
    icon: <Clock className="w-6 h-6" strokeWidth={3} />,
    color: "#FEF7CD"
  }
];

const mockPendingPatients: PatientRecord[] = [
  {
    id: "P-2024-001",
    name: "John D.",
    age: 54,
    gender: "Male",
    diagnosis: "Stage III NSCLC",
    submittedAt: "10:32 AM",
    status: "pending"
  },
  {
    id: "P-2024-002",
    name: "Sarah M.",
    age: 42,
    gender: "Female",
    diagnosis: "Metastatic Breast Cancer",
    submittedAt: "11:15 AM",
    status: "pending"
  },
  {
    id: "P-2024-003",
    name: "Robert K.",
    age: 67,
    gender: "Male",
    diagnosis: "Type 2 Diabetes + CKD",
    submittedAt: "11:45 AM",
    status: "processing"
  },
  {
    id: "P-2024-004",
    name: "Emily W.",
    age: 35,
    gender: "Female",
    diagnosis: "Rheumatoid Arthritis",
    submittedAt: "12:20 PM",
    status: "pending"
  },
  {
    id: "P-2024-005",
    name: "Michael T.",
    age: 58,
    gender: "Male",
    diagnosis: "Prostate Cancer",
    submittedAt: "1:05 PM",
    status: "pending"
  }
];

const mockMatchedPatients: MatchedPatient[] = [
  {
    id: "M-2024-089",
    patientId: "P-2024-089",
    patientName: "Patient_0892",
    matchCount: 3,
    topMatch: {
      trialId: "NCT04532820",
      trialName: "KEYTRUDA Monotherapy",
      confidence: 94
    },
    processedAt: "9:45 AM"
  },
  {
    id: "M-2024-088",
    patientId: "P-2024-088",
    patientName: "Patient_1024",
    matchCount: 2,
    topMatch: {
      trialId: "NCT03234547",
      trialName: "CAR-T Cell Therapy",
      confidence: 87
    },
    processedAt: "9:30 AM"
  },
  {
    id: "M-2024-087",
    patientId: "P-2024-087",
    patientName: "Patient_0745",
    matchCount: 4,
    topMatch: {
      trialId: "NCT02820116",
      trialName: "Immunotherapy Combo",
      confidence: 78
    },
    processedAt: "9:15 AM"
  },
  {
    id: "M-2024-086",
    patientId: "P-2024-086",
    patientName: "Patient_0562",
    matchCount: 1,
    topMatch: {
      trialId: "NCT04189024",
      trialName: "Targeted Therapy",
      confidence: 65
    },
    processedAt: "8:50 AM"
  }
];

export default function CoordinatorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "match-badge-success";
    if (confidence >= 60) return "match-badge-warning";
    return "match-badge-danger";
  };

  const getConfidenceValue = (confidence: number) => {
    if (confidence >= 80) return "#A7F3D0";
    if (confidence >= 60) return "#FFD700";
    return "#FF6B6B";
  };

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise overflow-hidden">
      {/* Fixed dot pattern background */}
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />
      
      {/* Top Header Bar */}
      <header className="relative z-50 bg-black text-white border-b-4 border-black">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
              <Link href="/" className="flex items-center gap-3 hover:opacity-80">
                <Activity className="w-8 h-8 text-lime-green" strokeWidth={3} />
                <div>
                  <h1 className="font-heading text-xl font-black uppercase tracking-tighter">
                    CogniStream
                  </h1>
                  <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest">
                    TrialMatch AI
                  </p>
                </div>
              </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-white/10 border-2 border-white/20 px-3 py-2">
              <Search className="w-4 h-4 text-white/50 mr-2" />
              <input 
                type="text" 
                placeholder="Search patients, trials..." 
                className="bg-transparent border-none outline-none text-sm font-mono placeholder:text-white/30 w-48"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-white/10">
              <Bell className="w-6 h-6" strokeWidth={2} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-hot-coral rounded-full" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-4 border-l-2 border-white/20">
              <div className="w-8 h-8 bg-lime-green border-2 border-white flex items-center justify-center">
                <span className="font-heading font-black text-black text-sm">RC</span>
              </div>
              <div className="hidden sm:block">
                <p className="font-mono text-xs font-bold uppercase">Dr. Sarah</p>
                <p className="font-mono text-[10px] text-white/50">Coordinator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* Sidebar Navigation */}
        <aside 
          className={`fixed lg:static inset-y-0 left-0 z-40 bg-cream border-r-4 border-black transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-0 lg:w-20"
          } overflow-hidden`}
        >
          <nav className="flex flex-col h-full pt-4">
            <div className={`px-4 mb-6 ${!sidebarOpen && "lg:hidden"}`}>
              <h2 className="font-mono text-xs font-bold text-black/40 uppercase tracking-widest mb-4">
                Navigation
              </h2>
            </div>

            <div className="space-y-2 px-2">
              <button
                onClick={() => setActiveNav("dashboard")}
                className={`sidebar-item w-full ${activeNav === "dashboard" ? "sidebar-item-active" : ""}`}
              >
                <LayoutDashboard className="w-5 h-5" strokeWidth={2.5} />
                <span className={!sidebarOpen ? "lg:hidden" : ""}>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveNav("patients")}
                className={`sidebar-item w-full ${activeNav === "patients" ? "sidebar-item-active" : ""}`}
              >
                <Users className="w-5 h-5" strokeWidth={2.5} />
                <span className={!sidebarOpen ? "lg:hidden" : ""}>Patients</span>
              </button>

              <button
                onClick={() => setActiveNav("trials")}
                className={`sidebar-item w-full ${activeNav === "trials" ? "sidebar-item-active" : ""}`}
              >
                <FlaskConical className="w-5 h-5" strokeWidth={2.5} />
                <span className={!sidebarOpen ? "lg:hidden" : ""}>Trials</span>
              </button>

              <Link href="/chat">
                <button className="sidebar-item w-full">
                  <MessageSquare className="w-5 h-5" strokeWidth={2.5} />
                  <span className={!sidebarOpen ? "lg:hidden" : ""}>AI Chat</span>
                </button>
              </Link>

              <button
                onClick={() => setActiveNav("settings")}
                className={`sidebar-item w-full ${activeNav === "settings" ? "sidebar-item-active" : ""}`}
              >
                <Settings className="w-5 h-5" strokeWidth={2.5} />
                <span className={!sidebarOpen ? "lg:hidden" : ""}>Settings</span>
              </button>
            </div>

            {/* Process New Patient Button */}
            <div className="mt-auto p-4">
              <Link href="/pipeline">
                <button className="brutal-btn brutal-btn-primary w-full py-4 flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" strokeWidth={3} />
                  <span className={!sidebarOpen ? "lg:hidden" : ""}>Process New</span>
                </button>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Stats Row */}
          <div className="p-4 md:p-6 border-b-4 border-black bg-cream/50">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {mockStats.map((stat, index) => (
                <div 
                  key={index} 
                  className="stat-card"
                  style={{ borderColor: stat.color === "#FEF7CD" ? "#000" : undefined }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="p-2 border-2 border-black"
                      style={{ backgroundColor: stat.color }}
                    >
                      {React.cloneElement(stat.icon as React.ReactElement<{ className?: string; strokeWidth?: number }>, { 
                        className: "w-5 h-5 stroke-black",
                        strokeWidth: 3 
                      })}
                    </div>
                    {stat.change && (
                      <div className={`flex items-center gap-1 font-mono text-xs font-bold ${
                        stat.changeType === "up" ? "text-lime-green" : "text-hot-coral"
                      }`}>
                        {stat.changeType === "up" ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {stat.change}
                      </div>
                    )}
                  </div>
                  <p className="font-heading text-3xl md:text-4xl font-black tracking-tighter">
                    {stat.value}
                  </p>
                  <p className="font-mono text-xs text-black/50 uppercase tracking-wider mt-1">
                    {stat.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Based on Active Nav */}
          {activeNav === "dashboard" && (
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Left Panel - Pending Patient Records */}
            <div className="flex-1 flex flex-col border-b-4 lg:border-b-0 lg:border-r-4 border-black min-h-[400px]">
              <div className="bg-white px-4 py-3 border-b-4 border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyber-yellow" strokeWidth={3} />
                  <h3 className="font-heading font-black uppercase tracking-tight">
                    Incoming Patient Records
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold bg-black text-white px-2 py-1">
                  {mockPendingPatients.filter(p => p.status === "pending").length} PENDING
                </span>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-brutal p-4 space-y-3">
                {mockPendingPatients.map((patient) => (
                  <div 
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient.id)}
                    className={`patient-card ${
                      selectedPatient === patient.id ? "ring-4 ring-lime-green" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black border-2 border-black flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-lime-green" strokeWidth={3} />
                        </div>
                        <div>
                          <p className="font-heading font-black uppercase text-sm">
                            {patient.id}
                          </p>
                          <p className="font-mono text-xs text-black/50">
                            {patient.name}, {patient.age}y {patient.gender === "Male" ? "M" : "F"}
                          </p>
                        </div>
                      </div>
                      <span className={`match-badge ${
                        patient.status === "pending" ? "bg-cyber-yellow" : 
                        patient.status === "processing" ? "bg-hot-coral animate-pulse" : "bg-lime-green"
                      }`}>
                        {patient.status === "pending" ? "Pending" : 
                         patient.status === "processing" ? "Processing" : "Done"}
                      </span>
                    </div>
                    
                    <div className="bg-cream p-2 border-2 border-black">
                      <p className="font-mono text-xs font-bold text-black/70">
                        {patient.diagnosis}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <p className="font-mono text-[10px] text-black/40">
                        Submitted: {patient.submittedAt}
                      </p>
                      <Link href="/pipeline">
                        <button className="flex items-center gap-1 font-mono text-xs font-bold text-black hover:text-lime-green">
                          Analyze <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel - Recently Matched */}
            <div className="flex-1 flex flex-col min-h-[400px]">
              <div className="bg-lime-green px-4 py-3 border-b-4 border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-black" strokeWidth={3} />
                  <h3 className="font-heading font-black uppercase tracking-tight">
                    Recently Matched
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold bg-black text-lime-green px-2 py-1">
                  {mockMatchedPatients.length} MATCHES
                </span>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-brutal p-4 space-y-3">
                {mockMatchedPatients.map((patient) => (
                  <div key={patient.id} className="patient-card bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyber-yellow border-2 border-black flex items-center justify-center">
                          <FileText className="w-5 h-5 text-black" strokeWidth={3} />
                        </div>
                        <div>
                          <p className="font-heading font-black uppercase text-sm">
                            {patient.patientId}
                          </p>
                          <p className="font-mono text-xs text-black/50">
                            {patient.patientName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[10px] text-black/40">
                          {patient.matchCount} trials matched
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-100 p-3 border-2 border-black">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] text-black/50 uppercase">
                          Top Match
                        </span>
                        <span className={`match-badge ${getConfidenceColor(patient.topMatch.confidence)}`}>
                          {patient.topMatch.confidence}%
                        </span>
                      </div>
                      <p className="font-heading font-black text-sm leading-tight">
                        {patient.topMatch.trialName}
                      </p>
                      <p className="font-mono text-xs text-black/60 mt-1">
                        {patient.topMatch.trialId}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <p className="font-mono text-[10px] text-black/40">
                        Processed: {patient.processedAt}
                      </p>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1 font-mono text-xs font-bold bg-black text-white px-2 py-1 border-2 border-black hover:bg-lime-green hover:text-black transition-colors">
                          <TrendingUp className="w-3 h-3" /> View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Patients View */}
          {activeNav === "patients" && (
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <div className="bg-white border-brutal shadow-brutal mb-6">
                <div className="bg-black px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-lime-green" strokeWidth={3} />
                    <h3 className="font-heading font-black uppercase text-white">
                      Patient Database
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 font-mono text-xs font-bold bg-white text-black px-3 py-2 border-2 border-white hover:bg-lime-green">
                      <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button className="flex items-center gap-2 font-mono text-xs font-bold bg-white text-black px-3 py-2 border-2 border-white hover:bg-lime-green">
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-mono text-sm mb-4">
                    <span className="font-bold">{INDIAN_PATIENTS.length}</span> patients in database
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-black">
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">ID</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Age/Gender</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Location</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Diagnosis</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Stage</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">ECOG</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {INDIAN_PATIENTS.slice(0, 15).map((patient) => (
                          <tr key={patient.id} className="border-b border-black/10 hover:bg-cream">
                            <td className="py-2 font-mono text-xs font-bold">{patient.id}</td>
                            <td className="py-2 font-mono text-xs">{patient.age}/{patient.gender.charAt(0)}</td>
                            <td className="py-2 font-mono text-xs">{patient.city}, {patient.state}</td>
                            <td className="py-2 font-mono text-xs">{patient.diagnosis}</td>
                            <td className="py-2 font-mono text-xs">{patient.stage}</td>
                            <td className="py-2 font-mono text-xs">{patient.ecogStatus}</td>
                            <td className="py-2">
                              <Link href="/results">
                                <button className="font-mono text-xs font-bold bg-black text-white px-2 py-1 hover:bg-lime-green hover:text-black">
                                  Match
                                </button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trials View */}
          {activeNav === "trials" && (
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <div className="bg-white border-brutal shadow-brutal mb-6">
                <div className="bg-lime-green px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-black" strokeWidth={3} />
                    <h3 className="font-heading font-black uppercase text-black">
                      Clinical Trials Database
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 font-mono text-xs font-bold bg-black text-white px-3 py-2 border-2 border-black hover:bg-cyber-yellow hover:text-black">
                      <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button className="flex items-center gap-2 font-mono text-xs font-bold bg-black text-white px-3 py-2 border-2 border-black hover:bg-cyber-yellow hover:text-black">
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-mono text-sm mb-4">
                    <span className="font-bold">{INDIAN_TRIALS.length}</span> trials in database
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-black">
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">NCT ID</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Title</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Phase</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Status</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Sponsor</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Location</th>
                          <th className="text-left py-2 font-heading font-black uppercase text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {INDIAN_TRIALS.slice(0, 15).map((trial) => (
                          <tr key={trial.id} className="border-b border-black/10 hover:bg-cream">
                            <td className="py-2 font-mono text-xs font-bold">{trial.trialId}</td>
                            <td className="py-2 font-mono text-xs max-w-xs truncate">{trial.title}</td>
                            <td className="py-2 font-mono text-xs">{trial.phase}</td>
                            <td className="py-2">
                              <span className={`font-mono text-xs font-bold px-2 py-1 ${
                                trial.status === "Recruiting" ? "bg-lime-green" : "bg-cyber-yellow"
                              }`}>
                                {trial.status}
                              </span>
                            </td>
                            <td className="py-2 font-mono text-xs">{trial.sponsor}</td>
                            <td className="py-2 font-mono text-xs">{trial.locations[0]?.city}, {trial.locations[0]?.state}</td>
                            <td className="py-2">
                              <Link href="/results">
                                <button className="font-mono text-xs font-bold bg-black text-white px-2 py-1 hover:bg-lime-green hover:text-black">
                                  View
                                </button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeNav === "settings" && (
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <div className="bg-white border-brutal shadow-brutal mb-6">
                <div className="bg-[#111] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyber-yellow" strokeWidth={3} />
                    <h3 className="font-heading font-black uppercase text-white">
                      System Settings
                    </h3>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="font-heading font-black uppercase mb-3">API Configuration</h4>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex justify-between items-center p-3 bg-cream border-2 border-black">
                        <span>Google Maps API</span>
                        <span className="text-lime-green font-bold">Connected</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-cream border-2 border-black">
                        <span>Mistral API</span>
                        <span className="text-lime-green font-bold">Connected</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-cream border-2 border-black">
                        <span>Groq API</span>
                        <span className="text-lime-green font-bold">Connected</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-heading font-black uppercase mb-3">Database</h4>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex justify-between items-center p-3 bg-cream border-2 border-black">
                        <span>Total Patients</span>
                        <span className="font-bold">{INDIAN_PATIENTS.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-cream border-2 border-black">
                        <span>Total Trials</span>
                        <span className="font-bold">{INDIAN_TRIALS.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="bg-white px-6 py-4 border-t-4 border-black flex items-center justify-between">
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-lime-green rounded-full animate-pulse" />
                <span className="font-mono text-xs font-bold">System Online</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-black/50" />
                <span className="font-mono text-xs text-black/50">Last sync: 2 min ago</span>
              </div>
            </div>
            
            <Link href="/pipeline">
              <button className="brutal-btn brutal-btn-primary px-8 py-4 text-lg flex items-center gap-3">
                <Plus className="w-6 h-6" strokeWidth={3} />
                Process New Patient Record
              </button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
