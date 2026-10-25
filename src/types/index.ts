export type UserRole = 'admin' | 'user';
export type AccountStatus = 'active' | 'disabled';
export type SurveyStatus = 'draft' | 'published' | 'archived';
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'text'
  | 'yes_no'
  | 'rating'
  | 'dropdown';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
  created_at: string;
  survey_count?: number;
}

export interface Option {
  id?: number;
  question_id?: number;
  option_text: string;
  display_order: number;
}

export interface Question {
  id?: number;
  survey_id?: number;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  display_order: number;
  options?: Option[];
}

export interface Survey {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  intro_text: string | null;
  public_id: string;
  status: SurveyStatus;
  require_auth?: boolean | number;
  created_at: string;
  updated_at?: string;
  response_count?: number;
  question_count?: number;
  questions?: Question[];
  creator_name?: string;
  creator_email?: string;
}

export interface OptionAnalytics {
  text: string;
  count: number;
  percentage: number;
}

export interface RatingDistribution {
  stars: number;
  count: number;
  percentage: number;
}

export interface QuestionAnalyticsItem {
  id: number;
  question_text: string;
  question_type: QuestionType;
  answered_count: number;
  options?: OptionAnalytics[];
  yes_count?: number;
  no_count?: number;
  yes_percentage?: number;
  no_percentage?: number;
  average_rating?: string;
  distribution?: RatingDistribution[];
  responses?: { text: string; submitted_at: string }[];
}

export interface SurveyAnalytics {
  survey: {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    status: SurveyStatus;
    public_id: string;
    created_at: string;
  };
  totalResponses: number;
  timeline: { date: string; count: number }[];
  questions: QuestionAnalyticsItem[];
}

export interface AuditLog {
  id: number;
  admin_user_id: number | null;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
}

export interface AdminOverview {
  metrics: {
    totalUsers: number;
    totalSurveys: number;
    publishedSurveys: number;
    totalResponses: number;
  };
  recentSurveys: Survey[];
  recentAudit: AuditLog[];
  dailyResponses: { date: string; count: number }[];
}
