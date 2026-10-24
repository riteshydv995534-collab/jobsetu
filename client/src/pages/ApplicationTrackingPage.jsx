import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileCheck2,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Banknote,
  Send,
  AlertCircle,
  FileText,
  User,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import TransparentEligibilityReport from '../components/TransparentEligibilityReport';
import ApplicationAssessmentReportModal from '../components/ApplicationAssessmentReportModal';

const QUICK_APPLICANT_SEARCHES = [
  'Arjun Singh',
  'Vikram Singh',
  'Meena Singh',
  'Neha Singh',
  'Rajesh Kumar'
];

const ApplicationTrackingPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Dedicated Section A-G Assessment Report Modal
  const [reportAppId, setReportAppId] = useState(null);

  // Detail Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetail, setAppDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status Action Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('UNDER_REVIEW');
  const [statusReason, setStatusReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Disbursement Modal State
  const [disbursementModalOpen, setDisbursementModalOpen] = useState(false);
  const [disbAmount, setDisbAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [disbursing, setDisbursing] = useState(false);

  const fetchApplications = async (page = 1, searchQuery = search, statusQ = statusFilter) => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (statusQ !== 'ALL') params.status = statusQ;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/applications', { params });
      if (res.data.success) {
        setApplications(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(1, search, statusFilter);
    if (id) {
      loadApplicationById(id);
    }
  }, [statusFilter, id]);

  const loadApplicationById = async (targetId) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/applications/${targetId}`);
      if (res.data.success && res.data.data) {
        setSelectedApp(res.data.data.application);
        setAppDetail(res.data.data);
      }
    } catch (err) {
      console.error('Failed loading application by id:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetail = async (app) => {
    setSelectedApp(app);
    try {
      setDetailLoading(true);
      const res = await api.get(`/applications/${app._id}`);
      if (res.data.success) {
        setAppDetail(res.data.data);
      }
    } catch (err) {
      console.error('Failed loading application detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!statusReason) {
      alert('A formal justification reason is required.');
      return;
    }

    try {
      setUpdating(true);
      const res = await api.patch(`/applications/${selectedApp._id}/status`, {
        status: newStatus,
        reason: statusReason
      });

      if (res.data.success) {
        alert(res.data.message);
        setStatusModalOpen(false);
        setStatusReason('');
        handleViewDetail(selectedApp);
        fetchApplications(pagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Status update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleDisbursementSubmit = async (e) => {
    e.preventDefault();
    if (!paymentRef) {
      alert('PFMS or DBT bank transaction reference is required.');
      return;
    }

    try {
      setDisbursing(true);
      const res = await api.post('/disbursements/record', {
        applicationId: selectedApp._id,
        amount: Number(disbAmount),
        paymentReference: paymentRef,
        paymentMethod: 'DBT_DIRECT_BENEFIT_TRANSFER',
        notes: `Executed via authenticated portal session by ${user?.name} (${user?.role})`
      });

      if (res.data.success) {
        alert('Direct Benefit Transfer successfully logged! Status updated to BENEFIT_DISBURSED.');
        setDisbursementModalOpen(false);
        handleViewDetail(selectedApp);
        fetchApplications(pagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Disbursement recording failed');
    } finally {
      setDisbursing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BENEFIT_DISBURSED':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Benefit Disbursed
          </span>
        );
      case 'APPROVED':
        return (
          <span className="bg-teal-100 text-teal-800 border border-teal-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            Sanction Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-blue-600 animate-spin" />
            Under Review
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-amber-600" />
            Submitted
          </span>
        );
      case 'VERIFICATION_PENDING':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-amber-600" />
            Verification Pending
          </span>
        );
      case 'INFORMATION_REQUIRED':
        return (
          <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 w-fit">
            <AlertCircle className="w-3 h-3 text-purple-600" />
            Info Required
          </span>
        );
      default:
        return <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Application Processing Workspace
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search applicant names, inspect verified registries, advance processing stages, and record official sanction decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            Reviewing Officer: <strong>{user?.name}</strong>
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Search Input */}
          <div className="flex-1 min-w-[280px] relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchApplications(1, search, statusFilter)}
              placeholder="Search by Applicant Name (e.g. Arjun Singh, Vikram, Meena), Citizen ID, or App ID..."
              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white transition font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchApplications(1, search, e.target.value);
            }}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 outline-none font-semibold"
          >
            <option value="ALL">All Application Stages</option>
            <option value="SUBMITTED">Submitted (Stage 1-2)</option>
            <option value="VERIFICATION_PENDING">Verification Pending</option>
            <option value="UNDER_REVIEW">Under Review (Stage 5)</option>
            <option value="INFORMATION_REQUIRED">Information Required</option>
            <option value="APPROVED">Approved (Sanctioned)</option>
            <option value="BENEFIT_DISBURSED">Benefit Disbursed (Stage 6 Paid)</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={() => fetchApplications(1, search, statusFilter)}
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-md transition flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>

        {/* Quick Applicant Search Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-teal-600" />
            Quick Applicant Search:
          </span>
          {QUICK_APPLICANT_SEARCHES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSearch(name);
                fetchApplications(1, name, statusFilter);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                search === name
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {name}
            </button>
          ))}
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchApplications(1, '', statusFilter);
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 ml-auto underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Applications Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Scheme Details</th>
                <th className="py-3 px-4">Applicant Citizen Name</th>
                <th className="py-3 px-4">Grant Amount</th>
                <th className="py-3 px-4">Received Date</th>
                <th className="py-3 px-4">Current Status & Authority</th>
                <th className="py-3 px-4">Overlap Check</th>
                <th className="py-3 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
                    <div>Loading application records...</div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No applications matched the specified name or status filter.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Application ID */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{app.applicationId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {app.sourceSystemReference || 'EXT-INGESTED'}
                      </div>
                    </td>

                    {/* Scheme */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{app.scheme?.name}</div>
                      <span className="text-[10px] text-teal-700 font-mono font-bold">
                        {app.scheme?.code} &bull; Scope: {app.scheme?.benefitScope || 'INDIVIDUAL'}
                      </span>
                    </td>

                    {/* Applicant Citizen Name (Prominently Displayed) */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        <span>{app.applicantIndividual?.fullName || 'Anonymous Beneficiary'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {app.applicantIndividual?.demoIdentifier || app.applicantIndividual?.individualId || 'DEMO-ID'}
                        </span>
                        {app.applicantIndividual?.incomeCategory && (
                          <span className="font-bold text-emerald-700">{app.applicantIndividual.incomeCategory}</span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{Number(app.requestedAmount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600">
                      {app.applicationDate ? new Date(app.applicationDate).toLocaleDateString('en-IN') : 'N/A'}
                    </td>

                    {/* Status & Reviewing Authority Officer */}
                    <td className="py-3 px-4">
                      {getStatusBadge(app.status)}
                      {app.reviewedBy?.name ? (
                        <div className="text-[10px] text-indigo-900 font-semibold mt-1 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                          <span>Auth: <strong>{app.reviewedBy.name}</strong></span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-1 italic">
                          Pending Officer Review
                        </div>
                      )}
                    </td>

                    {/* Duplicate Alert */}
                    <td className="py-3 px-4">
                      {app.hasDuplicateAlert ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          Overlap Flagged
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Clear
                        </span>
                      )}
                    </td>

                    {/* Workflow Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Advance / Improve Status Quick Button */}
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          handleViewDetail(app);
                          setStatusModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
                        title="Improve or advance application status"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        Update Status
                      </button>

                      <button
                        onClick={() => setReportAppId(app.applicationId || app._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition"
                        title="Open Consolidated Assessment Report (Sections A-G)"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        Report (A-G)
                      </button>

                      <button
                        onClick={() => handleViewDetail(app)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records recorded)
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => fetchApplications(pagination.page - 1, search, statusFilter)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-slate-300 rounded-lg bg-white font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchApplications(pagination.page + 1, search, statusFilter)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border border-slate-300 rounded-lg bg-white font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Application Detail & Lifecycle Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedApp.applicationId}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedApp.scheme?.name}</h3>
                <div className="text-xs text-slate-500">
                  Requested Benefit: <strong>₹{Number(selectedApp?.requestedAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
                <div>Retrieving full case records and timeline history...</div>
              </div>
            ) : !appDetail ? null : (
              <div className="space-y-5 text-xs">
                {/* Prominent Applicant Citizen & Reviewing Authority Card */}
                <div className="p-4 bg-teal-50/80 rounded-2xl border border-teal-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                      Applicant Beneficiary
                    </span>
                    <div className="text-sm font-black text-slate-900 flex items-center gap-2 mt-0.5">
                      <User className="w-4 h-4 text-teal-700" />
                      <span>{appDetail.application.applicantIndividual?.fullName}</span>
                      <span className="text-[10px] font-mono bg-teal-200/60 text-teal-900 px-1.5 py-0.2 rounded font-bold">
                        {appDetail.application.applicantIndividual?.demoIdentifier || appDetail.application.applicantIndividual?.individualId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 space-x-2">
                      <span>{appDetail.application.applicantIndividual?.gender || 'N/A'}</span>
                      <span>&bull;</span>
                      <span>{appDetail.application.applicantIndividual?.age || '25'} years</span>
                      <span>&bull;</span>
                      <span className="font-bold text-emerald-800">
                        Category: {appDetail.application.applicantIndividual?.incomeCategory || 'BPL'}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-teal-200 pt-2 sm:pt-0 sm:pl-4">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Reviewing Authority
                    </span>
                    <div className="text-sm font-bold text-slate-900 flex items-center sm:justify-end gap-1.5 mt-0.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>{appDetail.application.reviewedBy?.name || user?.name}</span>
                      <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                        {appDetail.application.reviewedBy?.role?.replace('_', ' ') || user?.role?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {appDetail.application.reviewedBy?.designation || user?.department || 'Welfare Department'}
                    </div>
                  </div>
                </div>

                {/* Operational Workflow Bar */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Application Status</span>
                    <div className="mt-0.5">{getStatusBadge(appDetail.application.status)}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Consolidated Section A-G Report */}
                    <button
                      onClick={() => setReportAppId(appDetail.application.applicationId || appDetail.application._id)}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Assessment Report (A-G)
                    </button>

                    {/* Change Status Button */}
                    <button
                      onClick={() => setStatusModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                      Update / Improve Status
                    </button>

                    {/* Execute DBT Disbursement */}
                    {appDetail.application.status === 'APPROVED' && (
                      <button
                        onClick={() => {
                          setDisbAmount(appDetail.application.requestedAmount);
                          setPaymentRef(`DBT-PFMS-${Date.now().toString().slice(-6)}`);
                          setDisbursementModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Execute DBT Disbursement
                      </button>
                    )}
                  </div>
                </div>

                {/* Transparent Eligibility Evaluation Component */}
                {appDetail.assessments && appDetail.assessments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-teal-600" />
                      Statutory Eligibility Assessment & Verification Breakdown
                    </h4>
                    <TransparentEligibilityReport
                      evaluation={appDetail.assessments[0]}
                      application={appDetail.application}
                      applicant={appDetail.application?.applicantIndividual}
                      scheme={appDetail.application?.scheme}
                      household={appDetail.application?.household}
                      property={appDetail.application?.property}
                    />
                  </div>
                )}

                {/* Audit Lifecycle Timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-600" />
                    Immutable Status Progression Timeline
                  </h4>
                  <div className="space-y-2 border-l-2 border-teal-500 pl-3 ml-2">
                    {appDetail.statusHistory.map((s, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{s.previousStatus} &rarr; {s.newStatus}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(s.changedAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Authority Officer: <strong className="text-slate-800">{s.changedBy?.name || 'System'}</strong>
                        </div>
                        {s.changeReason && (
                          <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                            "{s.changeReason}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Status Modal (With Applicant & Authority Names Clearly Visible) */}
      {statusModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Advance / Improve Application Status</h3>
              <button onClick={() => setStatusModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            {/* Applicant & Officer Information Strip */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Applicant Citizen:</span>
                <strong className="text-slate-900">{selectedApp.applicantIndividual?.fullName || 'Beneficiary'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Citizen ID:</span>
                <span className="font-mono text-teal-800 font-bold">
                  {selectedApp.applicantIndividual?.demoIdentifier || selectedApp.applicantIndividual?.individualId || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reviewing Authority:</span>
                <strong className="text-indigo-900">{user?.name} ({user?.role?.replace('_', ' ')})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-slate-800">{selectedApp.status}</span>
              </div>
            </div>

            <form onSubmit={handleStatusChangeSubmit} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Target Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold text-slate-800 bg-slate-50 focus:bg-white"
                >
                  <option value="UNDER_REVIEW">UNDER_REVIEW (Initiate in-depth examination)</option>
                  <option value="APPROVED">APPROVED (Sanction grant - moves to Stage 5 Sanction)</option>
                  <option value="VERIFICATION_PENDING">VERIFICATION_PENDING (Awaiting evidence)</option>
                  <option value="INFORMATION_REQUIRED">INFORMATION_REQUIRED (Request documents from applicant)</option>
                  <option value="REJECTED">REJECTED (Disqualify with recorded statutory reason)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Officer Justification / Audit Reason *
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Record the official rationale for updating this applicant's status..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
                >
                  {updating ? 'Recording Decision...' : 'Save & Record Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execute DBT Disbursement Modal */}
      {disbursementModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900">Execute Direct Benefit Transfer (DBT)</h3>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 text-[11px] space-y-1">
              <div>Applicant: <strong>{selectedApp.applicantIndividual?.fullName}</strong></div>
              <div>Scheme: <strong>{selectedApp.scheme?.name}</strong></div>
              <div>Sanctioning Officer: <strong>{user?.name}</strong></div>
            </div>

            <form onSubmit={handleDisbursementSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursed Amount (₹) *</label>
                <input
                  type="number"
                  value={disbAmount}
                  onChange={(e) => setDisbAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank / PFMS Reference Number *</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDisbursementModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disbursing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md"
                >
                  {disbursing ? 'Transmitting...' : 'Record Payment Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consolidated Application Assessment Report (Sections A through G) */}
      {reportAppId && (
        <ApplicationAssessmentReportModal
          applicationId={reportAppId}
          onClose={() => setReportAppId(null)}
        />
      )}
    </div>
  );
};

export default ApplicationTrackingPage;