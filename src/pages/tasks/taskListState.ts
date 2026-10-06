// Remembers the task list's filters, sort and page for the browser tab, so
// opening a task and coming back lands on the same filtered list. Storage can
// be unavailable (private mode, blocked site data) — then it simply forgets.

export interface TaskListFilters {
  search: string;
  status: string;
  department: string;
  category: string;
  startDate: string;
  endDate: string;
  assignedTo: string;
  week: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  page: number;
}

const filtersKey = (mine: boolean) => `tasks-list:${mine ? 'mine' : 'all'}`;
const LIST_PATH_KEY = 'tasks-list:path';

export const loadTaskListFilters = (mine: boolean): Partial<TaskListFilters> => {
  try {
    return JSON.parse(sessionStorage.getItem(filtersKey(mine)) ?? '{}') ?? {};
  } catch {
    return {};
  }
};

export const saveTaskListFilters = (mine: boolean, filters: TaskListFilters) => {
  try {
    sessionStorage.setItem(filtersKey(mine), JSON.stringify(filters));
    sessionStorage.setItem(LIST_PATH_KEY, mine ? '/tasks/my' : '/tasks');
  } catch {
    /* storage unavailable — nothing to remember */
  }
};

/** The list (My Tasks or All Tasks) the user last came from. */
export const lastTaskListPath = (): string => {
  try {
    return sessionStorage.getItem(LIST_PATH_KEY) || '/tasks';
  } catch {
    return '/tasks';
  }
};
