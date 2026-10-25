import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Sidebar } from '../components/Sidebar.tsx';
import { SurveyAnalytics, QuestionAnalyticsItem } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import {
  Download,
  Share2,
  Calendar,
  MessageSquare,
  Star,
  CheckCircle,
  Filter,
  ArrowLeft,
  Search,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SurveyResultsPageProps {
  surveyId: number;
  navigate: (path: string) => void;
  isAdmin?: boolean;
}

export const SurveyResultsPage: React.FC<SurveyResultsPageProps> = ({ surveyId, navigate, isAdmin = false }) => {
  const [data, setData] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionFilter, setSelectedQuestionFilter] = useState<string>('all');
  const [textSearch, setTextSearch] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [surveyId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/responses/survey/${surveyId}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json();
        setError(errJson.error || 'Failed to load survey analytics.');
      }
    } catch (err) {
      setError('Network communication error loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  const copyPublicLink = () => {
    if (!data?.survey.public_id) return;
    const fullUrl = `${window.location.origin}/s/${data.survey.public_id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCsv = async () => {
    try {
      const res = await apiFetch(`/api/responses/survey/${surveyId}/export-csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (data?.survey?.title || 'survey').replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 30);
        a.download = `${safeTitle}_results.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download CSV');
      }
    } catch (err) {
      alert('Error downloading CSV');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
        <Sidebar currentPath="/my-surveys" navigate={navigate} isAdminArea={isAdmin} />
        <main className="flex-1 p-12 text-center text-sm text-slate-400">
          Generating survey results &amp; computing chart metrics...
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
        <Sidebar currentPath="/my-surveys" navigate={navigate} isAdminArea={isAdmin} />
        <main className="flex-1 p-8 max-w-2xl mx-auto space-y-4 text-center">
          <div className="p-6 bg-white rounded-2xl border border-rose-200 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Unable to View Results</h2>
            <p className="text-sm text-rose-700">{error || 'Survey results not found.'}</p>
            <button
              onClick={() => navigate(isAdmin ? '/admin/surveys' : '/my-surveys')}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Back to Surveys
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { survey, totalResponses, timeline, questions } = data;

  const filteredQuestions =
    selectedQuestionFilter === 'all'
      ? questions
      : questions.filter((q) => String(q.id) === selectedQuestionFilter);

  // Timeline chart data
  const timelineChartData = {
    labels: timeline.map((t) => t.date),
    datasets: [
      {
        label: 'Responses',
        data: timeline.map((t) => t.count),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#2563eb',
      },
    ],
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar
        currentPath={isAdmin ? '/admin/surveys' : '/my-surveys'}
        navigate={navigate}
        isAdminArea={isAdmin}
      />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <button
              onClick={() => navigate(isAdmin ? '/admin/surveys' : '/my-surveys')}
              className="inline-flex items-center space-x-1 text-xs font-medium text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Survey List</span>
            </button>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  survey.status === 'published'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {survey.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live responses and statistical aggregation powered by persistent database queries
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={copyPublicLink}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV (Spreadsheet)</span>
            </button>
          </div>
        </div>

        {/* High Level Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Responses</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{totalResponses}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Recorded in SQLite database</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Questions Count</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{questions.length}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Active survey items</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Public Survey Link</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className="font-mono text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md truncate">
                /s/{survey.public_id}
              </span>
              <button
                onClick={() => window.open(`/s/${survey.public_id}`, '_blank')}
                className="p-1 text-slate-400 hover:text-slate-700"
                title="Test in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Open to respondents</p>
          </div>
        </div>

        {/* Responses Timeline Line Chart */}
        {timeline.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Submission Timeline</h2>
                <p className="text-xs text-slate-500">Number of responses recorded over time</p>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Daily Trend
              </span>
            </div>
            <div className="h-64 w-full">
              <Line
                data={timelineChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 },
                      grid: { color: '#f1f5f9' },
                    },
                    x: {
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Question Filter Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Question-by-Question Analytics</h2>
            <p className="text-xs text-slate-500">Breakdown of responses, choices, ratings, and open feedback</p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedQuestionFilter}
              onChange={(e) => setSelectedQuestionFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-800 font-medium"
            >
              <option value="all">Show All Questions ({questions.length})</option>
              {questions.map((q, idx) => (
                <option key={q.id} value={String(q.id)}>
                  Q{idx + 1}: {q.question_text.slice(0, 40)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Cards Grid */}
        <div className="space-y-6">
          {filteredQuestions.map((q, qIndex) => {
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
              >
                {/* Question Info Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        Question #{questions.findIndex((item) => item.id === q.id) + 1}
                      </span>
                      <span className="text-[11px] font-semibold uppercase text-slate-400">
                        {q.question_type.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{q.question_text}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-700">
                      {q.answered_count} {q.answered_count === 1 ? 'response' : 'responses'}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {totalResponses > 0
                        ? `${Math.round((q.answered_count / totalResponses) * 100)}% completion`
                        : '0%'}
                    </p>
                  </div>
                </div>

                {/* 1. Choice / Dropdown Analytics: Chart + Table */}
                {['single_choice', 'multiple_choice', 'dropdown'].includes(q.question_type) && q.options && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                    {/* Bar Chart */}
                    <div className="h-56 w-full">
                      <Bar
                        data={{
                          labels: q.options.map((o) => o.text),
                          datasets: [
                            {
                              label: 'Responses',
                              data: q.options.map((o) => o.count),
                              backgroundColor: [
                                '#3b82f6',
                                '#06b6d4',
                                '#10b981',
                                '#f59e0b',
                                '#8b5cf6',
                                '#ec4899',
                              ],
                              borderRadius: 6,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: { stepSize: 1 },
                              grid: { color: '#f8fafc' },
                            },
                            x: {
                              grid: { display: false },
                              ticks: { font: { size: 10 } },
                            },
                          },
                        }}
                      />
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">{opt.text}</span>
                            <span className="font-semibold text-slate-900">
                              {opt.count} ({opt.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${opt.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Rating Scale Analytics: Average + Distribution */}
                {q.question_type === 'rating' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-center space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Average Rating</p>
                      <h4 className="text-4xl font-extrabold text-amber-900">{q.average_rating || '0.00'}</h4>
                      <div className="flex justify-center text-amber-500 py-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-5 h-5 ${
                              s <= Math.round(parseFloat(q.average_rating || '0'))
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-amber-700 font-medium">Out of 5.00 stars</p>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Score Distribution:</p>
                      {q.distribution?.map((d) => (
                        <div key={d.stars} className="flex items-center space-x-3 text-xs">
                          <span className="w-12 font-medium text-slate-600 flex items-center space-x-1">
                            <span>{d.stars}</span>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          </span>
                          <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${d.percentage}%` }}
                            />
                          </div>
                          <span className="w-16 text-right font-semibold text-slate-800">
                            {d.count} ({d.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Yes / No Analytics */}
                {q.question_type === 'yes_no' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div className="flex items-center justify-around">
                      <div className="h-44 w-44">
                        <Doughnut
                          data={{
                            labels: ['Yes', 'No'],
                            datasets: [
                              {
                                data: [q.yes_count || 0, q.no_count || 0],
                                backgroundColor: ['#10b981', '#f43f5e'],
                                borderWidth: 0,
                              },
                            ],
                          }}
                          options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom' } },
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                        <span className="font-semibold text-emerald-900 text-sm">Yes</span>
                        <span className="font-bold text-emerald-900">
                          {q.yes_count} ({q.yes_percentage}%)
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                        <span className="font-semibold text-rose-900 text-sm">No</span>
                        <span className="font-bold text-rose-900">
                          {q.no_count} ({q.no_percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Open-ended Text Responses List */}
                {q.question_type === 'text' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={textSearch}
                        onChange={(e) => setTextSearch(e.target.value)}
                        placeholder="Search open-ended answers..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                      {q.responses && q.responses.length > 0 ? (
                        q.responses
                          .filter((r) => r.text.toLowerCase().includes(textSearch.toLowerCase()))
                          .map((r, rIdx) => (
                            <div key={rIdx} className="p-3 text-xs space-y-1">
                              <p className="text-slate-800 leading-relaxed font-normal">"{r.text}"</p>
                              <p className="text-[10px] text-slate-400">
                                Submitted {new Date(r.submitted_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                      ) : (
                        <p className="p-4 text-center text-xs text-slate-400">No text responses yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
