import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Database,
  Search,
  Filter,
  Users,
  Home,
  Scroll,
  FileCheck2,
  Award,
  Scale,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  FileText
} from 'lucide-react';

const TABS = [
  { id: 'INDIVIDUALS', label: 'Individuals', icon: Users },
  { id: 'HOUSEHOLDS', label: 'Households', icon: Home },
  { id: 'SCHEMES', label: 'Schemes', icon: Scroll },
  { id: 'APPLICATIONS', label: 'Applications', icon: FileCheck2 },
  { id: 'BENEFITS', label: 'Benefit History', icon: Award },
  { id: 'ALLOCATIONS', label: 'Household Allocations', icon: Scale },
  { id: 'VERIFICATIONS', label: 'Verification Results', icon: ShieldCheck }
];

const BenefitRecordsExplorerPage = () => {
  const [activeTab, setActiveTab] = useState('INDIVIDUALS');
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchRecords(1);
  }, [activeTab, statusFilter]);

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/benefit-records', {
        params: {
          tab: activeTab,
          search: searchQuery,
          status: statusFilter,
          page,
          limit: 15
        }
      });
      if (res.data) {
        setRecords(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load explorer records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords(1);
  };

  const renderBadge = (status) => {
    if (!status) return null;
    let colorClass = 'bg-slate-100 text-slate-700';
    if (['VERIFIED', 'APPROVED', 'DISBURSED', 'SANCTIONED', 'ACTIVE', 'SATISFIED'].includes(status)) {
      colorClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    } else if (['PENDING', 'SUBMITTED', 'RECOMMENDED_FOR_ALLOCATION', 'IN_REVIEW', 'PRIORITY_REVIEW_REQUIRED'].includes(status)) {
      colorClass = 'bg-amber-100 text-amber-800 border border-amber-300';
    } else if (['REJECTED', 'INELIGIBLE', 'DUPLICATE_FLAGGED'].includes(status)) {
      colorClass = 'bg-rose-100 text-rose-800 border border-rose-300';
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${colorClass}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-govTeal-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-navy-700">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-govTeal-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-govTeal-500/20 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-govTeal-500/30">
              <Database className="w-3.5 h-3.5" /> Administrative Master Explorer
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Universal Benefit Records Explorer
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Inspect, query, and audit all 7 foundational registries of the JanSetu benefit distribution infrastructure across citizens, families, schemes, allocations, and verifications.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRecords(pagination.page)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 border border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab.toLowerCase()} by name or ID...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-govTeal-500 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-govTeal-700 hover:bg-govTeal-800 text-white rounded text-[11px] font-bold"
          >
            Find
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-govTeal-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {activeTab === 'INDIVIDUALS' && (
                <>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                </>
              )}
              {activeTab === 'APPLICATIONS' && (
                <>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="DISBURSED">DISBURSED</option>
                </>
              )}
              {activeTab === 'BENEFITS' && (
                <>
                  <option value="SANCTIONED">SANCTIONED</option>
                  <option value="DISBURSED">DISBURSED</option>
                </>
              )}
              {activeTab === 'ALLOCATIONS' && (
                <>
                  <option value="RECOMMENDED_FOR_ALLOCATION">RECOMMENDED</option>
                  <option value="PRIORITY_REVIEW_REQUIRED">REVIEW REQUIRED</option>
                  <option value="ALLOCATION_APPROVED">APPROVED</option>
                  <option value="BENEFIT_DISBURSED">DISBURSED</option>
                </>
              )}
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Total: <strong className="text-slate-800">{pagination.total}</strong> records
          </span>
        </div>
      </div>

      {/* Table Data View */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-govTeal-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-600 font-medium">Loading database records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No records found for the selected tab and filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                {activeTab === 'INDIVIDUALS' && (
                  <tr>
                    <th className="py-3 px-4">Individual ID</th>
                    <th className="py-3 px-4">Citizen Name</th>
                    <th className="py-3 px-4">Demographics</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Income & Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                )}
                {activeTab === 'HOUSEHOLDS' && (
                  <tr>
                    <th className="py-3 px-4">Household Ref</th>
                    <th className="py-3 px-4">Head of Family</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Ration Card #</th>
                    <th className="py-3 px-4">Income</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                )}
                {activeTab === 'SCHEMES' && (
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Scheme Name</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Benefit Amount</th>
                    <th className="py-3 px-4">Repeat Policy</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                )}
                {activeTab === 'APPLICATIONS' && (
                  <tr>
                    <th className="py-3 px-4">App ID</th>
                    <th className="py-3 px-4">Scheme</th>
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Requested ₹</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                )}
                {activeTab === 'BENEFITS' && (
                  <tr>
                    <th className="py-3 px-4">Benefit ID / Ref</th>
                    <th className="py-3 px-4">Scheme</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Sanction Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                )}
                {activeTab === 'ALLOCATIONS' && (
                  <tr>
                    <th className="py-3 px-4">Case Ref</th>
                    <th className="py-3 px-4">Household</th>
                    <th className="py-3 px-4">Scheme</th>
                    <th className="py-3 px-4">Engine Recommendation</th>
                    <th className="py-3 px-4">Override</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                )}
                {activeTab === 'VERIFICATIONS' && (
                  <tr>
                    <th className="py-3 px-4">Assessment ID</th>
                    <th className="py-3 px-4">Citizen</th>
                    <th className="py-3 px-4">Scheme</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Evaluated At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/70">
                    {activeTab === 'INDIVIDUALS' && (
                      <>
                        <td className="py-2.5 px-4 font-mono font-bold text-govTeal-700">
                          {r.individualId}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {r.fullName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.ageYears || 35} yrs • {r.gender}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.district}, {r.state}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-700">
                          ₹{(r.annualIncome || 0).toLocaleString('en-IN')} ({r.incomeCategory})
                        </td>
                        <td className="py-2.5 px-4">{renderBadge(r.verificationStatus)}</td>
                      </>
                    )}

                    {activeTab === 'HOUSEHOLDS' && (
                      <>
                        <td className="py-2.5 px-4 font-mono font-bold text-navy-800">
                          {r.householdReference || r.householdId}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {r.headOfHousehold?.fullName || 'Family Head'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.district}, {r.state}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {r.rationCardNumber || 'RC-PAT-091'}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-700">
                          ₹{(r.annualHouseholdIncome || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4">{renderBadge(r.verificationStatus)}</td>
                      </>
                    )}

                    {activeTab === 'SCHEMES' && (
                      <>
                        <td className="py-2.5 px-4 font-mono font-bold text-govTeal-700">
                          {r.code}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{r.name}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.benefitScope}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{r.benefitCategory}</td>
                        <td className="py-2.5 px-4 font-extrabold text-navy-900">
                          ₹{(r.benefitAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{r.repeatBenefitPolicy}</td>
                      </>
                    )}

                    {activeTab === 'APPLICATIONS' && (
                      <>
                        <td className="py-2.5 px-4 font-mono font-bold text-govTeal-700">
                          {r.applicationId}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {r.scheme?.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.applicantIndividual?.fullName}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-emerald-700">
                          ₹{(r.requestedAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {new Date(r.applicationDate || r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4">{renderBadge(r.status)}</td>
                      </>
                    )}

                    {activeTab === 'BENEFITS' && (
                      <>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {r.referenceNumber || r.benefitId}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {r.scheme?.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.recipientIndividual?.fullName || r.recipientHousehold?.householdId}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-emerald-700">
                          ₹{(r.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.sanctionDate ? new Date(r.sanctionDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-4">{renderBadge(r.status)}</td>
                      </>
                    )}

                    {activeTab === 'ALLOCATIONS' && (
                      <>
                        <td className="py-2.5 px-4 font-mono font-bold text-navy-800">
                          {r.allocationReference}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {r.household?.householdId}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {r.scheme?.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.engineRecommendation}
                        </td>
                        <td className="py-2.5 px-4">
                          {r.isManualOverride ? (
                            <span className="text-purple-700 font-bold">YES</span>
                          ) : (
                            <span className="text-slate-400">NO</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">{renderBadge(r.status)}</td>
                      </>
                    )}

                    {activeTab === 'VERIFICATIONS' && (
                      <>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {r.assessmentId || r._id.slice(-8)}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {r.individual?.fullName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{r.scheme?.name}</td>
                        <td className="py-2.5 px-4">{renderBadge(r.overallResult)}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {new Date(r.createdAt || r.evaluatedAt).toLocaleDateString()}
                        </td>
                      </>
                    )}

                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
            <strong className="text-slate-800">{pagination.totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRecords(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4 inline" /> Prev
            </button>
            <button
              onClick={() => fetchRecords(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Inspect Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-govTeal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Inspect Record: {activeTab}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify(selectedRecord, null, 2)}</pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                ID: {selectedRecord._id}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenefitRecordsExplorerPage;
