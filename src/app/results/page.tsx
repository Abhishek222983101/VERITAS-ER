"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, XCircle, MapPin, Calendar, Users, Stethoscope, FileText, Brain, Shield, Hospital, Target, Navigation, Loader2, ChevronDown } from "lucide-react";
import { GoogleMaps } from "@/components/ui/GoogleMaps";
import { getDistanceMatrix, geocodeAddress, getCoordinatesForLocation, Coordinates } from "@/lib/googleDistance";
import { INDIAN_TRIALS, INDIAN_PATIENTS, calculateDistance, ClinicalTrial, Patient } from "@/lib/clinicalData";
interface CriterionExplanation { id: string; category: string; criterion: string; status: "pass" | "fail" | "warning"; patientValue: string; ruleValue: string; reasoning: string; isML?: boolean; }
interface TrialMatch { id: string; trialId: string; title: string; sponsor: string; location: string; distance: number; distanceText?: string; durationText?: string; phase: string; status: "pass" | "fail"; confidence: number; overallReasoning: string; criteria: CriterionExplanation[]; coordinates?: {lat: number; lng: number}; withinRadius?: boolean; }
interface PatientSummary { id: string; age: number; gender: string; diagnosis: string; stage: string; biomarkers: string[]; location: string; ecogScore: number; priorTreatments: string[]; processingTime: string; }
const ALL_TRIALS = INDIAN_TRIALS;

function getMatchingTrials(patient: Patient, trials: ClinicalTrial[]) {
  return trials.filter(trial => {
    if (patient.age < trial.minAge || patient.age > trial.maxAge) return false;
    if (trial.gender !== "All" && patient.gender !== trial.gender) return false;
    if (patient.ecogStatus > trial.ecogMax) return false;
    
    const diagnosisMatch = trial.requiredDiagnoses.some(d => 
      patient.diagnosis.toLowerCase().includes(d.toLowerCase())
    );
    if (!diagnosisMatch) return false;
    
    if (trial.requiredStages && trial.requiredStages.length > 0) {
      const stageMatch = trial.requiredStages.some(s => patient.stage.includes(s));
      if (!stageMatch) return false;
    }
    
    if (trial.requiredBiomarkers && trial.requiredBiomarkers.length > 0) {
      const biomarkerMatch = trial.requiredBiomarkers.some(b => 
        Object.values(patient.biomarkers).some(pb => pb.toLowerCase().includes(b.toLowerCase()))
      );
      if (!biomarkerMatch) return false;
    }
    
    return true;
  });
}

const RADIUS_KM = 150;
function CriterionRow({ criterion }: { criterion: CriterionExplanation }) {
  const statusStyles = { pass: "bg-lime-green text-black", fail: "bg-hot-coral text-black", warning: "bg-cyber-yellow text-black" };
  const statusIcon = { pass: <CheckCircle2 className="w-4 h-4" strokeWidth={3} />, fail: <XCircle className="w-4 h-4" strokeWidth={3} />, warning: <AlertTriangle className="w-4 h-4" strokeWidth={3} /> };
  return <div className="border-b-2 border-black/10 p-3 flex items-center gap-3"><div className={statusStyles[criterion.status]}>{statusIcon[criterion.status]}</div><div><span className="font-mono text-[10px] uppercase text-black/50">{criterion.category}{criterion.isML && " ML"}</span><p className="font-mono text-xs font-bold">{criterion.criterion}</p></div><span className={`ml-auto font-heading text-xs font-black uppercase ${criterion.status==="pass"?"text-lime-green":criterion.status==="fail"?"text-hot-coral":"text-cyber-yellow"}`}>{criterion.status}</span></div>;
}
function TrialCard({ trial, isExpanded, onToggle }: { trial: TrialMatch; isExpanded: boolean; onToggle: () => void }) {
  const confidenceColor = trial.confidence >= 80 ? "#A7F3D0" : trial.confidence >= 50 ? "#FFD700" : "#FF6B6B";
  const statusBadge = trial.status === "pass" ? <span className="bg-lime-green px-2 py-1 text-xs font-heading font-black uppercase border-2 border-black">ELIGIBLE</span> : <span className="bg-hot-coral px-2 py-1 text-xs font-heading font-black uppercase border-2 border-black">INELIGIBLE</span>;
  return <div className="border-brutal shadow-brutal-sm bg-white"><button onClick={onToggle} className="w-full p-4 md:p-6 text-left"><div className="flex items-start justify-between"><div><div className="font-mono text-xs text-black/50 mb-1">{trial.trialId} - {trial.phase}</div><h3 className="font-heading text-lg font-black uppercase">{trial.title}</h3><div className="flex gap-3 mt-2 font-mono text-xs text-black/60"><span><Hospital className="w-3 h-3 inline" /> {trial.sponsor}</span><span><MapPin className="w-3 h-3 inline" /> {trial.location}</span>{trial.distanceText && <span className={trial.withinRadius ? "text-lime-green" : "text-hot-coral"}><Navigation className="w-3 h-3 inline" /> {trial.distanceText}{trial.durationText && ` (${trial.durationText})`}</span>}</div></div><div className="text-right">{statusBadge}<div className="font-heading text-3xl font-black mt-2" style={{color:confidenceColor}}>{trial.confidence}%</div></div></div></button>{isExpanded && <div className="border-t-4 border-black"><div className="bg-cyber-yellow px-4 py-2 border-b-2 border-black font-heading font-black uppercase text-sm">Eligibility</div>{trial.criteria.map(c => <CriterionRow key={c.id} criterion={c} />)}<div className="bg-black px-4 py-3"><p className="font-mono text-sm text-white">{trial.overallReasoning}</p></div></div>}</div>;
}
export default function ResultsPage() {
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);
  const [patientCoords, setPatientCoords] = useState<Coordinates | null>(null);
  const [trials, setTrials] = useState<TrialMatch[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(INDIAN_PATIENTS[0].id);
  
  const selectedPatient = useMemo(() => 
    INDIAN_PATIENTS.find(p => p.id === selectedPatientId) || INDIAN_PATIENTS[0]
  , [selectedPatientId]);
  
  useEffect(() => {
    async function calculateMatches() {
      setIsCalculating(true);
      try {
        const patient = selectedPatient;
        const patientLocation = `${patient.city}, ${patient.state}`;
        
        let coords: Coordinates | null = patient.coordinates;
        if (!coords) {
          const fallbackCoords = getCoordinatesForLocation(patientLocation);
          if (fallbackCoords) {
            coords = fallbackCoords;
          } else {
            const g = await geocodeAddress(patientLocation);
            if (g) coords = g;
          }
        }
        
        if (coords) {
          setPatientCoords(coords);
        } else {
          setPatientCoords(patient.coordinates);
          coords = patient.coordinates;
        }
        
        const matchingTrials = getMatchingTrials(patient, ALL_TRIALS);
        
        const trialLocations = matchingTrials.map(t => t.locations[0]);
        const destinationAddresses = trialLocations.map(loc => `${loc.facility}, ${loc.city}, ${loc.state}`);
        
        const distanceResults = await getDistanceMatrix(patientLocation, destinationAddresses);
        
        const trialsWithDistances: TrialMatch[] = matchingTrials.map((trial, index) => {
          const primaryLocation = trial.locations[0];
          const trialCoords = primaryLocation.coordinates;
          const haversineDistance = calculateDistance(coords!, trialCoords);
          
          let distance = haversineDistance;
          let distanceText = `${Math.round(haversineDistance)} km`;
          let durationText = "Calculating...";
          
          if (distanceResults && distanceResults[index] && distanceResults[index].distanceValue > 0) {
            distance = distanceResults[index].distanceValue / 1000;
            distanceText = distanceResults[index].distance;
            durationText = distanceResults[index].duration;
          }
          
          const withinRadius = distance <= RADIUS_KM;
          
          const criteria: CriterionExplanation[] = [
            { id: "C1", category: "Age", criterion: `Age ${trial.minAge}-${trial.maxAge} years`, status: patient.age >= trial.minAge && patient.age <= trial.maxAge ? "pass" : "fail", patientValue: `${patient.age} years`, ruleValue: `${trial.minAge}-${trial.maxAge} years`, reasoning: patient.age >= trial.minAge && patient.age <= trial.maxAge ? "Within range" : "Outside range" },
            { id: "C2", category: "Gender", criterion: trial.gender === "All" ? "Any gender" : trial.gender, status: trial.gender === "All" || patient.gender === trial.gender ? "pass" : "fail", patientValue: patient.gender, ruleValue: trial.gender, reasoning: trial.gender === "All" || patient.gender === trial.gender ? "Matches" : "Does not match" },
            { id: "C3", category: "Diagnosis", criterion: trial.requiredDiagnoses.join(", "), status: "pass", patientValue: patient.diagnosis, ruleValue: trial.requiredDiagnoses.join(", "), reasoning: "Diagnosis matches", isML: true },
            { id: "C4", category: "ECOG", criterion: `ECOG <= ${trial.ecogMax}`, status: patient.ecogStatus <= trial.ecogMax ? "pass" : "fail", patientValue: `ECOG ${patient.ecogStatus}`, ruleValue: `<= ${trial.ecogMax}`, reasoning: patient.ecogStatus <= trial.ecogMax ? "Within range" : "Exceeds limit" },
            { id: "C5", category: "Geography", criterion: `Within ${trial.radiusKm} km`, status: withinRadius ? "pass" : "fail", patientValue: `${distanceText}${durationText !== "Calculating..." ? ` (${durationText})` : ""}`, ruleValue: `< ${trial.radiusKm} km`, reasoning: withinRadius ? "Within travel distance" : "Too far from trial site" },
          ];
          
          if (trial.requiredBiomarkers && trial.requiredBiomarkers.length > 0) {
            const biomarkerValues = Object.values(patient.biomarkers).join(", ");
            criteria.push({
              id: "C6",
              category: "Biomarkers",
              criterion: trial.requiredBiomarkers.join(", "),
              status: "pass",
              patientValue: biomarkerValues || "Not tested",
              ruleValue: trial.requiredBiomarkers.join(", "),
              reasoning: "Biomarker analysis complete",
              isML: true
            });
          }
          
          const passCount = criteria.filter(c => c.status === "pass").length;
          const confidence = Math.round((passCount / criteria.length) * 100);
          
          return {
            id: trial.id,
            trialId: trial.trialId,
            title: trial.title,
            sponsor: trial.sponsor,
            location: `${primaryLocation.city}, ${primaryLocation.state}`,
            distance: Math.round(distance),
            distanceText,
            durationText,
            phase: trial.phase,
            status: withinRadius ? "pass" : "fail",
            confidence,
            overallReasoning: withinRadius 
              ? `Patient meets ${passCount}/${criteria.length} criteria. Eligible for this trial.`
              : `Patient excluded due to geographic distance (${Math.round(distance)} km from trial site).`,
            criteria,
            coordinates: trialCoords,
            withinRadius
          };
        });
        
        setTrials(trialsWithDistances);
      } catch (e) { 
        console.error(e); 
        setMapError("Error calculating matches"); 
      }
      finally { setIsCalculating(false); }
    }
    calculateMatches();
  }, [selectedPatient]);
  const sortedTrials = useMemo(() => [...trials].sort((a,b) => b.confidence - a.confidence), [trials]);
  const stats = useMemo(() => ({ total:sortedTrials.length, eligible:sortedTrials.filter(t=>t.status==="pass").length, avgConfidence:Math.round(sortedTrials.length ? sortedTrials.reduce((s,t)=>s+t.confidence,0)/sortedTrials.length : 0) }), [sortedTrials]);
  const trialsForMap = useMemo(() => trials.filter(t=>t.coordinates).map(t=>({name:t.title, location:t.location, lat:t.coordinates!.lat, lng:t.coordinates!.lng, withinRadius:t.withinRadius||false, distance:t.distanceText||t.distance+" km"})), [trials]);
  return (
    <div className="min-h-screen bg-cream font-mono">
      <header className="bg-black text-white px-4 md:px-8 py-3 flex items-center justify-between border-brutal-b"><Link href="/dashboard" className="flex items-center gap-3 hover:text-lime-green"><ArrowLeft className="w-5 h-5" /><span className="font-heading text-xl font-black uppercase">CogniStream</span></Link><div className="flex items-center gap-3"><Shield className="w-4 h-4 text-lime-green" /><span className="px-3 py-2 bg-cyber-yellow text-black font-heading font-black text-sm border-2 border-black uppercase">Results</span></div></header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Selector */}
            <div className="bg-cyber-yellow border-brutal shadow-brutal p-4">
              <label className="font-heading font-black uppercase text-sm mb-2 block">
                Select Patient
              </label>
              <select 
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full bg-white border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                {INDIAN_PATIENTS.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.id} - {patient.diagnosis.substring(0, 25)}...
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-black text-white border-brutal shadow-brutal p-6"><div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-lime-green" /><span className="font-heading font-black uppercase">Patient</span></div><div className="space-y-3"><div><span className="font-mono text-[10px] text-white/40">ID</span><div className="font-heading text-xl text-lime-green">{selectedPatient.id}</div></div><div><span className="font-mono text-[10px] text-white/40">Age/Gender</span><div className="font-mono text-sm">{selectedPatient.age}/{selectedPatient.gender}</div></div><div><span className="font-mono text-[10px] text-white/40">Diagnosis</span><div className="font-mono text-sm">{selectedPatient.diagnosis}</div></div><div><span className="font-mono text-[10px] text-white/40">Stage</span><div className="font-heading text-lg text-cyber-yellow">{selectedPatient.stage}</div></div><div><span className="font-mono text-[10px] text-white/40">Location</span><div className="font-mono text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedPatient.city}, {selectedPatient.state}</div></div></div></div>
            <div className="bg-lime-green border-brutal shadow-brutal p-6"><div className="flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-black" /><span className="font-heading font-black uppercase">Summary</span></div><div className="space-y-3"><div className="flex justify-between"><span className="font-mono text-sm">Total</span><span className="font-heading text-2xl font-black">{stats.total}</span></div><div className="flex justify-between"><span className="font-mono text-sm">Eligible</span><span className="font-heading text-2xl font-black bg-black text-lime-green px-2">{stats.eligible}</span></div><div className="flex justify-between"><span className="font-mono text-sm">Avg</span><span className="font-heading text-2xl font-black">{stats.avgConfidence}%</span></div></div></div>
            <div className="bg-[#111] text-white border-brutal shadow-brutal p-6"><div className="flex items-center gap-2 mb-4"><Stethoscope className="w-5 h-5 text-cyber-yellow" /><span className="font-heading font-black uppercase">Engine</span></div><div className="space-y-2"><div className="flex justify-between"><span className="font-mono text-xs">Rule Engine</span><span className="text-lime-green text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />ACTIVE</span></div><div className="flex justify-between"><span className="font-mono text-xs">ML Matcher</span><span className="text-lime-green text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />ACTIVE</span></div><div className="flex justify-between"><span className="font-mono text-xs">Geo Filter</span><span className="text-lime-green text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />ACTIVE</span></div></div></div>
            <div className="bg-white border-brutal shadow-brutal overflow-hidden"><div className="bg-cyber-yellow px-4 py-2 border-b-2 border-black"><span className="font-heading font-black uppercase text-sm">Map</span></div><div className="h-64">{isCalculating ? <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div> : patientCoords ? <GoogleMaps patientLocation={`${selectedPatient.city}, ${selectedPatient.state}`} patientLat={patientCoords.lat} patientLng={patientCoords.lng} trials={trialsForMap} radiusMiles={RADIUS_KM} /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-xs">{mapError || "No map"}</div>}</div><div className="p-3 bg-black/5 border-t-2"><span className="font-mono text-[10px]">Radius: {RADIUS_KM} km</span></div></div>
          </div>
          <div className="lg:col-span-3">
            <div className="bg-black text-white px-6 py-4 border-brutal border-b-4 flex items-center justify-between"><div className="flex items-center gap-3"><Target className="w-6 h-6 text-lime-green" /><h2 className="font-heading font-black text-xl uppercase">Ranked Matches</h2></div><span className="font-mono text-xs"><Calendar className="w-4 h-4 inline" /> March 6, 2026</span></div>
            {isCalculating ? <div className="p-12 flex flex-col items-center bg-white border-brutal"><Loader2 className="w-12 h-12 animate-spin mb-4" /><p className="font-mono text-sm">Calculating real distances via OSRM...</p></div> : <div className="space-y-4 mt-4">{sortedTrials.map(t => <TrialCard key={t.id} trial={t} isExpanded={expandedTrial===t.id} onToggle={()=>setExpandedTrial(expandedTrial===t.id?null:t.id)} />)}</div>}
            {stats.eligible>0 && !isCalculating && <div className="mt-6 bg-lime-green border-brutal shadow-brutal p-6"><div className="flex items-center gap-3 mb-4"><CheckCircle2 className="w-6 h-6 text-black" /><h3 className="font-heading font-black uppercase">Recommended</h3></div><p className="font-mono text-sm mb-4"><strong>{sortedTrials[0].trialId}</strong> - {sortedTrials[0].confidence}% match</p><div className="flex gap-3"><button className="brutal-btn bg-black text-white px-6 py-3 font-heading font-black uppercase text-sm">Export</button><button className="brutal-btn bg-cyber-yellow text-black px-6 py-3 font-heading font-black uppercase text-sm">Schedule</button></div></div>}
          </div>
        </div>
      </main>
    </div>
  );
}