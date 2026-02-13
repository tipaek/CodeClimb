export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  userId: string;
  email: string;
  timezone: string;
}

export interface ListItem {
  id: string;
  name: string;
  templateVersion: string;
  deprecated: boolean;
}

export interface UpsertAttemptRequest {
  solved: boolean | null;
  dateSolved: string | null;
  timeMinutes: number | null;
  notes: string | null;
  problemUrl: string | null;
}

export interface Attempt {
  id: string;
  listId: string;
  neet250Id: number;
  solved: boolean | null;
  dateSolved: string | null;
  timeMinutes: number | null;
  notes: string | null;
  problemUrl: string | null;
  updatedAt: string;
}

export interface ProblemWithLatestAttempt {
  neet250Id: number;
  title: string;
  category: string;
  orderIndex: number;
  solved: boolean | null;
  dateSolved: string | null;
  timeMinutes: number | null;
  notes: string | null;
  problemUrl: string | null;
  attemptUpdatedAt: string | null;
}

export interface CategoryStat {
  category: string;
  solvedCount: number;
  avgTimeMinutes: number | null;
}

export interface Dashboard {
  latestListId: string | null;
  lastActivityAt: string | null;
  streakCurrent: number;
  farthestCategory: string | null;
  farthestOrderIndex: number | null;
  perCategory: CategoryStat[];
}
