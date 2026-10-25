import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar.tsx';
import { Modal } from '../components/Modal.tsx';
import { AuditLog } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import { ShieldAlert, Filter, Clock, Info, CheckCircle, RefreshCw } from 'lucide-react';

interface AdminAuditLogsPageProps {
  navigate: (path: string) => void;
}

export const AdminAuditLogsPage: React.FC<AdminAuditLogsPageProps> = ({ navigate }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);

      const res = await apiFetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar currentPath="/admin/audit" navigate={navigate} isAdminArea={true} />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Immutable Compliance Trail</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit Logs</h1>
            <p className="text-xs text-slate-500 mt-1">
              Cryptographically timestamped log of privileged operations, role changes, account activations, and deletions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700"
            >
              <option value="">All Administrative Actions</option>
              <option value="USER_STATUS_CHANGE">User Status Changes</option>
              <option value="USER_ROLE_CHANGE">User Role Elevations</option>
              <option value="SURVEY_STATUS_CHANGE">Survey Status Changes</option>
              <option value="SURVEY_DELETE">Survey Deletions</option>
              <option value="SYSTEM_INIT">System Initialization</option>
              <option value="ADMIN_CLI_SETUP">CLI Admin Operations</option>
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-900">{logs.length}</strong> of {total} events
          </span>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-sm text-slate-400">Loading audit trail...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No audit records match the filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action Code</th>
                    <th className="px-6 py-3.5">Administrator</th>
                    <th className="px-6 py-3.5">Target</th>
                    <th className="px-6 py-3.5">Description &amp; Context</th>
                    <th className="px-6 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className="font-semibold text-slate-900">
                          {log.admin_name || 'System / Auto'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        {log.target_type} #{log.target_id || '-'}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-700 max-w-md truncate">
                        {log.details}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Full Audit Event"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Details Modal */}
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Record #${selectedLog?.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block">Action Code:</span>
                <span className="font-mono font-bold text-slate-900">{selectedLog?.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Target Object:</span>
                <span className="font-mono text-slate-900">
                  {selectedLog?.target_type} (ID: {selectedLog?.target_id})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Acting Admin:</span>
                <span className="font-semibold text-slate-900">
                  {selectedLog?.admin_name} (ID: {selectedLog?.admin_user_id || 'System'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Recorded At:</span>
                <span className="text-slate-900">
                  {selectedLog ? new Date(selectedLog.created_at).toLocaleString() : ''}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-semibold">Event Description:</span>
              <div className="p-3 bg-white border border-slate-200 rounded-xl leading-relaxed text-slate-800">
                {selectedLog?.details}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};
