/**
 * A ticket may sit in New or Assigned without a duration, but every later status
 * (in progress, pending, delivered, tested, resolved, closed, reopened, not
 * related…) needs the hours spent on it. The API enforces this; checking here
 * too just tells the user before the request. Keep in step with durationError
 * in the backend's ticketController.js.
 */
const STATUSES_WITHOUT_DURATION = new Set(['new', 'assigned']);

export const DURATION_REQUIRED_MESSAGE =
  "Enter the ticket's duration (hours, more than 0) before moving it past Assigned.";

export const hasDuration = (duration: unknown): boolean =>
  duration !== null && duration !== undefined && duration !== '' && Number(duration) > 0;

/** True when putting a ticket in `status` with `duration` would be refused. */
export const needsDuration = (status: string, duration: unknown): boolean =>
  !STATUSES_WITHOUT_DURATION.has(status) && !hasDuration(duration);
