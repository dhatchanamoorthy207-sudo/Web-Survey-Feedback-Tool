import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar.tsx';
import { Modal } from '../components/Modal.tsx';
import { QuestionType } from '../types/index.ts';
import { apiFetch } from '../utils/api.ts';
import {
  PlusCircle,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Star,
  ListFilter,
  CheckSquare,
  MessageSquare,
  ToggleLeft,
  Settings,
} from 'lucide-react';

interface QuestionDraft {
  id?: number;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  display_order: number;
  options: { id?: number; option_text: string; display_order: number }[];
}

interface SurveyBuilderPageProps {
  navigate: (path: string) => void;
  surveyId?: number;
}

export const SurveyBuilderPage: React.FC<SurveyBuilderPageProps> = ({ navigate, surveyId }) => {
  const isEditing = !!surveyId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [introText, setIntroText] = useState('');
  const [requireAuth, setRequireAuth] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadExistingSurvey();
    } else {
      // Default starting question
      setQuestions([
        {
          question_text: 'How satisfied are you with our overall service?',
          question_type: 'rating',
          is_required: true,
          display_order: 1,
          options: [],
        },
      ]);
    }
  }, [surveyId]);

  const loadExistingSurvey = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/surveys/${surveyId}`);
      if (res.ok) {
        const data = await res.json();
        const s = data.survey;
        setTitle(s.title);
        setDescription(s.description || '');
        setIntroText(s.intro_text || '');
        setRequireAuth(!!s.require_auth);
        setStatus(s.status === 'published' ? 'published' : 'draft');
        setQuestions(
          (s.questions || []).map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            is_required: !!q.is_required,
            display_order: q.display_order,
            options: q.options || [],
          }))
        );
      } else {
        setErrorMessage('Failed to load survey. It may not exist or you lack permission.');
      }
    } catch (err) {
      setErrorMessage('Network error loading survey.');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = (type: QuestionType = 'single_choice') => {
    const defaultOptions = ['single_choice', 'multiple_choice', 'dropdown'].includes(type)
      ? [
          { option_text: 'Option 1', display_order: 1 },
          { option_text: 'Option 2', display_order: 2 },
        ]
      : [];

    const newQ: QuestionDraft = {
      question_text: '',
      question_type: type,
      is_required: true,
      display_order: questions.length + 1,
      options: defaultOptions,
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated.map((q, idx) => ({ ...q, display_order: idx + 1 })));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setQuestions(reordered.map((q, idx) => ({ ...q, display_order: idx + 1 })));
  };

  const updateQuestionText = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].question_text = text;
    setQuestions(updated);
  };

  const updateQuestionType = (index: number, newType: QuestionType) => {
    const updated = [...questions];
    const currentQ = updated[index];
    currentQ.question_type = newType;

    if (['single_choice', 'multiple_choice', 'dropdown'].includes(newType)) {
      if (!currentQ.options || currentQ.options.length === 0) {
        currentQ.options = [
          { option_text: 'Option 1', display_order: 1 },
          { option_text: 'Option 2', display_order: 2 },
        ];
      }
    } else {
      currentQ.options = [];
    }
    setQuestions(updated);
  };

  const toggleRequired = (index: number) => {
    const updated = [...questions];
    updated[index].is_required = !updated[index].is_required;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    const currentOptions = updated[qIndex].options || [];
    updated[qIndex].options = [
      ...currentOptions,
      {
        option_text: `Option ${currentOptions.length + 1}`,
        display_order: currentOptions.length + 1,
      },
    ];
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].option_text = text;
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 1) {
      alert('Questions must have at least one answer option.');
      return;
    }
    updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
    setQuestions(updated);
  };

  const handleSave = async (targetStatus: 'draft' | 'published') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please provide a title for your survey.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (questions.length === 0) {
      setErrorMessage('Please add at least one question to the survey.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate that questions have non-empty text
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        setErrorMessage(`Question #${i + 1} cannot have an empty question prompt.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (['single_choice', 'multiple_choice', 'dropdown'].includes(questions[i].question_type)) {
        if (!questions[i].options || questions[i].options.length < 2) {
          setErrorMessage(`Question #${i + 1} (${questions[i].question_type}) requires at least 2 options.`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      intro_text: introText.trim(),
      status: targetStatus,
      require_auth: requireAuth,
      questions,
    };

    try {
      const endpoint = isEditing ? `/api/surveys/${surveyId}` : '/api/surveys';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setSaving(false);

      if (res.ok) {
        setSuccessMessage(
          targetStatus === 'published'
            ? 'Survey published successfully! Live link is now active.'
            : 'Survey draft saved successfully.'
        );
        setTimeout(() => {
          navigate('/my-surveys');
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Failed to save survey.');
      }
    } catch (err) {
      setSaving(false);
      setErrorMessage('Network communication error while saving survey.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar currentPath="/create-survey" navigate={navigate} isAdminArea={false} />

      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isEditing ? 'Edit Survey Campaign' : 'Create New Survey'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Design questions, configure response validation, and preview before launching.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('draft')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('published')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all shadow-blue-500/20 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Publish Survey'}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to save survey:</p>
              <p className="text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-sm text-slate-400">Loading survey definition...</div>
        ) : (
          <div className="space-y-6">
            {/* Survey Meta Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Survey Information &amp; Settings</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Survey Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Undergraduate Student Services &amp; Facilities Evaluation"
                    className="mt-1 block w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Description / Purpose (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief summary explaining what this survey covers..."
                    className="mt-1 block w-full px-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Respondent Intro Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    placeholder="e.g. Thank you for taking 3 minutes to share your feedback with university leadership."
                    className="mt-1 block w-full px-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <input
                      id="require-auth"
                      type="checkbox"
                      checked={requireAuth}
                      onChange={(e) => setRequireAuth(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded-sm"
                    />
                    <label htmlFor="require-auth" className="text-xs text-slate-700 font-medium">
                      Require respondents to log in (Restricted Survey)
                    </label>
                  </div>
                  <span className="text-xs text-slate-400">Default: Public anonymous participation</span>
                </div>
              </div>
            </div>

            {/* Questions Header & List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Questions ({questions.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Add, reorder, customize types, and configure response options.
                  </p>
                </div>

                {/* Add Question Menu */}
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => addQuestion('rating')}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    + Rating (1-5)
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('single_choice')}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    + Single Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('multiple_choice')}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    + Multi Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('text')}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    + Open Text
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('yes_no')}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    + Yes/No
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion('dropdown')}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    + Dropdown
                  </button>
                </div>
              </div>

              {/* Questions Cards */}
              {questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {qIndex + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {q.question_type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        disabled={qIndex === 0}
                        onClick={() => moveQuestion(qIndex, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30"
                        title="Move question up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={qIndex === questions.length - 1}
                        onClick={() => moveQuestion(qIndex, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30"
                        title="Move question down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Required Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleRequired(qIndex)}
                        className={`ml-2 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                          q.is_required
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {q.is_required ? 'Required *' : 'Optional'}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors ml-2"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt & Type Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        placeholder="Enter the question prompt..."
                        className="w-full px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-900"
                      />
                    </div>
                    <div>
                      <select
                        value={q.question_type}
                        onChange={(e) => updateQuestionType(qIndex, e.target.value as QuestionType)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 text-slate-800 font-medium"
                      >
                        <option value="rating">Rating (1-5 Stars)</option>
                        <option value="single_choice">Single Choice (Radio)</option>
                        <option value="multiple_choice">Multiple Choice (Checkboxes)</option>
                        <option value="yes_no">Yes / No</option>
                        <option value="dropdown">Dropdown Selection</option>
                        <option value="text">Open-Ended Text</option>
                      </select>
                    </div>
                  </div>

                  {/* Option List for Choice / Dropdown */}
                  {['single_choice', 'multiple_choice', 'dropdown'].includes(q.question_type) && (
                    <div className="mt-3 pl-4 border-l-2 border-blue-200 space-y-2">
                      <p className="text-xs font-semibold text-slate-600">Answer Options:</p>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400 font-mono w-4">{optIndex + 1}.</span>
                          <input
                            type="text"
                            value={opt.option_text}
                            onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(qIndex, optIndex)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md"
                            title="Remove option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addOption(qIndex)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 mt-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  )}

                  {/* Preview snippet of the question type */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                    {q.question_type === 'rating' && (
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">Rating Preview:</span>
                        <div className="flex space-x-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-4 h-4 fill-amber-300 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400">(1: Poor to 5: Excellent)</span>
                      </div>
                    )}
                    {q.question_type === 'yes_no' && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Binary Toggle:</span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs">
                          Yes
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs">
                          No
                        </span>
                      </div>
                    )}
                    {q.question_type === 'text' && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Freeform Text:</span>
                        <span className="text-slate-400 italic">Multilateral response up to 3,000 characters</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => addQuestion('single_choice')}
                  className="inline-flex items-center space-x-2 px-5 py-3 border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold transition-colors w-full justify-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Another Question</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Preview Modal */}
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={`Preview: ${title || 'Untitled Survey'}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="border-b border-slate-100 pb-4">
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-100 text-blue-700 uppercase">
                Respondent Preview Mode
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">{title || 'Untitled Survey'}</h2>
              {description && <p className="text-xs text-slate-600 mt-1">{description}</p>}
              {introText && (
                <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                  {introText}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={idx} className="space-y-2 p-4 rounded-xl bg-slate-50/60 border border-slate-200">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xs font-bold text-slate-700">{idx + 1}.</span>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {q.question_text || 'Untitled Question'}
                      {q.is_required && <span className="text-rose-500 ml-1">*</span>}
                    </h3>
                  </div>

                  {q.question_type === 'rating' && (
                    <div className="flex items-center space-x-2 pt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="w-9 h-9 rounded-lg border border-slate-300 bg-white text-xs font-bold hover:bg-blue-50 hover:border-blue-400"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'yes_no' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-blue-50"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-blue-50"
                      >
                        No
                      </button>
                    </div>
                  )}

                  {q.question_type === 'single_choice' && (
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className="flex items-center space-x-2 text-xs text-slate-700 p-2 rounded-lg bg-white border border-slate-200"
                        >
                          <input type="radio" name={`prev_q_${idx}`} className="text-blue-600" />
                          <span>{opt.option_text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'multiple_choice' && (
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className="flex items-center space-x-2 text-xs text-slate-700 p-2 rounded-lg bg-white border border-slate-200"
                        >
                          <input type="checkbox" className="text-blue-600 rounded-sm" />
                          <span>{opt.option_text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'dropdown' && (
                    <div className="pt-1">
                      <select className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white">
                        <option value="">-- Choose an option --</option>
                        {q.options.map((opt, oIdx) => (
                          <option key={oIdx} value={opt.option_text}>
                            {opt.option_text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {q.question_type === 'text' && (
                    <div className="pt-1">
                      <textarea
                        rows={3}
                        placeholder="Respondent answer will appear here..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                        disabled
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};
