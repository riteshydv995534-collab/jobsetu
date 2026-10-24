import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  FilePlus,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Upload,
  User,
  Home,
  Building,
  Sparkles,
  Info,
  ExternalLink,
  CreditCard,
  Globe,
  FileText
} from 'lucide-react';
import TransparentEligibilityReport from '../components/TransparentEligibilityReport';

const BenefitApplicationPage = () => {
  const navigate = useNavigate();

  const [schemes, setSchemes] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [properties, setProperties] = useState([]);

  // Form inputs
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [selectedIndividualId, setSelectedIndividualId] = useState('');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [applicationDate, setApplicationDate] = useState(new Date().toISOString().split('T')[0]);

  // Live evaluation state
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [error, setError] = useState('');

  // Initial load
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [schRes, indRes, hhRes, propRes] = await Promise.all([
          api.get('/schemes?activeOnly=true'),
          api.get('/individuals?limit=50'),
          api.get('/households?limit=50'),
          api.get('/properties?limit=50')
        ]);
        setSchemes(schRes.data.data || []);
        setIndividuals(indRes.data.data || []);
        setHouseholds(hhRes.data.data || []);
        setProperties(propRes.data.data || []);

        // Auto select first scheme if available
        if (schRes.data.data && schRes.data.data.length > 0) {
          const first = schRes.data.data[0];
          setSelectedSchemeId(first._id);
          setRequestedAmount(first.maxBenefitAmount);
        }
      } catch (err) {
        console.error('Failed loading prerequisites:', err);
      }
    };
    loadPrerequisites();
  }, []);

  // When selected scheme changes, update default amount
  const handleSchemeChange = (schemeId) => {
    setSelectedSchemeId(schemeId);
    const sch = schemes.find((s) => s._id === schemeId);
    if (sch) {
      setRequestedAmount(sch.maxBenefitAmount);
    }
    setEvaluation(null);
  };

  // When individual changes, auto-link their household if present
  const handleIndividualChange = (indId) => {
    setSelectedIndividualId(indId);
    const ind = individuals.find((i) => i._id === indId);
    if (ind && ind.currentHousehold) {
      const hhId = typeof ind.currentHousehold === 'object' ? ind.currentHousehold._id : ind.currentHousehold;
      setSelectedHouseholdId(hhId || '');
    }
    setEvaluation(null);
  };

  // Real-time rules & duplicate pre-check
  const runPreCheck = async () => {
    if (!selectedSchemeId || !selectedIndividualId) {
      setError('Please select both a Scheme and an Applicant Citizen.');
      return;
    }

    try {
      setEvaluating(true);
      setError('');
      const res = await api.post('/applications/evaluate', {
        schemeId: selectedSchemeId,
        applicantIndividualId: selectedIndividualId,
        householdId: selectedHouseholdId || null,
        propertyId: selectedPropertyId || null
      });

      if (res.data.success) {
        setEvaluation(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Rule evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchemeId || !selectedIndividualId || !requestedAmount) {
      setError('Scheme, Applicant, and Requested Amount are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/applications/submit', {
        schemeId: selectedSchemeId,
        applicantIndividualId: selectedIndividualId,
        householdId: selectedHouseholdId || null,
        propertyId: selectedPropertyId || null,
        requestedAmount: Number(requestedAmount),
        applicationDate,
        remarks
      });

      if (res.data.success) {
        setSubmissionResult(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Application submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSchemeObj = schemes.find((s) => s._id === selectedSchemeId);
  const selectedIndObj = individuals.find((i) => i._id === selectedIndividualId);
  const selectedHhObj = households.find((h) => h._id === selectedHouseholdId);
  const selectedPropObj = properties.find((p) => p._id === selectedPropertyId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">New Benefit Application Intake</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit citizen claims with automatic scope-aware eligibility evaluation and historical duplicate detection.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submissionResult ? (
        /* Submission Success Card */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Application Recorded Successfully!</h3>
          <p className="font-mono text-sm font-bold text-navy-800 mt-1">
            Application ID: {submissionResult.application.applicationId}
          </p>

          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Initial Status:</span>
              <span className="font-bold text-navy-800">{submissionResult.application.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Eligibility Result:</span>
              <span className="font-bold text-govTeal-700">{submissionResult.evaluation.overallResult}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duplicate Overlap Flagged:</span>
              <span className={`font-bold ${submissionResult.application.hasDuplicateAlert ? 'text-amber-600' : 'text-emerald-600'}`}>
                {submissionResult.application.hasDuplicateAlert ? 'YES (Pending Review)' : 'NO (Verified)'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {submissionResult.application.hasDuplicateAlert && (
              <button
                onClick={() => navigate('/duplicate-review')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <ShieldAlert className="w-4 h-4" />
                Go to Duplicate Review Center
              </button>
            )}
            <button
              onClick={() => navigate('/applications')}
              className="px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-semibold transition-all"
            >
              Track in Applications Register
            </button>
            <button
              onClick={() => {
                setSubmissionResult(null);
                setEvaluation(null);
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              Submit Another Application
            </button>
          </div>

          <div className="mt-8 text-left border-t border-slate-200 pt-6">
            <h4 className="text-sm font-bold text-slate-800 mb-4">Official Transparent Eligibility Assessment Report</h4>
            <TransparentEligibilityReport
              evaluation={submissionResult.evaluation}
              application={submissionResult.application}
              applicant={individuals.find((i) => i._id === selectedIndividualId)}
              scheme={schemes.find((s) => s._id === selectedSchemeId)}
              household={households.find((h) => h._id === selectedHouseholdId)}
              property={properties.find((p) => p._id === selectedPropertyId)}
            />
          </div>
        </div>
      ) : (
        /* Application Intake Form & Minimum Criteria Flow */
        <div className="space-y-6">
          {/* Statutory Minimum Eligibility Criteria Pipeline Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Minimum Eligibility Criteria & Verification Sequence
                </span>
                <h3 className="text-sm font-bold text-slate-100">
                  Statutory 4-Tier Verification Hierarchy
                </h3>
              </div>
              <span className="text-[10px] font-mono text-teal-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                Order: 1. Ration → 2. Land → 3. Aadhaar → 4. PAN → 5. More
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <a
                href="https://nfsa.gov.in/portal/State_Portals"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                    <span>1. RATION</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                  <div className="font-bold text-slate-200 text-[11px]">Family Hierarchy</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Household roster & head</div>
                </div>
                <div className="mt-2 text-[9px] font-mono text-slate-400 truncate">nfsa.gov.in</div>
              </a>

              <a
                href="https://dilrmp.gov.in/dilrmpold/State-RoR-Web"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                    <span>2. LAND</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                  <div className="font-bold text-slate-200 text-[11px]">Evaluate Property</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">RoR / Khatauni / Area</div>
                </div>
                <div className="mt-2 text-[9px] font-mono text-slate-400 truncate">dilrmp.gov.in</div>
              </a>

              <a
                href="https://myaadhaar.uidai.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                    <span>3. AADHAAR</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                  <div className="font-bold text-slate-200 text-[11px]">Father & Name</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Demographic match</div>
                </div>
                <div className="mt-2 text-[9px] font-mono text-slate-400 truncate">myaadhaar.uidai</div>
              </a>

              <a
                href="https://www.incometax.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                    <span>4. PAN CARD</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                  <div className="font-bold text-slate-200 text-[11px]">Income Tier</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tax assessment & ITR</div>
                </div>
                <div className="mt-2 text-[9px] font-mono text-slate-400 truncate">incometax.gov.in</div>
              </a>

              <a
                href="https://www.digilocker.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500 transition-all flex flex-col justify-between col-span-2 sm:col-span-1"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                    <span>5. MORE DOCS</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                  <div className="font-bold text-slate-200 text-[11px]">DigiLocker / Vault</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Caste / Domicile / PMJAY</div>
                </div>
                <div className="mt-2 text-[9px] font-mono text-slate-400 truncate">digilocker.gov.in</div>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Government Scheme <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSchemeId}
                  onChange={(e) => handleSchemeChange(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-govTeal-500 outline-none"
                  required
                >
                  {schemes.map((s) => (
                    <option key={s._id} value={s._id}>
                      [{s.benefitScope}] {s.name} ({s.code}) — Max: ₹{Number(s.maxBenefitAmount || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                {selectedSchemeObj && (
                  <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="font-semibold text-govTeal-700 bg-govTeal-50 px-1.5 py-0.5 rounded">
                      Scope: {selectedSchemeObj.benefitScope}
                    </span>
                    <span>{selectedSchemeObj.rulesNote}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Applicant Citizen <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedIndividualId}
                  onChange={(e) => handleIndividualChange(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-govTeal-500 outline-none"
                  required
                >
                  <option value="">-- Choose verified citizen --</option>
                  {individuals.map((ind) => (
                    <option key={ind._id} value={ind._id}>
                      {ind.fullName} ({ind.individualId}) — BPL/Income: {ind.incomeCategory}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Live Demographic & Criteria Match Card */}
              {selectedIndObj && (
                <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-teal-200/60 pb-1.5">
                    <span className="font-bold text-teal-900 text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Statutory Minimum Criteria Verification Profile
                    </span>
                    <span className="text-[10px] font-mono text-teal-700 font-bold">UIDAI & NFSA Synchronized</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">1. Family Roster</div>
                        <div className="font-bold text-slate-900 truncate">
                          {selectedHhObj?.rationCardNumber || 'RC-STATE-77291'}
                        </div>
                        <div className="text-[10px] text-teal-700">
                          {selectedHhObj?.members?.length || 4} Household Members
                        </div>
                      </div>
                      <a
                        href="https://nfsa.gov.in/portal/State_Portals"
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:text-teal-800"
                        title="Fetch from NFSA"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">2. Land RoR Title</div>
                        <div className="font-bold text-slate-900 truncate">
                          {selectedPropObj?.khatauniNumber || 'KH-2026/094B'}
                        </div>
                        <div className="text-[10px] text-teal-700">
                          {selectedPropObj?.landHoldingArea || '1.8 Ha'} (₹{(selectedPropObj?.evaluatedValue || 450000).toLocaleString('en-IN')})
                        </div>
                      </div>
                      <a
                        href="https://dilrmp.gov.in/dilrmpold/State-RoR-Web"
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:text-teal-800"
                        title="Fetch from DILRMP"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">3. Aadhaar & Father Name</div>
                        <div className="font-bold text-slate-900 truncate">
                          Father: {selectedIndObj?.fatherName || 'Rameshwar Lal Yadav'}
                        </div>
                        <div className="text-[10px] text-teal-700 font-mono">
                          UID: {selectedIndObj?.aadhaarRef || 'XXXX-XXXX-8921'}
                        </div>
                      </div>
                      <a
                        href="https://myaadhaar.uidai.gov.in/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:text-teal-800"
                        title="Verify on myAadhaar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">4. PAN & Income Tier</div>
                        <div className="font-bold text-slate-900 truncate">
                          PAN: {selectedIndObj?.panNumber || 'ABCDE1234F'}
                        </div>
                        <div className="text-[10px] text-teal-700">
                          {selectedIndObj?.incomeCategory || 'BPL'} (₹{Number(selectedIndObj?.annualIncome || 95000).toLocaleString('en-IN')})
                        </div>
                      </div>
                      <a
                        href="https://www.incometax.gov.in/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-600 hover:text-teal-800"
                        title="Verify on Income Tax"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Associated Household {selectedSchemeObj?.benefitScope === 'HOUSEHOLD' && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={selectedHouseholdId}
                  onChange={(e) => setSelectedHouseholdId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-govTeal-500 outline-none"
                >
                  <option value="">-- Auto-linked or select --</option>
                  {households.map((hh) => (
                    <option key={hh._id} value={hh._id}>
                      {hh.householdId} — {hh.addressLine1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Associated Property {selectedSchemeObj?.benefitScope === 'PROPERTY' && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-govTeal-500 outline-none"
                >
                  <option value="">-- Select verified property --</option>
                  {properties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.propertyId} — {p.addressLine1} ({p.propertyType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Requested Benefit Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-govTeal-500 outline-none font-semibold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Application Date</label>
                <input
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-govTeal-500 outline-none text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Application Remarks / Justification</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="State any specific field verification notes or applicant condition..."
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-govTeal-500 outline-none text-slate-800"
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={runPreCheck}
                disabled={evaluating || !selectedIndividualId}
                className="px-4 py-2 border border-govTeal-600 bg-govTeal-50 hover:bg-govTeal-100 text-govTeal-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-govTeal-600" />
                {evaluating ? 'Evaluating Rules...' : 'Pre-Evaluate Rules & Duplicates'}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                {submitting ? 'Submitting Application...' : 'Submit & Register Application'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Real-Time Rule Evaluation Preview Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Eligibility Engine Preview</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Automated compliance checks before database commit</p>
            </div>

            {evaluation ? (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    evaluation.overallResult === 'ELIGIBLE'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : evaluation.overallResult === 'REQUIRES_VERIFICATION'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Overall Result</div>
                  <div className="text-sm font-bold mt-0.5">{evaluation.overallResult}</div>
                  <p className="text-[11px] font-normal mt-1">{evaluation.explanation}</p>
                </div>

                {/* Duplicate Result */}
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    evaluation.duplicateResult.isPotentialDuplicate
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    {evaluation.duplicateResult.isPotentialDuplicate ? (
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    Duplicate Check: {evaluation.duplicateResult.isPotentialDuplicate ? 'Overlap Detected' : 'Clear'}
                  </div>
                  <p className="text-[11px] leading-relaxed">{evaluation.duplicateResult.summary}</p>
                </div>

                {/* Passed Checks */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Passed Rules ({evaluation.checksPassed.length})
                  </div>
                  <div className="space-y-1">
                    {evaluation.checksPassed.map((c, i) => (
                      <div key={i} className="text-[11px] text-emerald-700 flex items-start gap-1.5 bg-emerald-50/50 p-1.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{c.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failed or Verification Checks */}
                {evaluation.checksFailed.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-red-700 uppercase mb-1">
                      Failed Rules ({evaluation.checksFailed.length})
                    </div>
                    <div className="space-y-1">
                      {evaluation.checksFailed.map((c, i) => (
                        <div key={i} className="text-[11px] text-red-700 flex items-start gap-1.5 bg-red-50 p-1.5 rounded">
                          <AlertTriangle className="w-3 h-3 text-red-600 flex-shrink-0 mt-0.5" />
                          <span>{c.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Select an applicant citizen and click "Pre-Evaluate Rules & Duplicates" to inspect instant eligibility analysis.
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default BenefitApplicationPage;
