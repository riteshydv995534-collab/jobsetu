import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Settings,
  RefreshCw,
  Zap,
  FileCode,
  FileText,
  Lock,
  ExternalLink,
  Power,
  Sliders,
  Globe,
  Layers,
  Landmark,
  BookOpen
} from 'lucide-react';

const ApiIntegrationsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'RECORDS_ADMIN';

  const [integrations, setIntegrations] = useState([]);
  const [officialSources, setOfficialSources] = useState([]);
  const [activeTab, setActiveTab] = useState('PROVIDERS'); // 'PROVIDERS' | 'OFFICIAL_SOURCES'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Selected Integration for Modals
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'TEST', 'CONFIG', 'LOGS', 'DOCS', 'SCHEMA'
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [safeLogs, setSafeLogs] = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Config Form
  const [configTimeout, setConfigTimeout] = useState(5000);
  const [configSimulateState, setConfigSimulateState] = useState('NORMAL');
  const [configEndpoint, setConfigEndpoint] = useState('');
  const [configType, setConfigType] = useState('MOCK_SANDBOX');

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      setError('');
      const [intRes, srcRes] = await Promise.allSettled([
        api.get('/api-integrations'),
        api.get('/api-integrations/official-sources')
      ]);

      if (intRes.status === 'fulfilled' && intRes.value.data.success) {
        setIntegrations(intRes.value.data.data);
      }
      if (srcRes.status === 'fulfilled' && srcRes.value.data.success) {
        setOfficialSources(srcRes.value.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load API integrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleOpenModal = async (provider, modalType) => {
    setSelectedProvider(provider);
    setActiveModal(modalType);
    setTestResult(null);
    setActionMessage('');

    if (modalType === 'CONFIG') {
      setConfigTimeout(provider.timeoutMs || 5000);
      setConfigSimulateState(provider.simulateState || 'NORMAL');
      setConfigEndpoint(provider.endpointUrl || '');
      setConfigType(provider.integrationType || 'MOCK_SANDBOX');
    } else if (modalType === 'LOGS') {
      try {
        const res = await api.get(`/api-integrations/${provider._id}/logs`);
        setSafeLogs(res.data.data || []);
      } catch (e) {
        setSafeLogs(provider.safeErrorLogs || []);
      }
    }
  };

  const handleTestPing = async (providerId) => {
    try {
      setTesting(true);
      setTestResult(null);
      const target = selectedProvider || integrations.find((i) => i._id === providerId);
      const res = await api.post(`/api-integrations/${target._id}/test`);
      setTestResult(res.data.data);
      fetchIntegrations();
    } catch (err) {
      setTestResult({
        error: err.response?.data?.message || err.message || 'Ping test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleActive = async (provider) => {
    if (!isAdmin) {
      alert('Only Administrators (RECORDS_ADMIN) can toggle API integration status.');
      return;
    }
    try {
      const res = await api.patch(`/api-integrations/${provider._id}`, {
        isActive: !provider.isActive
      });
      if (res.data.success) {
        setActionMessage(`Status updated for ${provider.name}`);
        fetchIntegrations();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to toggle integration.');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Administrators (RECORDS_ADMIN) can modify API integration settings.');
      return;
    }

    try {
      setSavingConfig(true);
      const res = await api.patch(`/api-integrations/${selectedProvider._id}`, {
        timeoutMs: Number(configTimeout),
        simulateState: configSimulateState,
        endpointUrl: configEndpoint,
        integrationType: configType
      });

      if (res.data.success) {
        setActionMessage(`Configuration updated for ${selectedProvider.name}`);
        setActiveModal(null);
        fetchIntegrations();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Configuration update failed.');
    } finally {
      setSavingConfig(false);
    }
  };

  const getStatusBadge = (status, isActive) => {
    if (!isActive) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5">
          <Power className="w-3.5 h-3.5 text-slate-400" />
          DISABLED
        </span>
      );
    }
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            HEALTHY
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            DEGRADED
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">
              API Integrations & Verification Sources
            </h2>
            <span className="text-[11px] font-bold text-navy-800 bg-navy-100 border border-navy-200 px-2 py-0.5 rounded-md">
              GovTech Interoperability
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Statutory registry connections for biometric demographic eKYC, household ration rosters, cadastral titles, and PFMS benefit history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchIntegrations}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Sources
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Banner */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 text-xs text-slate-600 flex items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-govTeal-600 flex-shrink-0" />
          <div>
            <span className="font-bold text-slate-800">Security & Privacy Protocol: </span>
            External API secrets and tokens remain strictly isolated on the backend server. Responses utilize synthetic citizen demonstration rosters in compliance with data minimization standards.
          </div>
        </div>
        <div className="hidden md:block flex-shrink-0 font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
          Sandboxed Gateway Active
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('PROVIDERS')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'PROVIDERS'
              ? 'border-govTeal-600 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4 text-govTeal-600" />
          API Verification Endpoints ({integrations.length})
        </button>

        <button
          onClick={() => setActiveTab('OFFICIAL_SOURCES')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'OFFICIAL_SOURCES'
              ? 'border-govTeal-600 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4 text-govTeal-600" />
          Official Government Document Portals ({officialSources.length || 17})
        </button>
      </div>

      {activeTab === 'PROVIDERS' ? (
        /* Provider Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((provider) => {
            const successCount = Math.max(provider.totalRequests - provider.failedRequests, 0);
            const successPct =
              provider.totalRequests > 0
                ? Math.round((successCount / provider.totalRequests) * 100)
                : 100;

            return (
              <div
                key={provider._id}
                className={`bg-white/90 backdrop-blur-md rounded-2xl border transition-all duration-200 p-5 shadow-xs flex flex-col justify-between ${
                  provider.isActive ? 'border-slate-200/90 hover:border-govTeal-500/50' : 'border-slate-200/50 opacity-75'
                }`}
              >
                <div>
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-800 flex items-center justify-center font-bold">
                        <Server className="w-4 h-4 text-govTeal-700" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {provider.verificationService}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                          {provider.name}
                        </h3>
                      </div>
                    </div>
                    <div>{getStatusBadge(provider.connectionStatus, provider.isActive)}</div>
                  </div>

                  {/* Criteria Rank & Official Portal Link */}
                  {provider.eligibilityCriteriaRank && (
                    <div className="flex items-center justify-between p-1.5 px-2 bg-slate-50 rounded-lg border border-slate-200/80 mb-2.5 text-[11px]">
                      <span className="font-bold text-navy-900">
                        Criteria #{provider.eligibilityCriteriaRank}: {provider.criteriaCategory}
                      </span>
                      {provider.officialPortalUrl && (
                        <a
                          href={provider.officialPortalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-govTeal-700 hover:text-govTeal-900 inline-flex items-center gap-0.5 underline text-[10px]"
                        >
                          Official Portal <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Integration Type & URL */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        provider.integrationType === 'AUTHORIZED_PRODUCTION'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-teal-50 text-govTeal-700 border border-teal-200'
                      }`}
                    >
                      {provider.integrationType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate font-mono">
                      {provider.endpointUrl}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 text-center my-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Latency</div>
                      <div className="font-mono font-bold text-navy-900 mt-0.5">
                        {provider.averageResponseTimeMs} ms
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Total Req</div>
                      <div className="font-mono font-bold text-slate-800 mt-0.5">
                        {provider.totalRequests || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Success Rate</div>
                      <div
                        className={`font-mono font-bold mt-0.5 ${
                          successPct >= 95 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {successPct}%
                      </div>
                    </div>
                  </div>

                  {/* Last Event Status */}
                  <div className="text-[11px] text-slate-500 space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span>Timeout Cap:</span>
                      <span className="font-mono text-slate-700 font-semibold">{provider.timeoutMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Simulation Mode:</span>
                      <span className="font-mono text-govTeal-700 font-bold">{provider.simulateState || 'NORMAL'}</span>
                    </div>
                    {provider.lastError && (
                      <div className="text-rose-600 truncate text-[10px] pt-1 border-t border-slate-100">
                        Error: {provider.lastError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => handleOpenModal(provider, 'TEST')}
                    className="px-2.5 py-1.5 bg-govTeal-50 hover:bg-govTeal-100 text-govTeal-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Test Live Connectivity"
                  >
                    <Zap className="w-3.5 h-3.5 text-govTeal-600" />
                    Test
                  </button>

                  <button
                    onClick={() => handleOpenModal(provider, 'CONFIG')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Configure Parameters"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-600" />
                    Config
                  </button>

                  <button
                    onClick={() => handleOpenModal(provider, 'LOGS')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Safe Audit Logs"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    Logs
                  </button>

                  <button
                    onClick={() => handleOpenModal(provider, 'DOCS')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ml-auto"
                    title="Provider Specification"
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-600" />
                    Docs
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleToggleActive(provider)}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                        provider.isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={provider.isActive ? 'Disable Integration' : 'Enable Integration'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Official Government Document Portals Directory (PS 7 Reference) */
        <div className="space-y-6">
          {/* Statutory Minimum Criteria Cards (1 -> 4) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-govTeal-600" />
                Minimum Scheme Eligibility Criteria (Statutory Sequence)
              </h3>
              <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold">
                Order: 1. Ration → 2. Land → 3. Aadhaar → 4. PAN
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {officialSources.filter((s) => s.isMinimumCriteria).map((source) => (
                <div
                  key={source.rank}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-govTeal-500/60 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-navy-900 text-teal-300 font-mono font-bold text-xs">
                        CRITERION {source.rank}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                        {source.category}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 mb-1">{source.name}</h4>
                    <p className="text-xs text-govTeal-800 font-semibold mb-3">
                      {source.criteriaPurpose}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Data Fetched & Verified
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {source.dataFetched?.map((item, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Upload / Submission Route
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{source.uploadSubmissionRoute}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                      {source.accessWebsite}
                    </span>
                    <a
                      href={source.accessWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      Open Official Website <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Public Portals & Welfare Repositories */}
          <div>
            <div className="flex items-center justify-between mb-3 pt-3 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-govTeal-600" />
                Additional Statutory Document Portals & Welfare Registries
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                PS 7 Unified Public Documentation Directory
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {officialSources.filter((s) => !s.isMinimumCriteria).map((source) => (
                <div
                  key={source.rank}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span># {source.rank}</span>
                      <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                        {source.category}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mb-1">{source.name}</h4>
                    <p className="text-[11px] text-slate-600 mb-2.5">{source.criteriaPurpose}</p>

                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 mb-2">
                      <span className="font-semibold text-slate-700">Submission Note: </span>
                      {source.uploadSubmissionRoute}
                    </div>

                    {source.developerResources && (
                      <div className="flex flex-wrap gap-1 text-[10px] font-mono mb-2">
                        <a
                          href={source.developerResources}
                          target="_blank"
                          rel="noreferrer"
                          className="text-govTeal-700 underline"
                        >
                          Dev Resources ↗
                        </a>
                        {source.apiDiscoveryRoute && (
                          <>
                            <span>•</span>
                            <a
                              href={source.apiDiscoveryRoute}
                              target="_blank"
                              rel="noreferrer"
                              className="text-govTeal-700 underline"
                            >
                              API Setu Directory ↗
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                      {source.accessWebsite.replace('https://', '')}
                    </span>
                    <a
                      href={source.accessWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-govTeal-700 hover:text-govTeal-900 inline-flex items-center gap-1 underline"
                    >
                      Visit Portal <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialogs */}
      {activeModal && selectedProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {activeModal === 'TEST' && 'Connectivity & Latency Diagnostic'}
                  {activeModal === 'CONFIG' && 'Provider Settings & Resilience Simulation'}
                  {activeModal === 'LOGS' && 'Sanitized Safe Error Logs'}
                  {activeModal === 'DOCS' && 'Official Provider Documentation'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedProvider.name}</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Test Modal Body */}
            {activeModal === 'TEST' && (
              <div className="py-4 space-y-4 text-xs">
                <p className="text-slate-600">
                  Sends an authorized synthetic test payload to measure gateway round-trip latency, SSL handshake integrity, and upstream responsiveness.
                </p>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Endpoint:</span>
                    <span className="text-slate-800 font-bold truncate max-w-xs">{selectedProvider.endpointUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timeout Threshold:</span>
                    <span className="text-slate-800 font-bold">{selectedProvider.timeoutMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service Scope:</span>
                    <span className="text-govTeal-700 font-bold">{selectedProvider.verificationService}</span>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-4 rounded-xl border ${
                      testResult.resultStatus === 'VERIFIED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {testResult.resultStatus === 'VERIFIED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
                        Result: {testResult.resultStatus || 'Diagnostic Test Completed'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>Latency: {testResult.responseTimeMs} ms</div>
                      <div>Mode: {testResult.isSyntheticDemo ? 'Mock Sandbox' : 'Production'}</div>
                    </div>
                    {testResult.error && (
                      <div className="mt-1 text-[11px] text-rose-700">{testResult.error}</div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleTestPing(selectedProvider._id)}
                    disabled={testing}
                    className="px-4 py-2 bg-govTeal-600 hover:bg-govTeal-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Zap className="w-4 h-4" />
                    {testing ? 'Testing Connection...' : 'Run Connectivity Ping'}
                  </button>
                </div>
              </div>
            )}

            {/* Config Modal Body */}
            {activeModal === 'CONFIG' && (
              <form onSubmit={handleSaveConfig} className="py-4 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={configEndpoint}
                    onChange={(e) => setConfigEndpoint(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-govTeal-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Timeout Limit (ms)
                    </label>
                    <input
                      type="number"
                      min="500"
                      max="30000"
                      value={configTimeout}
                      onChange={(e) => setConfigTimeout(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-govTeal-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Integration Tier
                    </label>
                    <select
                      value={configType}
                      onChange={(e) => setConfigType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-govTeal-500 outline-hidden"
                    >
                      <option value="MOCK_SANDBOX">MOCK_SANDBOX (Synthetic)</option>
                      <option value="APPROVED_SANDBOX">APPROVED_SANDBOX (Gov Staging)</option>
                      <option value="AUTHORIZED_PRODUCTION">AUTHORIZED_PRODUCTION</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Simulate Gateway Resilience Condition
                  </label>
                  <select
                    value={configSimulateState}
                    onChange={(e) => setConfigSimulateState(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-govTeal-500 outline-hidden"
                  >
                    <option value="NORMAL">NORMAL (Operational 200 OK)</option>
                    <option value="TIMEOUT">TIMEOUT (Simulate Upstream Gateway Delay)</option>
                    <option value="UNAVAILABLE">UNAVAILABLE (Simulate 503 Provider Outage)</option>
                    <option value="FAILURE">FAILURE (Simulate 500 Unrecoverable Error)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Allows testers to verify that JanSetu handles outages with "Verification Pending" instead of false failures.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-xl font-semibold shadow-xs"
                  >
                    {savingConfig ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* Safe Error Logs Body */}
            {activeModal === 'LOGS' && (
              <div className="py-4 space-y-3 text-xs">
                <p className="text-slate-500">
                  Auditable diagnostic logs with automatic PII sanitization. Credentials and citizen Aadhaar/PAN tokens are stripped prior to capture.
                </p>

                {safeLogs.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 border border-slate-200">
                    No error events recorded for this provider. All requests passed healthy.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {safeLogs.map((log, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px]">
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                          <span className="font-bold text-rose-600">{log.errorCode}</span>
                        </div>
                        <div className="text-slate-800 mt-0.5">{log.message}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Docs & Schema Body */}
            {activeModal === 'DOCS' && (
              <div className="py-4 space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Architecture & Purpose</h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedProvider.documentationSummary}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Standardized Received Data Schema</h4>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {selectedProvider.supportedFields?.map((field, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded font-mono text-[11px] bg-white border border-slate-200 text-navy-800 font-semibold"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiIntegrationsPage;
