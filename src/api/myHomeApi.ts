import api from './axiosConfig';
import type { CallOutcome, GrowthGoal, HomeFollowUp, HomeTask, MyHomeData } from '@/types/myHome.types';

// The signed-in employee's My Home page — /api/me. Everything here acts on the
// caller's own records; ticket status, email replies, follow-ups and leave go
// through their existing modules' endpoints (ticketApi, ticketEmailApi, …).

export const getMyHome = (weekStart?: string): Promise<MyHomeData> =>
  api.get('/me/home', { params: weekStart ? { weekStart } : undefined }).then((r) => r.data.data);

export const logTime = (data: { ticketId: string; hours: number; date?: string; note?: string }) =>
  api
    .post('/me/time-entries', data)
    .then((r) => r.data as { message: string; data: { ticketId: string; loggedHours: number } });

export const createTodo = (data: { title: string; dueDate?: string; priority?: string }): Promise<HomeTask> =>
  api.post('/me/todos', data).then((r) => r.data.data);

export const updateTodo = (id: string, data: { done?: boolean; title?: string; dueDate?: string | null }): Promise<HomeTask> =>
  api.patch(`/me/todos/${id}`, data).then((r) => r.data.data);

export const deleteTodo = (id: string) => api.delete(`/me/todos/${id}`).then((r) => r.data);

export const createGoal = (data: {
  title: string;
  type: GrowthGoal['type'];
  targetLabel?: string;
  steps: string[];
}): Promise<GrowthGoal> => api.post('/me/goals', data).then((r) => r.data.data);

export const deleteGoal = (id: string) => api.delete(`/me/goals/${id}`).then((r) => r.data);

export const toggleGoalStep = (goalId: string, stepId: string, done: boolean): Promise<GrowthGoal> =>
  api.patch(`/me/goals/${goalId}/steps/${stepId}`, { done }).then((r) => r.data.data);

export const markEmailReplied = (source: 'ticket' | 'lead', id: string) =>
  api.patch(`/me/emails/${source}/${id}/replied`).then((r) => r.data.data as { id: string; repliedAt: string });

export const logCall = (data: { leadId: string; outcome: CallOutcome; note?: string }) =>
  api.post('/me/telesales/calls', data).then(
    (r) => r.data.data as { call: { id: string; leadId: string; outcome: CallOutcome }; followUp: HomeFollowUp | null }
  );

export const undoCall = (id: string) =>
  api.delete(`/me/telesales/calls/${id}`).then((r) => r.data.data as { id: string; followUpId: string | null });
