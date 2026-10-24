import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Scroll,
  Plus,
  CheckCircle2,
  XCircle,
  Building,
  Home,
  User,
  Info,
  Sliders,
  Power,
  Filter,
  Sparkles,
  Scale,
  Calendar,
  Layers
} from 'lucide-react';

const SchemeDirectoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Scheme Create Modal (Admin)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    benefitScope: 'INDIVIDUAL',
    benefitCategory: 'WELFARE',
    benefitAmount: 20000,
    maxBenefitAmount: 20000,
    allowedIncomeCategories: ['BPL', 'AAY'],
    repeatBenefitPolicy: 'ONCE_PER_LIFETIME',
    tieBreakRule: 'EARLIER_APPLICATION_DATE',
    isActive: true
  });

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/schemes');
      if (res.data.success) {
        setSchemes(res.data.data);
      }
    } catch (err) {
      console.error('Failed fetching schemes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleToggleActive = async (scheme) => {
    try {
      const res = await api.patch(`/schemes/${scheme._id}/toggle`, {
        reason: `Officer toggled scheme ${scheme.code} active state`
      });
      if (res.data.success) {
        fetchSchemes();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Toggle failed');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/schemes', form);
      if (res.data.success) {
        setCreateModalOpen(false);
        fetchSchemes();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Creation failed');
    }
  };

  const filteredSchemes = schemes.filter((s) => {
    if (scopeFilter !== 'ALL' && s.benefitScope !== scopeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.benefitCategory?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Government Scheme Rules Directory ({schemes.length} Schemes)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            12 Illustrative Welfare, Housing, Agriculture & Energy Programs with configurable scopes (Individual, Household, Property), documented repeat policies, and deterministic priority scoring weights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/potential-benefits')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-govTeal-700 hover:bg-govTeal-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" /> Check Citizen Eligibility
          </button>
          {user?.role === 'RECORDS_ADMIN' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Configure Scheme
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Scope:
          </span>
          {['ALL', 'INDIVIDUAL', 'HOUSEHOLD', 'PROPERTY'].map((scope) => (
            <button
              key={scope}
              onClick={() => setScopeFilter(scope)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                scopeFilter === scope
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {scope}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter by scheme name, code or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-72 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-govTeal-500"
        />
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            Loading scheme rules...
          </div>
        ) : filteredSchemes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            No schemes found matching the search criteria.
          </div>
        ) : (
          filteredSchemes.map((s) => (
            <div
              key={s._id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                s.isActive ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                      {s.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                        s.benefitScope === 'INDIVIDUAL'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : s.benefitScope === 'HOUSEHOLD'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {s.benefitScope === 'PROPERTY' && <Building className="w-3 h-3" />}
                      {s.benefitScope === 'HOUSEHOLD' && <Home className="w-3 h-3" />}
                      {s.benefitScope === 'INDIVIDUAL' && <User className="w-3 h-3" />}
                      Scope: {s.benefitScope}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {s.benefitCategory || 'WELFARE'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.description}</p>

                {/* Scope & Rules Highlights */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Benefit Grant Amount:</span>
                    <span className="font-bold text-emerald-700">
                      ₹{(s.benefitAmount || s.maxBenefitAmount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Population:</span>
                    <span className="font-semibold text-slate-800">{s.targetPopulation || 'General Eligible'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Income Ceiling:</span>
                    <span className="font-semibold text-slate-800">
                      {s.maxAnnualIncome ? `₹${s.maxAnnualIncome.toLocaleString('en-IN')}/yr` : 'No Ceiling'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Repeat Policy:</span>
                    <span className="font-semibold text-navy-800">{s.repeatBenefitPolicy || 'ONCE_PER_LIFETIME'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tie-Break Rule:</span>
                    <span className="font-mono text-[11px] text-slate-700">
                      {s.tieBreakRule || 'EARLIER_APPLICATION_DATE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Rule Version: {s.ruleVersion || 'v1.0'}
                </span>

                <div className="flex items-center gap-2">
                  {s.benefitScope === 'HOUSEHOLD' && (
                    <button
                      onClick={() => navigate('/household-allocations')}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Scale className="w-3.5 h-3.5" /> Competing Claims
                    </button>
                  )}
                  {user?.role === 'RECORDS_ADMIN' && (
                    <button
                      onClick={() => handleToggleActive(s)}
                      className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Power className="w-3.5 h-3.5 text-slate-500" />
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SchemeDirectoryPage;
