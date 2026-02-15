import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';
import { useAuth } from './auth';
import { EMPTY_ATTEMPT, getComplexityOptions, isEmptyAttemptPayload } from './attempts';
import { Button, Card, Input, Pill, Select } from './components/primitives';
import { useAuthCtaModal } from './hooks/useAuthCtaModal';
import { THEME_OPTIONS, useTheme } from './theme';
import type { Dashboard, ListItem, ProblemWithLatestAttempt, UpsertAttemptRequest } from './types';
import './styles.css';

// Legacy dashboard labels kept for compatibility checks: Farthest category / Latest solved.

function AuthGuard({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { token, setToken } = useAuth();
  const { openAuthCta, authCtaModal } = useAuthCtaModal();
  const location = useLocation();
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const isProblemsRoute = location.pathname === '/problems';
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';

  useEffect(() => {
    let cancelled = false;
    wakeBackend()
      .then(() => {
        if (!cancelled) {
          setIsBackendReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStartupError(error instanceof Error ? error.message : 'Failed to start backend service.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand-link">
          CodeClimb
        </Link>
        <nav className="top-nav" aria-label="Primary">
          {isProblemsRoute ? <Link to="/">Dashboard</Link> : <Link to="/problems">Problems</Link>}
          <Select
            aria-label="Theme selector"
            value={theme}
            onChange={(event) => setTheme(event.target.value as (typeof THEME_OPTIONS)[number]['id'])}
          >
            {THEME_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          {token ? (
            <Button variant="secondary" onClick={() => setToken(null)}>
              Logout
            </Button>
          ) : !isAuthRoute ? (
            <Link to="/login">Login</Link>
          ) : null}
        </nav>
      </header>
      <main
        className={`content-shell${isAuthRoute ? ' content-shell--auth' : ''}${!isBackendReady ? ' content-shell--blocked' : ''}`}
        aria-busy={!isBackendReady}
      >
        {children}
      </main>
      {!isBackendReady ? (
        <div className="backend-startup-overlay" role="status" aria-live="polite">
          <Card className="backend-startup-card stack-16">
            <h2>Starting backend service…</h2>
            <p className="muted">Waking the database connection for your first request.</p>
            {startupError ? <p className="error">{startupError}</p> : <p className="muted">This can take a few seconds on cold start.</p>}
          </Card>
        </div>
      ) : null}
      {!isAuthRoute ? authCtaModal : null}
    </div>
  );
}

type DashboardLevel = { number: number; label: string };
type DashboardAttempt = {
  attemptId: string | null;
  solved: boolean | null;
  attempts: number | null;
  confidence: string | null;
  notes: string | null;
};
type DashboardCard = {
  neet250Id: number;
  title: string;
  category: string;
  orderIndex: number;
  leetcodeUrl: string;
  latestAttempt: DashboardAttempt | null;
};

type SaveState = 'idle' | 'saving' | 'error';

type UpNextState = {
  attemptId: string | null;
  draft: UpsertAttemptRequest;
  status: SaveState;
  error: string | null;
};


let wakeBackendPromise: Promise<void> | null = null;

function wakeBackend(): Promise<void> {
  if (wakeBackendPromise) {
    return wakeBackendPromise;
  }
  wakeBackendPromise = (async () => {
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await api.wakeBackend();
        return;
      } catch {
        if (attempt === maxAttempts - 1) {
          throw new Error('Backend startup took longer than expected. Please refresh in a moment.');
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  })();
  return wakeBackendPromise;
}

const DEMO_ACTIVITY_DAYS = ['2026-02-02', '2026-02-04', '2026-02-05', '2026-02-09', '2026-02-12', '2026-02-13'];
const DEMO_LEVEL: DashboardLevel = { number: 7, label: 'Trees' };
const DEMO_CARDS: DashboardCard[] = [
  { neet250Id: 104, title: 'Binary Tree Level Order Traversal', category: 'Trees', orderIndex: 4, leetcodeUrl: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', latestAttempt: { attemptId: null, solved: null, attempts: 2, confidence: 'MEDIUM', notes: 'Review BFS queue patterns.' } },
  { neet250Id: 121, title: 'Kth Smallest Element in a BST', category: 'Trees', orderIndex: 9, leetcodeUrl: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/', latestAttempt: { attemptId: null, solved: null, attempts: 1, confidence: 'LOW', notes: '' } },
  { neet250Id: 132, title: 'Validate Binary Search Tree', category: 'Trees', orderIndex: 6, leetcodeUrl: 'https://leetcode.com/problems/validate-binary-search-tree/', latestAttempt: null },
  { neet250Id: 158, title: 'Longest Repeating Character Replacement', category: 'Sliding Window', orderIndex: 5, leetcodeUrl: 'https://leetcode.com/problems/longest-repeating-character-replacement/', latestAttempt: null },
  { neet250Id: 175, title: 'Implement Trie (Prefix Tree)', category: 'Tries', orderIndex: 1, leetcodeUrl: 'https://leetcode.com/problems/implement-trie-prefix-tree/', latestAttempt: null },
];
const DEMO_PROBLEMS: ProblemWithLatestAttempt[] = [
  { neet250Id: 1, orderIndex: 1, title: 'Two Sum', leetcodeSlug: 'two-sum', category: 'Arrays & Hashing', difficulty: 'Easy', latestAttempt: null },
  { neet250Id: 2, orderIndex: 2, title: 'Contains Duplicate', leetcodeSlug: 'contains-duplicate', category: 'Arrays & Hashing', difficulty: 'Easy', latestAttempt: { solved: true } },
  { neet250Id: 20, orderIndex: 1, title: 'Valid Parentheses', leetcodeSlug: 'valid-parentheses', category: 'Stack', difficulty: 'Easy', latestAttempt: null },
  { neet250Id: 39, orderIndex: 4, title: 'Combination Sum', leetcodeSlug: 'combination-sum', category: 'Backtracking', difficulty: 'Medium', latestAttempt: null },
];
const FALLBACK_CARDS: DashboardCard[] = Array.from({ length: 5 }, (_, index) => ({
  neet250Id: 9000 + index,
  title: 'Create/select a list',
  category: 'Setup',
  orderIndex: index + 1,
  leetcodeUrl: '#',
  latestAttempt: null,
}));

function normalizeAttempt(raw: unknown): DashboardAttempt | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const source = raw as Record<string, unknown>;
  return {
    attemptId: typeof source.attemptId === 'string' ? source.attemptId : null,
    solved: typeof source.solved === 'boolean' ? source.solved : null,
    attempts: typeof source.attempts === 'number' ? source.attempts : null,
    confidence: typeof source.confidence === 'string' ? source.confidence : null,
    notes: typeof source.notes === 'string' ? source.notes : null,
  };
}

function normalizeCards(rawCards: unknown): DashboardCard[] {
  if (!Array.isArray(rawCards)) {
    return [];
  }
  return rawCards
    .map((item): DashboardCard | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const source = item as Record<string, unknown>;
      const neet250Id = typeof source.neet250_id === 'number' ? source.neet250_id : typeof source.neet250Id === 'number' ? source.neet250Id : null;
      const title = typeof source.title === 'string' ? source.title : null;
      if (neet250Id == null || !title) {
        return null;
      }
      return {
        neet250Id,
        title,
        category: typeof source.category === 'string' ? source.category : 'General',
        orderIndex: typeof source.order_index === 'number' ? source.order_index : typeof source.orderIndex === 'number' ? source.orderIndex : 0,
        leetcodeUrl: typeof source.leetcode_url === 'string' ? source.leetcode_url : '#',
        latestAttempt: normalizeAttempt(source.latestAttempt),
      };
    })
    .filter((item): item is DashboardCard => item != null);
}

function resolveLevel(dashboard: Dashboard | null): DashboardLevel | null {
  if (!dashboard) {
    return null;
  }
  const rawLevel = (dashboard as unknown as { level?: unknown }).level;
  if (rawLevel && typeof rawLevel === 'object') {
    const source = rawLevel as Record<string, unknown>;
    if (typeof source.number === 'number' && typeof source.label === 'string') {
      return { number: source.number, label: source.label };
    }
  }
  if (dashboard.farthestCategory) {
    const mapping = ['Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack', 'Binary Search', 'Linked List', 'Trees', 'Tries', 'Heap / Priority Queue', 'Backtracking', 'Graphs', 'Dynamic Programming'];
    const index = Math.max(mapping.indexOf(dashboard.farthestCategory), 0);
    return { number: index + 1, label: dashboard.farthestCategory };
  }
  return null;
}

function toDraft(card: DashboardCard): UpsertAttemptRequest {
  return {
    ...EMPTY_ATTEMPT,
    solved: card.latestAttempt?.solved ?? null,
    attempts: card.latestAttempt?.attempts ?? null,
    confidence: card.latestAttempt?.confidence ?? null,
    notes: card.latestAttempt?.notes ?? null,
  };
}

function getMiniCalendarDays(now: Date): Date[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  return Array.from({ length: 35 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
}

type DifficultyLabel = 'Easy' | 'Medium' | 'Hard';

function getProblemSolved(problem: ProblemWithLatestAttempt, editorState?: UpsertAttemptRequest | null): boolean {
  if (typeof editorState?.solved === 'boolean') {
    return editorState.solved;
  }
  const latestAttempt = problem.latestAttempt as Record<string, unknown> | null;
  return latestAttempt?.solved === true;
}

function getConfidenceTone(confidence: string | null | undefined): 'low' | 'medium' | 'high' | 'unset' {
  if (confidence === 'LOW') return 'low';
  if (confidence === 'MEDIUM') return 'medium';
  if (confidence === 'HIGH') return 'high';
  return 'unset';
}

function getComplexityTone(value: string | null | undefined): 'fast' | 'moderate' | 'slow' | 'unset' {
  if (!value) return 'unset';
  if (value === 'O(1)' || value === 'O(log n)' || value === 'O(n)') return 'fast';
  if (value === 'O(n log n)' || value === 'O(n^2)') return 'moderate';
  return 'slow';
}

function getLatestAttemptMeta(problem: ProblemWithLatestAttempt): { attempts: number | null; updatedAt: string | null; timeMinutes: number | null } {
  const latest = problem.latestAttempt as Record<string, unknown> | null;
  return {
    attempts: typeof latest?.attempts === 'number' ? latest.attempts : null,
    updatedAt: typeof latest?.updatedAt === 'string' ? latest.updatedAt : null,
    timeMinutes: typeof latest?.timeMinutes === 'number' ? latest.timeMinutes : null,
  };
}

function ProgressDonut({
  solvedByDifficulty,
  totalByDifficulty,
  solvedTotal,
  totalProblems,
  scopeControl,
  children,
}: {
  solvedByDifficulty: Record<DifficultyLabel, number>;
  totalByDifficulty: Record<DifficultyLabel, number>;
  solvedTotal: number;
  totalProblems: number;
  scopeControl?: ReactNode;
  children?: ReactNode;
}) {
  const slices: Array<{ difficulty: DifficultyLabel; solved: number; total: number; color: string }> = [
    { difficulty: 'Easy', solved: solvedByDifficulty.Easy, total: totalByDifficulty.Easy, color: '#4fa569' },
    { difficulty: 'Medium', solved: solvedByDifficulty.Medium, total: totalByDifficulty.Medium, color: '#c28732' },
    { difficulty: 'Hard', solved: solvedByDifficulty.Hard, total: totalByDifficulty.Hard, color: '#be4b59' },
  ];
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offsetCursor = 0;

  return (
    <div className="progress-chart-block" aria-label="Solved by difficulty">
      {scopeControl ? <div className="progress-chart-scope">{scopeControl}</div> : null}
      <div className="progress-chart-wrap">
        <svg viewBox="0 0 120 120" className="progress-donut" role="img" aria-label="Solved problems by difficulty">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="color-mix(in srgb, var(--border) 50%, transparent)" strokeWidth="14" />
          {slices.map((slice) => {
            const ratio = solvedTotal > 0 ? slice.solved / solvedTotal : 0;
            const dash = ratio * circumference;
            const segmentOffset = -offsetCursor;
            offsetCursor += dash;
            if (slice.solved === 0) {
              return null;
            }
            return (
              <circle
                key={slice.difficulty}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="14"
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={segmentOffset}
                transform="rotate(-90 60 60)"
              >
                <title>{`${slice.difficulty}: ${slice.solved} / ${slice.total}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="progress-donut-center">
          <strong>{solvedTotal}</strong>
          <span>{`/ ${totalProblems}`}</span>
        </div>
      </div>
      <div className="progress-chart-side">
        <ul className="progress-legend clean-list">
          {slices.map((slice) => (
            <li key={slice.difficulty}>
              <span className="legend-label"><span className="legend-dot" style={{ background: slice.color }} />{slice.difficulty}</span>
              <span className="legend-count">{`${slice.solved}/${slice.total}`}</span>
            </li>
          ))}
        </ul>
        {children}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { token } = useAuth();
  const { openAuthCta, authCtaModal } = useAuthCtaModal();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [selectedStatsScope, setSelectedStatsScope] = useState('latest');
  const [creatingListName, setCreatingListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressProblems, setProgressProblems] = useState<ProblemWithLatestAttempt[]>([]);
  const [upNextState, setUpNextState] = useState<Record<number, UpNextState>>({});
  const timeoutRefs = useRef<Record<number, ReturnType<typeof setTimeout> | undefined>>({});
  const requestVersionRef = useRef<Record<number, number>>({});
  const upNextStateRef = useRef<Record<number, UpNextState>>({});

  useEffect(() => {
    if (!token) {
      setDashboard(null);
      setLists([]);
      setError(null);
      setSelectedStatsScope('latest');
      return;
    }
    const loadLists = async () => {
      try {
        const loadedLists = await api.getLists(token);
        setLists(loadedLists);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load lists');
      }
    };
    void loadLists();
  }, [token]);

  const getScopePayload = () => {
    if (selectedStatsScope === 'all') {
      return { scope: 'all' as const, listId: null as string | null };
    }
    if (selectedStatsScope === 'latest') {
      return { scope: 'latest' as const, listId: null as string | null };
    }
    return { scope: 'list' as const, listId: selectedStatsScope };
  };

  const refreshDashboard = async () => {
    if (!token) {
      return;
    }
    const { scope, listId } = getScopePayload();
    const latestDashboard = await api.getDashboard(token, scope, listId);
    setDashboard(latestDashboard);
    const fallbackListId = latestDashboard.latestListId ?? latestDashboard.listId ?? lists[0]?.id ?? null;
    const progressListId = scope === 'list' ? listId : fallbackListId;
    if (progressListId) {
      setProgressProblems(await api.getProblems(token, progressListId));
    } else {
      setProgressProblems([]);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await refreshDashboard();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, selectedStatsScope, lists.length]);

  const activityDays = useMemo(() => {
    if (!token) {
      return DEMO_ACTIVITY_DAYS;
    }
    const raw = (dashboard as unknown as { activityDays?: unknown })?.activityDays;
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
  }, [dashboard, token]);

  const level = useMemo(() => {
    if (!token) {
      return DEMO_LEVEL;
    }
    return resolveLevel(dashboard) ?? { number: 1, label: 'Arrays & Hashing' };
  }, [dashboard, token]);

  const upNextCards = useMemo(() => {
    if (!token) {
      return DEMO_CARDS;
    }
    const raw = (dashboard as unknown as { rightPanel?: { nextUnsolved?: unknown } })?.rightPanel?.nextUnsolved;
    const normalized = normalizeCards(raw);
    return normalized.length > 0 ? normalized : FALLBACK_CARDS;
  }, [dashboard, token]);

  const progressTotals = useMemo(() => {
    const source = token ? progressProblems : DEMO_PROBLEMS;
    const base: Record<DifficultyLabel, number> = { Easy: 0, Medium: 0, Hard: 0 };
    const solved: Record<DifficultyLabel, number> = { Easy: 0, Medium: 0, Hard: 0 };

    for (const problem of source) {
      const difficulty = problem.difficulty === 'E' ? 'Easy' : problem.difficulty === 'M' ? 'Medium' : problem.difficulty === 'H' ? 'Hard' : (problem.difficulty as DifficultyLabel);
      if (difficulty !== 'Easy' && difficulty !== 'Medium' && difficulty !== 'Hard') {
        continue;
      }
      base[difficulty] += 1;
      if (getProblemSolved(problem)) {
        solved[difficulty] += 1;
      }
    }

    return {
      base,
      solved,
      totalSolved: solved.Easy + solved.Medium + solved.Hard,
      totalProblems: base.Easy + base.Medium + base.Hard,
    };
  }, [progressProblems, token]);

  const targetListId = useMemo(() => {
    if (!token) {
      return null;
    }
    if (selectedStatsScope !== 'latest' && selectedStatsScope !== 'all') {
      return selectedStatsScope;
    }
    return dashboard?.latestListId ?? dashboard?.listId ?? lists[0]?.id ?? null;
  }, [dashboard?.latestListId, dashboard?.listId, lists, selectedStatsScope, token]);

  useEffect(() => {
    upNextStateRef.current = upNextState;
  }, [upNextState]);

  useEffect(() => {
    setUpNextState((current) => {
      const next = { ...current };
      for (const card of upNextCards) {
        if (next[card.neet250Id]) {
          continue;
        }
        next[card.neet250Id] = {
          attemptId: card.latestAttempt?.attemptId ?? null,
          draft: toDraft(card),
          status: 'idle',
          error: null,
        };
      }
      return next;
    });
  }, [upNextCards]);

  const saveAttempt = (card: DashboardCard, draft: UpsertAttemptRequest, options?: { immediate?: boolean; retry?: boolean }) => {
    if (!token || !targetListId) {
      return;
    }

    const run = async (retry = false) => {
      if (!upNextStateRef.current[card.neet250Id]?.attemptId && isEmptyAttemptPayload(draft)) {
        return;
      }
      const version = (requestVersionRef.current[card.neet250Id] ?? 0) + 1;
      requestVersionRef.current[card.neet250Id] = version;
      setUpNextState((state) => ({
        ...state,
        [card.neet250Id]: {
          ...(state[card.neet250Id] ?? { attemptId: null, draft }),
          draft,
          status: 'saving',
          error: null,
        },
      }));

      try {
        const existingAttemptId = upNextStateRef.current[card.neet250Id]?.attemptId ?? null;
        const saved = existingAttemptId
          ? await api.patchAttempt(token, existingAttemptId, draft)
          : await api.createAttempt(token, targetListId, card.neet250Id, draft);
        if (requestVersionRef.current[card.neet250Id] !== version) {
          return;
        }
        setUpNextState((current) => ({
          ...current,
          [card.neet250Id]: {
            ...(current[card.neet250Id] ?? { draft, attemptId: null }),
            attemptId: saved.id,
            draft,
            status: 'idle',
            error: null,
          },
        }));
        await refreshDashboard();
      } catch (e) {
        const apiError = e instanceof ApiError ? e : null;
        if (!retry && apiError?.status === 0) {
          window.setTimeout(() => {
            if (requestVersionRef.current[card.neet250Id] === version) {
              void run(true);
            }
          }, 2000);
          return;
        }
        if (apiError?.status === 400 && !upNextStateRef.current[card.neet250Id]?.attemptId && isEmptyAttemptPayload(draft)) {
          setUpNextState((current) => ({
            ...current,
            [card.neet250Id]: {
              ...(current[card.neet250Id] ?? { draft, attemptId: null }),
              draft,
              status: 'idle',
              error: null,
            },
          }));
          return;
        }
        if (requestVersionRef.current[card.neet250Id] !== version) {
          return;
        }
        const errorMessage = e instanceof Error ? e.message : 'Couldn’t save. Retry';
        setUpNextState((current) => ({
          ...current,
          [card.neet250Id]: {
            ...(current[card.neet250Id] ?? { draft, attemptId: null }),
            draft,
            status: 'error',
            error: errorMessage || 'Couldn’t save. Retry',
          },
        }));
      }
    };

    if (options?.immediate) {
      void run(options.retry);
      return;
    }

    if (timeoutRefs.current[card.neet250Id]) {
      window.clearTimeout(timeoutRefs.current[card.neet250Id]);
    }
    timeoutRefs.current[card.neet250Id] = window.setTimeout(() => {
      void run(options?.retry);
    }, 700);
  };

  const updateField = (card: DashboardCard, updates: Partial<UpsertAttemptRequest>, immediate = false) => {
    if (!token) {
      openAuthCta();
      return;
    }
    const current = upNextState[card.neet250Id] ?? { attemptId: card.latestAttempt?.attemptId ?? null, draft: toDraft(card), status: 'idle' as const, error: null };
    const nextDraft = { ...current.draft, ...updates };
    setUpNextState((state) => ({
      ...state,
      [card.neet250Id]: {
        ...current,
        draft: nextDraft,
        status: current.status === 'error' ? 'idle' : current.status,
        error: null,
      },
    }));
    saveAttempt(card, nextDraft, immediate ? { immediate: true } : undefined);
  };

  const createListFromDashboard = async () => {
    if (!token) {
      openAuthCta();
      return;
    }
    const nextName = creatingListName.trim();
    if (!nextName) {
      return;
    }
    try {
      setError(null);
      const created = await api.createList(token, { name: nextName, templateVersion: 'neet250.v1' });
      const loadedLists = await api.getLists(token);
      setLists(loadedLists);
      setCreatingListName('');
      setIsCreatingList(false);
      setSelectedStatsScope(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create list');
    }
  };

  const currentMonthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date());
  const calendarDays = getMiniCalendarDays(new Date());
  const highlightedDays = new Set(activityDays);

  return (
    <section className="stack-24">
      <div>
        <h1>{token ? 'Welcome back' : 'Welcome'}</h1>
        <p className="muted">{token ? 'Keep the streak alive.' : 'Log in to start tracking.'}</p>
      </div>
      {loading ? (
        <div className="dashboard-skeleton" aria-live="polite">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="dashboard-layout">
        <Card className="progress-card">
          <div className="progress-card-header">
            <h2>Progress</h2>
            {level ? <span className="progress-level-inline">Level {level.number}: {level.label}</span> : <span className="muted">Level —</span>}
          </div>
          <div className="mini-calendar-wrap">
            <div className="mini-calendar-head">
              <strong>{currentMonthLabel}</strong>
              {activityDays.length === 0 ? <span className="muted">No activity yet</span> : null}
            </div>
            <div className="mini-calendar-grid" role="presentation">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label) => (
                <span key={label} className="mini-calendar-dow">{label}</span>
              ))}
              {calendarDays.map((day) => {
                const iso = day.toISOString().slice(0, 10);
                const isCurrentMonth = day.getMonth() === new Date().getMonth();
                const isActive = highlightedDays.has(iso);
                return (
                  <span
                    key={iso}
                    className={`mini-calendar-day ${isCurrentMonth ? '' : 'is-dim'} ${isActive ? 'is-active' : ''}`.trim()}
                    aria-label={iso}
                  >
                    {day.getDate()}
                  </span>
                );
              })}
            </div>
          </div>
          <ProgressDonut
            solvedByDifficulty={progressTotals.solved}
            totalByDifficulty={progressTotals.base}
            solvedTotal={progressTotals.totalSolved}
            totalProblems={progressTotals.totalProblems}
            scopeControl={
              <>
                <div className="dashboard-scope-control">
                  <Select
                    className="dashboard-scope-select"
                    value={selectedStatsScope}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === '__create__') {
                        setIsCreatingList(true);
                        return;
                      }
                      setIsCreatingList(false);
                      setSelectedStatsScope(value);
                    }}
                    onClick={!token ? openAuthCta : undefined}
                  >
                    <option value="latest">Latest list</option>
                    <option value="all">All lists</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                    <option value="__create__">+ Create new list</option>
                  </Select>
                </div>
                {isCreatingList ? (
                  <div className="dashboard-create-list">
                    <Input
                      value={creatingListName}
                      placeholder="New list name"
                      onChange={(event) => setCreatingListName(event.target.value)}
                      onFocus={!token ? openAuthCta : undefined}
                    />
                    <Button onClick={() => void createListFromDashboard()}>Create</Button>
                  </div>
                ) : null}
              </>
            }
          >
            <div className="mini-stats">
              <div className="mini-stat-tile">
                <span className="mini-stat-label">Current streak:</span>
                <span className="mini-stat-value">{token ? dashboard?.streakCurrent ?? 0 : 6}</span>
              </div>
              <div className="mini-stat-tile">
                <span className="mini-stat-label">Average streak:</span>
                <span className="mini-stat-value">{token ? dashboard?.streakAverage ?? 0 : 3.1}</span>
              </div>
              <div className="mini-stat-tile">
                <span className="mini-stat-label">Problems solved:</span>
                <span className="mini-stat-value">{progressTotals.totalSolved}</span>
              </div>
            </div>
          </ProgressDonut>
        </Card>

        <Card>
          <div className="up-next-header">
            <h2>Up Next</h2>
          </div>
          <div className="up-next-stack">
            {upNextCards.map((card) => {
              const state = upNextState[card.neet250Id] ?? {
                attemptId: card.latestAttempt?.attemptId ?? null,
                draft: toDraft(card),
                status: 'idle' as const,
                error: null,
              };
              return (
                <article key={card.neet250Id} className="up-next-card">
                  <div className="up-next-title-row">
                    <button
                      type="button"
                      className={`solved-toggle dashboard-solved-toggle ${state.draft.solved ? 'is-on' : ''}`}
                      aria-pressed={state.draft.solved === true}
                      onClick={() => updateField(card, { solved: state.draft.solved === true ? false : true, dateSolved: state.draft.solved === true ? null : new Date().toISOString().slice(0, 10) }, true)}
                    >
                      ✓
                    </button>
                    <div>
                      <h3>
                        <Link to="/problems" onClick={!token ? (event) => { event.preventDefault(); openAuthCta(); } : undefined}>{card.title}</Link>
                      </h3>
                      <p className="muted">{card.category}</p>
                    </div>
                    <Pill>{`#${card.orderIndex || '—'}`}</Pill>
                  </div>
                  <div className="up-next-fields">
                    <Button className="up-next-attempt-button" variant="ghost" onClick={() => updateField(card, { attempts: (state.draft.attempts ?? 0) + 1 }, true)}>Add attempt</Button>
                    <Select
                      className="up-next-confidence-select"
                      value={state.draft.confidence ?? ''}
                      onChange={(event) => updateField(card, { confidence: event.target.value || null })}
                      onClick={!token ? openAuthCta : undefined}
                    >
                      <option value="">Confidence</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </Select>
                    <Input
                      value={state.draft.notes ?? ''}
                      placeholder="Notes"
                      onChange={(event) => updateField(card, { notes: event.target.value || null })}
                      onFocus={!token ? openAuthCta : undefined}
                    />
                  </div>
                  <div className="up-next-actions">
                    {state.draft.attempts ? <span className="muted">Attempts: {state.draft.attempts}</span> : <span className="muted">No attempts yet</span>}
                    {state.status === 'saving' ? <span className="muted">Saving...</span> : null}
                    {state.status === 'error' ? (
                      <button
                        type="button"
                        className="inline-retry"
                        onClick={() => saveAttempt(card, state.draft, { immediate: true, retry: true })}
                      >
                        Couldn’t save. Retry
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          {!token && <p className="muted">Demo mode: every interaction opens login CTA.</p>}
          {token && !targetListId ? <p className="error">Create/select a list to save attempts from Dashboard.</p> : null}
        </Card>
      </div>
      {authCtaModal}
    </section>
  );
}

function ProblemsPage() {
  const { token } = useAuth();
  const { openAuthCta, authCtaModal } = useAuthCtaModal();
  const [lists, setLists] = useState<ListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [problems, setProblems] = useState<ProblemWithLatestAttempt[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DifficultyLabel>('all');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<'all' | 'unfinished' | 'completed'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedProblems, setExpandedProblems] = useState<Record<number, boolean>>({});
  const [editorState, setEditorState] = useState<
    Record<
      number,
      {
        attemptId: string | null;
        draft: UpsertAttemptRequest;
        status: SaveState;
        error: string | null;
        history: Array<{ item: ProblemWithLatestAttempt['latestAttempt'] & { id: string; updatedAt?: string | null } }>;
      }
    >
  >({});
  const timeoutRefs = useRef<Record<number, ReturnType<typeof setTimeout> | undefined>>({});
  const requestVersionRef = useRef<Record<number, number>>({});
  const retryVersionRef = useRef<Record<number, number>>({});
  const editorStateRef = useRef(editorState);

  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  const toAttemptDraft = (attempt: Record<string, unknown> | null | undefined): UpsertAttemptRequest => ({
    ...EMPTY_ATTEMPT,
    solved: typeof attempt?.solved === 'boolean' ? attempt.solved : null,
    dateSolved: typeof attempt?.dateSolved === 'string' ? attempt.dateSolved : null,
    timeMinutes: typeof attempt?.timeMinutes === 'number' ? attempt.timeMinutes : null,
    attempts: typeof attempt?.attempts === 'number' ? attempt.attempts : null,
    confidence: typeof attempt?.confidence === 'string' ? attempt.confidence : null,
    timeComplexity: typeof attempt?.timeComplexity === 'string' ? attempt.timeComplexity : null,
    spaceComplexity: typeof attempt?.spaceComplexity === 'string' ? attempt.spaceComplexity : null,
    notes: typeof attempt?.notes === 'string' ? attempt.notes : null,
  });

  useEffect(() => {
    if (!token) {
      return;
    }
    const load = async () => {
      const loadedLists = await api.getLists(token);
      setLists(loadedLists);
      if (loadedLists[0]) {
        setSelectedListId(loadedLists[0].id);
      }
    };
    void load();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedListId) {
      return;
    }
    const loadProblems = async () => {
      try {
        setLoading(true);
        setError(null);
        setProblems(await api.getProblems(token, selectedListId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    };
    void loadProblems();
  }, [token, selectedListId]);

  const sourceProblems = token ? problems : DEMO_PROBLEMS;

  useEffect(() => {
    setEditorState((current) => {
      const next = { ...current };
      for (const problem of sourceProblems) {
        if (next[problem.neet250Id]) {
          continue;
        }
        const latest = problem.latestAttempt as Record<string, unknown> | null;
        next[problem.neet250Id] = {
          attemptId: typeof latest?.id === 'string' ? latest.id : null,
          draft: toAttemptDraft(latest),
          status: 'idle',
          error: null,
          history: [],
        };
      }
      return next;
    });
  }, [sourceProblems]);

  const categories = useMemo(() => Array.from(new Set(sourceProblems.map((problem) => problem.category))).sort(), [sourceProblems]);

  const categoryProgress = useMemo(() => {
    const stats = new Map<string, { solvedCount: number; totalInCategory: number }>();
    for (const problem of sourceProblems) {
      const stat = stats.get(problem.category) ?? { solvedCount: 0, totalInCategory: 0 };
      stat.totalInCategory += 1;
      if (getProblemSolved(problem, editorState[problem.neet250Id]?.draft)) {
        stat.solvedCount += 1;
      }
      stats.set(problem.category, stat);
    }
    return stats;
  }, [editorState, sourceProblems]);

  const filteredProblems = useMemo(
    () =>
      sourceProblems.filter((problem) => {
        if (categoryFilter !== 'all' && problem.category !== categoryFilter) {
          return false;
        }
        if (difficultyFilter !== 'all' && problem.difficulty !== difficultyFilter) {
          return false;
        }
        return true;
      }),
    [categoryFilter, difficultyFilter, sourceProblems],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ProblemWithLatestAttempt[]>();
    for (const problem of filteredProblems) {
      const categoryProblems = map.get(problem.category) ?? [];
      categoryProblems.push(problem);
      map.set(problem.category, categoryProblems);
    }
    return Array.from(map.entries());
  }, [filteredProblems]);

  const visibleGroups = useMemo(
    () =>
      grouped.filter(([category]) => {
        if (categoryStatusFilter === 'all') {
          return true;
        }
        const stats = categoryProgress.get(category);
        if (!stats) {
          return false;
        }
        const isCompleted = stats.solvedCount === stats.totalInCategory;
        return categoryStatusFilter === 'completed' ? isCompleted : !isCompleted;
      }),
    [categoryProgress, categoryStatusFilter, grouped],
  );

  const scheduleSave = (problem: ProblemWithLatestAttempt, draft: UpsertAttemptRequest, options?: { immediate?: boolean; retry?: boolean }) => {
    if (!token || !selectedListId) {
      return;
    }
    const run = async (retry = false) => {
      const current = editorStateRef.current[problem.neet250Id];
      if (!current?.attemptId && isEmptyAttemptPayload(draft)) {
        return;
      }
      const version = (requestVersionRef.current[problem.neet250Id] ?? 0) + 1;
      requestVersionRef.current[problem.neet250Id] = version;
      if (!retry) {
        retryVersionRef.current[problem.neet250Id] = version;
      }
      setEditorState((prev) => ({
        ...prev,
        [problem.neet250Id]: { ...(prev[problem.neet250Id] ?? { attemptId: null, draft, history: [] }), draft, status: 'saving', error: null },
      }));

      try {
        const attemptId = editorStateRef.current[problem.neet250Id]?.attemptId ?? null;
        const saved = attemptId
          ? await api.patchAttempt(token, attemptId, draft)
          : await api.createAttempt(token, selectedListId, problem.neet250Id, draft);
        if (requestVersionRef.current[problem.neet250Id] !== version) {
          return;
        }
        setEditorState((prev) => ({
          ...prev,
          [problem.neet250Id]: {
            ...(prev[problem.neet250Id] ?? { draft, history: [] }),
            attemptId: saved.id,
            draft,
            status: 'idle',
            error: null,
            history: prev[problem.neet250Id]?.history ?? [],
          },
        }));
      } catch (e) {
        const apiError = e instanceof ApiError ? e : null;
        if (!retry && apiError?.status === 0) {
          window.setTimeout(() => {
            if (retryVersionRef.current[problem.neet250Id] === version) {
              void run(true);
            }
          }, 2000);
          return;
        }
        if (apiError?.status === 400 && !editorStateRef.current[problem.neet250Id]?.attemptId && isEmptyAttemptPayload(draft)) {
          setEditorState((prev) => ({
            ...prev,
            [problem.neet250Id]: { ...(prev[problem.neet250Id] ?? { attemptId: null, draft, history: [] }), draft, status: 'idle', error: null },
          }));
          return;
        }
        if (requestVersionRef.current[problem.neet250Id] !== version) {
          return;
        }
        setEditorState((prev) => ({
          ...prev,
          [problem.neet250Id]: {
            ...(prev[problem.neet250Id] ?? { attemptId: null, draft, history: [] }),
            draft,
            status: 'error',
            error: e instanceof Error ? e.message : 'Couldn’t save. Retry',
          },
        }));
      }
    };

    if (options?.immediate) {
      void run(options.retry);
      return;
    }
    if (timeoutRefs.current[problem.neet250Id]) {
      window.clearTimeout(timeoutRefs.current[problem.neet250Id]);
    }
    timeoutRefs.current[problem.neet250Id] = window.setTimeout(() => {
      void run(options?.retry);
    }, 700);
  };

  const updateDraft = (problem: ProblemWithLatestAttempt, update: Partial<UpsertAttemptRequest>, immediate = false) => {
    const current = editorState[problem.neet250Id] ?? { attemptId: null, draft: EMPTY_ATTEMPT, status: 'idle' as SaveState, error: null, history: [] };
    const nextDraft = { ...current.draft, ...update };
    setEditorState((prev) => ({ ...prev, [problem.neet250Id]: { ...current, draft: nextDraft, status: immediate ? current.status : 'saving', error: null } }));
    if (!token) {
      openAuthCta();
      return;
    }
    scheduleSave(problem, nextDraft, { immediate });
  };

  const loadHistory = async (problem: ProblemWithLatestAttempt) => {
    if (!token || !selectedListId) {
      return;
    }
    const history = await api.getAttemptsHistory(token, selectedListId, problem.neet250Id);
    setEditorState((prev) => ({
      ...prev,
      [problem.neet250Id]: {
        ...(prev[problem.neet250Id] ?? { attemptId: null, draft: EMPTY_ATTEMPT, status: 'idle', error: null }),
        history: history.map((item) => ({ item })),
      },
    }));
  };

  return (
    <section className="stack-24 problems-page">
      <div>
        <h1>Problems</h1>
      </div>
      <Card>
        <div className="problems-toolbar">
          <label className="toolbar-control">
            <span className="toolbar-label">List</span>
            <Select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} onClick={!token ? openAuthCta : undefined} disabled={Boolean(token) && lists.length === 0}>
              <option value="">Select a list</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
              {!token ? <option value="demo">Demo list</option> : null}
            </Select>
          </label>
          <label className="toolbar-control">
            <span className="toolbar-label">Category</span>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} onClick={!token ? openAuthCta : undefined}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </label>
          <label className="toolbar-control">
            <span className="toolbar-label">Difficulty</span>
            <Select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value as 'all' | DifficultyLabel)} onClick={!token ? openAuthCta : undefined}>
              <option value="all">All difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </Select>
          </label>
          <label className="toolbar-control">
            <span className="toolbar-label">Category status</span>
            <Select value={categoryStatusFilter} onChange={(event) => setCategoryStatusFilter(event.target.value as 'all' | 'unfinished' | 'completed')} onClick={!token ? openAuthCta : undefined}>
              <option value="all">All statuses</option>
              <option value="unfinished">Unfinished categories</option>
              <option value="completed">Completed categories</option>
            </Select>
          </label>
        </div>
        {loading ? <p className="muted">Loading problems…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <div className="problems-accordion">
          {visibleGroups.map(([category, items]) => {
            const solvedCount = categoryProgress.get(category)?.solvedCount ?? 0;
            const open = expandedCategories[category] ?? true;
            return (
              <article className="category-card" key={category}>
                <button type="button" className="category-header" onClick={() => setExpandedCategories((prev) => ({ ...prev, [category]: !open }))}>
                  <span>{category}</span>
                  <span className="muted">{solvedCount}/{items.length} solved</span>
                </button>
                {open ? (
                  <div className="problem-list-stack">
                    {items.map((problem) => {
                      const state = editorState[problem.neet250Id] ?? { attemptId: null, draft: EMPTY_ATTEMPT, status: 'idle' as SaveState, error: null, history: [] };
                      const drawerOpen = expandedProblems[problem.neet250Id] ?? false;
                      const latestMeta = getLatestAttemptMeta(problem);
                      const attemptsCount = state.draft.attempts ?? latestMeta.attempts ?? state.history.length;
                      const lastAttemptLabel = latestMeta.updatedAt ? new Date(latestMeta.updatedAt).toLocaleDateString() : null;
                      const timeComplexityOptions = getComplexityOptions(state.draft.timeComplexity);
                      const spaceComplexityOptions = getComplexityOptions(state.draft.spaceComplexity);
                      const toggleProblemDrawer = () => {
                        if (!drawerOpen) {
                          void loadHistory(problem);
                        }
                        setExpandedProblems((prev) => ({ ...prev, [problem.neet250Id]: !drawerOpen }));
                      };
                      return (
                        <article className={`problem-row-card ${state.draft.solved ? 'is-solved' : ''}`} key={problem.neet250Id}>
                          <div className="problem-row-main" onClick={toggleProblemDrawer}>
                            <button
                              type="button"
                              className={`solved-toggle ${state.draft.solved ? 'is-on' : ''}`}
                              aria-pressed={state.draft.solved === true}
                              onClick={(event) => {
                                event.stopPropagation();
                                updateDraft(problem, { solved: state.draft.solved === true ? false : true, dateSolved: state.draft.solved === true ? null : new Date().toISOString().slice(0, 10) }, true);
                              }}
                            >
                              ✓
                            </button>
                            <div className="problem-row-title">
                              <div className="problem-title-line">
                                <a
                                  className="problem-link"
                                  href={`https://leetcode.com/problems/${problem.leetcodeSlug}/`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!token) {
                                      e.preventDefault();
                                      openAuthCta();
                                    }
                                  }}
                                >
                                  {problem.title}
                                </a>
                              </div>
                              <div className="problem-meta-row">
                                <span className="problem-category">{problem.category}</span>
                                <span className={`difficulty-pill difficulty-pill--${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                                {state.draft.confidence ? (
                                  <span className={`confidence-pill confidence-pill--${getConfidenceTone(state.draft.confidence)}`}>{state.draft.confidence.toLowerCase()}</span>
                                ) : null}
                                {attemptsCount > 0 ? <span className="meta-badge">Attempts: {attemptsCount}</span> : null}
                                {lastAttemptLabel ? <span className="meta-badge">Last attempted: {lastAttemptLabel}</span> : null}
                                {latestMeta.timeMinutes ? <span className="meta-badge">Avg time: {latestMeta.timeMinutes}m</span> : null}
                              </div>
                            </div>
                            <span className="problem-expand-hint muted">{drawerOpen ? 'Hide details' : 'Show details'}</span>
                          </div>
                          {drawerOpen ? (
                            <div className="details-drawer">
                              <div className="details-header">
                                <strong>Details</strong>
                                {state.status === 'saving' ? <span className="muted">Saving...</span> : null}
                              </div>
                              <div className="drawer-fields">
                                <label className="drawer-field">
                                  <span className="toolbar-label">Confidence</span>
                                  <Select
                                    className={`compact-select confidence-select confidence-select--${getConfidenceTone(state.draft.confidence)}`}
                                    value={state.draft.confidence ?? ''}
                                    onChange={(event) => updateDraft(problem, { confidence: event.target.value || null })}
                                  >
                                    <option value="">Select confidence</option>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                  </Select>
                                </label>
                                <label className="drawer-field">
                                  <span className="toolbar-label">Time complexity</span>
                                  <Select
                                    className={`compact-select complexity-select complexity-select--${getComplexityTone(state.draft.timeComplexity)}`}
                                    value={state.draft.timeComplexity ?? ''}
                                    onChange={(event) => updateDraft(problem, { timeComplexity: event.target.value || null })}
                                  >
                                    <option value="">Select complexity</option>
                                    {timeComplexityOptions.map((option) => <option key={`time-${option}`} value={option}>{option}</option>)}
                                  </Select>
                                </label>
                                <label className="drawer-field">
                                  <span className="toolbar-label">Space complexity</span>
                                  <Select
                                    className={`compact-select complexity-select complexity-select--${getComplexityTone(state.draft.spaceComplexity)}`}
                                    value={state.draft.spaceComplexity ?? ''}
                                    onChange={(event) => updateDraft(problem, { spaceComplexity: event.target.value || null })}
                                  >
                                    <option value="">Select complexity</option>
                                    {spaceComplexityOptions.map((option) => <option key={`space-${option}`} value={option}>{option}</option>)}
                                  </Select>
                                </label>
                                <textarea className="cc-input drawer-full drawer-textarea" placeholder="Notes" value={state.draft.notes ?? ''} onChange={(event) => updateDraft(problem, { notes: event.target.value || null })} />
                              </div>
                              <details className="advanced-panel">
                                <summary>Advanced</summary>
                                <div className="attempts-stepper">
                                  <span className="toolbar-label">Attempts</span>
                                  <div className="attempts-controls">
                                    <button type="button" className="stepper-btn" onClick={() => updateDraft(problem, { attempts: Math.max(0, (state.draft.attempts ?? 0) - 1) || null }, true)}>−</button>
                                    <span>{state.draft.attempts ?? 0}</span>
                                    <button type="button" className="stepper-btn" onClick={() => updateDraft(problem, { attempts: (state.draft.attempts ?? 0) + 1 }, true)}>+</button>
                                    <Button variant="ghost" onClick={() => updateDraft(problem, { attempts: (state.draft.attempts ?? 0) + 1 }, true)}>Add attempt</Button>
                                  </div>
                                </div>
                              </details>
                              <div className="drawer-status-row">
                                {state.status === 'error' ? (
                                  <button className="inline-retry" onClick={() => scheduleSave(problem, state.draft, { immediate: true, retry: true })}>
                                    Couldn’t save. Retry
                                  </button>
                                ) : null}
                              </div>
                              <div className="history-panel">
                                <h3>History</h3>
                                <ul className="history-list">
                                  {state.history.map(({ item }) => {
                                    const attempt = item as Record<string, unknown>;
                                    return (
                                      <li key={String(attempt.id)}>
                                        <div>
                                          <strong>{String(attempt.updatedAt ?? 'Recent attempt')}</strong>
                                          <p className="muted">{attempt.notes ? String(attempt.notes) : 'No notes'}</p>
                                        </div>
                                        <div className="history-actions">
                                          <Button variant="ghost" onClick={() => setEditorState((prev) => ({ ...prev, [problem.neet250Id]: { ...prev[problem.neet250Id], attemptId: String(attempt.id), draft: toAttemptDraft(attempt) } }))}>
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            onClick={async () => {
                                              if (!token) {
                                                openAuthCta();
                                                return;
                                              }
                                              await api.deleteAttempt(token, String(attempt.id));
                                              await loadHistory(problem);
                                            }}
                                          >
                                            Delete
                                          </Button>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {!token ? <p className="muted">Demo mode: interactions open login CTA modal.</p> : null}
        {token && !selectedListId ? <p className="error">Select a list to load and save attempts.</p> : null}
      </Card>
      {authCtaModal}
    </section>
  );
}

function LoginPage() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await api.login({ email, password });
      setToken(response.accessToken);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <Card className="auth-card">
      <h1>Login</h1>
      <form onSubmit={submit} className="stack-16">
        <Input placeholder="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input placeholder="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit">Login</Button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">
        Need an account? <Link to="/signup">Signup</Link>
      </p>
    </Card>
  );
}

function SignupPage() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [error, setError] = useState<string | null>(null);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await api.signup({ email, password, timezone });
      setToken(response.accessToken);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    }
  };

  return (
    <Card className="auth-card">
      <h1>Signup</h1>
      <form onSubmit={submit} className="stack-16">
        <Input placeholder="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input placeholder="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Input placeholder="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        <Button type="submit">Create account</Button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </Card>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </AppShell>
  );
}
