import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from './api';
import { EMPTY_ATTEMPT, isEmptyAttemptPayload } from './attempts';
import { useAuth } from './auth';
import type { Attempt, Dashboard, ListItem, ProblemWithLatestAttempt, UpsertAttemptRequest } from './types';
import './styles.css';

function AuthGuard({ children }: { children: JSX.Element }) {
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
      <p>Need an account? <Link to="/signup">Signup</Link></p>
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

  if (token) return <Navigate to="/" replace />;

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
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input placeholder="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        <button type="submit">Create account</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </main>
  );
}

interface EditableRowState {
  draft: UpsertAttemptRequest;
  attemptId: string | null;
  hasServerData: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
}

function toDraft(problem: ProblemWithLatestAttempt): UpsertAttemptRequest {
  return {
    solved: problem.latestAttempt?.solved ?? null,
    dateSolved: problem.latestAttempt?.dateSolved ?? null,
    timeMinutes: problem.latestAttempt?.timeMinutes ?? null,
    notes: problem.latestAttempt?.notes ?? null,
    problemUrl: problem.latestAttempt?.problemUrl ?? null,
  };
}

function listHasServerData(draft: UpsertAttemptRequest): boolean {
  return !isEmptyAttemptPayload(draft);
}

function HomePage() {
  const { token, setToken } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [problems, setProblems] = useState<ProblemWithLatestAttempt[]>([]);
  const [rows, setRows] = useState<Record<number, EditableRowState>>({});
  const [historyByNeetId, setHistoryByNeetId] = useState<Record<number, Attempt[]>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [error, setError] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const timers = useRef<Record<number, number>>({});

  const handleAuthError = (error: unknown): boolean => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
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
        const [dashboardResponse, listsResponse] = await Promise.all([api.getDashboard(token), api.getLists(token)]);
        setDashboard(dashboardResponse);
        setLists(listsResponse);
        const fallback = listsResponse[0]?.id ?? null;
        setSelectedListId(dashboardResponse.latestListId ?? fallback);
      } catch (e) {
        if (handleAuthError(e)) return;
        setError(e instanceof Error ? e.message : 'Failed to load dashboard/lists');
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
        const items = await api.getProblems(token, selectedListId);
        setProblems(items);
        setSelectedCategory('All');
        const nextRows: Record<number, EditableRowState> = {};
        items.forEach((problem) => {
          const draft = toDraft(problem);
          nextRows[problem.neet250Id] = {
            draft,
            attemptId: null,
            hasServerData: listHasServerData(draft),
            status: 'idle',
          };
        });
        setRows(nextRows);
      } catch (e) {
        if (handleAuthError(e)) return;
        setError(e instanceof Error ? e.message : 'Failed to load problems');
      }
    };
    void loadProblems();
  }, [selectedListId, token]);

  const saveRow = async (listId: string, neetId: number) => {
    if (!token) return;
    const current = rows[neetId];
    if (!current) return;
    if (isEmptyAttemptPayload(current.draft)) {
      if (current.attemptId) {
        try {
          await api.deleteAttempt(token, current.attemptId);
          setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], attemptId: null, status: 'saved' } }));
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
    } catch (e) {
      if (handleAuthError(e)) {
        return;
      }
      if (e instanceof ApiError && e.status === 400) {
        setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], status: 'idle' } }));
        return;
      }
      setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], status: 'error' } }));
    }
  };

  const scheduleSave = (neetId: number, update: (draft: UpsertAttemptRequest) => UpsertAttemptRequest) => {
    if (!selectedListId) return;
    setRows((prev) => {
      const row = prev[neetId] ?? { draft: { ...EMPTY_ATTEMPT }, attemptId: null, hasServerData: false, status: 'idle' };
      return {
        ...prev,
        [neetId]: {
          ...row,
          draft: update(row.draft),
          status: 'idle',
        },
      };
    });

    if (timers.current[neetId]) {
      window.clearTimeout(timers.current[neetId]);
    }
    timers.current[neetId] = window.setTimeout(() => {
      void saveRow(selectedListId, neetId);
    }, 650);
  };

  const loadHistory = async (neetId: number) => {
    if (!token || !selectedListId || historyByNeetId[neetId]) return;
    const history = await api.getAttemptsHistory(token, selectedListId, neetId);
    setHistoryByNeetId((prev) => ({ ...prev, [neetId]: history }));
    if (history[0]) {
      setRows((prev) => ({ ...prev, [neetId]: { ...prev[neetId], attemptId: history[0].id, hasServerData: true } }));
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

  const categories = useMemo(() => ['All', ...Array.from(new Set(problems.map((p) => p.category)))], [problems]);
  const visibleProblems = useMemo(
    () => (selectedCategory === 'All' ? problems : problems.filter((p) => p.category === selectedCategory)),
    [problems, selectedCategory],
  );

  const jumpToProblem = (neetId: number) => {
    setExpanded((prev) => ({ ...prev, [neetId]: true }));
    void loadHistory(neetId);
    document.getElementById(`problem-${neetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <main className="page">
      <header>
        <h1>CodeClimb</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <button onClick={() => setToken(null)}>Logout</button>
        </nav>
      </header>
      {error && <p className="error">{error}</p>}
      <div className="layout">
        <aside>
          <h2>Lists</h2>
          <form onSubmit={createList}>
            <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name" />
            <button type="submit">Create</button>
          </form>
          <ul>{lists.map((list) => (<li key={list.id}><button className={selectedListId === list.id ? 'active' : ''} onClick={() => setSelectedListId(list.id)}>{list.name}</button></li>))}</ul>
          <hr />
          <p>Farthest category: {dashboard?.farthestCategory ?? '—'}</p>
          <p>Farthest progress: {dashboard?.farthestOrderIndex ?? 0}/250</p>
          <h3>Latest solved</h3>
          <ul>
            {(dashboard?.latestSolved ?? []).map((item) => (
              <li key={`solved-${item.neet250Id}`}><button onClick={() => jumpToProblem(item.neet250Id)}>{item.orderIndex}. {item.title}</button></li>
            ))}
          </ul>
          <h3>Next unsolved</h3>
          <ul>
            {(dashboard?.nextUnsolved ?? []).map((item) => (
              <li key={`next-${item.neet250Id}`}><button onClick={() => jumpToProblem(item.neet250Id)}>{item.orderIndex}. {item.title}</button></li>
            ))}
          </ul>
        </aside>
        <section>
          <h2>Problems ({visibleProblems.length})</h2>
          <label>
            Category:{' '}
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <table>
            <thead>
              <tr>
                <th>Problem</th><th>Category</th><th>Difficulty</th><th>LeetCode</th>
                <th>Solved</th><th>Confidence</th><th>Attempts</th><th>Time (min)</th><th>Time Complexity</th><th>Space Complexity</th><th>Notes</th><th>Date Solved</th><th>History</th>
              </tr>
            </thead>
            <tbody>
              {visibleProblems.map((problem) => {
                const row = rows[problem.neet250Id];
                const draft = row?.draft ?? EMPTY_ATTEMPT;
                return (
                  <Fragment key={problem.neet250Id}>
                    <tr id={`problem-${problem.neet250Id}`}>
                      <td>{problem.orderIndex}. {problem.title}</td>
                      <td>{problem.category}</td>
                      <td>{problem.difficulty}</td>
                      <td>{problem.leetcodeSlug ? <a href={`https://leetcode.com/problems/${problem.leetcodeSlug}/`} target="_blank" rel="noreferrer">link</a> : '—'}</td>
                      <td>
                        <select value={draft.solved === null ? '' : String(draft.solved)} onChange={(e) => scheduleSave(problem.neet250Id, (d) => ({ ...d, solved: e.target.value === '' ? null : e.target.value === 'true' }))}>
                          <option value="">—</option><option value="true">Yes</option><option value="false">No</option>
                        </select>
                      </td>
                      <td>—</td><td>—</td>
                      <td><input type="number" value={draft.timeMinutes ?? ''} onChange={(e) => scheduleSave(problem.neet250Id, (d) => ({ ...d, timeMinutes: e.target.value ? Number(e.target.value) : null }))} /></td>
                      <td>—</td><td>—</td>
                      <td><input value={draft.notes ?? ''} onChange={(e) => scheduleSave(problem.neet250Id, (d) => ({ ...d, notes: e.target.value || null }))} /></td>
                      <td><input type="date" value={draft.dateSolved ?? ''} onChange={(e) => scheduleSave(problem.neet250Id, (d) => ({ ...d, dateSolved: e.target.value || null }))} /></td>
                      <td>
                        <button onClick={() => scheduleSave(problem.neet250Id, () => ({ ...EMPTY_ATTEMPT }))}>Clear</button>
                        <button onClick={() => {
                          const next = !expanded[problem.neet250Id];
                          setExpanded((prev) => ({ ...prev, [problem.neet250Id]: next }));
                          if (next) void loadHistory(problem.neet250Id);
                        }}>Expand</button>
                        {row?.status === 'saving' && <small> saving…</small>}
                      </td>
                    </tr>
                    {expanded[problem.neet250Id] && (
                      <tr><td colSpan={13}><ul>{(historyByNeetId[problem.neet250Id] ?? []).map((attempt) => (<li key={attempt.id}>{attempt.updatedAt}: solved={String(attempt.solved)} time={attempt.timeMinutes ?? '—'} notes={attempt.notes ?? '—'}</li>))}</ul></td></tr>
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
    if (!token) return;
    void api.getDashboard(token).then(setDashboard);
  }, [token]);

  return (
    <main className="page">
      <h1>Dashboard</h1>
      <p>Last activity: {dashboard?.lastActivityAt ?? '—'}</p>
      <p>Current streak: {dashboard?.streakCurrent ?? 0}</p>
      <p>Farthest category: {dashboard?.farthestCategory ?? '—'}</p>
      <ul>{(dashboard?.perCategory ?? []).map((row) => (<li key={row.category}>{row.category}: {row.solvedCount}</li>))}</ul>
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
