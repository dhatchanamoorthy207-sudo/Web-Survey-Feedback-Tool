import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Sidebar } from '../components/Sidebar.tsx';
import { Modal } from '../components/Modal.tsx';
import { User, Survey } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface AdminUsersPageProps {
  navigate: (path: string) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ navigate }) => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // User surveys modal state
  const [selectedUserForSurveys, setSelectedUserForSurveys] = useState<User | null>(null);
  const [userSurveys, setUserSurveys] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, statusFilter, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (roleFilter) params.append('role', roleFilter);

      const res = await apiFetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const targetStatus = user.account_status === 'active' ? 'disabled' : 'active';
    if (user.id === currentAdmin?.id && targetStatus === 'disabled') {
      alert('Security constraint: You cannot deactivate your own administrative account.');
      return;
    }

    setFeedbackMessage(null);
    setFeedbackError(null);

    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedbackMessage(data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, account_status: targetStatus } : u))
        );
      } else {
        setFeedbackError(data.error || 'Failed to update user status.');
      }
    } catch (err) {
      setFeedbackError('Network communication error.');
    }
  };

  const handleToggleRole = async (user: User) => {
    const targetRole = user.role === 'admin' ? 'user' : 'admin';
    if (user.id === currentAdmin?.id && targetRole === 'user') {
      alert('Security constraint: You cannot demote your own administrative role.');
      return;
    }

    setFeedbackMessage(null);
    setFeedbackError(null);

    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedbackMessage(data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: targetRole } : u))
        );
      } else {
        setFeedbackError(data.error || 'Failed to update user role.');
      }
    } catch (err) {
      setFeedbackError('Network communication error.');
    }
  };

  const handleOpenUserSurveys = async (user: User) => {
    setSelectedUserForSurveys(user);
    setLoadingSurveys(true);
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/surveys`);
      if (res.ok) {
        const data = await res.json();
        setUserSurveys(data.surveys || []);
      }
    } catch (err) {
      console.error('Failed to load user surveys:', err);
    } finally {
      setLoadingSurveys(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar currentPath="/admin/users" navigate={navigate} isAdminArea={true} />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Account Governance</h1>
            <p className="text-xs text-slate-500 mt-1">
              Search registered researchers, modify roles, deactivate or activate accounts, and inspect survey campaigns.
            </p>
          </div>
        </div>

        {feedbackError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{feedbackError}</span>
          </div>
        )}

        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name or email..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700"
            >
              <option value="">All Account Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="disabled">Disabled Accounts</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700"
            >
              <option value="">All Roles</option>
              <option value="user">Standard User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-sm text-slate-400">Loading user directory...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No users match the search criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Surveys</th>
                    <th className="px-6 py-3.5">Registered</th>
                    <th className="px-6 py-3.5 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 flex items-center space-x-2">
                          <span>{u.name}</span>
                          {u.id === currentAdmin?.id && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            u.account_status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.account_status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenUserSurveys(u)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <span>{u.survey_count || 0} surveys</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        {/* Toggle Status */}
                        <button
                          disabled={u.id === currentAdmin?.id}
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                            u.account_status === 'active'
                              ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          } disabled:opacity-40`}
                          title={u.id === currentAdmin?.id ? 'Cannot deactivate self' : undefined}
                        >
                          {u.account_status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>

                        {/* Toggle Role */}
                        <button
                          disabled={u.id === currentAdmin?.id}
                          onClick={() => handleToggleRole(u)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                          title={u.id === currentAdmin?.id ? 'Cannot demote self' : undefined}
                        >
                          {u.role === 'admin' ? 'Make User' : 'Elevate to Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Surveys Modal */}
        <Modal
          isOpen={!!selectedUserForSurveys}
          onClose={() => setSelectedUserForSurveys(null)}
          title={`Surveys Created by ${selectedUserForSurveys?.name || ''}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {loadingSurveys ? (
              <p className="p-8 text-center text-xs text-slate-400">Loading surveys...</p>
            ) : userSurveys.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">
                This user has not created any surveys yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {userSurveys.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{s.title}</p>
                      <p className="text-slate-400 font-mono mt-0.5">/s/{s.public_id}</p>
                    </div>
                    <div className="text-right space-x-2">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {s.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUserForSurveys(null);
                          navigate(`/survey/${s.id}/results`);
                        }}
                        className="px-2 py-1 text-blue-600 hover:underline font-semibold"
                      >
                        Results ({s.response_count || 0})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedUserForSurveys(null)}
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
