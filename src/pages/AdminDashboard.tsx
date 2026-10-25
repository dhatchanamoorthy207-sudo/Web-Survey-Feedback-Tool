import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Sidebar } from '../components/Sidebar.tsx';
import { AdminOverview } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import {
  Users,
  FileText,
  CheckCircle,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';

interface AdminDashboardProps {
  navigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await apiFetch('/api/admin/overview');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: data?.dailyResponses.map((d) => d.date) || [],
    datasets: [
      {
        label: 'Platform Responses',
        data: data?.dailyResponses.map((d) => d.count) || [],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.35,
        fill: true,
      },
    ],
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar currentPath="/admin" navigate={navigate} isAdminArea={true} />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Administrative Governance Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Platform Administration
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live operational metrics, user account access control, content moderation, and audit compliance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/admin/users')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Manage Users</span>
            </button>
            <button
              onClick={() => navigate('/admin/surveys')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Moderate Surveys</span>
            </button>
          </div>
        </div>

        {/* 4 Core Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {data?.metrics.totalUsers ?? '...'}
              </h3>
              <p className="text-[11px] text-slate-400">Registered accounts</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Surveys</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {data?.metrics.totalSurveys ?? '...'}
              </h3>
              <p className="text-[11px] text-slate-400">All creator surveys</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Published</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {data?.metrics.publishedSurveys ?? '...'}
              </h3>
              <p className="text-[11px] text-amber-700 font-medium">Currently active</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Responses</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {data?.metrics.totalResponses ?? '...'}
              </h3>
              <p className="text-[11px] text-slate-400">Collected in database</p>
            </div>
          </div>
        </div>

        {/* Global Response Activity Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Platform Response Volume</h2>
              <p className="text-xs text-slate-500">Aggregate daily response submissions across all active surveys</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              Last 14 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <Line
              data={chartData}
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
                  },
                },
              }}
            />
          </div>
        </div>

        {/* 2-Column Split: Recent Surveys & Recent Audit Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Surveys */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Latest Created Surveys</h3>
                <p className="text-xs text-slate-500">Recent surveys registered in SQLite</p>
              </div>
              <button
                onClick={() => navigate('/admin/surveys')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                View All &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {data?.recentSurveys.map((s) => (
                <div key={s.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900 line-clamp-1">{s.title}</p>
                    <p className="text-slate-400">
                      By <span className="text-slate-600">{s.creator_name}</span> &bull; {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        s.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.status}
                    </span>
                    <p className="text-slate-500 font-bold mt-1">{s.response_count || 0} resps</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Audit Trail */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Audit Trail</h3>
                <p className="text-xs text-slate-500">Administrative operations recorded</p>
              </div>
              <button
                onClick={() => navigate('/admin/audit')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                All Logs &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {data?.recentAudit.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
                      {log.action}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 line-clamp-2">{log.details}</p>
                  <p className="text-[10px] text-slate-400">Actor: {log.admin_name || 'System'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
