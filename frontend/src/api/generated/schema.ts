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
  attempts: (number) | null;
  confidence: (string) | null;
  timeComplexity: (string) | null;
  spaceComplexity: (string) | null;
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
  attempts: (number) | null;
  confidence: (string) | null;
  timeComplexity: (string) | null;
  spaceComplexity: (string) | null;
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
  attempts: (number) | null;
  confidence: (string) | null;
  timeComplexity: (string) | null;
  spaceComplexity: (string) | null;
  notes: (string) | null;
  problemUrl: (string) | null;
  updatedAt: (string) | null;
};
    DashboardScope: "latest" | "list" | "all";
    DashboardCategorySolvedStats: {
  category: string;
  solvedCount: number;
  totalInCategory: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
};
    DashboardCategoryAvgTime: {
  category: string;
  avgTimeMinutes: (number) | null;
};
    DashboardSolvedCounts: {
  totalSolved: number;
  byCategory: (components['schemas']['DashboardCategorySolvedStats'])[];
};
    DashboardTimeAverages: {
  overallAvgTimeMinutes: (number) | null;
  byCategoryAvgTimeMinutes: (components['schemas']['DashboardCategoryAvgTime'])[];
};
    DashboardRightPanel: {
  latestSolved: (components['schemas']['ProgressProblem'])[];
  nextUnsolved: (components['schemas']['ProgressProblem'])[];
};
    Dashboard: {
  scope: components['schemas']['DashboardScope'];
  latestListId: (string) | null;
  listId: (string) | null;
  lastActivityAt: (string) | null;
  streakCurrent: number;
  streakAverage: number;
  farthestCategory: (string) | null;
  farthestOrderIndex: (number) | null;
  farthestProblem: (Record<string, unknown>) | null;
  solvedCounts: components['schemas']['DashboardSolvedCounts'];
  timeAverages: components['schemas']['DashboardTimeAverages'];
  rightPanel: components['schemas']['DashboardRightPanel'];
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
