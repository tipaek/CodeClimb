import type { components } from './api/generated/schema';

export type SignupRequest = components['schemas']['SignupRequest'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type AuthResponse = components['schemas']['AuthResponse'];
export type CreateListRequest = components['schemas']['CreateListRequest'];
export type ListItem = components['schemas']['List'];
export type UpsertAttemptRequest = components['schemas']['UpsertAttemptRequest'];
export type Attempt = components['schemas']['Attempt'];
export type ProblemWithLatestAttempt = components['schemas']['ProblemWithLatestAttempt'];
export type CategoryStat = components['schemas']['CategoryStats'];
export type Dashboard = components['schemas']['Dashboard'];
