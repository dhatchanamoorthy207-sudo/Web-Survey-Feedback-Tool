import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import {
  CheckCircle2,
  AlertCircle,
  Star,
  Lock,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Question } from '../types/index.ts';

interface PublicSurveyPageProps {
  publicId: string;
  navigate: (path: string) => void;
}

interface PublicSurveyData {
  id: number;
  title: string;
  description: string | null;
  intro_text: string | null;
  public_id: string;
  status: string;
  questions: Question[];
}

export const PublicSurveyPage: React.FC<PublicSurveyPageProps> = ({ publicId, navigate }) => {
  const { user } = useAuth();
  const [survey, setSurvey] = useState<PublicSurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  // Form responses: questionId -> value | array of values
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    responseId: number;
    submittedAt: string;
  } | null>(null);

  useEffect(() => {
    loadSurvey();
  }, [publicId]);

  const loadSurvey = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch(`/api/surveys/public/${publicId}`);
      const data = await res.json();

      if (res.ok) {
        setSurvey(data.survey);
      } else {
        if (data.requiresAuth) {
          setRequiresAuth(true);
        }
        setErrorStatus(data.error || 'Failed to access survey.');
      }
    } catch (err) {
      setErrorStatus('Failed to connect to survey server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (qId: number, rating: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: String(rating) }));
    if (validationErrors[qId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  };

  const handleSingleChoiceChange = (qId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (validationErrors[qId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  };

  const handleMultipleChoiceToggle = (qId: number, optionText: string) => {
    const currentList: string[] = Array.isArray(answers[qId]) ? answers[qId] : [];
    let updated: string[];
    if (currentList.includes(optionText)) {
      updated = currentList.filter((item) => item !== optionText);
    } else {
      updated = [...currentList, optionText];
    }
    setAnswers((prev) => ({ ...prev, [qId]: updated }));
    if (validationErrors[qId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  };

  const handleTextChange = (qId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
    if (validationErrors[qId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    // Client-side validation
    const errors: Record<number, string> = {};
    for (const q of survey.questions) {
      const val = answers[q.id!];
      const empty =
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0);

      if (q.is_required && empty) {
        errors[q.id!] = 'This question is required. Please provide an answer.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstErrorQ = document.getElementById(`q-card-${Object.keys(errors)[0]}`);
      if (firstErrorQ) {
        firstErrorQ.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/responses/submit/${publicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      setSubmitting(false);

      if (res.ok) {
        setSubmissionSuccess({
          responseId: data.responseId,
          submittedAt: data.submittedAt,
        });

        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#38bdf8', '#10b981', '#f59e0b'],
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(data.error || 'Submission error');
      }
    } catch (err) {
      setSubmitting(false);
      alert('Network communication error during submission.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            {requiresAuth ? <Lock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Survey Unavailable</h2>
            <p className="text-sm text-slate-600 mt-2">{errorStatus}</p>
          </div>

          {requiresAuth ? (
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors"
              >
                Sign In to Participate
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={() => navigate('/')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors"
              >
                Return to Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (submissionSuccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 p-8 text-center space-y-5 shadow-lg shadow-emerald-900/5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Thank You!</h2>
            <p className="text-sm text-slate-600">
              Your responses have been securely stored in the survey database.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2 font-mono text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Response ID:</span>
              <span className="font-bold text-slate-900">#{submissionSuccess.responseId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timestamp:</span>
              <span className="text-slate-900">
                {new Date(submissionSuccess.submittedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Integrity:</span>
              <span className="text-emerald-700 font-semibold">Verified &amp; Committed</span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setAnswers({});
              }}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Submit Another Response</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Back to SurveyPulse Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Survey Banner Card */}
        <div className="bg-white rounded-3xl border border-blue-200/80 shadow-md p-6 sm:p-8 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

          <div className="pt-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official University Survey</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {survey?.title}
            </h1>
            {survey?.description && (
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{survey.description}</p>
            )}

            {survey?.intro_text && (
              <div className="mt-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                {survey.intro_text}
              </div>
            )}

            <div className="pt-4 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 mt-4">
              <span>{survey?.questions.length} Questions</span>
              <span>Fields marked with <span className="text-rose-500 font-bold">*</span> are required</span>
            </div>
          </div>
        </div>

        {/* Survey Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {survey?.questions.map((q, idx) => {
            const hasError = !!validationErrors[q.id!];

            return (
              <div
                key={q.id}
                id={`q-card-${q.id}`}
                className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 transition-all ${
                  hasError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {q.question_text}
                      {q.is_required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                    </h3>
                  </div>
                </div>

                {hasError && (
                  <p className="text-xs text-rose-600 font-medium pl-9 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors[q.id!]}</span>
                  </p>
                )}

                {/* Question Body Input Types */}
                <div className="pl-9 pt-1">
                  {/* Rating (1-5) */}
                  {q.question_type === 'rating' && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        {[1, 2, 3, 4, 5].map((stars) => {
                          const currentVal = parseInt(answers[q.id!], 10);
                          const isSelected = currentVal >= stars;
                          return (
                            <button
                              key={stars}
                              type="button"
                              onClick={() => handleRatingChange(q.id!, stars)}
                              className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-105'
                                  : 'bg-slate-50 border border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-300'
                              }`}
                            >
                              <Star className={`w-5 h-5 ${isSelected ? 'fill-white' : ''}`} />
                              <span className="text-[10px] font-bold mt-0.5">{stars}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between max-w-xs text-[11px] text-slate-400 font-medium px-1">
                        <span>1: Poor</span>
                        <span>5: Excellent</span>
                      </div>
                    </div>
                  )}

                  {/* Yes / No */}
                  {q.question_type === 'yes_no' && (
                    <div className="flex gap-3">
                      {['Yes', 'No'].map((val) => {
                        const isSelected = answers[q.id!] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleSingleChoiceChange(q.id!, val)}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Single Choice (Radio) */}
                  {q.question_type === 'single_choice' && (
                    <div className="space-y-2">
                      {q.options?.map((opt) => {
                        const isSelected = answers[q.id!] === opt.option_text;
                        return (
                          <label
                            key={opt.id || opt.option_text}
                            onClick={() => handleSingleChoiceChange(q.id!, opt.option_text)}
                            className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/70 border-blue-500 text-blue-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{opt.option_text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Multiple Choice (Checkboxes) */}
                  {q.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {q.options?.map((opt) => {
                        const selectedList: string[] = Array.isArray(answers[q.id!]) ? answers[q.id!] : [];
                        const isSelected = selectedList.includes(opt.option_text);
                        return (
                          <label
                            key={opt.id || opt.option_text}
                            onClick={() => handleMultipleChoiceToggle(q.id!, opt.option_text)}
                            className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/70 border-blue-500 text-blue-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 text-blue-600 rounded-sm focus:ring-blue-500"
                            />
                            <span className="text-sm">{opt.option_text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown */}
                  {q.question_type === 'dropdown' && (
                    <div>
                      <select
                        value={answers[q.id!] || ''}
                        onChange={(e) => handleSingleChoiceChange(q.id!, e.target.value)}
                        className="w-full sm:max-w-md px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-800"
                      >
                        <option value="">-- Select an option --</option>
                        {q.options?.map((opt) => (
                          <option key={opt.id || opt.option_text} value={opt.option_text}>
                            {opt.option_text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Open Text */}
                  {q.question_type === 'text' && (
                    <div className="space-y-1">
                      <textarea
                        rows={3}
                        maxLength={3000}
                        value={answers[q.id!] || ''}
                        onChange={(e) => handleTextChange(q.id!, e.target.value)}
                        placeholder="Write your feedback here..."
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                      />
                      <div className="flex justify-end text-[10px] text-slate-400">
                        <span>{(answers[q.id!] || '').length} / 3000 characters</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Submit Action */}
          <div className="pt-4 pb-12 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Responses are encrypted &amp; stored safely</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <span>Recording Response...</span>
              ) : (
                <>
                  <span>Submit Feedback</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
