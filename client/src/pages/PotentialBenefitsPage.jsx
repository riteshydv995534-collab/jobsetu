import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Sparkles,
  Search,
  UserCheck,
  Home,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Info,
  Calendar,
  DollarSign,
  FileText,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Filter
} from 'lucide-react';

const PotentialBenefitsPage = () => {
  const navigate = useNavigate();
  const [individuals, setIndividuals] = useState([]);
  const [selectedIndividualId, setSelectedIndividualId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [benefitsData, setBenefitsData] = useState(null);
  const [expandedScheme, setExpandedScheme] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load individual directory for selector
  useEffect(() => {
    fetchIndividuals();
  }, []);

  const fetchIndividuals = async () => {
    try {
      const res = await api.get('/individuals?limit=100');
      if (res.data?.data) {
        setIndividuals(res.data.data);
        if (res.data.data.length > 0 && !selectedIndividualId) {
          setSelectedIndividualId(res.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load individuals:', err);
    }
  };

  // When selected individual changes, fetch their potential benefits
  useEffect(() => {
    if (selectedIndividualId) {
      fetchPotentialBenefits(selectedIndividualId);
    }
  }, [selectedIndividualId]);

  const fetchPotentialBenefits = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/individuals/${id}/potential-benefits`);
      if (res.data?.data) {
        setBenefitsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to evaluate potential benefits:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (result) => {
    switch (result) {
      case 'ELIGIBLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fully Eligible
          </span>
        );
      case 'VERIFICATION_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Verification Pending
          </span>
        );
      case 'PREVIOUS_BENEFIT_REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" /> Benefit History Review
          </span>
        );
      case 'INELIGIBLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Not Qualified
          </span>
        );
    }
  };

  const filteredIndividuals = individuals.filter((ind) => {
    const q = searchQuery.toLowerCase();
    return (
      ind.fullName?.toLowerCase().includes(q) ||
      ind.individualId?.toLowerCase().includes(q) ||
      ind.district?.toLowerCase().includes(q)
    );
  });

  const allSchemesList = [];
  if (benefitsData) {
    if (benefitsData.individualBenefits) {
      benefitsData.individualBenefits.forEach((b) =>
        allSchemesList.push({ ...b, scopeType: 'INDIVIDUAL' })
      );
    }
    if (benefitsData.householdBenefits) {
      benefitsData.householdBenefits.forEach((b) =>
        allSchemesList.push({ ...b, scopeType: 'HOUSEHOLD' })
      );
    }
    if (benefitsData.propertyBenefits) {
      benefitsData.propertyBenefits.forEach((b) =>
        allSchemesList.push({ ...b, scopeType: 'PROPERTY' })
      );
    }
  }

  const displayedSchemes = allSchemesList.filter((item) => {
    if (scopeFilter !== 'ALL' && item.scopeType !== scopeFilter) return false;
    if (statusFilter !== 'ALL' && item.evaluation.overallResult !== statusFilter) return false;
    return true;
  });

  const selectedInd = benefitsData?.individual;
  const householdData = benefitsData?.household;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-govTeal-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-navy-700">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-govTeal-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-govTeal-500/20 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-govTeal-500/30">
              <Sparkles className="w-3.5 h-3.5" /> Deterministic Eligibility Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Citizen Potential Benefits Discovery
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Select an individual citizen to calculate real-time eligibility across all 12 government schemes, detect household & property entitlements, verify duplicate restrictions, and examine rule-by-rule audit proofs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPotentialBenefits(selectedIndividualId)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 border border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Re-evaluate Rules
            </button>
          </div>
        </div>
      </div>

      {/* Citizen Selector Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="w-full md:w-96">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Citizen from Synthetic Directory
            </label>
            <div className="relative">
              <select
                value={selectedIndividualId}
                onChange={(e) => setSelectedIndividualId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-govTeal-500 focus:outline-none"
              >
                {individuals.map((ind) => (
                  <option key={ind._id} value={ind._id}>
                    {ind.fullName} ({ind.individualId}) — {ind.district || 'Patna'}, {ind.state || 'Bihar'} [₹{(ind.annualIncome || 0).toLocaleString('en-IN')}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-72">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Filter Citizens by Name / District
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search citizen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-govTeal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Selected Citizen Summary Ribbon */}
        {selectedInd && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block font-medium">Full Name</span>
              <span className="font-bold text-slate-800 text-sm truncate block">{selectedInd.fullName}</span>
              <span className="text-[11px] text-govTeal-600 font-mono">{selectedInd.individualId}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block font-medium">Demographics</span>
              <span className="font-semibold text-slate-800">{selectedInd.ageYears || 35} yrs • {selectedInd.gender}</span>
              <span className="text-[11px] text-slate-500 block">{selectedInd.district}, {selectedInd.state}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block font-medium">Income & Category</span>
              <span className="font-bold text-emerald-700">₹{(selectedInd.annualIncome || 0).toLocaleString('en-IN')}/yr</span>
              <span className="text-[11px] font-semibold text-slate-600 block">{selectedInd.incomeCategory || 'GENERAL'}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block font-medium">Employment / Education</span>
              <span className="font-semibold text-slate-800 truncate block">{selectedInd.employmentStatus || 'INFORMAL_LABOUR'}</span>
              <span className="text-[11px] text-slate-500">{selectedInd.educationStatus || 'SECONDARY'}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block font-medium">Household Unit</span>
              <span className="font-bold text-navy-800 truncate block">
                {householdData ? householdData.householdReference || householdData.householdId : 'No Linked Household'}
              </span>
              <span className="text-[11px] text-slate-500">
                {householdData ? `${householdData.householdSize || 1} family members` : 'Unattached'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block font-medium">Civil Verification</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> {selectedInd.verificationStatus || 'VERIFIED'}
              </span>
              <span className="text-[11px] text-amber-600 font-semibold block">Synthetic Demo Record</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Metrics Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Scopes & Statuses Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Scope:
          </span>
          {['ALL', 'INDIVIDUAL', 'HOUSEHOLD', 'PROPERTY'].map((scope) => (
            <button
              key={scope}
              onClick={() => setScopeFilter(scope)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                scopeFilter === scope
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {scope === 'ALL' ? 'All Scopes' : scope}
            </button>
          ))}

          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 ml-3 mr-1">
            Result:
          </span>
          {['ALL', 'ELIGIBLE', 'VERIFICATION_PENDING', 'INELIGIBLE'].map((res) => (
            <button
              key={res}
              onClick={() => setStatusFilter(res)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                statusFilter === res
                  ? 'bg-govTeal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {res === 'ALL' ? 'All Outcomes' : res.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Counter of Evaluated Schemes */}
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{displayedSchemes.length}</span> of {allSchemesList.length} evaluated schemes
        </div>
      </div>

      {/* Schemes Results Grid */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 text-govTeal-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Evaluating scheme eligibility and duplicate rules...</p>
        </div>
      ) : displayedSchemes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
          No schemes match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedSchemes.map((item) => {
            const scheme = item.scheme;
            const evalResult = item.evaluation;
            const isExpanded = expandedScheme === scheme._id;
            const isCompeting = item.hasCompetingApplication;

            return (
              <div
                key={scheme._id}
                className={`bg-white/90 backdrop-blur-sm rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                  evalResult.overallResult === 'ELIGIBLE'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : evalResult.overallResult === 'VERIFICATION_PENDING'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                            scheme.benefitScope === 'INDIVIDUAL'
                              ? 'bg-blue-100 text-blue-800'
                              : scheme.benefitScope === 'HOUSEHOLD'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {scheme.benefitScope} SCOPE
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-medium">
                          {scheme.code}
                        </span>
                        {isCompeting && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-600" /> Competing Household Claim
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-base leading-tight">
                        {scheme.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {scheme.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {getStatusBadge(evalResult.overallResult)}
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">Benefit</span>
                        <span className="text-sm font-extrabold text-navy-900">
                          ₹{(scheme.benefitAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {scheme.benefitCategory || 'WELFARE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Repeat Policy</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {scheme.repeatBenefitPolicy || 'ONCE_PER_LIFETIME'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Rule Version</span>
                      <span className="font-mono text-slate-600 block">
                        {evalResult.ruleVersionApplied || 'v1.0'}
                      </span>
                    </div>
                  </div>

                  {/* Reasons / Explanation */}
                  <div className="mt-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/70 text-xs">
                    <div className="font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Engine Evaluation Decision:</span>
                      <span className="text-[11px] text-slate-400">
                        Evaluated {new Date(evalResult.evaluatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {evalResult.reasons && evalResult.reasons.length > 0 ? (
                        evalResult.reasons.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-slate-600">
                            <span className="text-govTeal-600 font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-slate-500 italic">No restriction reasons recorded.</li>
                      )}
                    </ul>
                  </div>

                  {/* Toggle Detailed Breakdown Button */}
                  <div className="mt-3 flex items-center justify-between pt-2">
                    <button
                      onClick={() => setExpandedScheme(isExpanded ? null : scheme._id)}
                      className="text-xs font-semibold text-govTeal-700 hover:text-govTeal-900 flex items-center gap-1 transition"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" /> Hide Rule Verification Proofs
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" /> View Full Rule Checklist ({evalResult.ruleEvaluation?.length || 0} checks)
                        </>
                      )}
                    </button>

                    {evalResult.overallResult === 'ELIGIBLE' && (
                      <button
                        onClick={() =>
                          navigate(`/apply?schemeId=${scheme._id}&individualId=${selectedInd._id}`)
                        }
                        className="px-3 py-1.5 bg-govTeal-700 hover:bg-govTeal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                      >
                        Apply for Scheme <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Detailed Rule Proofs */}
                {isExpanded && evalResult.ruleEvaluation && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/60 rounded-b-xl">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Traceable Rule Verification Checklist
                    </h4>
                    <div className="space-y-2">
                      {evalResult.ruleEvaluation.map((rule, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            {rule.status === 'SATISFIED' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            ) : rule.status === 'NOT_SATISFIED' ? (
                              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <span className="font-bold text-slate-800">{rule.ruleName}: </span>
                              <span className="text-slate-600">{rule.ruleDetail}</span>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Verified Applicant Value:{' '}
                                <span className="font-semibold text-slate-700">
                                  {rule.applicantValue}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                              rule.status === 'SATISFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rule.status === 'NOT_SATISFIED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rule.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Duplicate Benefit Audit Proof */}
                    <div className="mt-3 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900">
                      <span className="font-bold block mb-1">Benefit History & Repeat Policy Check:</span>
                      {evalResult.isRestrictedDuplicate ? (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Restricted duplicate detected. Applicant or household already received this benefit.
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          No restricted duplicate found in historical disbursements for this benefit period.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Historical Benefits Received Section */}
      {benefitsData?.benefitHistory && benefitsData.benefitHistory.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Disbursed & Sanctioned Benefit History
              </h2>
              <p className="text-xs text-slate-500">
                Official benefits previously sanctioned or disbursed to this individual citizen.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
              {benefitsData.benefitHistory.length} Previous Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Scheme</th>
                  <th className="py-2.5 px-3">Scope</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Sanction Date</th>
                  <th className="py-2.5 px-3">Disbursement Date</th>
                  <th className="py-2.5 px-3">Reference / Transaction</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {benefitsData.benefitHistory.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {item.scheme?.name || 'General Welfare Scheme'}
                      <span className="block text-[11px] text-slate-400 font-mono">
                        {item.scheme?.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.schemeScope || 'INDIVIDUAL'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                      ₹{(item.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.sanctionDate ? new Date(item.sanctionDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.disbursementDate ? new Date(item.disbursementDate).toLocaleDateString() : 'Pending'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {item.referenceNumber || item.benefitId || 'MOCK-PFMS-0001'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'DISBURSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PotentialBenefitsPage;
