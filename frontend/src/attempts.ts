import type { UpsertAttemptRequest } from './types';

export const EMPTY_ATTEMPT: UpsertAttemptRequest = {
  solved: null,
  dateSolved: null,
  timeMinutes: null,
  notes: null,
  problemUrl: null,
};

export function isEmptyAttemptPayload(request: UpsertAttemptRequest): boolean {
  return (
    request.solved === null &&
    request.dateSolved === null &&
    request.timeMinutes === null &&
    (!request.notes || request.notes.trim() === '') &&
    (!request.problemUrl || request.problemUrl.trim() === '')
  );
}
