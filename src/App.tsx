import React, { useState, useEffect } from 'react';
import { Shield, FileText, History, Upload, CheckCircle, Loader2, Save } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type View = 'audit' | 'vault';
type Verdict = 'Pending' | 'Verified ✅' | 'Rejected ❌';

interface AuditEntry {
  category: string;
  evidence: string;
  isCompliant: boolean;
  aiAnalysis: string;
  draftedClause: string;
  verdict: Verdict;
  notes: string;
}

interface SavedAudit {
  id: string;
  date: string;
  vendor: string;
  jurisdictions: string;
  category: string;
  evidence: string;
  is_compliant: number;
  ai_analysis: string;
  drafted_clause: string;
  verdict: string;
  notes: string;
}

const AVAILABLE_JURISDICTIONS = [
  "EU (GDPR)",
  "UK (UK GDPR)",
  "California (CCPA/CPRA)",
  "Virginia (VCDPA)",
  "Colorado (CPA)",
  "Utah (UCPA)",
  "Connecticut (CTDPA)",
  "All 50 US States"
];

export default function App() {
  const [currentView, setCurrentView] = useState<View>('audit');
  
  // Audit State
  const [vendor, setVendor] = useState('');
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>(['EU (GDPR)', 'California (CCPA/CPRA)']);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditEntry[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Vault State
  const [vaultData, setVaultData] = useState<SavedAudit[]>([]);
  const [isLoadingVault, setIsLoadingVault] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const executeAudit = async () => {
    if (!file || !vendor || selectedJurisdictions.length === 0) return;
    
    setIsProcessing(true);
    setAuditResults(null);
    setSaveSuccess(false);

    try {
      const base64Pdf = await fileToBase64(file);
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Pdf
                }
              },
              {
                text: `You are a Senior Privacy Counsel and Forensic Clause Auditor. Analyze the provided Data Processing Agreement (DPA) PDF. Extract verbatim operative clauses regarding:\n1. Scope, Nature, and Purpose of Processing\n2. Types of Personal Data and Categories of Data Subjects\n3. Confidentiality Obligations\n4. Security Measures (Technical and Organizational)\n5. Sub-processing Restrictions\n6. Assistance with Data Subject Rights (DSARs)\n7. Breach Notification Timelines\n8. Audit and Inspection Rights\n9. Data Deletion or Return (End of Contract)\n10. De-identification and Anonymization\n\nFor category 10 (De-identification and Anonymization), act as a Senior Privacy Risk Analyst. Evaluate the section against GDPR Recital 26 and CCPA Section 1798.140 using these criteria:\n- Irreversibility (40% weight): Search for 'Permanent', 'Irreversible', 'Technical means'. If absent, flag as High Risk.\n- Legal Commitment (30% weight): Search for 'No attempt to re-identify', 'Prohibit linking'. If missing, mark as Non-Compliant.\n- Methodology (20% weight): Search for 'Noise addition', 'Generalization', 'Differential privacy'.\n- Contextual Risk (10% weight): Search for 'All available info', 'External data', 'Universe'.\n\nApply these specific 'Flag' Triggers for category 10:\n- 'HIPAA Trap': If 'Safe Harbor' or '18 identifiers' found, include: 'Warning: Vendor is using a static 20-year-old checklist. This does not meet the GDPR standard for anonymization or the CCPA standard for preventing linkability.'\n- 'Pseudonymization Confusion': If 'Pseudonymization' found, include: 'Note: Vendor is using pseudonymization. Ensure the DPA includes strict 'Key Management' and 'Access Control' clauses, as this data remains within the scope of GDPR/CCPA.'\n- 'AI-Impact': If 'Fuzzy matching' or 'Unstructured data' found, include: 'Risk Alert: DPA lacks protections against AI-driven re-identification. Recommend adding a clause regarding periodic external re-identification assessments.'\n\nFor each category, you must perform a rigorous compliance check specifically against the following jurisdictions: ${selectedJurisdictions.join(', ')}. Do not miss any single word that could be a loophole in ANY of these selected jurisdictions. Identify any potential issues, risks, ambiguities, or missing elements specific to these laws. Return the verbatim clause, a boolean indicating overall compliance with the selected jurisdictions, your detailed forensic analysis, and a drafted compliant replacement clause that resolves any identified issues or serves as a gold-standard baseline.`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scope: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Scope, Nature, and Purpose of Processing" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              data_types: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Types of Personal Data and Categories of Data Subjects" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              confidentiality: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Confidentiality Obligations" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              security: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Security Measures" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              subprocessing: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Sub-processing Restrictions" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              dsar_assistance: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Assistance with DSARs" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              breach: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Breach Notification Timelines" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              audit_rights: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Audit and Inspection Rights" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              deletion: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for Data Deletion or Return" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              },
              anonymization: {
                type: Type.OBJECT,
                properties: {
                  clause: { type: Type.STRING, description: "Verbatim clause for De-identification and Anonymization" },
                  isCompliant: { type: Type.BOOLEAN, description: "Overall compliance status" },
                  analysis: { type: Type.STRING, description: "Rigorous forensic analysis of the clause, highlighting loopholes, missing words, or risks." },
                  draftedClause: { type: Type.STRING, description: "A drafted, fully compliant replacement clause." }
                },
                required: ["clause", "isCompliant", "analysis", "draftedClause"]
              }
            },
            required: ["scope", "data_types", "confidentiality", "security", "subprocessing", "dsar_assistance", "breach", "audit_rights", "deletion", "anonymization"]
          },
          temperature: 0
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        setAuditResults([
          { 
            category: '1. Scope, Nature, and Purpose', 
            evidence: parsed.scope?.clause || 'Not found.', 
            isCompliant: parsed.scope?.isCompliant || false,
            aiAnalysis: parsed.scope?.analysis || 'No analysis provided.',
            draftedClause: parsed.scope?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '2. Data Types and Subjects', 
            evidence: parsed.data_types?.clause || 'Not found.', 
            isCompliant: parsed.data_types?.isCompliant || false,
            aiAnalysis: parsed.data_types?.analysis || 'No analysis provided.',
            draftedClause: parsed.data_types?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '3. Confidentiality Obligations', 
            evidence: parsed.confidentiality?.clause || 'Not found.', 
            isCompliant: parsed.confidentiality?.isCompliant || false,
            aiAnalysis: parsed.confidentiality?.analysis || 'No analysis provided.',
            draftedClause: parsed.confidentiality?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '4. Security Measures', 
            evidence: parsed.security?.clause || 'Not found.', 
            isCompliant: parsed.security?.isCompliant || false,
            aiAnalysis: parsed.security?.analysis || 'No analysis provided.',
            draftedClause: parsed.security?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '5. Sub-processing Restrictions', 
            evidence: parsed.subprocessing?.clause || 'Not found.', 
            isCompliant: parsed.subprocessing?.isCompliant || false,
            aiAnalysis: parsed.subprocessing?.analysis || 'No analysis provided.',
            draftedClause: parsed.subprocessing?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '6. Assistance with DSARs', 
            evidence: parsed.dsar_assistance?.clause || 'Not found.', 
            isCompliant: parsed.dsar_assistance?.isCompliant || false,
            aiAnalysis: parsed.dsar_assistance?.analysis || 'No analysis provided.',
            draftedClause: parsed.dsar_assistance?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '7. Breach Notification Timelines', 
            evidence: parsed.breach?.clause || 'Not found.', 
            isCompliant: parsed.breach?.isCompliant || false,
            aiAnalysis: parsed.breach?.analysis || 'No analysis provided.',
            draftedClause: parsed.breach?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '8. Audit and Inspection Rights', 
            evidence: parsed.audit_rights?.clause || 'Not found.', 
            isCompliant: parsed.audit_rights?.isCompliant || false,
            aiAnalysis: parsed.audit_rights?.analysis || 'No analysis provided.',
            draftedClause: parsed.audit_rights?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '9. Data Deletion or Return', 
            evidence: parsed.deletion?.clause || 'Not found.', 
            isCompliant: parsed.deletion?.isCompliant || false,
            aiAnalysis: parsed.deletion?.analysis || 'No analysis provided.',
            draftedClause: parsed.deletion?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          },
          { 
            category: '10. De-identification and Anonymization', 
            evidence: parsed.anonymization?.clause || 'Not found.', 
            isCompliant: parsed.anonymization?.isCompliant || false,
            aiAnalysis: parsed.anonymization?.analysis || 'No analysis provided.',
            draftedClause: parsed.anonymization?.draftedClause || 'No draft provided.',
            verdict: 'Pending', 
            notes: '' 
          }
        ]);
      }
    } catch (error) {
      console.error("Audit failed:", error);
      alert("Failed to analyze the document. Please ensure it's a valid PDF and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateAuditEntry = (index: number, field: keyof AuditEntry, value: string) => {
    setAuditResults(prev => {
      if (!prev) return prev;
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], [field]: value };
      return newResults;
    });
  };

  const saveToVault = async () => {
    if (!auditResults) return;
    if (!vendor) {
      alert("Please enter a Vendor Name before saving.");
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const auditId = Math.random().toString(36).substring(2, 10);
      const dateNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      const payload = auditResults.map((entry, idx) => ({
        id: `${auditId}-${idx}`,
        date: dateNow,
        vendor,
        jurisdictions: selectedJurisdictions.join(', '),
        category: entry.category,
        evidence: entry.evidence || '',
        is_compliant: entry.isCompliant ? 1 : 0,
        ai_analysis: entry.aiAnalysis || '',
        drafted_clause: entry.draftedClause || '',
        verdict: entry.verdict || 'Pending',
        notes: entry.notes || ''
      }));

      // Alternative: Save to LocalStorage instead of backend
      const existingData = localStorage.getItem('enterprise_vault');
      const currentVault = existingData ? JSON.parse(existingData) : [];
      const updatedVault = [...payload, ...currentVault]; // Add new items to the top
      
      localStorage.setItem('enterprise_vault', JSON.stringify(updatedVault));
      setSaveSuccess(true);
      
    } catch (error: any) {
      console.error("Save failed:", error);
      setSaveError(error.message || "Failed to save audit to local storage.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadVault = async () => {
    setIsLoadingVault(true);
    try {
      // Alternative: Load from LocalStorage instead of backend
      const existingData = localStorage.getItem('enterprise_vault');
      const data = existingData ? JSON.parse(existingData) : [];
      setVaultData(data);
    } catch (error) {
      console.error("Failed to load vault:", error);
    } finally {
      setIsLoadingVault(false);
    }
  };

  useEffect(() => {
    if (currentView === 'vault') {
      loadVault();
    }
  }, [currentView]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f4] font-sans text-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-6 flex items-center gap-3 text-white">
          <Shield className="w-6 h-6 text-emerald-400" />
          <span className="font-semibold tracking-tight text-lg">GovAudit Pro</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setCurrentView('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'audit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium text-sm">New Audit</span>
          </button>
          <button 
            onClick={() => setCurrentView('vault')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'vault' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}`}
          >
            <History className="w-5 h-5" />
            <span className="font-medium text-sm">Historical Vault</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="text-xs text-slate-500 font-mono">
            Standard: Gemini 3.1 Pro<br/>
            Zero Temp Determinism
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentView === 'audit' ? (
          <div className="max-w-5xl mx-auto p-8 lg:p-12">
            <header className="mb-10">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Forensic Clause Audit</h1>
              <p className="text-slate-500 mt-2">Upload a Data Processing Agreement (DPA) for automated extraction and verification.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Setup Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Audit Setup</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
                      <input 
                        type="text" 
                        value={vendor}
                        onChange={e => setVendor(e.target.value)}
                        placeholder="e.g. Snowflake Inc."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Target Jurisdictions</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {AVAILABLE_JURISDICTIONS.map(j => (
                          <label key={j} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors">
                            <input 
                              type="checkbox" 
                              checked={selectedJurisdictions.includes(j)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedJurisdictions([...selectedJurisdictions, j]);
                                } else {
                                  setSelectedJurisdictions(selectedJurisdictions.filter(item => item !== j));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            {j}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Upload DPA (PDF)</label>
                      <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                        <input 
                          type="file" 
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-sm text-slate-600 font-medium">
                          {file ? file.name : 'Click or drag PDF here'}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={executeAudit}
                      disabled={!file || !vendor || selectedJurisdictions.length === 0 || isProcessing}
                      className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                      ) : (
                        <><Shield className="w-5 h-5" /> Execute Audit</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Results Column */}
              <div className="lg:col-span-2 space-y-6">
                {isProcessing && (
                  <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Orchestrating Agentic Review</h3>
                    <p className="text-slate-500 mt-2 max-w-sm">Extracting PDF contents and identifying verbatim operative clauses regarding Breach, Retention, and Sharing...</p>
                  </div>
                )}

                {!isProcessing && !auditResults && (
                  <div className="bg-white/50 border border-slate-200 border-dashed rounded-2xl h-full min-h-[400px] flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Awaiting document upload</p>
                    </div>
                  </div>
                )}

                {auditResults && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">Counsel's Verification Station</h2>
                      {saveSuccess && <span className="text-sm font-medium text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Saved to Vault</span>}
                    </div>

                    {auditResults.map((entry, idx) => (
                      <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                          <h3 className="font-medium text-slate-900">{entry.category}</h3>
                          
                          <div className="flex bg-slate-100 rounded-lg p-1">
                            {(['Pending', 'Verified ✅', 'Rejected ❌'] as Verdict[]).map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => updateAuditEntry(idx, 'verdict', v)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${entry.verdict === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                {v.replace(' ✅', '').replace(' ❌', '')}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Extracted Clause</label>
                              <textarea 
                                value={entry.evidence}
                                onChange={e => updateAuditEntry(idx, 'evidence', e.target.value)}
                                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">Suggested Compliant Clause</label>
                              <textarea 
                                value={entry.draftedClause}
                                onChange={e => updateAuditEntry(idx, 'draftedClause', e.target.value)}
                                className="w-full h-32 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl font-mono text-xs text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">AI Forensic Analysis</label>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.isCompliant ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {entry.isCompliant ? 'Appears Compliant' : 'Risks Detected'}
                                </span>
                              </div>
                              <div className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 overflow-y-auto">
                                {entry.aiAnalysis}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Counsel's Notes / Caveats</label>
                              <textarea 
                                value={entry.notes}
                                onChange={e => updateAuditEntry(idx, 'notes', e.target.value)}
                                placeholder="Add your final review notes here..."
                                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {saveError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                        {saveError}
                      </div>
                    )}

                    <button 
                      onClick={saveToVault}
                      disabled={isSaving || saveSuccess}
                      className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {saveSuccess ? 'Locked to Local Storage' : 'Lock Audit to Local Storage'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-8 lg:p-12">
            <header className="mb-10">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Historical Vault</h1>
              <p className="text-slate-500 mt-2">Immutable record of all verified Data Processing Agreements.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {isLoadingVault ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              ) : vaultData.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No audits saved yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Vendor</th>
                        <th className="px-6 py-4">Jurisdictions</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">AI Check</th>
                        <th className="px-6 py-4">Verdict</th>
                        <th className="px-6 py-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vaultData.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">{row.date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{row.vendor}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs max-w-[150px] truncate" title={row.jurisdictions}>{row.jurisdictions}</td>
                          <td className="px-6 py-4 text-slate-700">{row.category}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.is_compliant ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {row.is_compliant ? 'Compliant' : 'Risks'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.verdict.includes('Verified') ? 'bg-emerald-100 text-emerald-800' :
                              row.verdict.includes('Rejected') ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {row.verdict}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={row.notes}>{row.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
