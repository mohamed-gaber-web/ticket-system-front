/**
 * Development module — kanban boards. Mirrors the backend's DevBoard / DevList /
 * DevCard / DevCardComment models and the `/api/development` envelopes.
 */

export interface DevPerson {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  profilePicture?: string | null;
  position?: string;
}

export interface DevLabel {
  _id: string;
  name: string;
  color: string;
}

export interface DevBoard {
  _id: string;
  name: string;
  description: string;
  createdBy: DevPerson;
  members: DevPerson[];
  labels: DevLabel[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /** Only on the list endpoint */
  listCount?: number;
  cardCount?: number;
}

export interface DevList {
  _id: string;
  board: string;
  name: string;
  position: number;
}

export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';

export const CARD_PRIORITIES: CardPriority[] = ['low', 'medium', 'high', 'urgent'];

export const PRIORITY_LABELS: Record<CardPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export interface DevChecklistItem {
  _id: string;
  text: string;
  done: boolean;
}

export interface DevCard {
  _id: string;
  board: string;
  list: string;
  position: number;
  title: string;
  description: string;
  assignedTo: DevPerson | null;
  priority: CardPriority;
  dueDate: string | null;
  labels: string[];
  checklist: DevChecklistItem[];
  createdBy: Pick<DevPerson, '_id' | 'firstName' | 'lastName'>;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevCardComment {
  _id: string;
  card: string;
  board: string;
  author: DevPerson;
  text: string;
  createdAt: string;
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateBoardData {
  name: string;
  description?: string;
  members?: string[];
  labels?: { name: string; color: string }[];
}

export interface UpdateBoardData {
  name?: string;
  description?: string;
  archived?: boolean;
}

export interface CardFieldsData {
  title?: string;
  description?: string;
  assignedTo?: string | null;
  priority?: CardPriority;
  dueDate?: string | null;
  labels?: string[];
  completed?: boolean;
}

export interface CreateCardData extends CardFieldsData {
  listId: string;
  title: string;
}

export interface MoveCardData {
  listId: string;
  position: number;
}

// ── Envelopes ─────────────────────────────────────────────────────────────────

export interface ApiOne<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type BoardFullResponse = ApiOne<{ board: DevBoard; lists: DevList[]; cards: DevCard[] }>;

export type MoveCardResponse = ApiOne<{
  card: DevCard;
  source: { list: string; order: string[] };
  destination: { list: string; order: string[] };
}>;
