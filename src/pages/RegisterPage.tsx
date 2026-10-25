import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/Modal.tsx';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Password strength checks
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel =
    strengthScore <= 2 ? 'Weak' : strengthScore === 3 || strengthScore === 4 ? 'Moderate' : 'Strong';
  const strengthColor =
    strengthScore <= 2 ? 'bg-rose-500' : strengthScore <= 4 ? 'bg-amber-500' : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreeTerms) {
      setErrorMessage('You must review and agree to the Terms & Privacy Policy to register.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      agreeTerms,
    });
    setLoading(false);

    if (result.success && result.user) {
      navigate('/dashboard');
    } else {
      setErrorMessage(result.error || 'Failed to complete registration.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Create an Account</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Already registered?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              Sign in to your account
            </button>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Full Name
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="block w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
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
                  placeholder="jane@university.edu"
                  className="block w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="block w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Password Strength:</span>
                    <span className="font-semibold text-slate-700">{strengthLabel}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${(strengthScore / 5) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                    <span className={hasLength ? 'text-emerald-600 font-medium' : ''}>
                      {hasLength ? '✓' : '○'} 8+ characters
                    </span>
                    <span className={hasUpper ? 'text-emerald-600 font-medium' : ''}>
                      {hasUpper ? '✓' : '○'} Uppercase letter
                    </span>
                    <span className={hasLower ? 'text-emerald-600 font-medium' : ''}>
                      {hasLower ? '✓' : '○'} Lowercase letter
                    </span>
                    <span className={hasNumber ? 'text-emerald-600 font-medium' : ''}>
                      {hasNumber ? '✓' : '○'} Number (0-9)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Confirm Password
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="block w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Terms and conditions */}
            <div className="pt-2">
              <div className="flex items-start">
                <input
                  id="agree-terms"
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded-sm cursor-pointer"
                />
                <label htmlFor="agree-terms" className="ml-2 block text-xs text-slate-600 leading-normal">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Terms of Service &amp; Privacy Policy
                  </button>
                  .
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Creating Account...</span>
                  </span>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Terms Modal */}
      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} title="SurveyPulse Terms &amp; Privacy">
        <div className="space-y-4 text-xs text-slate-600 max-h-[60vh] overflow-y-auto pr-2">
          <p className="font-semibold text-slate-800">1. Educational &amp; Academic Scope</p>
          <p>
            SurveyPulse is designed for academic feedback, student research, and institutional evaluations.
            Data is stored securely in an isolated, parameterized SQLite database.
          </p>

          <p className="font-semibold text-slate-800">2. Security &amp; Credentials</p>
          <p>
            All user passwords are encrypted using bcrypt salted hashing. Plaintext passwords are never stored
            or logged. Administrative accounts cannot be self-provisioned during registration and require elevated authorization.
          </p>

          <p className="font-semibold text-slate-800">3. Respondent Privacy &amp; Data Ownership</p>
          <p>
            Surveys published for public response collect minimal network metadata solely to mitigate automated spam.
            Researchers own their survey responses and can export them safely to CSV format at any time.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              setAgreeTerms(true);
              setShowTermsModal(false);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
          >
            I Accept the Terms
          </button>
        </div>
      </Modal>
    </div>
  );
};
