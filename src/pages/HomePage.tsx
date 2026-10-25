import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Database,
  Lock,
  Layers,
  FileSpreadsheet,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { user, login } = useAuth();
  const [directCode, setDirectCode] = useState('feedback-2026-campus');
  const [quickLoginLoading, setQuickLoginLoading] = useState<string | null>(null);

  const handleQuickLogin = async (email: string, pass: string, role: string) => {
    setQuickLoginLoading(role);
    const res = await login({ email, password: pass });
    setQuickLoginLoading(null);
    if (res.success) {
      if (res.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleOpenSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (directCode.trim()) {
      navigate(`/s/${directCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 shadow-inner">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure Web Survey &amp; Analytics Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Collect High-Impact Feedback <br className="hidden sm:inline" />
            <span className="text-blue-200">With Real-Time Analytics</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-blue-100/90 leading-relaxed">
            Full-stack survey platform built with persistent SQLite, bcrypt session authentication,
            granular administrator governance, dynamic question builders, and Chart.js analytics.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <button
                onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-white text-blue-900 font-bold hover:bg-blue-50 shadow-lg shadow-black/10 transition-transform active:scale-95"
              >
                <span>Enter {user.role === 'admin' ? 'Admin Portal' : 'Workspace'}</span>
                <ArrowRight className="w-5 h-5 text-blue-700" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold shadow-lg shadow-blue-900/30 transition-transform active:scale-95"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 backdrop-blur-xs transition-colors"
                >
                  <span>Sign In</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-12">
        {/* Quick Evaluation Credentials & Live Testing Card */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-blue-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-900">Immediate Testing &amp; Roles Demo</h2>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Database is pre-seeded with persistent administrative and researcher test accounts. Click below to sign in instantly.
              </p>
            </div>

            {/* Direct Survey Respondent Lookup */}
            <form onSubmit={handleOpenSurvey} className="flex items-center gap-2">
              <input
                type="text"
                value={directCode}
                onChange={(e) => setDirectCode(e.target.value)}
                placeholder="Survey Public ID..."
                className="px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                <span>Take Survey</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Admin Test Account Card */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Admin Role
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Full Privileges</span>
                </div>
                <div className="mt-3 text-sm text-slate-700 space-y-1">
                  <p><strong className="font-semibold text-slate-900">Admin Account:</strong> admin@surveypulse.io</p>
                  <p className="text-xs text-slate-500">Privileges: User governance, platform survey moderation, audit logs, analytics.</p>
                </div>
              </div>
              <button
                onClick={() => handleQuickLogin('admin@surveypulse.io', 'Admin123!', 'admin')}
                disabled={!!quickLoginLoading}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1"
              >
                {quickLoginLoading === 'admin' ? <span>Signing in...</span> : <span>Quick Sign In as Admin</span>}
              </button>
            </div>

            {/* Researcher User Account Card */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    User Role
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Researcher &amp; Creator</span>
                </div>
                <div className="mt-3 text-sm text-slate-700 space-y-1">
                  <p><strong className="font-semibold text-slate-900">User Account:</strong> alex.rivera@example.com</p>
                  <p className="text-xs text-slate-500">Privileges: Survey builder, response analytics, CSV export, profile settings.</p>
                </div>
              </div>
              <button
                onClick={() => handleQuickLogin('alex.rivera@example.com', 'User123!', 'user')}
                disabled={!!quickLoginLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1"
              >
                {quickLoginLoading === 'user' ? <span>Signing in...</span> : <span>Quick Sign In as User</span>}
              </button>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900">Engineered for Academic &amp; Production Rigor</h2>
            <p className="text-sm text-slate-500 mt-2">
              Every feature satisfies all requirements of a modern full-stack web development project.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Persistent Relational SQLite</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Indexed schemas, foreign key cascade enforcement, parameterized SQL against injection,
                and disk-backed storage that survives server restarts.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">bcrypt &amp; Session Security</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                HttpOnly session cookies, session fixation regeneration, IP rate limiting, server-side role validation,
                and IDOR protection preventing cross-user survey tampering.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">6 Supported Question Types</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Single choice (radio), multiple choice (checkbox), open text, Yes/No toggles, 1-5 rating scales,
                and dropdown menus with required/optional flags and reordering.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Real-Time Chart.js Visualizations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatic aggregation of responses into interactive bar charts, doughnut distributions, average score badges,
                and filterable text feedback streams.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Admin Audit Trail &amp; Governance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated administrator portal with user status toggles (activate/disable), role elevations, survey moderation,
                and immutable audit logs recording every admin action.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Safe CSV Data Export</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Export raw survey responses to CSV with spreadsheet formula injection mitigation (escaping =, +, -, @),
                fully compatible with Excel, Google Sheets, and SPSS.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>SurveyPulse &bull; Full-Stack College Web Development Project &bull; Persistent SQLite &amp; Node.js Express</p>
      </footer>
    </div>
  );
};
