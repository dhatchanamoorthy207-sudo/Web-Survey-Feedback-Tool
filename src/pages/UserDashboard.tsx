import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Sidebar } from '../components/Sidebar.tsx';
import { Survey } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import {
  FileText,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  PlusCircle,
  ExternalLink,
  BarChart2,
  Share2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface UserDashboardProps {
  navigate: (path: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const res = await apiFetch('/api/surveys/my');
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } catch (err) {
      console.error('Failed to load surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSurveys = surveys.length;
  const publishedSurveys = surveys.filter((s) => s.status === 'published').length;
  const totalResponses = surveys.reduce((acc, s) => acc + (s.response_count || 0), 0);
  const averageResponses = totalSurveys > 0 ? (totalResponses / totalSurveys).toFixed(1) : '0';

  const copyPublicLink = (publicId: string) => {
    const fullUrl = `${window.location.origin}/s/${publicId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar currentPath="/dashboard" navigate={navigate} isAdminArea={false} />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-md shadow-blue-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-medium border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Researcher Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-sm text-blue-100 max-w-xl">
              Track your survey campaigns, review respondent engagement metrics, and export data with complete security.
            </p>
          </div>

          <button
            onClick={() => navigate('/create-survey')}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Survey</span>
          </button>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Surveys</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalSurveys}</h3>
              <p className="text-[11px] text-slate-400">Created by your account</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Published</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{publishedSurveys}</h3>
              <p className="text-[11px] text-emerald-600 font-medium">Accepting live responses</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Responses Recorded</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalResponses}</h3>
              <p className="text-[11px] text-slate-400">Stored in SQLite</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg. Per Survey</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{averageResponses}</h3>
              <p className="text-[11px] text-slate-400">Responses per study</p>
            </div>
          </div>
        </div>

        {/* Recent Surveys Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Surveys</h2>
              <p className="text-xs text-slate-500">Your most recently created or modified feedback surveys</p>
            </div>
            <button
              onClick={() => navigate('/my-surveys')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View All ({surveys.length}) &rarr;
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Loading your surveys...</div>
          ) : surveys.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">No surveys created yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Start collecting structured feedback from students, colleagues, or users with our dynamic survey builder.
                </p>
              </div>
              <button
                onClick={() => navigate('/create-survey')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Survey</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Survey Title</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Questions</th>
                    <th className="px-6 py-3">Responses</th>
                    <th className="px-6 py-3">Last Updated</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {surveys.slice(0, 5).map((survey) => (
                    <tr key={survey.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">{survey.title}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">/s/{survey.public_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
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
                      <td className="px-6 py-4 text-slate-600">{survey.question_count || 0}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{survey.response_count || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(survey.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => copyPublicLink(survey.public_id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Copy Public Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/survey/${survey.id}/results`)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Results</span>
                        </button>
                        <button
                          onClick={() => navigate(`/survey/${survey.id}/edit`)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Copy Notification Toast */}
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
