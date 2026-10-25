import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar.tsx';
import { Modal } from '../components/Modal.tsx';
import { Survey } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import {
  FileText,
  Search,
  Filter,
  BarChart2,
  Trash2,
  ExternalLink,
  Share2,
  CheckCircle,
  AlertCircle,
  Archive,
} from 'lucide-react';

interface AdminSurveysPageProps {
  navigate: (path: string) => void;
}

export const AdminSurveysPage: React.FC<AdminSurveysPageProps> = ({ navigate }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion modal
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, [searchQuery, statusFilter]);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const res = await apiFetch(`/api/admin/surveys?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } catch (err) {
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (survey: Survey, newStatus: 'published' | 'draft' | 'archived') => {
    try {
      const res = await apiFetch(`/api/surveys/${survey.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSurveys((prev) =>
          prev.map((s) => (s.id === survey.id ? { ...s, status: newStatus } : s))
        );
      }
    } catch (err) {
      console.error('Error modifying survey status:', err);
    }
  };

  const handleDelete = async () => {
    if (!surveyToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/surveys/${surveyToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSurveys((prev) => prev.filter((s) => s.id !== surveyToDelete.id));
        setSurveyToDelete(null);
      }
    } catch (err) {
      console.error('Error deleting survey:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyLink = (publicId: string) => {
    const fullUrl = `${window.location.origin}/s/${publicId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar currentPath="/admin/surveys" navigate={navigate} isAdminArea={true} />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Survey Moderation</h1>
            <p className="text-xs text-slate-500 mt-1">
              Inspect all surveys created across all user accounts, manage publication statuses, and audit responses.
            </p>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, creator name or email..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Surveys Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-sm text-slate-400">Loading surveys...</div>
          ) : surveys.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No surveys found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Survey Title</th>
                    <th className="px-6 py-3.5">Creator</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Responses</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {surveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{survey.title}</div>
                        <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                          /s/{survey.public_id}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{survey.creator_name}</div>
                        <div className="text-xs text-slate-400">{survey.creator_email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            survey.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : survey.status === 'draft'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {survey.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {survey.response_count || 0}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(survey.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => copyLink(survey.public_id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Copy Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/survey/${survey.id}/results`)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Results</span>
                        </button>

                        {survey.status !== 'archived' && (
                          <button
                            onClick={() => handleToggleStatus(survey, 'archived')}
                            className="px-2 py-1 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100"
                            title="Archive survey"
                          >
                            Archive
                          </button>
                        )}

                        {survey.status === 'draft' && (
                          <button
                            onClick={() => handleToggleStatus(survey, 'published')}
                            className="px-2 py-1 text-xs font-medium rounded-lg text-emerald-700 hover:bg-emerald-50"
                          >
                            Publish
                          </button>
                        )}

                        {survey.status === 'published' && (
                          <button
                            onClick={() => handleToggleStatus(survey, 'draft')}
                            className="px-2 py-1 text-xs font-medium rounded-lg text-amber-700 hover:bg-amber-50"
                          >
                            Unpublish
                          </button>
                        )}

                        <button
                          onClick={() => setSurveyToDelete(survey)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Admin Delete Survey"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!surveyToDelete}
          onClose={() => setSurveyToDelete(null)}
          title="Admin Survey Deletion"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Administrative action: Permanently delete{' '}
              <strong className="text-slate-900">"{surveyToDelete?.title}"</strong> created by{' '}
              <span className="font-semibold">{surveyToDelete?.creator_name}</span>?
            </p>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
              This action will be logged in the immutable system audit trail and permanently delete all responses.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSurveyToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Admin Deletion'}
              </button>
            </div>
          </div>
        </Modal>

        {copiedId && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-medium animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Link copied to clipboard!</span>
          </div>
        )}
      </main>
    </div>
  );
};
