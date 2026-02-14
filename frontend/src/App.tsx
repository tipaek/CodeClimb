import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';
import { EMPTY_ATTEMPT, getComplexityOptions, isEmptyAttemptPayload, normalizeComplexity } from './attempts';
import { useAuth } from './auth';
import type { Attempt, Dashboard, ListItem, ProblemWithLatestAttempt, UpsertAttemptRequest } from './types';
import './styles.css';

const CONFIDENCE_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const THEME_STORAGE_KEY = 'codeclimb.theme';

const THEMES = [
  { key: 'salt-pepper', label: 'Salt and pepper' },
  { key: 'fresh-peach', label: 'Fresh peach' },
  { key: 'wisteria-bloom', label: 'Wisteria bloom' },
  { key: 'night-sands', label: 'Night sands' },
] as const;

type ThemeKey = (typeof THEMES)[number]['key'];
type SolvedFilter = 'all' | 'solved' | 'unsolved';
type RowStatus = 'idle' | 'saving' | 'saved' | 'error';

type LatestAttemptLike = Partial<Attempt> & Record<string, unknown>;

interface EditableRowState {
  draft: UpsertAttemptRequest;
  attemptId: string | null;
  hasServerData: boolean;
  status: RowStatus;
}

function AuthGuard({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function LoginPage() { /* unchanged */
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (token) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await api.login({ email, password });
      setToken(response.accessToken);
      const nextPath = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(nextPath, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <main className="auth-page">
      <h1>Login</h1>
      <form onSubmit={submit}>
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p>
        Need an account? <Link to="/signup">Signup</Link>
      </p>
    </main>
  );
}

function SignupPage() { /* unchanged */
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [error, setError] = useState<string | null>(null);
  if (token) return <Navigate to="/" replace />;
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(null); try { const response = await api.signup({ email, password, timezone }); setToken(response.accessToken); navigate('/', { replace: true }); } catch (e) { setError(e instanceof Error ? e.message : 'Signup failed'); } };
  return <main className="auth-page"><h1>Signup</h1><form onSubmit={submit}><input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} /><input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><input placeholder="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} /><button type="submit">Create account</button></form>{error && <p className="error">{error}</p>}<p>Already have an account? <Link to="/login">Login</Link></p></main>;
}

type LatestAttemptLike = Partial<Attempt> & Record<string, unknown>;

  return (
    <main className="auth-page">
      <h1>Signup</h1>
      <form onSubmit={submit}>
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input placeholder="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
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

function HomePage() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.some((item) => item.key === saved) ? (saved as ThemeKey) : 'salt-pepper';
  });
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [problems, setProblems] = useState<ProblemWithLatestAttempt[]>([]);
  const [rows, setRows] = useState<Record<number, EditableRowState>>({});
  const [historyByNeetId, setHistoryByNeetId] = useState<Record<number, Attempt[]>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const timers = useRef<Record<number, number>>({});

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleAuthError = (nextError: unknown): boolean => {
    if (nextError instanceof ApiError && (nextError.status === 401 || nextError.status === 403)) {
      setToken(null);
      navigate('/login', { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const [dashboardResponse, listsResponse] = await Promise.all([api.getDashboard(token), api.getLists(token)]);
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
    if (!token || !selectedListId) {
      setProblems([]);
      setRows({});
      return;
    }

    const loadProblems = async () => {
      try {
        setLoading(true);
        const items = await api.getProblems(token, selectedListId);
        setProblems(items);
        setSelectedCategory('All');

        const nextRows: Record<number, EditableRowState> = {};
        items.forEach((problem) => {
          const draft = toDraft(problem);
          nextRows[problem.neet250Id] = {
            draft,
            attemptId: null,
            hasServerData: !isEmptyAttemptPayload(draft),
            status: 'idle',
          };
        });
        setRows(nextRows);
      } catch (e) {
        if (!handleAuthError(e)) {
          setError(e instanceof Error ? e.message : 'Failed to load problems');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProblems();
  }, [selectedListId, token]);

  const mergeAttemptIntoProblem = (neetId: number, attempt: Attempt | null) => {
    setProblems((prev) => prev.map((problem) => (problem.neet250Id === neetId ? { ...problem, latestAttempt: attempt } : problem)));
  };

  const saveRow = async (listId: string, neetId: number) => {
    if (!token) return;
    const current = rows[neetId];
    if (!current) return;

    if (isEmptyAttemptPayload(current.draft)) {
      if (current.attemptId) {
        try {
          await api.deleteAttempt(token, current.attemptId);
          setRows((prev) => ({
            ...prev,
            [neetId]: { ...prev[neetId], attemptId: null, status: 'saved', hasServerData: false },
          }));
          mergeAttemptIntoProblem(neetId, null);
          setHistoryByNeetId((prev) => ({
            ...prev,
            [neetId]: (prev[neetId] ?? []).filter((item) => item.id !== current.attemptId),
          }));
        } catch {
          setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], status: 'error' } }));
        }
      }
      return;
    }

    setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], status: 'saving' } }));
    try {
      let attemptId = current.attemptId;
      if (!attemptId && current.hasServerData) {
        const history = await api.getAttemptsHistory(token, listId, neetId);
        attemptId = history[0]?.id ?? null;
      }

      const attempt = attemptId
        ? await api.patchAttempt(token, attemptId, current.draft)
        : await api.createAttempt(token, listId, neetId, current.draft);

      setRows((prev) => ({
        ...prev,
        [neetId]: { ...prev[neetId], attemptId: attempt.id, hasServerData: true, status: 'saved' },
      }));
      mergeAttemptIntoProblem(neetId, attempt);
      setHistoryByNeetId((prev) => {
        if (!prev[neetId]) return prev;
        const rest = prev[neetId].filter((item) => item.id !== attempt.id);
        return { ...prev, [neetId]: [attempt, ...rest] };
      });
    } catch (e) {
      if (handleAuthError(e)) return;
      const nextStatus: RowStatus = e instanceof ApiError && e.status === 400 ? 'idle' : 'error';
      setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], status: nextStatus } }));
    }
  };

  const scheduleSave = (neetId: number, update: (draft: UpsertAttemptRequest) => UpsertAttemptRequest) => {
    if (!selectedListId) return;
    setRows((prev) => {
      const row = prev[neetId] ?? { draft: { ...EMPTY_ATTEMPT }, attemptId: null, hasServerData: false, status: 'idle' as const };
      return {
        ...prev,
        [neetId]: {
          ...row,
          draft: update(row.draft),
          status: 'idle',
        },
      };
    });
    if (timers.current[neetId]) window.clearTimeout(timers.current[neetId]);
    timers.current[neetId] = window.setTimeout(() => { void saveRow(selectedListId, neetId); }, 650);
  };

  const loadHistory = async (neetId: number) => {
    if (!token || !selectedListId) return;
    const history = await api.getAttemptsHistory(token, selectedListId, neetId);
    setHistoryByNeetId((prev) => ({ ...prev, [neetId]: history }));
    if (history[0]) setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], attemptId: history[0].id, hasServerData: true } }));
  };

  const saveHistoryAttempt = async (neetId: number, attemptId: string, update: (draft: UpsertAttemptRequest) => UpsertAttemptRequest) => {
    if (!token) return;
    const current = (historyByNeetId[neetId] ?? []).find((item) => item.id === attemptId);
    if (!current) return;
    const payload = update(current);
    if (isEmptyAttemptPayload(payload)) return;
    const patched = await api.patchAttempt(token, attemptId, payload);
    setHistoryByNeetId((prev) => ({ ...prev, [neetId]: (prev[neetId] ?? []).map((item) => (item.id === attemptId ? patched : item)) }));
    if (rows[neetId]?.attemptId === attemptId) {
      setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], draft: patched } }));
      mergeAttemptIntoProblem(neetId, patched);
    }
  };

  const patchHistoryAttempt = async (neetId: number, attemptId: string, payload: UpsertAttemptRequest) => {
    if (!token || isEmptyAttemptPayload(payload)) return;
    const patched = await api.patchAttempt(token, attemptId, payload);

    setHistoryByNeetId((prev) => ({
      ...prev,
      [neetId]: (prev[neetId] ?? []).map((entry) => (entry.id === attemptId ? patched : entry)),
    }));

    if (rows[neetId]?.attemptId === attemptId) {
      setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], draft: patched } }));
      mergeAttemptIntoProblem(neetId, patched);
    }
  };

  const saveHistoryAttempt = async (neetId: number, attemptId: string, update: (draft: UpsertAttemptRequest) => UpsertAttemptRequest) => {
    const current = (historyByNeetId[neetId] ?? []).find((entry) => entry.id === attemptId);
    if (!current) return;
    const payload = update(current);
    await patchHistoryAttempt(neetId, attemptId, payload);
  };

  const deleteHistoryAttempt = async (neetId: number, attemptId: string) => {
    if (!token) return;
    await api.deleteAttempt(token, attemptId);

    const nextHistory = (historyByNeetId[neetId] ?? []).filter((entry) => entry.id !== attemptId);
    setHistoryByNeetId((prev) => ({ ...prev, [neetId]: nextHistory }));

    if (rows[neetId]?.attemptId === attemptId) {
      const nextLatest = nextHistory[0] ?? null;
      setRows((prev) => ({
        ...prev,
        [neetId]: {
          ...prev[neetId],
          attemptId: nextLatest?.id ?? null,
          draft: nextLatest ?? { ...EMPTY_ATTEMPT },
        },
      }));
      mergeAttemptIntoProblem(neetId, nextLatest);
    }
  };

  const createList = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !newListName.trim()) return;
    const created = await api.createList(token, { name: newListName.trim(), templateVersion: 'neet250.v1' });
    setLists((prev) => [created, ...prev]);
    setSelectedListId(created.id);
    setNewListName('');
  };

  const createList = async (event: FormEvent) => { event.preventDefault(); if (!token || !newListName.trim()) return; const created = await api.createList(token, { name: newListName.trim(), templateVersion: 'neet250.v1' }); setLists((prev) => [created, ...prev]); setSelectedListId(created.id); setNewListName(''); };

  const categories = useMemo(() => ['All', ...Array.from(new Set(problems.map((p) => p.category)))], [problems]);
  const visibleProblems = useMemo(
    () =>
      problems.filter((problem) => {
        const rowSolved = rows[problem.neet250Id]?.draft.solved;
        const byCategory = selectedCategory === 'All' || problem.category === selectedCategory;
        const bySolved =
          solvedFilter === 'all' || (solvedFilter === 'solved' ? rowSolved === true : rowSolved !== true);
        const bySearch = !search.trim() || problem.title.toLowerCase().includes(search.trim().toLowerCase());
        return byCategory && bySolved && bySearch;
      }),
    [problems, rows, selectedCategory, search, solvedFilter],
  );

  const jumpToProblem = (neetId: number) => { setExpanded((prev) => ({ ...prev, [neetId]: true })); void loadHistory(neetId); document.getElementById(`problem-${neetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  return (
    <main className="page">
      <header>
        <h1>CodeClimb</h1>
        <nav>
          <label className="theme-picker">
            Theme
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeKey)}>
              {THEMES.map((item) => (
                <option value={item.key} key={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Link to="/dashboard">Dashboard</Link>
          <button onClick={() => setToken(null)}>Logout</button>
        </nav>
      </header>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="layout">
        <aside className="panel">
          <h2>Stats</h2>
          <p>Farthest category: {dashboard?.farthestCategory ?? '—'}</p>
          <p>Farthest progress: {dashboard?.farthestOrderIndex ?? 0}/250</p>
          <p>Current streak: {dashboard?.streakCurrent ?? 0}</p>
          <h3>Lists</h3>
          <form onSubmit={createList}>
            <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name" />
            <button type="submit">Create</button>
          </form>
          <ul>
            {lists.map((list) => (
              <li key={list.id}>
                <button className={selectedListId === list.id ? 'active' : ''} onClick={() => setSelectedListId(list.id)}>
                  {list.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <aside className="panel">
          <h3>Latest solved</h3>
          <ul>
            {(dashboard?.latestSolved ?? []).slice(0, 2).map((item) => (
              <li key={`solved-${item.neet250Id}`}>
                <button onClick={() => jumpToProblem(item.neet250Id)}>
                  {item.orderIndex}. {item.title}
                </button>
              </li>
            ))}
          </ul>

          <h3>Next unsolved</h3>
          <ul>
            {(dashboard?.nextUnsolved ?? []).slice(0, 4).map((item) => (
              <li key={`next-${item.neet250Id}`}>
                <button onClick={() => jumpToProblem(item.neet250Id)}>
                  {item.orderIndex}. {item.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="panel table-panel">
          <h2>Problems ({visibleProblems.length})</h2>
          <div className="filters">
            <input placeholder="Search title" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select value={solvedFilter} onChange={(e) => setSolvedFilter(e.target.value as SolvedFilter)}>
              <option value="all">All</option>
              <option value="solved">Solved</option>
              <option value="unsolved">Unsolved</option>
            </select>
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
                const history = historyByNeetId[problem.neet250Id] ?? [];

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
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({
                              ...next,
                              solved: e.target.value === '' ? null : e.target.value === 'true',
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
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({
                              ...next,
                              confidence: e.target.value || null,
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
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({
                              ...next,
                              attempts: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={draft.timeMinutes ?? ''}
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({
                              ...next,
                              timeMinutes: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          list={`time-presets-${problem.neet250Id}`}
                          value={draft.timeComplexity ?? ''}
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({ ...next, timeComplexity: e.target.value || null }))
                          }
                          onBlur={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({
                              ...next,
                              timeComplexity: normalizeComplexity(e.target.value) || null,
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
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({ ...next, spaceComplexity: e.target.value || null }))
                          }
                          onBlur={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({
                              ...next,
                              spaceComplexity: normalizeComplexity(e.target.value) || null,
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
                          className="notes-input"
                          title={draft.notes ?? ''}
                          value={draft.notes ?? ''}
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({ ...next, notes: e.target.value || null }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={draft.dateSolved ?? ''}
                          onChange={(e) =>
                            scheduleSave(problem.neet250Id, (next) => ({ ...next, dateSolved: e.target.value || null }))
                          }
                        />
                      </td>
                      <td>
                        <button onClick={() => scheduleSave(problem.neet250Id, () => ({ ...EMPTY_ATTEMPT }))}>Clear</button>
                        <button
                          onClick={() => {
                            const next = !expanded[problem.neet250Id];
                            setExpanded((prev) => ({ ...prev, [problem.neet250Id]: next }));
                            if (next) void loadHistory(problem.neet250Id);
                          }}
                        >
                          {expanded[problem.neet250Id] ? 'Hide' : 'History'}
                        </button>
                        {row?.status === 'saving' && <small> saving…</small>}
                      </td>
                    </tr>

                    {expanded[problem.neet250Id] && (
                      <tr className="history-row">
                        <td colSpan={13}>
                          {history.length === 0 ? (
                            <p className="muted">No history yet.</p>
                          ) : (
                            <ul>
                              {history.map((attempt) => (
                                <li key={attempt.id} className="history-card">
                                  <div>
                                    <strong>{attempt.updatedAt}</strong>
                                  </div>
                                  <div className="history-edit">
                                    <select
                                      defaultValue={attempt.solved === null ? '' : String(attempt.solved)}
                                      onChange={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          solved: e.target.value === '' ? null : e.target.value === 'true',
                                        }))
                                      }
                                    >
                                      <option value="">—</option>
                                      <option value="true">Solved</option>
                                      <option value="false">Unsolved</option>
                                    </select>
                                    <select
                                      defaultValue={attempt.confidence ?? ''}
                                      onChange={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          confidence: e.target.value || null,
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
                                      defaultValue={attempt.attempts ?? ''}
                                      onBlur={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          attempts: e.target.value ? Number(e.target.value) : null,
                                        }))
                                      }
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      defaultValue={attempt.timeMinutes ?? ''}
                                      onBlur={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          timeMinutes: e.target.value ? Number(e.target.value) : null,
                                        }))
                                      }
                                    />
                                    <input
                                      defaultValue={attempt.timeComplexity ?? ''}
                                      onBlur={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          timeComplexity: normalizeComplexity(e.target.value) || null,
                                        }))
                                      }
                                    />
                                    <input
                                      defaultValue={attempt.spaceComplexity ?? ''}
                                      onBlur={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          spaceComplexity: normalizeComplexity(e.target.value) || null,
                                        }))
                                      }
                                    />
                                    <input
                                      defaultValue={attempt.notes ?? ''}
                                      onBlur={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          notes: e.target.value || null,
                                        }))
                                      }
                                    />
                                    <input
                                      type="date"
                                      defaultValue={attempt.dateSolved ?? ''}
                                      onChange={(e) =>
                                        void saveHistoryAttempt(problem.neet250Id, attempt.id, (next) => ({
                                          ...next,
                                          dateSolved: e.target.value || null,
                                        }))
                                      }
                                    />
                                    <button onClick={() => void deleteHistoryAttempt(problem.neet250Id, attempt.id)}>
                                      Delete
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
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

function DashboardPage() { const { token } = useAuth(); const [dashboard, setDashboard] = useState<Dashboard | null>(null); useEffect(() => { if (!token) return; void api.getDashboard(token).then(setDashboard); }, [token]); return <main className="page"><h1>Dashboard</h1><p>Last activity: {dashboard?.lastActivityAt ?? '—'}</p><p>Current streak: {dashboard?.streakCurrent ?? 0}</p><p>Farthest category: {dashboard?.farthestCategory ?? '—'}</p><ul>{(dashboard?.perCategory ?? []).map((row) => (<li key={row.category}>{row.category}: {row.solvedCount}</li>))}</ul><Link to="/">Back to problems</Link></main>; }

  useEffect(() => {
    if (!token) return;
    void api.getDashboard(token).then(setDashboard);
  }, [token]);

  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p>Last activity: {dashboard?.lastActivityAt ?? '—'}</p>
      <p>Current streak: {dashboard?.streakCurrent ?? 0}</p>
      <p>Farthest category: {dashboard?.farthestCategory ?? '—'}</p>
      <ul>{(dashboard?.perCategory ?? []).map((row) => <li key={row.category}>{row.category}: {row.solvedCount}</li>)}</ul>
      <Link to="/">Back to problems</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
      <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
    </Routes>
  );
}
