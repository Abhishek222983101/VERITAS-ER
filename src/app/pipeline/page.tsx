"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Upload, 
  Shield, 
  Brain, 
  MapPin, 
  Server, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  ArrowDown,
  FileJson,
  File,
  X,
  RefreshCw,
  Cpu,
  Database,
  Globe,
  Zap
} from "lucide-react";

type PipelineStep = "upload" | "anonymize" | "processing" | "complete";

interface ProcessingLog {
  id: number;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
}

const SAMPLE_PATIENT_RECORD = `PATIENT HEALTH RECORD
========================

Patient Name: John Michael Davidson
Date of Birth: March 15, 1970
SSN: 123-45-6789
Address: 742 Evergreen Terrace, Springfield, IL 62701
Phone: (217) 555-0142
Email: j.davidson@email.com

MEDICAL HISTORY
---------------
Primary Diagnosis: Stage III Non-Small Cell Lung Cancer (NSCLC)
Date of Diagnosis: January 2024
Treating Physician: Dr. Sarah Mitchell
Hospital: Memorial Hospital of Springfield

VITAL SIGNS
-----------
Age: 54 years
Weight: 165 lbs
Height: 5'10"
Blood Type: O+

LAB RESULTS
-----------
EGFR Mutation: Positive (Exon 19 Deletion)
PD-L1 Expression: 80%
Carcinoembryonic Antigen (CEA): 4.2 ng/mL

MEDICATIONS
-----------
- Carboplatin (adjuvant, completed 2021)
- Pemetrexed (adjuvant, completed 2021)

ALLERGIES
---------
- Penicillin (rash)
- Sulfa drugs

ECOG PERFORMANCE STATUS: 0`;

const anonymizeText = (text: string): string => {
  let anonymized = text;
  
  anonymized = anonymized.replace(/John Michael Davidson/g, '[REDACTED_NAME]');
  anonymized = anonymized.replace(/March 15, 1970/g, '[REDACTED_DOB]');
  anonymized = anonymized.replace(/123-45-6789/g, '[REDACTED_SSN]');
  anonymized = anonymized.replace(/742 Evergreen Terrace, Springfield, IL 62701/g, '[REDACTED_ADDRESS]');
  anonymized = anonymized.replace(/\(217\) 555-0142/g, '[REDACTED_PHONE]');
  anonymized = anonymized.replace(/j\.davidson@email\.com/g, '[REDACTED_EMAIL]');
  anonymized = anonymized.replace(/Sarah Mitchell/g, '[REDACTED_PHYSICIAN]');
  anonymized = anonymized.replace(/Memorial Hospital of Springfield/g, '[REDACTED_HOSPITAL]');
  
  return anonymized;
};

const initialLogs: ProcessingLog[] = [
  { id: 1, message: "Initializing CogniStream TrialMatch Engine v2.4.1...", type: "info", timestamp: "00:00.001" },
  { id: 2, message: "Loading patient record...", type: "info", timestamp: "00:00.245" },
  { id: 3, message: "Record loaded successfully. Size: 1.2KB", type: "success", timestamp: "00:00.512" },
  { id: 4, message: "Starting NLP criteria extraction...", type: "info", timestamp: "00:01.003" },
];

const engineLogs: ProcessingLog[] = [
  { id: 5, message: "NLP Parser: Extracted 12 criteria from 142 active trials", type: "success", timestamp: "00:02.145" },
  { id: 6, message: "Rule Engine: Evaluating hard criteria (age, stage, ECOG)...", type: "info", timestamp: "00:02.678" },
  { id: 7, message: "Rule Engine: Age 54 ✓ Pass (required: 18-75)", type: "success", timestamp: "00:02.891" },
  { id: 8, message: "Rule Engine: Stage III ✓ Pass (required: III, IV)", type: "success", timestamp: "00:02.994" },
  { id: 9, message: "Rule Engine: ECOG 0 ✓ Pass (required: 0-1)", type: "success", timestamp: "00:03.127" },
  { id: 10, message: "Geographic Filter: Querying trial locations within 200mi...", type: "info", timestamp: "00:03.456" },
  { id: 11, message: "Geo API: Found 23 trials within radius", type: "success", timestamp: "00:03.891" },
  { id: 12, message: "ML Engine: Loading fine-tuned TrialMatch-7B model...", type: "info", timestamp: "00:04.123" },
  { id: 13, message: "ML Engine: Semantic matching for 8 semantic criteria...", type: "info", timestamp: "00:04.567" },
  { id: 14, message: "ML: 'EGFR exon 19 deletion' → 'EGFR mutation positive' = 94%", type: "success", timestamp: "00:05.234" },
  { id: 15, message: "ML: 'Stage III NSCLC' → 'Non-Small Cell Lung Cancer' = 98%", type: "success", timestamp: "00:05.567" },
  { id: 16, message: "ML: 'Adjuvant chemo 2021' → 'No prior systemic therapy' = 87%", type: "success", timestamp: "00:05.891" },
  { id: 17, message: "Computing weighted ensemble score...", type: "info", timestamp: "00:06.123" },
  { id: 18, message: "Score: 94.2% | Trial: NCT04532820 | KEYTRUDA Monotherapy", type: "success", timestamp: "00:06.456" },
  { id: 19, message: "Score: 78.4% | Trial: NCT03234547 | CAR-T Cell Therapy", type: "success", timestamp: "00:06.678" },
  { id: 20, message: "Score: 45.1% | Trial: NCT02820116 | Immunotherapy Combo", type: "warning", timestamp: "00:06.891" },
  { id: 21, message: "Analysis complete. 3 trials matched.", type: "success", timestamp: "00:07.012" },
];

export default function PipelinePage() {
  const [currentStep, setCurrentStep] = useState<PipelineStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [anonymizeProgress, setAnonymizeProgress] = useState(0);
  const [highlightedText, setHighlightedText] = useState(SAMPLE_PATIENT_RECORD);
  const [showOriginal, setShowOriginal] = useState(true);
  const [processingLogs, setProcessingLogs] = useState<ProcessingLog[]>(initialLogs);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapPulse, setMapPulse] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/json" || file.type === "application/pdf")) {
      setUploadedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  }, []);

  const startAnonymization = useCallback(() => {
    if (!uploadedFile) return;
    setCurrentStep("anonymize");
    setShowOriginal(true);
    setAnonymizeProgress(0);

    const interval = setInterval(() => {
      setAnonymizeProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowOriginal(false);
            setTimeout(() => {
              startProcessing();
            }, 1500);
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  }, [uploadedFile]);

  const startProcessing = useCallback(() => {
    setCurrentStep("processing");
    setIsProcessing(true);
    setMapPulse(true);

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < engineLogs.length) {
        setProcessingLogs(prev => [...prev, engineLogs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(logInterval);
        setIsProcessing(false);
        setMapPulse(false);
        setTimeout(() => {
          setCurrentStep("complete");
        }, 1000);
      }
    }, 400);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [processingLogs]);

  const getLogColor = (type: ProcessingLog["type"]) => {
    switch (type) {
      case "success": return "text-lime-green";
      case "warning": return "text-cyber-yellow";
      case "error": return "text-hot-coral";
      default: return "text-white/70";
    }
  };

  const steps = [
    { step: 1, label: "Upload", icon: Upload, status: currentStep === "upload" ? "active" : "completed" },
    { step: 2, label: "Anonymize", icon: Shield, status: currentStep === "anonymize" ? "active" : (currentStep === "upload" ? "pending" : "completed") },
    { step: 3, label: "Processing", icon: Brain, status: currentStep === "processing" ? "active" : (["upload", "anonymize"].includes(currentStep) ? "pending" : "completed") },
    { step: 4, label: "Results", icon: FileText, status: currentStep === "complete" ? "completed" : "pending" }
  ];

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise overflow-hidden flex flex-col">
      {/* Fixed dot pattern */}
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />
      
      {/* Header */}
      <header className="relative z-50 bg-black text-white px-4 md:px-8 py-3 flex items-center justify-between border-b-4 border-black shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 hover:text-lime-green transition-colors"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
          <span className="font-heading text-lg md:text-2xl font-black uppercase tracking-tighter">
            CogniStream
          </span>
        </Link>

        {/* Step Indicators */}
        <div className="hidden md:flex items-center gap-2">
          {steps.map((s, i) => (
            <React.Fragment key={s.step}>
              <div 
                className={`
                  flex items-center gap-2 px-3 py-1 border-2 
                  ${s.status === "completed" ? "bg-lime-green border-lime-green text-black" : 
                    s.status === "active" ? "bg-cyber-yellow border-cyber-yellow text-black" : 
                    "bg-black border-white/30 text-white/50"}
                `}
              >
                {s.status === "completed" ? (
                  <CheckCircle className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <s.icon className="w-4 h-4" strokeWidth={3} />
                )}
                <span className="font-mono text-xs font-bold uppercase">{s.label}</span>
              </div>
              {i < 3 && <ArrowRight className="w-4 h-4 text-white/30" />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 border-2 ${
            isProcessing ? "border-cyber-yellow bg-cyber-yellow" : 
            currentStep === "complete" ? "border-lime-green bg-lime-green" :
            "border-white/30"
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              isProcessing ? "bg-black animate-pulse" : 
              currentStep === "complete" ? "bg-black" :
              "bg-white/30"
            }`} />
            <span className="font-mono text-xs font-bold uppercase text-black">
              {isProcessing ? "Processing" : currentStep === "complete" ? "Complete" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-hidden p-4 md:p-6">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          
          {/* STEP A: UPLOAD */}
          {currentStep === "upload" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-heading text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
                Upload Patient Record
              </h1>
              <p className="font-mono text-lg text-black/60 mb-8">
                Drag and drop a patient record (JSON or PDF)
              </p>

              <div 
                className={`
                  w-full max-w-2xl border-4 border-dashed p-12 text-center transition-all duration-300
                  ${isDragging ? "border-lime-green bg-lime-green/20 scale-105" : "border-black bg-white"}
                  ${uploadedFile ? "border-solid border-lime-green bg-lime-green/10" : ""}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {uploadedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-lime-green border-4 border-black flex items-center justify-center mb-4 shadow-brutal">
                      {uploadedFile.type === "application/json" ? (
                        <FileJson className="w-10 h-10" strokeWidth={3} />
                      ) : (
                        <File className="w-10 h-10" strokeWidth={3} />
                      )}
                    </div>
                    <p className="font-heading font-black text-xl uppercase mb-2">{uploadedFile.name}</p>
                    <p className="font-mono text-sm text-black/50 mb-4">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    <button 
                      onClick={() => setUploadedFile(null)}
                      className="flex items-center gap-2 font-mono text-sm text-hot-coral hover:underline"
                    >
                      <X className="w-4 h-4" /> Remove file
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-16 h-16 mx-auto mb-4 text-black/30" strokeWidth={2} />
                    <p className="font-heading font-black text-xl uppercase mb-2">
                      Drop file here
                    </p>
                    <p className="font-mono text-sm text-black/40 mb-6">or</p>
                    <label className="brutal-btn brutal-btn-warning px-8 py-3 cursor-pointer inline-flex">
                      <input 
                        type="file" 
                        accept=".json,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      Browse Files
                    </label>
                  </>
                )}
              </div>

              <button 
                onClick={startAnonymization}
                disabled={!uploadedFile}
                className={`brutal-btn brutal-btn-primary px-12 py-4 text-xl mt-8 flex items-center gap-3 ${
                  !uploadedFile ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Start Processing <ArrowRight className="w-6 h-6" strokeWidth={3} />
              </button>
            </div>
          )}

          {/* STEP B: ANONYMIZATION */}
          {currentStep === "anonymize" && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter">
                  Live Anonymization
                </h1>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-black/60">Progress:</span>
                  <div className="w-48 h-6 bg-white border-4 border-black">
                    <div 
                      className="h-full bg-lime-green transition-all duration-100"
                      style={{ width: `${anonymizeProgress}%` }}
                    />
                  </div>
                  <span className="font-heading font-black">{anonymizeProgress}%</span>
                </div>
              </div>

              <div className="flex-1 grid md:grid-cols-2 gap-6 min-h-0">
                {/* Original Text */}
                <div className="flex flex-col">
                  <div className="bg-white border-4 border-black p-3 flex items-center justify-between">
                    <span className="font-heading font-black uppercase">Original Record</span>
                    <span className="match-badge bg-hot-coral">Contains PII</span>
                  </div>
                  <div className="flex-1 bg-white border-4 border-t-0 border-black p-6 overflow-auto scrollbar-brutal font-mono text-sm whitespace-pre-wrap">
                    {SAMPLE_PATIENT_RECORD}
                  </div>
                </div>

                {/* Anonymized Text */}
                <div className="flex flex-col">
                  <div className="bg-lime-green border-4 border-black p-3 flex items-center justify-between">
                    <span className="font-heading font-black uppercase">Anonymized Record</span>
                    <span className="match-badge bg-lime-green">
                      {anonymizeProgress < 100 ? "Processing..." : "Secured"}
                    </span>
                  </div>
                  <div className="flex-1 bg-white border-4 border-t-0 border-black p-6 overflow-auto scrollbar-brutal font-mono text-sm whitespace-pre-wrap relative">
                    {anonymizeProgress < 100 && showOriginal && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                        <RefreshCw className="w-8 h-8 animate-spin text-black" strokeWidth={3} />
                      </div>
                    )}
                    <span className={showOriginal ? "opacity-0" : ""}>
                      {anonymizeText(SAMPLE_PATIENT_RECORD)}
                    </span>
                    {anonymizeProgress < 100 && showOriginal && (
                      <div className="absolute inset-0 pointer-events-none">
                        {SAMPLE_PATIENT_RECORD.split('\n').map((line, lineIdx) => (
                          <div key={lineIdx} className="flex">
                            {line.split(' ').map((word, wordIdx) => {
                              const isPII = /John Michael Davidson|March 15|123-45-6789|742 Evergreen|Springfield|555-0142|j\.davidson|Sarah Mitchell|Memorial Hospital/i.test(word);
                              return (
                                <span 
                                  key={wordIdx}
                                  className={`
                                    relative
                                    ${anonymizeProgress > lineIdx * 3 ? "animate-pulse bg-cyber-yellow/50" : ""}
                                  `}
                                >
                                  {word}{' '}
                                </span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Anonymization Legend */}
              <div className="mt-6 bg-white border-4 border-black p-4">
                <p className="font-heading font-black uppercase mb-3">Detected & Redacted:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Names", color: "bg-hot-coral" },
                    { label: "DOB", color: "bg-cyber-yellow" },
                    { label: "SSN", color: "bg-lime-green" },
                    { label: "Address", color: "bg-hot-coral" },
                    { label: "Phone", color: "bg-cyber-yellow" },
                    { label: "Email", color: "bg-lime-green" },
                    { label: "Physician", color: "bg-hot-coral" },
                    { label: "Hospital", color: "bg-cyber-yellow" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 border-2 border-black ${item.color}`} />
                      <span className="font-mono text-xs font-bold">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP C: PROCESSING ENGINE */}
          {currentStep === "processing" && (
            <div className="flex-1 flex flex-col">
              <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter mb-6">
                AI Engine Processing
              </h1>

              <div className="flex-1 grid lg:grid-cols-2 gap-6 min-h-0">
                {/* Terminal Window */}
                <div className="flex flex-col">
                  <div className="bg-black border-4 border-black p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-hot-coral" />
                        <div className="w-3 h-3 rounded-full bg-cyber-yellow" />
                        <div className="w-3 h-3 rounded-full bg-lime-green" />
                      </div>
                      <span className="font-mono text-sm text-white/70 ml-2">CogniStream Engine Terminal</span>
                    </div>
                    <Cpu className="w-5 h-5 text-lime-green animate-pulse" strokeWidth={3} />
                  </div>
                  <div 
                    ref={terminalRef}
                    className="flex-1 bg-[#0a0a0a] border-4 border-t-0 border-black p-4 overflow-auto scrollbar-brutal font-mono text-sm"
                  >
                    {processingLogs.map((log) => (
                      <div key={log.id} className="mb-1 flex gap-3">
                        <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
                        <span className={getLogColor(log.type)}>{log.message}</span>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-cyber-yellow">
                        <span>_</span>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Map Visualization */}
                <div className="flex flex-col">
                  <div className="bg-black border-4 border-black p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-cyber-yellow" strokeWidth={3} />
                      <span className="font-mono text-sm text-white/70">Geographic Filter</span>
                    </div>
                    <MapPin className={`w-5 h-5 text-hot-coral ${mapPulse ? "animate-bounce" : ""}`} strokeWidth={3} />
                  </div>
                  <div className="flex-1 bg-slate-800 border-4 border-t-0 border-black relative overflow-hidden">
                    {/* Abstract Map Background */}
                    <div className="absolute inset-0 bg-grid-pattern-dark opacity-30" />
                    
                    {/* Map Grid Lines */}
                    <svg className="absolute inset-0 w-full h-full opacity-20">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Patient Location */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className={`relative ${mapPulse ? "animate-ping" : ""}`}>
                        <div className="w-4 h-4 bg-lime-green border-2 border-black rounded-full" />
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 font-mono text-xs text-white font-bold whitespace-nowrap">
                          Patient Location
                        </div>
                      </div>
                    </div>

                    {/* Trial Locations */}
                    {[
                      { name: "Trial A", x: 30, y: 40, distance: "12 mi", match: true },
                      { name: "Trial B", x: 70, y: 30, distance: "45 mi", match: true },
                      { name: "Trial C", x: 20, y: 70, distance: "89 mi", match: true },
                      { name: "Trial D", x: 80, y: 75, distance: "156 mi", match: false },
                      { name: "Trial E", x: 50, y: 20, distance: "210 mi", match: false },
                    ].map((trial, i) => (
                      <div 
                        key={i}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${trial.x}%`, top: `${trial.y}%` }}
                      >
                        <div className={`relative ${mapPulse && i < 3 ? "animate-pulse" : ""}`}>
                          <MapPin 
                            className={`w-6 h-6 ${trial.match ? "text-lime-green" : "text-hot-coral/50"}`} 
                            strokeWidth={3} 
                            fill={trial.match ? "currentColor" : "none"}
                          />
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            <span className={`font-mono text-[10px] font-bold ${trial.match ? "text-lime-green" : "text-hot-coral/50"}`}>
                              {trial.distance}
                            </span>
                          </div>
                        </div>
                        {mapPulse && i < 3 && (
                          <svg className="absolute inset-0 w-32 h-32 -z-10">
                            <circle 
                              cx="12" 
                              cy="12" 
                              r="30" 
                              fill="none" 
                              stroke={trial.match ? "#A7F3D0" : "#FF6B6B"} 
                              strokeWidth="1" 
                              strokeDasharray="4 4"
                              className="animate-spin"
                              style={{ animationDuration: '3s' }}
                            />
                          </svg>
                        )}
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-black/80 border-2 border-white/20 p-3">
                      <p className="font-mono text-[10px] text-white/50 uppercase mb-2">Legend</p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-lime-green" />
                          <span className="font-mono text-xs text-white/70">Within Radius</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-hot-coral/50" />
                          <span className="font-mono text-xs text-white/70">Outside Radius</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing Components */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Database, label: "NLP Parser", status: "active" },
                  { icon: Server, label: "Rule Engine", status: "active" },
                  { icon: Brain, label: "ML Matcher", status: "active" },
                  { icon: MapPin, label: "Geo Filter", status: "active" },
                ].map((component) => (
                  <div key={component.label} className="bg-white border-4 border-black p-4 flex items-center gap-3">
                    <component.icon className={`w-8 h-8 ${component.status === "active" ? "text-lime-green animate-pulse" : "text-black/30"}`} strokeWidth={3} />
                    <div>
                      <p className="font-heading font-black uppercase text-sm">{component.label}</p>
                      <p className="font-mono text-xs text-lime-green">{component.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP D: COMPLETE */}
          {currentStep === "complete" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-lime-green border-4 border-black flex items-center justify-center mb-8 shadow-brutal-lg animate-bounce">
                <CheckCircle className="w-16 h-16 text-black" strokeWidth={3} />
              </div>
              
              <h1 className="font-heading text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                Processing Complete
              </h1>
              
              <p className="font-mono text-xl text-black/60 mb-8">
                3 clinical trials matched for this patient
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/results">
                  <button className="brutal-btn brutal-btn-success px-12 py-4 text-xl flex items-center gap-3">
                    View Match Results <ArrowRight className="w-6 h-6" strokeWidth={3} />
                  </button>
                </Link>
                
                <Link href="/dashboard">
                  <button className="brutal-btn bg-white px-8 py-4 text-lg">
                    Back to Dashboard
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
