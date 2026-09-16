import api from './axiosConfig';
import type {
  ApiOne,
  BoardFullResponse,
  CardFieldsData,
  CreateBoardData,
  CreateCardData,
  DevBoard,
  DevCard,
  DevCardComment,
  DevChecklistItem,
  DevLabel,
  DevList,
  MoveCardData,
  MoveCardResponse,
  UpdateBoardData,
} from '@/types/development.types';

const noCache = { headers: { 'Cache-Control': 'no-cache' } };
const base = '/development';

// ── Boards ────────────────────────────────────────────────────────────────────

export const getBoards = async (params?: { archived?: 'true' | 'false' | 'all'; search?: string }) =>
  (await api.get<ApiOne<DevBoard[]>>(`${base}/boards`, { params, ...noCache })).data;

export const createBoard = async (payload: CreateBoardData) =>
  (await api.post<ApiOne<DevBoard>>(`${base}/boards`, payload)).data;

export const getBoardFull = async (id: string) =>
  (await api.get<BoardFullResponse>(`${base}/boards/${id}/full`, noCache)).data;

export const updateBoard = async (id: string, payload: UpdateBoardData) =>
  (await api.patch<ApiOne<DevBoard>>(`${base}/boards/${id}`, payload)).data;

export const deleteBoard = async (id: string) =>
  (await api.delete<ApiOne<object>>(`${base}/boards/${id}`)).data;

export const setBoardMembers = async (id: string, members: string[]) =>
  (await api.put<ApiOne<DevBoard>>(`${base}/boards/${id}/members`, { members })).data;

export const addLabel = async (boardId: string, payload: { name: string; color: string }) =>
  (await api.post<ApiOne<DevLabel[]>>(`${base}/boards/${boardId}/labels`, payload)).data;

export const updateLabel = async (boardId: string, labelId: string, payload: { name?: string; color?: string }) =>
  (await api.patch<ApiOne<DevLabel[]>>(`${base}/boards/${boardId}/labels/${labelId}`, payload)).data;

export const deleteLabel = async (boardId: string, labelId: string) =>
  (await api.delete<ApiOne<DevLabel[]>>(`${base}/boards/${boardId}/labels/${labelId}`)).data;

// ── Lists ─────────────────────────────────────────────────────────────────────

export const createList = async (boardId: string, name: string) =>
  (await api.post<ApiOne<DevList>>(`${base}/boards/${boardId}/lists`, { name })).data;

export const reorderLists = async (boardId: string, listIds: string[]) =>
  (await api.put<ApiOne<DevList[]>>(`${base}/boards/${boardId}/lists/reorder`, { listIds })).data;

export const updateList = async (id: string, name: string) =>
  (await api.patch<ApiOne<DevList>>(`${base}/lists/${id}`, { name })).data;

export const deleteList = async (id: string) =>
  (await api.delete<ApiOne<object>>(`${base}/lists/${id}`)).data;

// ── Cards ─────────────────────────────────────────────────────────────────────

export const createCard = async (boardId: string, payload: CreateCardData) =>
  (await api.post<ApiOne<DevCard>>(`${base}/boards/${boardId}/cards`, payload)).data;

export const updateCard = async (id: string, payload: CardFieldsData) =>
  (await api.patch<ApiOne<DevCard>>(`${base}/cards/${id}`, payload)).data;

export const moveCard = async (id: string, payload: MoveCardData) =>
  (await api.patch<MoveCardResponse>(`${base}/cards/${id}/move`, payload)).data;

export const deleteCard = async (id: string) =>
  (await api.delete<ApiOne<object>>(`${base}/cards/${id}`)).data;

export const addChecklistItem = async (cardId: string, text: string) =>
  (await api.post<ApiOne<DevChecklistItem[]>>(`${base}/cards/${cardId}/checklist`, { text })).data;

export const updateChecklistItem = async (cardId: string, itemId: string, payload: { text?: string; done?: boolean }) =>
  (await api.patch<ApiOne<DevChecklistItem[]>>(`${base}/cards/${cardId}/checklist/${itemId}`, payload)).data;

export const deleteChecklistItem = async (cardId: string, itemId: string) =>
  (await api.delete<ApiOne<DevChecklistItem[]>>(`${base}/cards/${cardId}/checklist/${itemId}`)).data;

// ── Comments ──────────────────────────────────────────────────────────────────

export const getComments = async (cardId: string) =>
  (await api.get<ApiOne<DevCardComment[]>>(`${base}/cards/${cardId}/comments`, noCache)).data;

export const addComment = async (cardId: string, text: string) =>
  (await api.post<ApiOne<DevCardComment>>(`${base}/cards/${cardId}/comments`, { text })).data;

export const deleteComment = async (id: string) =>
  (await api.delete<ApiOne<object>>(`${base}/comments/${id}`)).data;
