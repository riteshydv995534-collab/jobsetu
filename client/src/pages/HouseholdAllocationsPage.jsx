import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Award,
  DollarSign,
  UserCheck,
  FileText,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  Check,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';

const HouseholdAllocationsPage = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideApplicationId, setOverrideApplicationId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('');

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/household-allocations');
      if (res.data?.data) {
        setAllocations(res.data.data);
        if (res.data.data.length > 0 && !selectedAllocation) {
          setSelectedAllocation(res.data.data[0]);
        } else if (selectedAllocation) {
          const updated = res.data.data.find((a) => a._id === selectedAllocation._id);
          if (updated) setSelectedAllocation(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load household allocations:', err);
      setErrorMsg('Failed to load household allocations.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRecommendation = async () => {
    if (!selectedAllocation) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/household-allocations/${selectedAllocation._id}/review`, {
        decision: 'APPROVE_RECOMMENDATION',
        decisionReason: 'Verified economic hardship and authenticated civil record by Welfare Officer'
      });
      setSuccessMsg('Allocation recommendation officially approved and SANCTIONED! Benefit record generated.');
      await fetchAllocations();
    } catch (err) {
      console.error('Failed to approve allocation:', err);
      setErrorMsg(err.response?.data?.message || 'Approval action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setErrorMsg('Mandatory officer justification is required for manual override.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post(`/household-allocations/${selectedAllocation._id}/review`, {
        decision: 'MANUAL_OVERRIDE',
        decisionReason: overrideReason,
        overrideApplicationId: overrideApplicationId || undefined
      });
      setSuccessMsg('Manual override executed and logged to immutable audit trail.');
      setShowOverrideModal(false);
      setOverrideReason('');
      await fetchAllocations();
    } catch (err) {
      console.error('Failed to execute override:', err);
      setErrorMsg(err.response?.data?.message || 'Manual override failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisbursement = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post(`/household-allocations/${selectedAllocation._id}/disburse`, {
        paymentReference: paymentReference || `PFMS-DBT-${Date.now()}`,
        amount: Number(disburseAmount) || selectedAllocation.scheme?.benefitAmount || 0
      });
      setSuccessMsg('DBT Benefit successfully recorded as DISBURSED with official transaction voucher.');
      setShowDisburseModal(false);
      setPaymentReference('');
      await fetchAllocations();
    } catch (err) {
      console.error('Failed to record disbursement:', err);
      setErrorMsg(err.response?.data?.message || 'Disbursement recording failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECOMMENDED_FOR_ALLOCATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Recommended by Engine
          </span>
        );
      case 'PRIORITY_REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Tie / Officer Review Required
          </span>
        );
      case 'ALLOCATION_APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Sanctioned (Awaiting DBT)
          </span>
        );
      case 'BENEFIT_DISBURSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Award className="w-3.5 h-3.5 text-emerald-600" /> Benefit Disbursed
          </span>
        );
      case 'ALLOCATION_REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Allocation Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-govTeal-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-navy-700">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-govTeal-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-govTeal-500/20 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-govTeal-500/30">
              <Scale className="w-3.5 h-3.5" /> Fair Household Benefit Allocation Console
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Competing Household Claim Adjudication
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              When multiple family members in the same household apply for a restricted single-benefit scheme, the Fair Allocation Engine calculates deterministic priority scores (income, vulnerability, timestamps) and recommends the most qualified beneficiary.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllocations}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 border border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Cases
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Left List + Right Detail Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Cases List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Active Household Cases ({allocations.length})
            </span>
            <span className="text-xs text-slate-400">Restricted Schemes</span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {allocations.map((alloc) => {
              const isSelected = selectedAllocation?._id === alloc._id;
              return (
                <div
                  key={alloc._id}
                  onClick={() => setSelectedAllocation(alloc)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 shadow-sm ${
                    isSelected
                      ? 'bg-navy-900 text-white border-navy-800 ring-2 ring-govTeal-500'
                      : 'bg-white/90 hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isSelected
                          ? 'bg-govTeal-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {alloc.household?.householdReference || alloc.household?.householdId || 'Household'}
                    </span>
                    <span className="text-xs font-mono opacity-70">
                      {alloc.allocationReference}
                    </span>
                  </div>

                  <h3
                    className={`font-bold text-sm leading-tight mb-1 ${
                      isSelected ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {alloc.scheme?.name || 'Restricted Household Scheme'}
                  </h3>

                  <p
                    className={`text-xs mb-3 line-clamp-1 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {alloc.competingApplications?.length || 0} family members competing • ₹
                    {(alloc.scheme?.benefitAmount || 0).toLocaleString('en-IN')}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100/20 text-xs">
                    <span
                      className={`text-[11px] font-medium ${
                        isSelected ? 'text-teal-300' : 'text-slate-500'
                      }`}
                    >
                      {alloc.household?.district}, {alloc.household?.state}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alloc.status === 'BENEFIT_DISBURSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : alloc.status === 'ALLOCATION_APPROVED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {alloc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Adjudication Workbench */}
        <div className="lg:col-span-8">
          {selectedAllocation ? (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-navy-100 text-navy-800">
                      CASE: {selectedAllocation.allocationReference}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Scheme Code: {selectedAllocation.scheme?.code}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedAllocation.scheme?.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Restricted Household Scheme • Policy: {selectedAllocation.scheme?.repeatBenefitPolicy || 'ONCE_PER_LIFETIME'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(selectedAllocation.status)}
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Sanction Amount</span>
                    <span className="text-lg font-black text-navy-900">
                      ₹{(selectedAllocation.scheme?.benefitAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Household Context Strip */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Household Ref</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedAllocation.household?.householdReference || selectedAllocation.household?.householdId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Location</span>
                  <span className="font-semibold text-slate-700">
                    {selectedAllocation.household?.district}, {selectedAllocation.household?.state}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Household Income</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    ₹{(selectedAllocation.household?.annualHouseholdIncome || 0).toLocaleString('en-IN')}/yr
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Family Members</span>
                  <span className="font-bold text-slate-800">
                    {selectedAllocation.competingApplications?.length || 0} Competing Claimants
                  </span>
                </div>
              </div>

              {/* Engine Recommendation Callout */}
              <div className="p-4 rounded-xl border bg-blue-50/80 border-blue-200 text-blue-950">
                <div className="flex items-start gap-3">
                  <Scale className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-blue-900">
                      Engine Recommendation: {selectedAllocation.engineRecommendation}
                    </h4>
                    <p className="text-xs text-blue-800 mt-1">
                      {selectedAllocation.justificationSummary}
                    </p>
                    {selectedAllocation.isManualOverride && (
                      <div className="mt-2 text-xs font-bold text-purple-800 bg-purple-100 px-2 py-1 rounded inline-block">
                        ⚠️ Manual Officer Override Active: {selectedAllocation.officerDecisionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Competing Claimants Evaluation Table / Cards */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Candidate Priority Assessments</span>
                  <span className="text-xs font-medium text-slate-500 lowercase">
                    scored against income, vulnerability & timestamp
                  </span>
                </h3>

                <div className="space-y-3">
                  {selectedAllocation.competingApplications?.map((item, idx) => {
                    const isRecommended =
                      selectedAllocation.recommendedApplication?._id === item.application?._id ||
                      selectedAllocation.recommendedApplication === item.application?._id;
                    const ind = item.application?.applicantIndividual;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isRecommended
                            ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-400'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900 text-base">
                                {ind?.fullName || `Applicant ${idx + 1}`}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                ({ind?.individualId || item.application?.applicationId})
                              </span>
                              {isRecommended && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Award className="w-3 h-3 text-emerald-600" /> Top Priority Candidate
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                              <span>Age: <strong>{ind?.ageYears || 35} yrs</strong></span>
                              <span>•</span>
                              <span>Category: <strong>{ind?.incomeCategory || 'BPL'}</strong></span>
                              <span>•</span>
                              <span>Income: <strong>₹{(ind?.annualIncome || 0).toLocaleString('en-IN')}/yr</strong></span>
                              <span>•</span>
                              <span>Submitted: <strong>{new Date(item.application?.applicationDate || item.application?.createdAt).toLocaleDateString()}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                Priority Score
                              </span>
                              <span className="text-lg font-black text-navy-900">
                                {item.priorityScore} pts
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Priority Criteria Breakdown */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span>
                            Economic Score: <strong className="text-slate-800">{item.scoreBreakdown?.incomeScore || 0} pts</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Vulnerability Score: <strong className="text-slate-800">{item.scoreBreakdown?.vulnerabilityScore || 0} pts</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Timestamp Bonus: <strong className="text-slate-800">{item.scoreBreakdown?.timestampScore || 0} pts</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Mandatory Eligibility: <strong className={item.isMandatoryEligible ? 'text-emerald-700' : 'text-rose-700'}>
                              {item.isMandatoryEligible ? 'SATISFIED' : 'DISQUALIFIED'}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Officer Decision & Disbursement Actions */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Welfare Officer Adjudication Controls
                </h4>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Approve Recommendation Button */}
                  {selectedAllocation.status === 'RECOMMENDED_FOR_ALLOCATION' && (
                    <button
                      onClick={handleApproveRecommendation}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-govTeal-700 hover:bg-govTeal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Approve Recommendation (Sanction)
                    </button>
                  )}

                  {/* Manual Override Button */}
                  {selectedAllocation.status !== 'BENEFIT_DISBURSED' && (
                    <button
                      onClick={() => setShowOverrideModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      <Sliders className="w-4 h-4" /> Manual Officer Override
                    </button>
                  )}

                  {/* Record Disbursement Button (when sanctioned) */}
                  {selectedAllocation.status === 'ALLOCATION_APPROVED' && (
                    <button
                      onClick={() => {
                        setDisburseAmount(selectedAllocation.scheme?.benefitAmount || '');
                        setShowDisburseModal(true);
                      }}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      <DollarSign className="w-4 h-4" /> Disburse Benefit via DBT
                    </button>
                  )}

                  {selectedAllocation.status === 'BENEFIT_DISBURSED' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                      <Award className="w-4 h-4 text-emerald-600" /> Benefit Disbursed to Bank Account via PFMS-DBT
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
              Select an allocation case on the left to examine competing claims.
            </div>
          )}
        </div>
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Manual Officer Allocation Override
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Government accountability rules require an explicit documented justification for overruling the engine recommendation.
            </p>

            <form onSubmit={handleManualOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Candidate to Sanction
                </label>
                <select
                  value={overrideApplicationId}
                  onChange={(e) => setOverrideApplicationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">-- Choose Beneficiary --</option>
                  {selectedAllocation?.competingApplications?.map((item, idx) => (
                    <option key={idx} value={item.application?._id}>
                      {item.application?.applicantIndividual?.fullName} (Score: {item.priorityScore} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mandatory Justification / Review Reason *
                </label>
                <textarea
                  required
                  rows={4}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Document the exceptional field verification, medical emergency, or civil reason..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !overrideReason.trim()}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  Confirm & Log Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DBT Disbursement Modal */}
      {showDisburseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Record Direct Benefit Transfer (DBT)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the PFMS / bank transaction voucher reference to mark this sanctioned allocation as officially disbursed.
            </p>

            <form onSubmit={handleDisbursement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  DBT / PFMS Payment Voucher Reference *
                </label>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. PFMS-DBT-2026-JH-8834"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Disbursed Amount (₹)
                </label>
                <input
                  type="number"
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  Submit Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseholdAllocationsPage;
