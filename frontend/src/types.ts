import type { components } from './api/generated/openapi';

type Schemas = components['schemas'];

export type AuthResponse = Schemas['AuthResponse'];
export type ListItem = Schemas['List'];
export type UpsertAttemptRequest = Schemas['UpsertAttemptRequest'];
export type Attempt = Schemas['Attempt'];
export type ProblemWithLatestAttempt = Schemas['ProblemWithLatestAttempt'];
export type CategoryStat = Schemas['CategoryStats'];
export type Dashboard = Schemas['Dashboard'];
