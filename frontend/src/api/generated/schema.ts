// Generated from contracts/openapi.yaml. Do not edit manually.
export type components = {
  schemas: {
    SignupRequest: {
  email: string;
  password: string;
  timezone?: string;
};
    LoginRequest: {
  email: string;
  password: string;
};
    AuthResponse: {
  accessToken: string;
  expiresInSeconds: number;
  userId: string;
  email: string;
  timezone: string;
};
    CreateListRequest: {
  name: string;
  templateVersion: string;
};
    RenameListRequest: {
  name: string;
};
    List: {
  id: string;
  name: string;
  templateVersion: string;
  deprecated: boolean;
};
    UpsertAttemptRequest: {
  solved: (boolean) | null;
  dateSolved: (string) | null;
  timeMinutes: (number) | null;
  notes: (string) | null;
  problemUrl: (string) | null;
};
    Attempt: {
  id: string;
  listId: string;
  neet250Id: number;
  solved: (boolean) | null;
  dateSolved: (string) | null;
  timeMinutes: (number) | null;
  notes: (string) | null;
  problemUrl: (string) | null;
  updatedAt: string;
};
    ProblemWithLatestAttempt: {
  neet250Id: number;
  orderIndex: number;
  title: string;
  leetcodeSlug: string;
  category: string;
  difficulty: string;
  latestAttempt: (Record<string, unknown>) | null;
};
    LatestAttempt: {
  solved: (boolean) | null;
  dateSolved: (string) | null;
  timeMinutes: (number) | null;
  notes: (string) | null;
  problemUrl: (string) | null;
  updatedAt: (string) | null;
};
    CategoryStats: {
  category: string;
  solvedCount: number;
  avgTimeMinutes: (number) | null;
};
    Dashboard: {
  latestListId: (string) | null;
  lastActivityAt: (string) | null;
  streakCurrent: number;
  farthestCategory: (string) | null;
  farthestOrderIndex: (number) | null;
  farthestSolved: (Record<string, unknown>) | null;
  latestSolved: (components['schemas']['ProgressProblem'])[];
  nextUnsolved: (components['schemas']['ProgressProblem'])[];
  perCategory: (components['schemas']['CategoryStats'])[];
};
    ProgressProblem: {
  neet250Id: number;
  orderIndex: number;
  title: string;
  category: string;
};
    ErrorResponse: {
  message: string;
};
  };
};

