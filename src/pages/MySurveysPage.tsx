import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar.tsx';
import { Modal } from '../components/Modal.tsx';
import { Survey } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import {
  FileText,
  Search,
  Filter,
  PlusCircle,
  Share2,
  BarChart2,
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle,
  Globe,
  Lock,
  Archive,
  RefreshCw,
} from 'lucide-react';

interface MySurveysPageProps {
  navigate: (path: string) => void;
}

export const MySurveysPage: React.FC<MySurveysPageProps> = ({ navigate }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal delete state
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/surveys/my');
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

  const copyPublicLink = (publicId: string) => {
    const fullUrl = `${window.location.origin}/s/${publicId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 2500);
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
      console.error('Failed to change survey status:', err);
    }
  };

  const handleDeleteSurvey = async () => {
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
      console.error('Failed to delete survey:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSurveys = surveys.filter((survey) => {
    const matchesSearch =
      survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.public_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || survey.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar currentPath="/my-surveys" navigate={navigate} isAdminArea={false} />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Surveys</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your feedback campaigns, edit questions, share public links, and inspect analytics.
            </p>
          </div>
          <button
            onClick={() => navigate('/create-survey')}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-transform active:scale-95 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Survey</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search surveys by title or slug..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {(['all', 'published', 'draft', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Surveys List Table / Cards */}
        {loading ? (
          <div className="p-16 text-center text-sm text-slate-400">Loading surveys...</div>
        ) : filteredSurveys.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">No matching surveys found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try clearing your search or status filter.'
                  : 'Get started by creating your first survey.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Survey</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Questions</th>
                    <th className="px-6 py-3.5">Responses</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSurveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{survey.title}</div>
                        {survey.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{survey.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            /s/{survey.public_id}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
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

                          {/* Quick Publish / Unpublish button */}
                          {survey.status === 'draft' && (
                            <button
                              onClick={() => handleToggleStatus(survey, 'published')}
                              className="text-[11px] font-medium text-emerald-700 hover:underline"
                            >
                              Publish Now
                            </button>
                          )}
                          {survey.status === 'published' && (
                            <button
                              onClick={() => handleToggleStatus(survey, 'draft')}
                              className="text-[11px] font-medium text-amber-700 hover:underline"
                            >
                              Unpublish
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {survey.question_count || 0} questions
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-800">
                          {survey.response_count || 0}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(survey.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => copyPublicLink(survey.public_id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Copy Shareable Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => window.open(`/s/${survey.public_id}`, '_blank')}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Open Live Public Form"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/survey/${survey.id}/results`)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Results</span>
                        </button>

                        <button
                          onClick={() => navigate(`/survey/${survey.id}/edit`)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Survey"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSurveyToDelete(survey)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Survey"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!surveyToDelete}
          onClose={() => setSurveyToDelete(null)}
          title="Confirm Survey Deletion"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900">"{surveyToDelete?.title}"</strong>?
            </p>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
              <strong>Warning:</strong> This operation will cascade and permanently erase all{' '}
              {surveyToDelete?.response_count || 0} recorded responses and analytics from the database.
              This cannot be undone.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSurveyToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSurvey}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Copy Toast */}
        {copiedId && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-medium animate-bounce z-50">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Public survey link copied to clipboard!</span>
          </div>
        )}
      </main>
    </div>
  );
};
