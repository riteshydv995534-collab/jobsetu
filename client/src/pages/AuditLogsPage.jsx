import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Clock,
  User,
  Activity
} from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (entityFilter !== 'ALL') params.entityType = entityFilter;
      if (search) params.search = search;

      const res = await api.get('/audit-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [entityFilter]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Immutable Administrative Audit Log</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Tamper-evident system trail recording all logins, eligibility determinations, duplicate review verdicts, and scheme updates.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Event ID (e.g. AUD-001), Officer Name, or reason..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-govTeal-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 outline-none"
        >
          <option value="ALL">All Entity Types</option>
          <option value="Application">Applications</option>
          <option value="DuplicateAlert">Duplicate Alerts</option>
          <option value="Household">Households</option>
          <option value="Individual">Individuals</option>
          <option value="Property">Properties</option>
          <option value="Scheme">Schemes</option>
          <option value="DisbursementRecord">Disbursements</option>
          <option value="User">User Authentication</option>
        </select>

        <button
          onClick={() => fetchLogs(1)}
          className="px-3.5 py-2 bg-navy-800 text-white rounded-lg text-xs font-semibold hover:bg-navy-900"
        >
          Search Logs
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Officer / User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Recorded Reason</th>
                <th className="py-3 px-4 text-right">Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{log.eventId}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.actingUserName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.userRole}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-govTeal-700 font-semibold">{log.entityType}</span>:{' '}
                      <span className="font-mono text-slate-500">{log.entityId}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600 truncate">
                      {log.reasonNotes || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Diff
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
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} events)
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs font-bold text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedLog.eventId}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Audit Snapshot: {selectedLog.action}</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="space-y-1 text-slate-600">
              <div>
                <strong>Acting User:</strong> {selectedLog.actingUserName} ({selectedLog.userRole})
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}
              </div>
              <div>
                <strong>IP Origin:</strong> {selectedLog.ipAddress}
              </div>
              <div>
                <strong>Recorded Justification:</strong> "{selectedLog.reasonNotes}"
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <div className="font-bold text-slate-700 mb-1">State Before Mutation</div>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-[10px] font-mono text-slate-700 max-h-48">
                  {selectedLog.beforeSnapshot ? JSON.stringify(selectedLog.beforeSnapshot, null, 2) : 'None (Creation Event)'}
                </pre>
              </div>

              <div>
                <div className="font-bold text-slate-700 mb-1">State After Mutation</div>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-[10px] font-mono text-slate-700 max-h-48">
                  {selectedLog.afterSnapshot ? JSON.stringify(selectedLog.afterSnapshot, null, 2) : 'None'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
