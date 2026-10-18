// Marketing › Social Pulse (/api/social) — mirrors the backend's socialLogic.js.

export type Platform = 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'x';
export type ContentType = 'reel' | 'video' | 'image' | 'carousel' | 'text' | 'live' | 'story';
export type MetricField =
  | 'reach'
  | 'impressions'
  | 'views'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'clicks'
  | 'followers'
  | 'leads'
  | 'spend';
export type MetricKey = 'reach' | 'impressions' | 'views' | 'engagement' | 'er' | 'clicks' | 'ctr' | 'followers' | 'leads' | 'cpl';
export type SocialView = 'cumulative' | 'month';
export type SnapshotSource = 'manual' | 'batch' | 'import';

/** Every metric is a number ≥ 0, or null = "not available". */
export type MetricValues = Record<MetricField, number | null>;

/** aggregate(): sums of the raw fields (null counts as 0) + engagement + row count. */
export type Sums = Record<MetricField, number> & { count: number; eng: number };

export interface SocialFilters {
  platform: string;
  type: string;
  category: string;
  from: string;
  to: string;
}

export interface SocialMeta {
  platforms: Platform[];
  types: ContentType[];
  categories: string[];
  usedCategories: string[];
  hasUncategorised: boolean;
  months: string[];
  currentMonth: string;
  dueCount: number;
  postCount: number;
  sampleCount: number;
  canWrite: boolean;
}

export interface SocialPostRow {
  id: string;
  title: string;
  platform: Platform;
  type: ContentType;
  category: string;
  publishDate: string;
  boosted: boolean;
  link: string;
  isSample: boolean;
  latestMonth: string | null;
  pullCount: number;
  values: MetricValues;
  engagement: number;
  er: number | null;
  lastGainEngagement: number | null;
}

export interface SocialSnapshot extends MetricValues {
  month: string;
  pulledAt?: string;
  source?: SnapshotSource;
}

export interface SocialPost {
  id: string;
  title: string;
  platform: Platform;
  type: ContentType;
  category: string;
  publishDate: string;
  boosted: boolean;
  link: string;
  externalId: string;
  notes: string;
  isSample: boolean;
  latestMonth: string | null;
  snapshots: SocialSnapshot[];
}

export interface SocialHistoryRow {
  month: string;
  pulledAt: string | null;
  source: SnapshotSource;
  values: MetricValues;
  engagement: number;
  engagementGain: number | null;
  er: number | null;
}

export interface SocialPostDetail {
  post: SocialPost;
  history: SocialHistoryRow[];
}

export interface SocialPostInput {
  title: string;
  platform: Platform;
  type: ContentType;
  category: string;
  publishDate: string;
  boosted: boolean;
  link: string;
  notes: string;
}

export interface GroupSums {
  key: string;
  sums: Sums;
  postCount: number;
}

export interface BestGroup {
  key: string;
  label: string;
  er: number;
  postCount: number;
  lift: number | null;
}

export interface SocialInsights {
  needsMore: boolean;
  mostEngaging?: { id: string; title: string; platform: Platform; er: number } | null;
  earlier?: { share: number | null; posts: number } | null;
  best?: {
    platform: BestGroup | null;
    type: BestGroup | null;
    category: BestGroup | null;
    weekday: BestGroup | null;
    paid: BestGroup | null;
  };
}

export interface SocialDashboard {
  view: SocialView;
  month: string | null;
  totals: Sums;
  platformCount: number;
  trend: { month: string; sums: Sums; postCount: number }[];
  byPlatform: GroupSums[];
  byType: GroupSums[];
  byCategory: GroupSums[];
  posts: { id: string; title: string; platform: Platform; publishDate: string; sums: Sums }[];
  insights: SocialInsights;
}

export interface SocialCompareItem {
  post: {
    id: string;
    title: string;
    platform: Platform;
    type: ContentType;
    category: string;
    publishDate: string;
    boosted: boolean;
    link: string;
  };
  values: MetricValues | null;
  aggregate: Sums | null;
}

export interface SocialBatchRow {
  post: { id: string; title: string; platform: Platform; publishDate: string };
  status: 'pulled' | 'notPulled';
  baseMonth: string | null;
  prefill: MetricValues;
}

export interface SocialBatch {
  month: string;
  rows: SocialBatchRow[];
  pulledCount: number;
  eligibleCount: number;
}

export interface ImportRow {
  rowIndex: number;
  title: string;
  link: string;
  externalId: string;
  date: string;
  platformRaw: string;
  typeRaw: string;
  category: string;
  metrics: Partial<MetricValues>;
}

export type ImportMode = 'cumulative' | 'month';

export interface ImportOptions {
  month: string;
  mode: ImportMode;
  defaults: { platform: string; type: string; category: string };
}

export interface ImportItem {
  rowIndex: number;
  status: 'update' | 'new' | 'skip';
  issue: string | null;
  postId: string | null;
  title: string;
  fileTitle: string;
  platform: Platform | null;
  type: ContentType;
  category: string;
  publishDate: string | null;
  values: MetricValues | null;
  engagementGain: number | null;
}

export interface ImportPreview {
  items: ImportItem[];
  counts: { update: number; new: number; skipped: number };
}

export interface ImportCommitResult {
  updated: number;
  created: number;
  skipped: number;
  failed: { rowIndex: number; error: string }[];
}
