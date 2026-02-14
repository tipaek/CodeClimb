import type { UpsertAttemptRequest } from './types';

export const EMPTY_ATTEMPT: UpsertAttemptRequest = {
  solved: null,
  dateSolved: null,
  timeMinutes: null,
  attempts: null,
  confidence: null,
  timeComplexity: null,
  spaceComplexity: null,
  notes: null,
  problemUrl: null,
};

function blank(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

export function isEmptyAttemptPayload(request: UpsertAttemptRequest): boolean {
  return (
    request.solved == null &&
    request.dateSolved == null &&
    request.timeMinutes == null &&
    request.attempts == null &&
    blank(request.confidence) &&
    blank(request.timeComplexity) &&
    blank(request.spaceComplexity) &&
    blank(request.notes) &&
    blank(request.problemUrl)
  );
}

const COMPLEXITY_PRESETS = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)', 'O(n!)', 'O(2^n*n)'];

export function normalizeComplexity(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  const simplified = trimmed.toLowerCase().replace(/\s+/g, '').replace(/\*/g, '');
  const aliasMap: Record<string, string> = {
    '1': 'O(1)',
    'o(1)': 'O(1)',
    'logn': 'O(log n)',
    'o(logn)': 'O(log n)',
    'n': 'O(n)',
    'o(n)': 'O(n)',
    'nlogn': 'O(n log n)',
    'onlogn': 'O(n log n)',
    'o(nlogn)': 'O(n log n)',
    'n^2': 'O(n^2)',
    'n2': 'O(n^2)',
    'o(n^2)': 'O(n^2)',
    '2^n': 'O(2^n)',
    'o(2^n)': 'O(2^n)',
    'n!': 'O(n!)',
    'o(n!)': 'O(n!)',
    '2^nn': 'O(2^n*n)',
    '2^n*n': 'O(2^n*n)',
    'o(2^n*n)': 'O(2^n*n)',
  };

  return aliasMap[simplified] ?? trimmed;
}

export function getComplexityOptions(currentValue: string | null): string[] {
  const value = currentValue?.trim();
  if (!value || COMPLEXITY_PRESETS.includes(value)) {
    return COMPLEXITY_PRESETS;
  }
  return [value, ...COMPLEXITY_PRESETS];
}
