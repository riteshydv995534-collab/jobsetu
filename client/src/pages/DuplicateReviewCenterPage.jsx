import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  Building,
  Home,
  User,
  Clock,
  Send,
  Info
} from 'lucide-react';

const DuplicateReviewCenterPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterScope, setFilterScope] = useState('ALL');

  // Decision Modal State
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [decision, setDecision] = useState('CONFIRMED_DUPLICATE');
  const [reasonNotes, setReasonNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterScope !== 'ALL') params.candidateType = filterScope;

      const res = await api.get('/duplicate-alerts', { params });
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load duplicate alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterStatus, filterScope]);

  const handleOpenReviewModal = (alert) => {
    setSelectedAlert(alert);
    setReasonNotes('');
    setActionTaken('');
    setActionSuccess('');
    // Default sensible decision based on current alert status
    setDecision('CONFIRMED_DUPLICATE');
  };

  const handleRecordDecision = async (e) => {
    e.preventDefault();
    if (!reasonNotes || !reasonNotes.trim()) {
      alert('A formal justification reason is strictly mandatory for any officer review decision.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/duplicate-alerts/${selectedAlert._id}/decision`, {
        decision,
        reasonNotes,
        actionTaken
      });

      if (res.data.success) {
        setActionSuccess(`Decision successfully logged! Alert updated to ${decision}.`);
        setTimeout(() => {
          setSelectedAlert(null);
          fetchAlerts();
        }, 1200);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to record decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-xs font-bold">Pending Officer Review</span>;
      case 'CONFIRMED_DUPLICATE':
        return <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded text-xs font-bold">Confirmed Duplicate</span>;
      case 'RESOLVED_NOT_DUPLICATE':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-xs font-bold">Marked Not Duplicate</span>;
      case 'INFO_REQUESTED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-xs font-bold">Information Requested</span>;
      case 'ESCALATED':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded text-xs font-bold">Escalated for Inspection</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-govTeal-700 bg-govTeal-50 border border-govTeal-200 px-2 py-0.5 rounded">
              JanSetu Innovation Core
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Benefit Verification & Duplicate Review Centre</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Scope-aware historical cross-referencing preventing duplicate public fund leakage while safeguarding independent citizen eligibility.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Alert Queue
        </button>
      </div>

      {/* Philosophical Guardrail Card (Compliance with Section 5.H) */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-4 border border-slate-800 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white">Fair Decision Guarantee:</strong> Relative relationships, matching surnames, or different income categories alone are <span className="text-amber-400 font-semibold">NEVER</span> treated as duplicate or fraudulent claims. Alerts are triggered exclusively by verified scheme scope restrictions (Property, Household, or Individual limits).
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Filter className="w-4 h-4 text-slate-400" />
          Filters:
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-govTeal-500 outline-none"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="PENDING_REVIEW">Pending Review Only</option>
            <option value="CONFIRMED_DUPLICATE">Confirmed Duplicates</option>
            <option value="RESOLVED_NOT_DUPLICATE">Marked Not Duplicate</option>
            <option value="INFO_REQUESTED">Information Requested</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </div>

        <div>
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-govTeal-500 outline-none"
          >
            <option value="ALL">All Scope Levels</option>
            <option value="PROPERTY">Property Scope (e.g. Sanitation, Infrastructure)</option>
            <option value="HOUSEHOLD">Household Scope (e.g. Family Nutritional Aid)</option>
            <option value="INDIVIDUAL">Individual Scope (e.g. Scholarships)</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-500">
          Showing <span className="font-bold text-slate-800">{alerts.length}</span> alert case(s)
        </div>
      </div>

      {/* Alerts Table & Detail View */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-4 border-navy-700 border-t-govTeal-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500 font-medium">Scanning multi-tier benefit registries...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No Matching Duplicate Alerts</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All applications under current filter criteria are verified and compliant with scheme limits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert) => {
            const hasConflictingRecord = !!alert.conflictingBenefitRecord;
            return (
              <div
                key={alert._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2.5 max-w-3xl">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
                      {alert.alertId}
                    </span>
                    {getStatusBadge(alert.status)}
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                      {alert.candidateType === 'PROPERTY' && <Building className="w-3 h-3 text-slate-500" />}
                      {alert.candidateType === 'HOUSEHOLD' && <Home className="w-3 h-3 text-slate-500" />}
                      {alert.candidateType === 'INDIVIDUAL' && <User className="w-3 h-3 text-slate-500" />}
                      Scope: {alert.candidateType}
                    </span>
                    <span className="text-xs font-semibold text-govTeal-700 bg-govTeal-50 border border-govTeal-200 px-2 py-0.5 rounded">
                      {alert.scheme?.name} ({alert.scheme?.code})
                    </span>
                  </div>

                  {/* Core Content */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Applicant: {alert.applicantIndividual?.fullName}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        (ID: {alert.applicantIndividual?.individualId} | BPL: {alert.applicantIndividual?.incomeCategory})
                      </span>
                    </h3>

                    {/* Triggering Rule & Explanation Box */}
                    <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        Triggering Rule: <span className="font-mono">{alert.triggeringRule}</span>
                      </div>
                      <p className="leading-relaxed">{alert.explanation}</p>
                    </div>

                    {/* Entity Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-slate-600">
                      {alert.relevantProperty && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            <strong>Property:</strong> {alert.relevantProperty.propertyId} ({alert.relevantProperty.addressLine1})
                          </span>
                        </div>
                      )}
                      {alert.relevantHousehold && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 flex items-center gap-2">
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            <strong>Household:</strong> {alert.relevantHousehold.householdId} ({alert.relevantHousehold.addressLine1})
                          </span>
                        </div>
                      )}
                    </div>

                    {alert.resolutionNotes && (
                      <div className="mt-2 text-xs bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-emerald-900">
                        <strong>Recorded Officer Justification:</strong> "{alert.resolutionNotes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Action CTA */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-end sm:items-center lg:items-end justify-center gap-2 flex-shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Detected: {new Date(alert.detectedAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleOpenReviewModal(alert)}
                    className="px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    Take Review Action <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Officer Decision Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-govTeal-700 uppercase bg-govTeal-50 px-2 py-0.5 rounded">
                  Officer Judicial Determination
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Review Potential Duplicate: {selectedAlert.alertId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {actionSuccess && (
              <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {actionSuccess}
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
              <div>
                <strong className="text-slate-900">Applicant:</strong> {selectedAlert.applicantIndividual?.fullName} (
                {selectedAlert.applicantIndividual?.individualId})
              </div>
              <div>
                <strong className="text-slate-900">Scheme:</strong> {selectedAlert.scheme?.name} (Scope:{' '}
                {selectedAlert.candidateType})
              </div>
              <div>
                <strong className="text-slate-900">Flagged Overlap:</strong> {selectedAlert.explanation}
              </div>
            </div>

            <form onSubmit={handleRecordDecision} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Determination Decision</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`p-3 border rounded-xl cursor-pointer transition-all flex flex-col gap-1 ${
                      decision === 'CONFIRMED_DUPLICATE'
                        ? 'border-red-500 bg-red-50/50 text-red-950 font-semibold ring-1 ring-red-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-red-700">
                      <input
                        type="radio"
                        name="decision"
                        value="CONFIRMED_DUPLICATE"
                        checked={decision === 'CONFIRMED_DUPLICATE'}
                        onChange={(e) => setDecision(e.target.value)}
                        className="text-red-600"
                      />
                      Confirm Duplicate
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Verified identical benefit already granted on this property/household. Rejects concurrent claim.
                    </span>
                  </label>

                  <label
                    className={`p-3 border rounded-xl cursor-pointer transition-all flex flex-col gap-1 ${
                      decision === 'MARKED_NOT_DUPLICATE'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <input
                        type="radio"
                        name="decision"
                        value="MARKED_NOT_DUPLICATE"
                        checked={decision === 'MARKED_NOT_DUPLICATE'}
                        onChange={(e) => setDecision(e.target.value)}
                        className="text-emerald-600"
                      />
                      Mark Not Duplicate
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Verified distinct dwelling, separate household roster, or unrelated benefit. Allows claim to proceed.
                    </span>
                  </label>

                  <label
                    className={`p-3 border rounded-xl cursor-pointer transition-all flex flex-col gap-1 ${
                      decision === 'INFO_REQUESTED'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-950 font-semibold ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-blue-700">
                      <input
                        type="radio"
                        name="decision"
                        value="INFO_REQUESTED"
                        checked={decision === 'INFO_REQUESTED'}
                        onChange={(e) => setDecision(e.target.value)}
                        className="text-blue-600"
                      />
                      Request Information
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Requests physical patwari deed, electricity division inspection, or family separation affidavit.
                    </span>
                  </label>

                  <label
                    className={`p-3 border rounded-xl cursor-pointer transition-all flex flex-col gap-1 ${
                      decision === 'ESCALATED'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-950 font-semibold ring-1 ring-purple-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-purple-700">
                      <input
                        type="radio"
                        name="decision"
                        value="ESCALATED"
                        checked={decision === 'ESCALATED'}
                        onChange={(e) => setDecision(e.target.value)}
                        className="text-purple-600"
                      />
                      Escalate for Senior Review
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Refer case to District Collectorate / Tehsildar Committee for field adjudication.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mandatory Justification Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  placeholder="State the verified ground for your decision (e.g., 'Field inspection of Plot 42-A confirms a single dwelling unit with functional sanitation unit installed under BR-2025-001; concurrent claim cannot be sanctioned per scheme rules')."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-govTeal-500 outline-none"
                  required
                />
                <span className="text-[11px] text-slate-400">
                  This justification is permanently stored in the audit trail with your digital credentials.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  {submitting ? 'Recording Decision...' : 'Confirm & Commit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateReviewCenterPage;
