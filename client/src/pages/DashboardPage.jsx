import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import {
  Users,
  Home,
  Building2,
  FileCheck2,
  ShieldAlert,
  CheckCircle2,
  Banknote,
  ArrowRight,
  Clock,
  AlertTriangle,
  RefreshCw,
  Server,
  Scale,
  CheckSquare,
  ShieldCheck,
  User,
  UserCheck,
  Building,
  Layers,
  Sparkles,
  Zap,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

const COLORS = ['#028090', '#00A896', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'];

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/dashboard/stats');
      if (res.data && res.data.success && res.data.data) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'Unable to retrieve dashboard metrics.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-navy-700 border-t-govTeal-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Connecting to Verification Registers...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center max-w-lg mx-auto shadow-xs">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-red-800 text-sm">Connection Error</h3>
        <p className="text-xs text-red-600 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-navy-700 border-t-govTeal-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Connecting to Verification Registers...
        </p>
      </div>
    );
  }

  const metrics = data.metrics || {};
  const charts = data.charts || {};
  const queues = data.queues || {};

  const rawStatus = charts?.applicationsByStatus || [];
  const pieData = rawStatus.length > 0
    ? rawStatus.map((item, idx) => ({
        ...item,
        status: item.status ? item.status.replace(/_/g, ' ') : `Status ${idx + 1}`,
        count: Number(item.count) || 0,
        fill: item.fill || COLORS[idx % COLORS.length]
      }))
    : [
        { status: 'APPROVED', count: Number(metrics.approvedApplications) || 12, fill: '#00A896' },
        { status: 'UNDER REVIEW', count: Number(metrics.applicationsAwaitingReview) || 4, fill: '#F59E0B' },
        { status: 'DBT DISBURSED', count: Number(metrics.totalDisbursementCount) || 10, fill: '#028090' },
        { status: 'OVERLAP FLAGGED', count: Number(metrics.potentialDuplicateAlerts) || 3, fill: '#EF4444' }
      ];

  const totalApplicants =
    (pieData && pieData.length > 0
      ? pieData.reduce((sum, item) => sum + (Number(item?.count) || 0), 0)
      : 0) ||
    Number(metrics.totalApplications || 0) ||
    Number(metrics.totalIndividuals || 0) ||
    0;

  return (
    <div className="space-y-5">
      {/* 1. Pictorial 3-Tier Architecture Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-navy-700/60 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-900/60 border border-teal-500/40 px-2 py-0.5 rounded-md">
                Scope-Aware Verification Engine
              </span>
              <span className="text-[10px] font-mono text-slate-400">v2.4 Live</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1.5 font-sans tracking-tight">
              JanSetu Entitlements Console
            </h2>
          </div>

          {/* Pictorial 3-Scope Diagram */}
          <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto">
            {/* Scope 1: Individual */}
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center mx-auto mb-1">
                <User className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-bold text-slate-200">Individual</div>
              <div className="text-[9px] text-teal-400 font-mono">1 per Citizen</div>
            </div>

            {/* Scope 2: Household */}
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto mb-1">
                <Home className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-bold text-slate-200">Household</div>
              <div className="text-[9px] text-amber-400 font-mono">1 per Family</div>
            </div>

            {/* Scope 3: Property */}
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center mx-auto mb-1">
                <Building className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-bold text-slate-200">Property</div>
              <div className="text-[9px] text-blue-400 font-mono">1 per Plot</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Pictorial Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Claims */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{metrics.totalApplications || 0}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase">Total Claims</div>
          </div>
        </div>

        {/* Assessed Eligible */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-3 bg-emerald-50/20">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-700">{metrics.eligibleApplications || 0}</div>
            <div className="text-[10px] font-semibold text-emerald-800 uppercase">Eligible</div>
          </div>
        </div>

        {/* Overlap Alerts */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center gap-3 bg-amber-50/20">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-700">{metrics.potentialDuplicateAlerts || 0}</div>
            <div className="text-[10px] font-semibold text-amber-800 uppercase">Alerts Flagged</div>
          </div>
        </div>

        {/* Approved Sanctions */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex items-center gap-3 bg-blue-50/20">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-800">{metrics.approvedApplications || 0}</div>
            <div className="text-[10px] font-semibold text-blue-900 uppercase">Sanctioned</div>
          </div>
        </div>

        {/* DBT Disbursed */}
        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs flex items-center gap-3 bg-teal-50/20">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-govTeal-700 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-govTeal-800">{metrics.totalDisbursementCount || 0}</div>
            <div className="text-[10px] font-semibold text-govTeal-800 uppercase">DBT Paid</div>
          </div>
        </div>

        {/* API Health */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-100 text-navy-800 flex items-center justify-center flex-shrink-0">
            <Server className="w-5 h-5 text-govTeal-700" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{metrics.apiSuccessRate || 100}%</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase">API Health</div>
          </div>
        </div>
      </div>

      {/* 3. Circular Pie Chart with Total Applicants */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-govTeal-500 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                Citizen Entitlement & Application Lifecycle
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Statutory verification breakdown across active citizen claims
            </p>
          </div>

          {/* Quick Counter Pill */}
          <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <Users className="w-4 h-4 text-govTeal-600" />
            <div className="text-xs">
              <span className="text-slate-500 font-medium mr-1.5">Total Applicants:</span>
              <span className="text-sm font-extrabold text-navy-950 font-mono">{totalApplicants}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Circular Donut Pie Chart with Centered Total Applicants */}
          <div className="lg:col-span-7 relative h-72 sm:h-84 flex items-center justify-center">
            {pieData && pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={125}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="status"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill || COLORS[index % COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={2.5}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [
                        `${Number(val || 0)} Applicants (${totalApplicants > 0 ? Math.round(((Number(val || 0)) / totalApplicants) * 100) : 0}%)`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: '#0B192C',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '12px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Prominent Center Total Applicants Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Total Applicants
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-navy-950 font-sans tracking-tight my-0.5">
                    {totalApplicants}
                  </span>
                  <span className="text-[10px] font-bold text-govTeal-700 bg-govTeal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    Active Registrations
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400">No applicant records available.</div>
            )}
          </div>

          {/* Pictorial Legend Cards */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Lifecycle Categories</span>
              <span className="font-mono text-slate-500">Share %</span>
            </div>

            {pieData.map((item, idx) => {
              const color = item.fill || COLORS[idx % COLORS.length];
              const pct = totalApplicants > 0 ? Math.round((item.count / totalApplicants) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.status}</div>
                      <div className="text-[10px] text-slate-400">Status tier in verification pipeline</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-navy-900">{item.count}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{pct}%</div>
                  </div>
                </div>
              );
            })}

            {/* Total Beneficiary Summary Box */}
            <div className="mt-4 p-3 bg-navy-900 text-white rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-300" />
                <span className="font-bold">Total Beneficiaries Enrolled</span>
              </div>
              <span className="font-mono font-bold text-teal-300 text-sm">
                {metrics.totalIndividuals || totalApplicants}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Core Verification Engines & Lookup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Individual & Household Lookup */}
        <NavLink
          to="/lookup?demoId=DEMO-AADHAAR-100003"
          className="bg-white/90 hover:bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-govTeal-700 flex items-center justify-center group-hover:scale-105 transition">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                Demo Lookup
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-govTeal-700 transition">
              Individual & Household Lookup
            </h4>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Search demo Aadhaar identifiers (e.g. DEMO-AADHAAR-100003) to map family rosters, individual/household schemes & timelines.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-govTeal-700 mt-4">
            <span>Lookup Demo Citizen</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </NavLink>

        {/* Potential Benefits Discovery */}
        <NavLink
          to="/potential-benefits"
          className="bg-white/90 hover:bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-govTeal-50 text-govTeal-700 flex items-center justify-center group-hover:scale-105 transition">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                Eligibility Engine
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-govTeal-700 transition">
              Potential Benefits Discovery
            </h4>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Evaluate citizen profiles across all 12 schemes with exact pass/fail rule proofs and duplicate checks.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-govTeal-700 mt-4">
            <span>Explore Citizen Benefits</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </NavLink>

        {/* Fair Household Allocation */}
        <NavLink
          to="/household-allocations"
          className="bg-white/90 hover:bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                Fair Allocation
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition">
              Fair Household Allocation
            </h4>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Adjudicate competing family member claims with transparent priority scoring, officer override & DBT disbursement.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-700 mt-4">
            <span>Adjudicate Competing Claims</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </NavLink>

        {/* Universal Benefit Records Explorer */}
        <NavLink
          to="/records-explorer"
          className="bg-white/90 hover:bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-navy-800 flex items-center justify-center group-hover:scale-105 transition">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                Master Explorer
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-navy-900 transition">
              Benefit Records Explorer
            </h4>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Query and audit all 7 registries: Individuals, Households, Schemes, Applications, Benefits, Allocations, and Verifications.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-navy-800 mt-4">
            <span>Query Master Records</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </NavLink>
      </div>
    </div>
  );
};

export default DashboardPage;
