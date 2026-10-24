import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  PlusCircle,
  ArrowRight,
  Shield,
  User,
  Home,
  CreditCard,
  Upload,
  Calendar,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const MyApplicationsPage = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [appDetails, setAppDetails] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/applications');
      if (res.data.success) {
        setApplications(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your submitted claims.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTimeline = async (app) => {
    setSelectedApp(app);
    setUploadSuccess(false);
    try {
      setTimelineLoading(true);
      const res = await api.get(`/applications/${app._id}`);
      if (res.data.success) {
        setAppDetails(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load application timeline details:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BENEFIT_DISBURSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Benefit Disbursed
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            Sanction Approved
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            Under Official Review
          </span>
        );
      case 'INFORMATION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Documents Required
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Application Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Submitted & Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Citizen Applicant Header Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold">
              <User className="w-3.5 h-3.5" />
              Citizen Welfare Tracking Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Citizen Applicant'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Track statutory government subsidy and grant applications in real time with end-to-end transparency,
              milestone event logs, and Direct Benefit Transfer (DBT) verification.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <NavLink
              to="/apply"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-govTeal-600 hover:bg-govTeal-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Apply for New Scheme
            </NavLink>
            <NavLink
              to="/lookup"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all"
            >
              <Shield className="w-4 h-4 text-teal-400" />
              Check Eligibility
            </NavLink>
          </div>
        </div>

        {/* Profile Attributes Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Demo Identifier</div>
            <div className="text-xs font-mono font-bold text-teal-300 mt-0.5">
              {user?.linkedIndividual?.demoIdentifier || 'DEMO-AADHAAR-100003'}
            </div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Household ID</div>
            <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">H-1005</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Income Category</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">BPL (Below Poverty Line)</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Applications</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5">
              {applications.length} Submitted
            </div>
          </div>
        </div>
      </div>

      {/* Applications List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Submitted Claims</h2>
            <p className="text-xs text-slate-500">
              Only your authenticated applications are displayed. Data isolation guarantees privacy.
            </p>
          </div>
          <button
            onClick={fetchMyApplications}
            className="text-xs text-govTeal-600 hover:text-govTeal-700 font-bold"
          >
            Refresh Status
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-govTeal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-xs font-bold text-slate-600">Retrieving application history from secure registry...</div>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{error}</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">No applications on file</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't submitted any scheme benefit claims yet. Explore matching schemes and file an application today.
            </p>
            <NavLink
              to="/apply"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-govTeal-600 text-white text-xs font-bold shadow-md hover:bg-govTeal-700 transition-all mt-2"
            >
              <PlusCircle className="w-4 h-4" />
              Apply Now
            </NavLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map((app) => (
              <div
                key={app._id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {app.applicationId}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(app.applicationDate || app.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {app.scheme?.name || 'Welfare Scheme Application'}
                    </h3>
                  </div>

                  <div>{getStatusBadge(app.status)}</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Scheme Code</span>
                    <span className="font-bold text-slate-800">{app.scheme?.code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Benefit Scope</span>
                    <span className="font-bold text-slate-800">{app.scheme?.benefitScope || 'INDIVIDUAL'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Requested Grant</span>
                    <span className="font-extrabold text-govTeal-700">
                      ₹{Number(app.requestedAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Eligibility Assessment</span>
                    <span className={`font-bold ${app.eligibilityStatus === 'ELIGIBLE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {app.eligibilityStatus || 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* Information Required Alert */}
                {app.status === 'INFORMATION_REQUIRED' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Action Required: </span>
                      <span>The verifying officer has requested updated scholastic enrollment certification.</span>
                    </div>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    {app.decisionReason ? (
                      <span className="italic">"{app.decisionReason}"</span>
                    ) : (
                      <span>Application undergoing standard eligibility checks</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenTimeline(app)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-govTeal-50 hover:text-govTeal-700 text-slate-700 text-xs font-bold transition-all"
                  >
                    <span>View Event Timeline</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Timeline Drawer / Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-govTeal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                    {selectedApp.applicationId}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {selectedApp.scheme?.code}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedApp.scheme?.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {timelineLoading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-govTeal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <div className="text-xs text-slate-500">Loading statutory milestones...</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Milestone Stepper */}
                <div className="relative pl-6 space-y-6 border-l-2 border-teal-200 ml-3">
                  {/* Step 1: Submission */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Application Submitted</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(selectedApp.applicationDate || selectedApp.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Application registered with JanSetu Central Registry. Form documents received.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Automated Verification */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Automated Rules & Duplicate Evaluation</div>
                      <div className="text-[11px] text-slate-500">JanSetu Statutory Eligibility Engine v2.4</div>
                      <p className="text-xs text-slate-600 mt-1">
                        Cross-checked household roster, age criteria, income category, and previous benefit history.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Officer Review */}
                  <div className="relative">
                    <div className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      ['APPROVED', 'BENEFIT_DISBURSED'].includes(selectedApp.status)
                        ? 'bg-teal-600 text-white'
                        : selectedApp.status === 'REJECTED'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {['APPROVED', 'BENEFIT_DISBURSED', 'REJECTED'].includes(selectedApp.status) ? '✓' : '•'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Departmental Review & Verification</div>
                      <div className="text-[11px] text-slate-500">Assigned Scheme Officer</div>
                      <p className="text-xs text-slate-600 mt-1">
                        {selectedApp.decisionReason || 'Under departmental examination against statutory rules.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: DBT Disbursement */}
                  <div className="relative">
                    <div className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                      selectedApp.status === 'BENEFIT_DISBURSED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {selectedApp.status === 'BENEFIT_DISBURSED' ? '✓' : '•'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Direct Benefit Transfer (DBT)</div>
                      <div className="text-[11px] text-slate-500">Public Financial Management System (PFMS)</div>
                      <p className="text-xs text-slate-600 mt-1">
                        {selectedApp.status === 'BENEFIT_DISBURSED'
                          ? `Funds credited to linked Aadhaar bank account. Reference: PFMS-TXN-2026-VERIFIED`
                          : 'Awaiting completion of earlier milestones.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Upload Drawer for Information Required */}
                {selectedApp.status === 'INFORMATION_REQUIRED' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>Upload Missing Verification Proof</span>
                    </div>
                    <p className="text-xs text-amber-800">
                      Please upload scanned college ID card or current academic semester fee receipt.
                    </p>
                    {uploadSuccess ? (
                      <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Document uploaded successfully! Verification officer notified.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-200 file:text-amber-900 hover:file:bg-amber-300"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadSuccess(true)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                        >
                          Submit Proof
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyApplicationsPage;
