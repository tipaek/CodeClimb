import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';
import { useAuth } from './auth';
import { EMPTY_ATTEMPT, isEmptyAttemptPayload } from './attempts';
import { Button, Card, Input, Pill, Select } from './components/primitives';
import { useAuthCtaModal } from './hooks/useAuthCtaModal';
import { THEME_OPTIONS, useTheme } from './theme';
import type { Dashboard, ListItem, ProblemWithLatestAttempt, UpsertAttemptRequest } from './types';
import './styles.css';

function AuthGuard({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { token, setToken } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand-link">
          CodeClimb
        </Link>
        <nav className="top-nav" aria-label="Primary">
          <Link to="/problems">Problems</Link>
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
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
      <main className="content-shell">{children}</main>
    </div>
  );
}

type DashboardLevel = { number: number; label: string };
type DashboardAttempt = {
  attemptId: string | null;
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

const DEMO_ACTIVITY_DAYS = ['2026-02-02', '2026-02-04', '2026-02-05', '2026-02-09', '2026-02-12', '2026-02-13'];
const DEMO_LEVEL: DashboardLevel = { number: 7, label: 'Trees' };
const DEMO_CARDS: DashboardCard[] = [
  { neet250Id: 104, title: 'Binary Tree Level Order Traversal', category: 'Trees', orderIndex: 4, leetcodeUrl: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', latestAttempt: { attemptId: null, attempts: 2, confidence: 'MEDIUM', notes: 'Review BFS queue patterns.' } },
  { neet250Id: 121, title: 'Kth Smallest Element in a BST', category: 'Trees', orderIndex: 9, leetcodeUrl: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/', latestAttempt: { attemptId: null, attempts: 1, confidence: 'LOW', notes: '' } },
  { neet250Id: 132, title: 'Validate Binary Search Tree', category: 'Trees', orderIndex: 6, leetcodeUrl: 'https://leetcode.com/problems/validate-binary-search-tree/', latestAttempt: null },
  { neet250Id: 158, title: 'Longest Repeating Character Replacement', category: 'Sliding Window', orderIndex: 5, leetcodeUrl: 'https://leetcode.com/problems/longest-repeating-character-replacement/', latestAttempt: null },
  { neet250Id: 175, title: 'Implement Trie (Prefix Tree)', category: 'Tries', orderIndex: 1, leetcodeUrl: 'https://leetcode.com/problems/implement-trie-prefix-tree/', latestAttempt: null },
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

function DashboardPage() {
  const { token } = useAuth();
  const { openAuthCta, authCtaModal } = useAuthCtaModal();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upNextState, setUpNextState] = useState<Record<number, UpNextState>>({});
  const timeoutRefs = useRef<Record<number, ReturnType<typeof setTimeout> | undefined>>({});
  const requestVersionRef = useRef<Record<number, number>>({});
  const upNextStateRef = useRef<Record<number, UpNextState>>({});

  useEffect(() => {
    if (!token) {
      setDashboard(null);
      setError(null);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setDashboard(await api.getDashboard(token, 'latest'));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const activityDays = useMemo(() => {
    if (!token) {
      return DEMO_ACTIVITY_DAYS;
    }
    const raw = (dashboard as unknown as { activityDays?: unknown })?.activityDays;
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
  }, [dashboard, token]);

  const level = useMemo(() => (token ? resolveLevel(dashboard) : DEMO_LEVEL), [dashboard, token]);

  const upNextCards = useMemo(() => {
    if (!token) {
      return DEMO_CARDS;
    }
    const raw = (dashboard as unknown as { rightPanel?: { nextUnsolved?: unknown } })?.rightPanel?.nextUnsolved;
    const normalized = normalizeCards(raw);
    return normalized.length > 0 ? normalized.slice(0, 5) : FALLBACK_CARDS;
  }, [dashboard, token]);

  const targetListId = dashboard?.latestListId ?? dashboard?.listId ?? null;

  useEffect(() => {
    upNextStateRef.current = upNextState;
  }, [upNextState]);

  useEffect(() => {
    setUpNextState((current) => {
      const next: Record<number, UpNextState> = {};
      for (const card of upNextCards) {
        const existing = current[card.neet250Id];
        next[card.neet250Id] =
          existing ?? {
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
      setUpNextState((current) => ({
        ...current,
        [card.neet250Id]: {
          ...(current[card.neet250Id] ?? { attemptId: null, draft }),
          draft,
          status: 'saving',
          error: null,
        },
      }));

      const existingAttemptId = upNextStateRef.current[card.neet250Id]?.attemptId ?? null;

      try {
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
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Couldn’t save. Retry';
        const apiError = e instanceof ApiError ? e : null;
        if (!retry && apiError?.status === 0) {
          window.setTimeout(() => {
            void run(true);
          }, 2000);
          return;
        }
        if (requestVersionRef.current[card.neet250Id] !== version) {
          return;
        }
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

  const updateField = (card: DashboardCard, updates: Partial<UpsertAttemptRequest>) => {
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
    saveAttempt(card, nextDraft);
  };

  const currentMonthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date());
  const calendarDays = getMiniCalendarDays(new Date());
  const highlightedDays = new Set(activityDays);

  return (
    <section className="stack-24">
      <div>
        <h1>Dashboard</h1>
        <p className="muted">Premium progress tracking with clean signal-first insights.</p>
        <p className="muted">Farthest category and Latest solved signals are blended into the cards below.</p>
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
            {level ? <Pill tone="success">Level {level.number}: {level.label}</Pill> : <p className="muted">Level —</p>}
          </div>
          <div className="mini-stats">
            <div className="mini-stat-tile">
              <span className="mini-stat-value">{token ? dashboard?.streakCurrent ?? 0 : 6}</span>
              <span className="mini-stat-label">current streak</span>
            </div>
            <div className="mini-stat-tile">
              <span className="mini-stat-value">{token ? dashboard?.streakAverage ?? 0 : 3.1}</span>
              <span className="mini-stat-label">average streak</span>
            </div>
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
        </Card>

        <Card>
          <div className="up-next-header">
            <h2>Up Next</h2>
            <Pill>{token ? 'Live' : 'Demo'}</Pill>
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
                    <div>
                      <h3>{card.title}</h3>
                      <p className="muted">{card.category}</p>
                    </div>
                    <Pill>{`#${card.orderIndex || '—'}`}</Pill>
                  </div>
                  <div className="up-next-fields">
                    <Input
                      value={state.draft.attempts ?? ''}
                      inputMode="numeric"
                      placeholder="Attempts"
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        updateField(card, { attempts: value ? Number(value) : null });
                      }}
                      onFocus={!token ? openAuthCta : undefined}
                    />
                    <Select
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
                      placeholder="Quick note"
                      onChange={(event) => updateField(card, { notes: event.target.value || null })}
                      onFocus={!token ? openAuthCta : undefined}
                    />
                  </div>
                  <div className="up-next-actions">
                    <Button variant="secondary" onClick={token ? undefined : openAuthCta}>Open problem</Button>
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
  const [search, setSearch] = useState('');
  const [solvedFilter, setSolvedFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
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

  const demoProblems: ProblemWithLatestAttempt[] = [
    { neet250Id: 1, orderIndex: 1, title: 'Two Sum', leetcodeSlug: 'two-sum', category: 'Arrays & Hashing', difficulty: 'Easy', latestAttempt: null },
    { neet250Id: 2, orderIndex: 2, title: 'Contains Duplicate', leetcodeSlug: 'contains-duplicate', category: 'Arrays & Hashing', difficulty: 'Easy', latestAttempt: { solved: true } },
    { neet250Id: 20, orderIndex: 1, title: 'Valid Parentheses', leetcodeSlug: 'valid-parentheses', category: 'Stack', difficulty: 'Easy', latestAttempt: null },
    { neet250Id: 39, orderIndex: 4, title: 'Combination Sum', leetcodeSlug: 'combination-sum', category: 'Backtracking', difficulty: 'Medium', latestAttempt: null },
  ];

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
    problemUrl: typeof attempt?.problemUrl === 'string' ? attempt.problemUrl : null,
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

  const sourceProblems = token ? problems : demoProblems;

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

  const filteredProblems = useMemo(
    () =>
      sourceProblems.filter((problem) => {
        const state = editorState[problem.neet250Id];
        const solved = state?.draft.solved ?? ((problem.latestAttempt as Record<string, unknown> | null)?.solved as boolean | null) ?? null;
        if (solvedFilter === 'solved' && solved !== true) {
          return false;
        }
        if (solvedFilter === 'unsolved' && solved === true) {
          return false;
        }
        if (!search.trim()) {
          return true;
        }
        const query = search.trim().toLowerCase();
        return problem.title.toLowerCase().includes(query) || problem.category.toLowerCase().includes(query);
      }),
    [editorState, search, solvedFilter, sourceProblems],
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
        <p className="muted">Focused practice by category with compact attempt tracking.</p>
      </div>
      <Card>
        <div className="problems-toolbar">
          <Select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} onClick={!token ? openAuthCta : undefined} disabled={token && lists.length === 0}>
            <option value="">Select a list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
            {!token ? <option value="demo">Demo list</option> : null}
          </Select>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or category" onClick={!token ? openAuthCta : undefined} />
          <Select value={solvedFilter} onChange={(event) => setSolvedFilter(event.target.value as 'all' | 'solved' | 'unsolved')} onClick={!token ? openAuthCta : undefined}>
            <option value="all">All</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
          </Select>
        </div>
        {loading ? <p className="muted">Loading problems…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <div className="problems-accordion">
          {grouped.map(([category, items]) => {
            const solvedCount = items.filter((problem) => (editorState[problem.neet250Id]?.draft.solved ?? (problem.latestAttempt as Record<string, unknown> | null)?.solved) === true).length;
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
                      const difficultyTone = problem.difficulty === 'Easy' ? 'success' : problem.difficulty === 'Hard' ? 'warning' : 'default';
                      return (
                        <article className="problem-row-card" key={problem.neet250Id}>
                          <div className="problem-row-main">
                            <button
                              type="button"
                              className={`solved-toggle ${state.draft.solved ? 'is-on' : ''}`}
                              aria-pressed={state.draft.solved === true}
                              onClick={() => updateDraft(problem, { solved: state.draft.solved === true ? false : true, dateSolved: state.draft.solved === true ? null : new Date().toISOString().slice(0, 10) }, true)}
                            >
                              ✓
                            </button>
                            <div className="problem-row-title">
                              <strong>{problem.title}</strong>
                              <a href={`https://leetcode.com/problems/${problem.leetcodeSlug}/`} target="_blank" rel="noreferrer" onClick={!token ? (e) => { e.preventDefault(); openAuthCta(); } : undefined}>
                                Solve
                              </a>
                            </div>
                            <Pill tone={difficultyTone}>{problem.difficulty}</Pill>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                if (!drawerOpen) {
                                  void loadHistory(problem);
                                }
                                setExpandedProblems((prev) => ({ ...prev, [problem.neet250Id]: !drawerOpen }));
                              }}
                            >
                              {drawerOpen ? 'Hide details' : 'Details'}
                            </Button>
                          </div>
                          {drawerOpen ? (
                            <div className="details-drawer">
                              <div className="drawer-fields">
                                <Input type="date" value={state.draft.dateSolved ?? ''} onChange={(event) => updateDraft(problem, { dateSolved: event.target.value || null })} />
                                <Input type="number" placeholder="Minutes" value={state.draft.timeMinutes ?? ''} onChange={(event) => updateDraft(problem, { timeMinutes: event.target.value ? Number(event.target.value) : null })} />
                                <Input type="number" placeholder="Attempts" value={state.draft.attempts ?? ''} onChange={(event) => updateDraft(problem, { attempts: event.target.value ? Number(event.target.value) : null })} />
                                <Input placeholder="Time complexity" value={state.draft.timeComplexity ?? ''} onChange={(event) => updateDraft(problem, { timeComplexity: event.target.value || null })} />
                                <Input placeholder="Space complexity" value={state.draft.spaceComplexity ?? ''} onChange={(event) => updateDraft(problem, { spaceComplexity: event.target.value || null })} />
                                <Select value={state.draft.confidence ?? ''} onChange={(event) => updateDraft(problem, { confidence: event.target.value || null })}>
                                  <option value="">Confidence</option>
                                  <option value="LOW">Low</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HIGH">High</option>
                                </Select>
                                <Input className="drawer-full" placeholder="Problem URL" value={state.draft.problemUrl ?? ''} onChange={(event) => updateDraft(problem, { problemUrl: event.target.value || null })} />
                                <textarea className="cc-input drawer-full drawer-textarea" placeholder="Notes" value={state.draft.notes ?? ''} onChange={(event) => updateDraft(problem, { notes: event.target.value || null })} />
                              </div>
                              <div className="drawer-status-row">
                                {state.status === 'saving' ? <span className="muted">Saving...</span> : null}
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
