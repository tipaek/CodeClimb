import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';
import { EMPTY_ATTEMPT, getComplexityOptions, isEmptyAttemptPayload, normalizeComplexity } from './attempts';
import { useAuth } from './auth';
import type { Attempt, Dashboard, ListItem, ProblemWithLatestAttempt, UpsertAttemptRequest } from './types';
import './styles.css';

const CONFIDENCE_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const THEME_OPTIONS = [
  { id: 'salt-pepper', label: 'Salt & Pepper' },
  { id: 'fresh-peach', label: 'Fresh Peach' },
  { id: 'wisteria-bloom', label: 'Wisteria Bloom' },
  { id: 'night-sands', label: 'Night Sands' },
] as const;

type ThemeId = (typeof THEME_OPTIONS)[number]['id'];
type LatestAttemptLike = Partial<Attempt> & Record<string, unknown>;

interface EditableRowState {
  draft: UpsertAttemptRequest;
  attemptId: string | null;
  hasServerData: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
}

function AuthGuard({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function LoginPage() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <main className="auth-page">
      <h1>Login</h1>
      <form onSubmit={submit}>
        <input placeholder="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p>
        Need an account? <Link to="/signup">Signup</Link>
      </p>
    </main>
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
    <main className="auth-page">
      <h1>Signup</h1>
      <form onSubmit={submit}>
        <input placeholder="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <input placeholder="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        <button type="submit">Create account</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </main>
  );
}

const asLatestAttempt = (problem: ProblemWithLatestAttempt): LatestAttemptLike | null =>
  (problem.latestAttempt as LatestAttemptLike | null) ?? null;

function toDraft(problem: ProblemWithLatestAttempt): UpsertAttemptRequest {
  const latest = asLatestAttempt(problem);
  return {
    solved: latest?.solved ?? null,
    dateSolved: latest?.dateSolved ?? null,
    timeMinutes: latest?.timeMinutes ?? null,
    attempts: latest?.attempts ?? null,
    confidence: (latest?.confidence as string | null | undefined) ?? null,
    timeComplexity: (latest?.timeComplexity as string | null | undefined) ?? null,
    spaceComplexity: (latest?.spaceComplexity as string | null | undefined) ?? null,
    notes: latest?.notes ?? null,
    problemUrl: latest?.problemUrl ?? null,
  };
}

const toAttemptPayload = (attempt: Attempt): UpsertAttemptRequest => ({
  solved: attempt.solved,
  dateSolved: attempt.dateSolved,
  timeMinutes: attempt.timeMinutes,
  attempts: attempt.attempts,
  confidence: attempt.confidence,
  timeComplexity: attempt.timeComplexity,
  spaceComplexity: attempt.spaceComplexity,
  notes: attempt.notes,
  problemUrl: attempt.problemUrl,
});

function HomePage() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [dashboardScope, setDashboardScope] = useState<'latest' | 'list' | 'all'>('latest');
  const [problems, setProblems] = useState<ProblemWithLatestAttempt[]>([]);
  const [rows, setRows] = useState<Record<number, EditableRowState>>({});
  const [historyByNeetId, setHistoryByNeetId] = useState<Record<number, Attempt[]>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [solvedFilter, setSolvedFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<ThemeId>('salt-pepper');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const saveTimers = useRef<Record<number, number>>({});
  const historyTimers = useRef<Record<string, number>>({});

  const handleAuthError = (authError: unknown): boolean => {
    if (authError instanceof ApiError && (authError.status === 401 || authError.status === 403)) {
      setToken(null);
      navigate('/login', { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const listsResponse = await api.getLists(token);
        const dashboardResponse = await api.getDashboard(token, 'latest');
        setDashboard(dashboardResponse);
        setLists(listsResponse);
        setSelectedListId(dashboardResponse.latestListId ?? listsResponse[0]?.id ?? null);
      } catch (e) {
        if (!handleAuthError(e)) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard/lists');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const loadDashboard = async () => {
      try {
        const response = await api.getDashboard(token, dashboardScope, dashboardScope === 'list' ? selectedListId : undefined);
        setDashboard(response);
      } catch (e) {
        if (!handleAuthError(e)) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        }
      }
    };
    void loadDashboard();
  }, [token, dashboardScope, selectedListId]);

  useEffect(() => {
    if (!token || !selectedListId) {
      setProblems([]);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getProblems(token, selectedListId);
        setProblems(response);
        const nextRows: Record<number, EditableRowState> = {};
        response.forEach((problem) => {
          const latest = asLatestAttempt(problem);
          nextRows[problem.neet250Id] = {
            draft: toDraft(problem),
            attemptId: typeof latest?.id === 'string' ? latest.id : null,
            hasServerData: latest != null,
            status: 'idle',
          };
        });
        setRows(nextRows);
        setHistoryByNeetId({});
        setExpanded({});
      } catch (e) {
        if (!handleAuthError(e)) {
          setError(e instanceof Error ? e.message : 'Failed to load problems');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, selectedListId]);

  useEffect(
    () => () => {
      Object.values(saveTimers.current).forEach((id) => window.clearTimeout(id));
      Object.values(historyTimers.current).forEach((id) => window.clearTimeout(id));
    },
    []
  );

  const updateLatestAttempt = (neetId: number, attempt: Attempt | null) => {
    setProblems((prev) =>
      prev.map((problem) => {
        if (problem.neet250Id !== neetId) {
          return problem;
        }
        return { ...problem, latestAttempt: attempt };
      })
    );
  };

  const saveDraft = async (neetId: number, draft: UpsertAttemptRequest) => {
    if (!token || !selectedListId) {
      return;
    }

    let nextRow: EditableRowState | undefined;
    setRows((prev) => {
      nextRow = prev[neetId];
      return {
        ...prev,
        [neetId]: {
          ...(prev[neetId] ?? { draft: EMPTY_ATTEMPT, attemptId: null, hasServerData: false }),
          draft,
          status: 'saving',
        },
      };
    });

    const current = nextRow ?? rows[neetId];
    const attemptId = current?.attemptId ?? null;

    try {
      if (isEmptyAttemptPayload(draft) && !attemptId) {
        setRows((prev) => ({
          ...prev,
          [neetId]: {
            ...(prev[neetId] ?? { draft: EMPTY_ATTEMPT, attemptId: null, hasServerData: false }),
            draft,
            status: 'saved',
          },
        }));
        return;
      }

      const saved = attemptId
        ? await api.patchAttempt(token, attemptId, draft)
        : await api.createAttempt(token, selectedListId, neetId, draft);

      const nextDraft = toAttemptPayload(saved);
      setRows((prev) => ({
        ...prev,
        [neetId]: {
          draft: nextDraft,
          attemptId: saved.id,
          hasServerData: true,
          status: 'saved',
        },
      }));

      setHistoryByNeetId((prev) => {
        const existing = prev[neetId];
        if (!existing) {
          return prev;
        }
        const filtered = existing.filter((item) => item.id !== saved.id);
        return {
          ...prev,
          [neetId]: [saved, ...filtered],
        };
      });

      updateLatestAttempt(neetId, saved);
    } catch (e) {
      if (!handleAuthError(e)) {
        setRows((prev) => ({
          ...prev,
          [neetId]: {
            ...(prev[neetId] ?? { draft: EMPTY_ATTEMPT, attemptId: null, hasServerData: false }),
            status: 'error',
          },
        }));
      }
    }
  };

  const scheduleSave = (neetId: number, update: (draft: UpsertAttemptRequest) => UpsertAttemptRequest) => {
    const current = rows[neetId]?.draft ?? EMPTY_ATTEMPT;
    const nextDraft = update(current);
    setRows((prev) => ({
      ...prev,
      [neetId]: {
        ...(prev[neetId] ?? { draft: EMPTY_ATTEMPT, attemptId: null, hasServerData: false, status: 'idle' }),
        draft: nextDraft,
        status: 'idle',
      },
    }));

    if (saveTimers.current[neetId]) {
      window.clearTimeout(saveTimers.current[neetId]);
    }

    saveTimers.current[neetId] = window.setTimeout(() => {
      void saveDraft(neetId, nextDraft);
    }, 450);
  };

  const loadHistory = async (neetId: number) => {
    if (!token || !selectedListId) {
      return;
    }
    try {
      const history = await api.getAttemptsHistory(token, selectedListId, neetId);
      setHistoryByNeetId((prev) => ({ ...prev, [neetId]: history }));
      if (history[0]) {
        setRows((prev) => ({
          ...prev,
          [neetId]: {
            ...(prev[neetId] ?? { draft: EMPTY_ATTEMPT, attemptId: null, hasServerData: false, status: 'idle' }),
            attemptId: history[0].id,
            hasServerData: true,
          },
        }));
      }
    } catch (e) {
      if (!handleAuthError(e)) {
        setError(e instanceof Error ? e.message : 'Failed to load history');
      }
    }
  };

  const patchHistoryAttempt = async (neetId: number, attemptId: string, draft: UpsertAttemptRequest) => {
    if (!token) {
      return;
    }
    try {
      const saved = await api.patchAttempt(token, attemptId, draft);
      setHistoryByNeetId((prev) => ({
        ...prev,
        [neetId]: (prev[neetId] ?? []).map((item) => (item.id === attemptId ? saved : item)),
      }));
      if (rows[neetId]?.attemptId === attemptId) {
        setRows((prev) => ({
          ...prev,
          [neetId]: {
            ...(prev[neetId] ?? { draft: EMPTY_ATTEMPT, attemptId: null, hasServerData: false, status: 'idle' }),
            draft: toAttemptPayload(saved),
            status: 'saved',
          },
        }));
        updateLatestAttempt(neetId, saved);
      }
    } catch (e) {
      if (!handleAuthError(e)) {
        setError(e instanceof Error ? e.message : 'Failed to update history attempt');
      }
    }
  };

  const scheduleHistorySave = (neetId: number, attempt: Attempt, update: (draft: UpsertAttemptRequest) => UpsertAttemptRequest) => {
    const key = `${neetId}:${attempt.id}`;
    const nextDraft = update(toAttemptPayload(attempt));
    if (historyTimers.current[key]) {
      window.clearTimeout(historyTimers.current[key]);
    }
    historyTimers.current[key] = window.setTimeout(() => {
      void patchHistoryAttempt(neetId, attempt.id, nextDraft);
    }, 450);
  };

  const deleteHistoryAttempt = async (neetId: number, attemptId: string) => {
    if (!token) {
      return;
    }
    try {
      await api.deleteAttempt(token, attemptId);
      setHistoryByNeetId((prev) => {
        const nextHistory = (prev[neetId] ?? []).filter((item) => item.id !== attemptId);
        const nextLatest = nextHistory[0] ?? null;

        setRows((prevRows) => ({
          ...prevRows,
          [neetId]: {
            ...(prevRows[neetId] ?? { draft: EMPTY_ATTEMPT, attemptId: null, hasServerData: false, status: 'idle' }),
            attemptId: nextLatest?.id ?? null,
            hasServerData: Boolean(nextLatest),
            draft: nextLatest ? toAttemptPayload(nextLatest) : EMPTY_ATTEMPT,
            status: 'saved',
          },
        }));
        updateLatestAttempt(neetId, nextLatest);

        return { ...prev, [neetId]: nextHistory };
      });
    } catch (e) {
      if (!handleAuthError(e)) {
        setError(e instanceof Error ? e.message : 'Failed to delete history attempt');
      }
    }
  };

  const categories = useMemo(() => ['All', ...new Set(problems.map((problem) => problem.category))], [problems]);

  const visibleProblems = useMemo(
    () =>
      problems.filter((problem) => {
        const row = rows[problem.neet250Id];
        const draft = row?.draft ?? EMPTY_ATTEMPT;
        const categoryMatch = selectedCategory === 'All' || problem.category === selectedCategory;
        const solvedMatch =
          solvedFilter === 'all' ||
          (solvedFilter === 'solved' ? draft.solved === true : draft.solved !== true);
        const searchMatch = problem.title.toLowerCase().includes(search.trim().toLowerCase());

        return categoryMatch && solvedMatch && searchMatch;
      }),
    [problems, rows, selectedCategory, solvedFilter, search]
  );

  const createList = async () => {
    if (!token || !newListName.trim()) {
      return;
    }
    try {
      const created = await api.createList(token, { name: newListName.trim(), templateVersion: 'NEET_250_V1' });
      setLists((prev) => [...prev, created]);
      setSelectedListId(created.id);
      setNewListName('');
    } catch (e) {
      if (!handleAuthError(e)) {
        setError(e instanceof Error ? e.message : 'Failed to create list');
      }
    }
  };

  const jumpToProblem = (neetId: number) => {
    setExpanded((prev) => ({ ...prev, [neetId]: true }));
    void loadHistory(neetId);
    document.getElementById(`problem-${neetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const rightPanel = (
    <aside className="panel right-column">
      <section>
        <h3>Latest solved (2)</h3>
        <ul>
          {(dashboard?.rightPanel.latestSolved ?? []).slice(0, 2).map((item) => (
            <li key={item.neet250Id}>
              <button className="link-button" onClick={() => jumpToProblem(item.neet250Id)}>
                {item.orderIndex}. {item.title}
              </button>
            </li>
          ))}
          {!dashboard?.rightPanel.latestSolved?.length && <li className="muted">No solved problems yet.</li>}
        </ul>
      </section>
      <section>
        <h3>Next 4 unsolved</h3>
        <ul>
          {(dashboard?.rightPanel.nextUnsolved ?? []).slice(0, 4).map((item) => (
            <li key={item.neet250Id}>
              <button className="link-button" onClick={() => jumpToProblem(item.neet250Id)}>
                {item.orderIndex}. {item.title}
              </button>
            </li>
          ))}
          {!dashboard?.rightPanel.nextUnsolved?.length && <li className="muted">Everything solved 🎉</li>}
        </ul>
      </section>
    </aside>
  );

  return (
    <main className="page" data-theme={theme}>
      <header>
        <div>
          <h1>CodeClimb</h1>
          <p className="muted">Track attempts with fast inline editing and autosave.</p>
        </div>
        <nav>
          <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)}>
            {THEME_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                Theme: {item.label}
              </option>
            ))}
          </select>
          <Link to="/dashboard">Dashboard route</Link>
          <button onClick={() => setToken(null)}>Logout</button>
        </nav>
      </header>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading data…</p>}

      <div className="layout">
        <aside className="panel left-column">
          <h3>Dashboard stats</h3>
          <p>
            <strong>Last activity:</strong> {dashboard?.lastActivityAt ?? '—'}
          </p>
          <p>
            <strong>Current streak:</strong> {dashboard?.streakCurrent ?? 0}
          </p>
          <p>
            <strong>Avg streak:</strong> {dashboard?.streakAverage?.toFixed(2) ?? '0.00'}
          </p>
          <p>
            <strong>Farthest category:</strong> {dashboard?.farthestCategory ?? '—'}
          </p>
          <p>
            <strong>Total solved:</strong> {dashboard?.solvedCounts.totalSolved ?? 0}
          </p>
          <p>
            <strong>Overall avg time (min):</strong> {dashboard?.timeAverages.overallAvgTimeMinutes?.toFixed(2) ?? '—'}
          </p>
          <label>
            Dashboard scope
            <select value={dashboardScope} onChange={(event) => setDashboardScope(event.target.value as 'latest' | 'list' | 'all')}>
              <option value="latest">Latest list</option>
              <option value="list" disabled={!selectedListId}>This list</option>
              <option value="all">All lists</option>
            </select>
          </label>
          <ul>
            {(dashboard?.solvedCounts.byCategory ?? []).map((row) => (
              <li key={row.category}>
                {row.category}: {row.solvedCount}/{row.totalInCategory} (E {row.easySolved}, M {row.mediumSolved}, H {row.hardSolved})
              </li>
            ))}
          </ul>
          <hr />
          <h4>Lists</h4>
          <div className="list-controls">
            <select value={selectedListId ?? ''} onChange={(event) => setSelectedListId(event.target.value)}>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
            <input
              placeholder="new list name"
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
            />
            <button onClick={() => void createList()}>Create list</button>
          </div>
        </aside>

        {rightPanel}

        <section className="panel table-panel">
          <h2>Problems ({visibleProblems.length})</h2>
          <div className="filters">
            <label>
              Category
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Solved
              <select
                value={solvedFilter}
                onChange={(event) => setSolvedFilter(event.target.value as 'all' | 'solved' | 'unsolved')}
              >
                <option value="all">All</option>
                <option value="solved">Solved</option>
                <option value="unsolved">Unsolved</option>
              </select>
            </label>
            <label>
              Search
              <input
                placeholder="Search title"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <table>
            <thead>
              <tr>
                <th>Problem</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>LeetCode</th>
                <th>Solved</th>
                <th>Confidence</th>
                <th>Attempts</th>
                <th>Time (min)</th>
                <th>Time Complexity</th>
                <th>Space Complexity</th>
                <th>Notes</th>
                <th>Date Solved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProblems.map((problem) => {
                const row = rows[problem.neet250Id];
                const draft = row?.draft ?? EMPTY_ATTEMPT;
                const timeOptions = getComplexityOptions(draft.timeComplexity);
                const spaceOptions = getComplexityOptions(draft.spaceComplexity);
                const notesExpanded = expandedNotes[problem.neet250Id];
                const notesPreview = (draft.notes ?? '').trim();
                const showExpand = notesPreview.length > 32;

                return (
                  <Fragment key={problem.neet250Id}>
                    <tr id={`problem-${problem.neet250Id}`}>
                      <td>
                        {problem.orderIndex}. {problem.title}
                      </td>
                      <td>{problem.category}</td>
                      <td>{problem.difficulty}</td>
                      <td>
                        {problem.leetcodeSlug ? (
                          <a href={`https://leetcode.com/problems/${problem.leetcodeSlug}/`} target="_blank" rel="noreferrer">
                            link
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <select
                          value={draft.solved === null ? '' : String(draft.solved)}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              solved: event.target.value === '' ? null : event.target.value === 'true',
                            }))
                          }
                        >
                          <option value="">—</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={draft.confidence ?? ''}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              confidence: event.target.value || null,
                            }))
                          }
                        >
                          <option value="">—</option>
                          {CONFIDENCE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={draft.attempts ?? ''}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              attempts: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={draft.timeMinutes ?? ''}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              timeMinutes: event.target.value ? Number(event.target.value) : null,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          list={`time-presets-${problem.neet250Id}`}
                          value={draft.timeComplexity ?? ''}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              timeComplexity: event.target.value || null,
                            }))
                          }
                          onBlur={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              timeComplexity: normalizeComplexity(event.target.value) || null,
                            }))
                          }
                        />
                        <datalist id={`time-presets-${problem.neet250Id}`}>
                          {timeOptions.map((option) => (
                            <option value={option} key={option} />
                          ))}
                        </datalist>
                      </td>
                      <td>
                        <input
                          list={`space-presets-${problem.neet250Id}`}
                          value={draft.spaceComplexity ?? ''}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              spaceComplexity: event.target.value || null,
                            }))
                          }
                          onBlur={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              spaceComplexity: normalizeComplexity(event.target.value) || null,
                            }))
                          }
                        />
                        <datalist id={`space-presets-${problem.neet250Id}`}>
                          {spaceOptions.map((option) => (
                            <option value={option} key={option} />
                          ))}
                        </datalist>
                      </td>
                      <td>
                        <input
                          title={draft.notes ?? ''}
                          value={notesExpanded ? draft.notes ?? '' : notesPreview.slice(0, 32)}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              notes: event.target.value || null,
                            }))
                          }
                        />
                        {showExpand && (
                          <button
                            className="tiny-button"
                            onClick={() =>
                              setExpandedNotes((prev) => ({ ...prev, [problem.neet250Id]: !prev[problem.neet250Id] }))
                            }
                          >
                            {notesExpanded ? 'Less' : 'More'}
                          </button>
                        )}
                      </td>
                      <td>
                        <input
                          type="date"
                          value={draft.dateSolved ?? ''}
                          onChange={(event) =>
                            scheduleSave(problem.neet250Id, (currentDraft) => ({
                              ...currentDraft,
                              dateSolved: event.target.value || null,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button onClick={() => scheduleSave(problem.neet250Id, () => ({ ...EMPTY_ATTEMPT }))}>Clear</button>
                        <button
                          onClick={() => {
                            const next = !expanded[problem.neet250Id];
                            setExpanded((prev) => ({ ...prev, [problem.neet250Id]: next }));
                            if (next) {
                              void loadHistory(problem.neet250Id);
                            }
                          }}
                        >
                          {expanded[problem.neet250Id] ? 'Hide' : 'History'}
                        </button>
                        {row?.status === 'saving' && <small> saving…</small>}
                        {row?.status === 'error' && <small className="error"> save failed</small>}
                      </td>
                    </tr>
                    {expanded[problem.neet250Id] && (
                      <tr className="history-row">
                        <td colSpan={13}>
                          <ul className="history-list">
                            {(historyByNeetId[problem.neet250Id] ?? []).map((attempt) => {
                              const timeHistoryOptions = getComplexityOptions(attempt.timeComplexity);
                              const spaceHistoryOptions = getComplexityOptions(attempt.spaceComplexity);
                              return (
                                <li key={attempt.id}>
                                  <div>
                                    <strong>{attempt.updatedAt}</strong> · solved={String(attempt.solved)}
                                  </div>
                                  <div className="history-edit">
                                    <select
                                      value={attempt.confidence ?? ''}
                                      onChange={(event) =>
                                        scheduleHistorySave(problem.neet250Id, attempt, (draft) => ({
                                          ...draft,
                                          confidence: event.target.value || null,
                                        }))
                                      }
                                    >
                                      <option value="">—</option>
                                      {CONFIDENCE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      min={1}
                                      value={attempt.attempts ?? ''}
                                      onChange={(event) =>
                                        scheduleHistorySave(problem.neet250Id, attempt, (draft) => ({
                                          ...draft,
                                          attempts: event.target.value ? Number(event.target.value) : null,
                                        }))
                                      }
                                    />
                                    <input
                                      list={`history-time-${attempt.id}`}
                                      value={attempt.timeComplexity ?? ''}
                                      onChange={(event) =>
                                        scheduleHistorySave(problem.neet250Id, attempt, (draft) => ({
                                          ...draft,
                                          timeComplexity: event.target.value || null,
                                        }))
                                      }
                                      onBlur={(event) =>
                                        scheduleHistorySave(problem.neet250Id, attempt, (draft) => ({
                                          ...draft,
                                          timeComplexity: normalizeComplexity(event.target.value) || null,
                                        }))
                                      }
                                    />
                                    <datalist id={`history-time-${attempt.id}`}>
                                      {timeHistoryOptions.map((option) => (
                                        <option value={option} key={option} />
                                      ))}
                                    </datalist>
                                    <input
                                      list={`history-space-${attempt.id}`}
                                      value={attempt.spaceComplexity ?? ''}
                                      onChange={(event) =>
                                        scheduleHistorySave(problem.neet250Id, attempt, (draft) => ({
                                          ...draft,
                                          spaceComplexity: event.target.value || null,
                                        }))
                                      }
                                      onBlur={(event) =>
                                        scheduleHistorySave(problem.neet250Id, attempt, (draft) => ({
                                          ...draft,
                                          spaceComplexity: normalizeComplexity(event.target.value) || null,
                                        }))
                                      }
                                    />
                                    <datalist id={`history-space-${attempt.id}`}>
                                      {spaceHistoryOptions.map((option) => (
                                        <option value={option} key={option} />
                                      ))}
                                    </datalist>
                                    <button onClick={() => void deleteHistoryAttempt(problem.neet250Id, attempt.id)}>Delete</button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function DashboardPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    void api.getDashboard(token, 'latest').then(setDashboard);
  }, [token]);

  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p>Last activity: {dashboard?.lastActivityAt ?? '—'}</p>
      <p>Current streak: {dashboard?.streakCurrent ?? 0}</p>
      <p>Farthest category: {dashboard?.farthestCategory ?? '—'}</p>
      <p>Average streak: {dashboard?.streakAverage ?? 0}</p>
      <ul>
        {(dashboard?.solvedCounts.byCategory ?? []).map((row) => (
          <li key={row.category}>
            {row.category}: {row.solvedCount}/{row.totalInCategory}
          </li>
        ))}
      </ul>
      <Link to="/">Back to problems</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        }
      />
    </Routes>
  );
}
