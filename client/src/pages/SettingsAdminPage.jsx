import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Users,
  ShieldCheck,
  Server,
  Info,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Building
} from 'lucide-react';

const SettingsAdminPage = () => {
  const { user, logout, demoLogin } = useAuth();
  const [health, setHealth] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setLoading(true);
        const [healthRes, accountsRes] = await Promise.all([
          api.get('/health'),
          api.get('/auth/demo-accounts')
        ]);
        setHealth(healthRes.data);
        setDemoAccounts(accountsRes.data.accounts || []);
      } catch (err) {
        console.error('Failed loading settings metadata:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">System Administration & Portal Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Role-based permission status, demonstration authentication accounts, and database cluster health.
        </p>
      </div>

      {/* Current Authenticated Session Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-navy-800 text-white font-bold flex items-center justify-center text-lg shadow-sm">
            {(user?.name && user.name.trim()) ? user.name.trim().charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <div className="ml-auto">
            <span className="font-mono text-xs font-bold text-govTeal-700 bg-govTeal-50 border border-govTeal-200 px-3 py-1 rounded-lg">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-400">Official Designation</span>
            <div className="font-bold text-slate-800 mt-0.5">{user?.designation || 'Government Officer'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-400">Badge Number</span>
            <div className="font-mono font-bold text-navy-800 mt-0.5">{user?.badgeNumber || 'JS-2026-01'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-400">Department</span>
            <div className="font-bold text-slate-800 mt-0.5 truncate">{user?.department || 'Civil Registry'}</div>
          </div>
        </div>
      </div>

      {/* Demo Credentials Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Demonstration User Roles</h3>
            <p className="text-xs text-slate-400">Pre-seeded accounts for TechTrix hackathon jury evaluation</p>
          </div>
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
            Pre-Configured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {demoAccounts.map((acc) => (
            <div
              key={acc.email}
              className={`p-4 rounded-xl border transition-all ${
                user?.role === acc.role
                  ? 'border-govTeal-500 bg-govTeal-50/30 ring-1 ring-govTeal-400'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">{acc.title}</span>
                {user?.role === acc.role && (
                  <span className="text-[10px] bg-govTeal-600 text-white font-bold px-1.5 py-0.2 rounded">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-700 font-semibold">{acc.name}</div>
              <div className="text-[11px] font-mono text-slate-500">{acc.email}</div>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{acc.description}</p>

              {user?.role !== acc.role && (
                <button
                  onClick={() => demoLogin(acc.role)}
                  className="mt-3 w-full py-1.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Switch to this Account
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Backend & Database Health Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-govTeal-600" />
            <h3 className="text-sm font-bold text-slate-800">Backend & MongoDB Cluster Health</h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Operational
          </span>
        </div>

        {health ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
            <div><strong>Status:</strong> {health.status}</div>
            <div><strong>Service:</strong> {health.service}</div>
            <div><strong>Version:</strong> {health.version}</div>
            <div><strong>Environment:</strong> {health.dataEnvironment}</div>
            <div><strong>Timestamp:</strong> {health.timestamp}</div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">Loading health metrics...</div>
        )}
      </div>

      {/* Synthetic Data Disclaimer Section */}
      <div className="p-4 bg-slate-200/70 rounded-2xl border border-slate-300 text-xs text-slate-700 leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Info className="w-4 h-4 text-govTeal-700" />
          Technical & Legal Notice (TechTrix Hackathon)
        </div>
        <p>
          JanSetu is an architectural proof-of-concept developed exclusively for technical evaluation. It operates strictly on synthetic demo records and does not link to real-world citizen Aadhaar, bank records, or State Resident Data Hubs. Production deployment would require statutory data privacy impact assessments, authorized departmental API keys, and adherence to relevant digital data protection laws.
        </p>
      </div>
    </div>
  );
};

export default SettingsAdminPage;
