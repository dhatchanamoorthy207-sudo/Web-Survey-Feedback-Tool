import React, { useState } from 'react';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowLeft, Lock } from 'lucide-react';

interface ForgotPasswordPageProps {
  navigate: (path: string) => void;
  initialToken?: string;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ navigate, initialToken = '' }) => {
  const [step, setStep] = useState<'request' | 'reset'>(initialToken ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedTokenNotice, setGeneratedTokenNotice] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage(data.message);
        if (data.resetToken) {
          setGeneratedTokenNotice(data.resetToken);
          setToken(data.resetToken);
        }
      } else {
        setError(data.error || 'Failed to submit recovery request.');
      }
    } catch (err) {
      setLoading(false);
      setError('Network communication error.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
          confirmNewPassword: confirmPassword,
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage(data.message || 'Password successfully reset!');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setLoading(false);
      setError('Network communication error.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {step === 'request' ? 'Password Recovery' : 'Create New Password'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {step === 'request'
              ? 'Enter your registered email address to generate a recovery token.'
              : 'Enter your verification token and your new secure password.'}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {generatedTokenNotice && step === 'request' && (
            <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
              <p className="text-xs font-bold text-blue-900 uppercase">Dev Demo Notice:</p>
              <p className="text-xs text-blue-800">
                A secure 1-hour reset token was generated in SQLite:
              </p>
              <div className="p-2 bg-white rounded-md border border-blue-200 font-mono text-[11px] break-all select-all text-slate-800">
                {generatedTokenNotice}
              </div>
              <button
                type="button"
                onClick={() => setStep('reset')}
                className="w-full mt-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Proceed to Reset Password Form &rarr;
              </button>
            </div>
          )}

          {step === 'request' ? (
            <form className="space-y-4" onSubmit={handleRequestToken}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Account Email
                </label>
                <div className="mt-1 relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex.rivera@example.com"
                    className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden transition-colors disabled:opacity-60"
              >
                {loading ? 'Processing...' : 'Send Recovery Instructions'}
              </button>

              <div className="pt-2 text-center flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('reset')}
                  className="text-blue-600 hover:underline"
                >
                  Already have a token?
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Recovery Token
                </label>
                <div className="mt-1 relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token code"
                    className="block w-full pl-10 pr-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  New Password (min 8 chars)
                </label>
                <div className="mt-1 relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Confirm New Password
                </label>
                <div className="mt-1 relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden transition-colors disabled:opacity-60"
              >
                {loading ? 'Updating Password...' : 'Save New Password &amp; Log In'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  &larr; Request a different token
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
