export interface PersonRef {
  _id: string;
  firstName?: string;
  lastName?: string;
}

export interface SurveyCompany {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface SurveyItem {
  _id?: string;
  rating: number;
  comment: string;
}

export interface CustomerSurvey {
  _id: string;
  company: SurveyCompany;
  surveyDate: string;
  items: SurveyItem[];
  averageRating: number;
  createdBy?: PersonRef | null;
  updatedBy?: PersonRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveySummary {
  count: number;
  average: number | null;
  lastSurveyDate: string | null;
}

export interface SurveyPayload {
  company?: string;
  surveyDate?: string;
  items: { rating: number; comment: string }[];
}

export type CampaignContactStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'excluded';

export interface CampaignContact {
  _id: string;
  name?: string;
  companyName?: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  country?: string;
  status: CampaignContactStatus;
  sentAt?: string;
  /** Marked "already emailed" by hand rather than sent by the campaign. */
  sentManually?: boolean;
  lastError?: string;
  source?: string;
  createdAt: string;
}

export interface CampaignContactInput {
  email: string;
  name?: string;
  companyName?: string;
  phone?: string;
  jobTitle?: string;
  country?: string;
}

export interface CampaignContactsResponse {
  success: boolean;
  data: CampaignContact[];
  total: number;
  page: number;
  limit: number;
  byStatus: Record<CampaignContactStatus, number>;
}

export interface CampaignImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
  errors: { row: number; message: string }[];
}

export interface CampaignSettings {
  /** Hours of the day (0–23, `timeZone`); each sends one random contact. */
  sendHours: number[];
  timeZone: string;
  attachCatalog: boolean;
  /** Running (Activate pressed) or paused. Starts paused. */
  enabled: boolean;
  activatedAt: string | null;
  pausedAt: string | null;
  template: string | null;
  effectiveTemplate: { _id: string; name: string; subject?: string } | null;
  lastSentAt: string | null;
  todaySent: number;
  todayFailed: number;
}

export interface CampaignTemplate {
  _id: string;
  name: string;
  purpose: string;
  subject?: string;
  isDefault?: boolean;
}

export interface CampaignPreview {
  to: string;
  subject: string;
  body: string;
  missing: string[];
  template: { _id: string; name: string };
  attachment: { name: string; fileName: string } | null;
}
