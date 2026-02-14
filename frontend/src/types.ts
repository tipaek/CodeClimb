import type { components } from './api/generated/openapi';

type Schemas = components['schemas'];

export interface AuthResponse extends Schemas['AuthResponse'] {}
export interface ListItem extends Schemas['List'] {}
export interface UpsertAttemptRequest extends Schemas['UpsertAttemptRequest'] {}
export interface Attempt extends Schemas['Attempt'] {}
export interface ProblemWithLatestAttempt extends Schemas['ProblemWithLatestAttempt'] {}
export interface CategoryStat extends Schemas['CategoryStats'] {}
export interface Dashboard extends Schemas['Dashboard'] {}
