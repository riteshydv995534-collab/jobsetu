import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  BarChart3,
  ShieldCheck,
  TrendingUp,
  Banknote,
  PieChart as PieIcon,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const STATUS_COLORS = {
  SUBMITTED: '#3B82F6',
  UNDER_REVIEW: '#F59E0B',
  VERIFICATION_PENDING: '#EC4899',
  INFORMATION_REQUIRED: '#F97316',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  BENEFIT_DISBURSED: '#8B5CF6'
};

const ReportsAnalyticsPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [schemes, setSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('ALL');

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [days, selectedSchemeId]);

  const fetchSchemes = async () => {
    try {
      const res = await api.get('/schemes');
      if (res.data.success) {
        let available = res.data.data;
        if (user && user.assignedSchemes && user.assignedSchemes.length > 0 && !['SUPER_ADMIN', 'RECORDS_ADMIN'].includes(user.role)) {
          const assignedIds = user.assignedSchemes.map((s) => (s && s._id ? s._id : s).toString());
          available = available.filter((s) => assignedIds.includes(s._id.toString()));
        }
        setSchemes(available);
      }
    } catch (err) {
      console.error('Failed fetching schemes:', err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/reports/analytics?days=${days}`;
      if (selectedSchemeId && selectedSchemeId !== 'ALL') {
        url += `&schemeId=${selectedSchemeId}`;
      }
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed fetching analytics data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <div className="w-8 h-8 border-3 border-govTeal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div>Computing database analytics across welfare registers...</div>
      </div>
    );
  }

  const {
    summary = {},
    dailyActivity = [],
    statusDistribution = [],
    clearanceTrend = [],
    schemePerformance = [],
    applicationAgeBreakdown = [],
    householdAllocationCases = []
  } = data || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Filter Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
              <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
              Executive Analytics & Turnaround Reporting
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Application Analytics & Reports
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Empirical metrics computed dynamically from MongoDB application collections, decision records, and household allocations.
            </p>
          </div>

          <button
            onClick={fetchReports}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Metrics
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-700">Scheme:</span>
              <select
                value={selectedSchemeId}
                onChange={(e) => setSelectedSchemeId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 font-medium text-slate-800 outline-hidden"
              >
                <option value="ALL">All Authorized Schemes</option>
                {schemes.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-700">Time Horizon:</span>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 font-medium text-slate-800 outline-hidden"
              >
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Assigned Access:</span>
            <span className="text-[11px] font-bold text-govTeal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {['SUPER_ADMIN', 'RECORDS_ADMIN'].includes(user?.role) ? 'All Schemes' : `${schemes.length} Scheme(s)`}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase text-slate-400">Total Applications</span>
            <BarChart3 className="w-4 h-4 text-govTeal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{summary.totalApplications || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Processed in Scope</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase text-slate-400">Cleared Applications</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{summary.clearedTotal || 0}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.clearanceRate || 0}% Clearance Turnaround</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase text-slate-400">Approved Beneficiaries</span>
            <Award className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-govTeal-700">{summary.approvedTotal || 0}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.approvalRate || 0}% Approval Rate of Cleared</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase text-slate-400">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{summary.pendingTotal || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Under Departmental Verification</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Daily Application Activity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chart 1: Daily Application Activity</h3>
            <p className="text-xs text-slate-500">Received intake vs. cleared decisions vs. active pending pipeline</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#028090" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#028090" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="clearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="received" name="Received" stroke="#028090" fill="url(#recvGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="cleared" name="Cleared" stroke="#10B981" fill="url(#clearGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="#F59E0B" fill="none" strokeWidth={1.5} strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Application Status Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chart 2: Application Status Distribution</h3>
            <p className="text-xs text-slate-500">Live breakdown of applications by administrative status</p>
          </div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution.filter((s) => s.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || '#94A3B8'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Approval and Clearance Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chart 3: Approval and Clearance Trend</h3>
            <p className="text-xs text-slate-500">Clearance volume and rolling approval compliance %</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clearanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="left" dataKey="cleared" name="Cleared Cases" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="approvalRate" name="Approval Rate (%)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Scheme-wise Performance */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chart 4: Scheme-wise Performance</h3>
            <p className="text-xs text-slate-500">Received intake vs. approved grants across schemes</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schemePerformance} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="schemeCode" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="received" name="Received" fill="#028090" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 5: Pending Application Age Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chart 5: Pending Application Age Breakdown</h3>
            <p className="text-xs text-slate-500">Turnaround age brackets for applications awaiting verification</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={applicationAgeBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fontWeight: 'bold' }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" name="Pending Cases" radius={[0, 6, 6, 0]}>
                  <Cell fill="#10B981" />
                  <Cell fill="#028090" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#EF4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 6: Household Allocation Cases */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chart 6: Household Allocation Cases</h3>
            <p className="text-xs text-slate-500">Resolution states for single-benefit competing family claims</p>
          </div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(householdAllocationCases || []).filter((c) => c && c.count > 0)}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name || 'Case'}: ${Number(percent ? percent * 100 : 0).toFixed(0)}%`}
                >
                  <Cell fill="#028090" />
                  <Cell fill="#10B981" />
                  <Cell fill="#8B5CF6" />
                  <Cell fill="#EF4444" />
                  <Cell fill="#F59E0B" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B192C', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalyticsPage;
