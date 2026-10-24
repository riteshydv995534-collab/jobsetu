import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Eye,
  Calendar,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  FileText
} from 'lucide-react';

const IndividualRegistryPage = () => {
  const { user } = useAuth();
  const [individuals, setIndividuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [incomeFilter, setIncomeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Detail Modal State
  const [selectedInd, setSelectedInd] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('family');

  // Create Modal State (Admin)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    gender: 'MALE',
    dateOfBirth: '',
    incomeCategory: 'BPL',
    annualIncome: 60000,
    phone: '',
    email: '',
    notes: '',
    reason: 'Initial citizen civil registration'
  });

  const fetchIndividuals = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (incomeFilter !== 'ALL') params.incomeCategory = incomeFilter;
      if (statusFilter !== 'ALL') params.verificationStatus = statusFilter;

      const res = await api.get('/individuals', { params });
      if (res.data.success) {
        setIndividuals(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed fetching individuals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndividuals(1);
  }, [incomeFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIndividuals(1);
  };

  const handleViewDetail = async (ind) => {
    setSelectedInd(ind);
    setActiveTab('family');
    try {
      setDetailLoading(true);
      const res = await api.get(`/individuals/${ind._id}`);
      if (res.data.success) {
        setDetailData(res.data.data);
      }
    } catch (err) {
      console.error('Failed loading individual details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/individuals', createForm);
      if (res.data.success) {
        setCreateModalOpen(false);
        setCreateForm({
          fullName: '',
          gender: 'MALE',
          dateOfBirth: '',
          incomeCategory: 'BPL',
          annualIncome: 60000,
          phone: '',
          email: '',
          notes: '',
          reason: 'Initial citizen civil registration'
        });
        fetchIndividuals(1);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Creation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Individual Civil Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified citizen identities with decoupled family relationships, independent BPL classifications, and full benefit history.
          </p>
        </div>

        {user?.role === 'RECORDS_ADMIN' && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register New Citizen
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Citizen Name, Individual ID (IND-001), or Phone..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-govTeal-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </form>

        <select
          value={incomeFilter}
          onChange={(e) => setIncomeFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 outline-none"
        >
          <option value="ALL">All Income Categories</option>
          <option value="BPL">BPL (Below Poverty Line)</option>
          <option value="AAY">AAY (Antyodaya Anna)</option>
          <option value="APL">APL (Above Poverty Line)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 outline-none"
        >
          <option value="ALL">All Verification Statuses</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING">Pending Verification</option>
          <option value="FLAGGED_CONFLICT">Flagged Conflict</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Citizen ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">DOB / Age</th>
                <th className="py-3 px-4">Income Category</th>
                <th className="py-3 px-4">Current Household</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Claims</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading citizen registry records...
                  </td>
                </tr>
              ) : individuals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching citizen records found.
                  </td>
                </tr>
              ) : (
                individuals.map((ind) => (
                  <tr key={ind._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{ind.individualId}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ind.fullName}</div>
                      <div className="text-[11px] text-slate-400">{ind.phone || 'No phone recorded'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {ind.dateOfBirth && !isNaN(new Date(ind.dateOfBirth).getTime())
                        ? `${new Date(ind.dateOfBirth).toLocaleDateString()} (${new Date().getFullYear() - new Date(ind.dateOfBirth).getFullYear()}y)`
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ind.incomeCategory === 'AAY'
                            ? 'bg-purple-100 text-purple-800'
                            : ind.incomeCategory === 'BPL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ind.incomeCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {ind.currentHousehold ? (
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {ind.currentHousehold.householdId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {ind.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{ind.applicationCount || 0}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewDetail(ind)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => fetchIndividuals(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchIndividuals(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Individual Detail Modal */}
      {selectedInd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs font-bold text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedInd.individualId}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedInd.fullName}</h3>
                <p className="text-xs text-slate-500">
                  Income Category: <strong className="text-slate-800">{selectedInd.incomeCategory}</strong> (Assessed independently from relatives)
                </p>
              </div>
              <button
                onClick={() => setSelectedInd(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mt-4 text-xs font-bold text-slate-500 gap-4">
              <button
                onClick={() => setActiveTab('family')}
                className={`pb-2 transition-colors ${
                  activeTab === 'family' ? 'text-govTeal-700 border-b-2 border-govTeal-600 font-extrabold' : 'hover:text-slate-800'
                }`}
              >
                Family Relationships
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 transition-colors ${
                  activeTab === 'history' ? 'text-govTeal-700 border-b-2 border-govTeal-600 font-extrabold' : 'hover:text-slate-800'
                }`}
              >
                Household History
              </button>
              <button
                onClick={() => setActiveTab('benefits')}
                className={`pb-2 transition-colors ${
                  activeTab === 'benefits' ? 'text-govTeal-700 border-b-2 border-govTeal-600 font-extrabold' : 'hover:text-slate-800'
                }`}
              >
                Benefit Records
              </button>
              <button
                onClick={() => setActiveTab('audits')}
                className={`pb-2 transition-colors ${
                  activeTab === 'audits' ? 'text-govTeal-700 border-b-2 border-govTeal-600 font-extrabold' : 'hover:text-slate-800'
                }`}
              >
                Audit Events
              </button>
            </div>

            <div className="py-4">
              {detailLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading profile data...</div>
              ) : !detailData ? (
                <div className="text-xs text-slate-400">No profile data available.</div>
              ) : (
                <div>
                  {activeTab === 'family' && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 mb-2">
                        Registered family relations. Note: Kinship does NOT automatically transfer BPL status or disqualifications.
                      </div>
                      {detailData.familyRelationships.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">No family links recorded.</div>
                      ) : (
                        detailData.familyRelationships.map((rel) => (
                          <div
                            key={rel._id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{rel.relative?.fullName}</span>{' '}
                              <span className="text-slate-400">({rel.relative?.individualId})</span>
                              <div className="text-[11px] text-slate-500">
                                Relationship: <span className="font-semibold text-navy-800">{rel.relationshipType}</span>
                              </div>
                            </div>
                            <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                              Independent BPL: {rel.relative?.incomeCategory || 'BPL'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 mb-2">
                        Preserved household residence history with verified timestamps and reasons:
                      </div>
                      {detailData.membershipHistory.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">No residence history found.</div>
                      ) : (
                        detailData.membershipHistory.map((m) => (
                          <div key={m._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-navy-900">{m.household?.householdId} — {m.household?.addressLine1}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.isCurrent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                {m.isCurrent ? 'Active Roster' : 'Past Residence'}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              Role: <strong>{m.relationshipToHead}</strong> | From: {new Date(m.startDate).toLocaleDateString()}{' '}
                              {m.endDate ? `to ${new Date(m.endDate).toLocaleDateString()}` : 'to Present'}
                            </div>
                            {m.reasonForChange && (
                              <div className="text-[11px] text-slate-600 italic">Ground: {m.reasonForChange}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'benefits' && (
                    <div className="space-y-2">
                      {detailData.benefitHistory.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">No historical benefits sanctioned for this citizen.</div>
                      ) : (
                        detailData.benefitHistory.map((b) => (
                          <div key={b._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                            <div>
                              <div className="font-bold text-slate-900">{b.scheme?.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Record: {b.recordId} | Sanctioned: {b.sanctionDate ? new Date(b.sanctionDate).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-govTeal-700 text-sm">₹{Number(b.benefitAmount || 0).toLocaleString('en-IN')}</div>
                              <span className="text-[10px] uppercase font-bold text-slate-500">{b.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'audits' && (
                    <div className="space-y-2">
                      {detailData.auditLogs.map((a) => (
                        <div key={a._id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                          <div className="flex justify-between text-slate-500 text-[11px]">
                            <span className="font-mono font-bold text-slate-800">{a.action}</span>
                            <span>{new Date(a.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-slate-600 mt-0.5">by {a.actingUserName} ({a.userRole})</div>
                          {a.reasonNotes && <div className="text-slate-500 italic mt-0.5">"{a.reasonNotes}"</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register Individual Modal (Admin Only) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Register New Citizen Profile</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-govTeal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={createForm.gender}
                    onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={createForm.dateOfBirth}
                    onChange={(e) => setCreateForm({ ...createForm, dateOfBirth: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Income / BPL Category</label>
                  <select
                    value={createForm.incomeCategory}
                    onChange={(e) => setCreateForm({ ...createForm, incomeCategory: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="BPL">BPL (Below Poverty Line)</option>
                    <option value="AAY">AAY (Antyodaya Anna Yojana)</option>
                    <option value="APL">APL (Above Poverty Line)</option>
                    <option value="NONE">None</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Annual Income (₹)</label>
                  <input
                    type="number"
                    value={createForm.annualIncome}
                    onChange={(e) => setCreateForm({ ...createForm, annualIncome: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="9829000000"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="demo@jansetu.in"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualRegistryPage;
