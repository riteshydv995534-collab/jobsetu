import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
  Briefcase,
  Info,
  KeyRound,
  X,
  FileCheck2,
  Building2,
  Scale
} from 'lucide-react';
import LiveBackground from '../components/LiveBackground';

const LoginPage = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@jansetu.gov.demo');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    location.search.includes('sessionExpired=true')
      ? 'Your session has expired. For cybersecurity compliance, please sign in again.'
      : ''
  );

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide an authorised officer identifier and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const loggedUser = await login(email, password);

      // Verify that this is an authorised government account
      if (loggedUser.role === 'APPLICANT') {
        setError(
          'Access Denied: JanSetu is exclusively an authorised government officer and departmental decision platform. Citizen self-service accounts cannot access this command centre.'
        );
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (accountEmail) => {
    try {
      setLoading(true);
      setError('');
      setEmail(accountEmail);
      setPassword('Password@123');
      const loggedUser = await demoLogin(accountEmail);

      if (loggedUser.role === 'APPLICANT') {
        setError(
          'Access Denied: JanSetu is strictly an authorised government platform. Citizen login is not permitted.'
        );
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Demo authentication failed. Ensure backend server is active.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setResetSubmitted(true);
    setTimeout(() => {
      setResetSubmitted(false);
      setShowResetModal(false);
      setResetEmail('');
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4 sm:px-6 relative overflow-hidden bg-slate-950 font-sans">
      <LiveBackground />

      <div className="relative z-10 w-full max-w-2xl space-y-5">
        {/* Top Official GovTech Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 text-white shadow-2xl shadow-teal-500/30 border border-teal-300/40">
            <ShieldCheck className="w-9 h-9" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-semibold text-teal-300 mb-1.5 tracking-wider uppercase">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              Authorised Government Personnel Only
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              JANSETU <span className="text-teal-400 font-light text-2xl sm:text-3xl">| जनसेतु</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-lg mx-auto mt-1">
              Government Scheme Verification, Eligibility Intelligence & Fund Allocation Support Platform
            </p>
          </div>
        </div>

        {/* Clear Demonstration Mode Disclosure */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-lg backdrop-blur-md flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300 uppercase tracking-wide text-[11px]">
              GovTech Hackathon Demonstration Environment
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              All citizen records, properties, and ₹ disbursements are <strong>synthetic demonstration data</strong> using fictional identifiers (<span className="font-mono text-amber-300">DEMO-ID-XXXXXX</span>).
              JanSetu is an internal government evaluation bridge; public citizen registration is disabled.
            </p>
          </div>
        </div>

        {/* Dedicated Applicant Application Stage Tracker Access */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 to-slate-900 border border-teal-500/40 text-teal-200 text-xs shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md flex-shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <span>Are you an Applicant or Citizen?</span>
                <span className="text-[10px] font-mono bg-teal-400/20 text-teal-300 px-1.5 py-0.2 rounded font-bold">
                  STAGE TRACKER
                </span>
              </div>
              <div className="text-[11px] text-teal-300/90 mt-0.5">
                Check exactly which statutory stage your application is on (1 &rarr; 6) in read-only mode.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/track')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
          >
            <span>Track Application Stage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Officer Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-600" />
                Officer Authentication Portal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Backend-enforced role assignments, jurisdiction filtering, and audit logging
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
              SECURE RBAC
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Officer Email / Configured Identifier
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@jansetu.gov.demo"
                  className="block w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-hidden transition-all text-slate-900 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Access Password</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-hidden transition-all text-slate-900 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-white bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Authorised Command Centre</span>
                  <ArrowRight className="w-4 h-4 text-teal-400" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demonstration Officer Personas */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Authorised Role for Evaluation
              </span>
              <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-mono font-bold">
                1-CLICK SIGN IN
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {/* 1. Super Admin */}
              <button
                type="button"
                onClick={() => handleDemoSignIn('admin@jansetu.gov.demo')}
                disabled={loading}
                className="p-3 border-2 border-indigo-500/80 bg-indigo-50/70 hover:bg-indigo-100/90 rounded-xl transition-all group col-span-1 sm:col-span-2 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    SA
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <span>Vikram Singhania</span>
                      <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded">SUPER_ADMIN</span>
                    </div>
                    <div className="text-[11px] text-indigo-800 truncate mt-0.5">
                      admin@jansetu.gov.demo • All 12 Schemes, System Config & Full Audit Logs
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-700 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>

              {/* 2. Department Admin */}
              <button
                type="button"
                onClick={() => handleDemoSignIn('dept.admin@jansetu.gov.demo')}
                disabled={loading}
                className="p-2.5 border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 rounded-xl transition-all group flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  DA
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-purple-950">Dr. Kavita Nair</div>
                  <div className="text-[10px] text-purple-800 truncate">DEPARTMENT_ADMIN (Welfare & Entitlements)</div>
                </div>
              </button>

              {/* 3. Scheme Supervisor */}
              <button
                type="button"
                onClick={() => handleDemoSignIn('supervisor@jansetu.gov.demo')}
                disabled={loading}
                className="p-2.5 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 rounded-xl transition-all group flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  SS
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-emerald-950">Rameshwar Sen</div>
                  <div className="text-[10px] text-emerald-800 truncate">SCHEME_SUPERVISOR (Escalations & Overrides)</div>
                </div>
              </button>

              {/* 4. Scheme Officer - Education */}
              <button
                type="button"
                onClick={() => handleDemoSignIn('officer.education@jansetu.gov.demo')}
                disabled={loading}
                className="p-2.5 border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 rounded-xl transition-all group flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  ED
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-blue-950">Sunita Sharma</div>
                  <div className="text-[10px] text-blue-800 truncate">SCHEME_OFFICER (Assigned to Education: IEA, SSA)</div>
                </div>
              </button>

              {/* 5. Scheme Officer - Housing */}
              <button
                type="button"
                onClick={() => handleDemoSignIn('officer.housing@jansetu.gov.demo')}
                disabled={loading}
                className="p-2.5 border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 rounded-xl transition-all group flex items-center gap-2.5 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  HS
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-amber-950">Rajesh Mukherjee</div>
                  <div className="text-[10px] text-amber-900 truncate">SCHEME_OFFICER (Assigned to Housing: HAG, HSS)</div>
                </div>
              </button>

              {/* 6. Verification Officer */}
              <button
                type="button"
                onClick={() => handleDemoSignIn('officer.verification@jansetu.gov.demo')}
                disabled={loading}
                className="p-2.5 border border-teal-200 bg-teal-50/60 hover:bg-teal-100/80 rounded-xl transition-all group flex items-center gap-2.5 shadow-2xs col-span-1 sm:col-span-2"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  VO
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-teal-950">Anjali Deshmukh</div>
                  <div className="text-[10px] text-teal-800 truncate">VERIFICATION_OFFICER (Field & Document Evidence Checks)</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Architecture Disclaimers */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            Backend Permission Enforcement
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Zero Cross-Scheme Leakage
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            Statutory Human Decision Oversight
          </span>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Officer Password Reset Workflow</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Demonstration Password Reset Token Dispatched
                </div>
                <p className="text-slate-600">
                  In a production environment, a signed cryptographic reset token is sent to the departmental email on file.
                  For local demonstration evaluation, default password is: <span className="font-mono font-bold text-slate-900">Password@123</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your official departmental email identifier. A secure one-time verification link will be routed to your registered departmental directory.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Identifier</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="officer@jansetu.gov.demo"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md"
                  >
                    Request Authorised Reset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;