import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import { Button, Card, Input, Pill, Select } from './components/primitives';
import { useAuthCtaModal } from './hooks/useAuthCtaModal';
import { THEME_OPTIONS, useTheme } from './theme';
import type { Dashboard, ListItem, ProblemWithLatestAttempt } from './types';
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

function DashboardPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setDashboard(null);
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

  const stats = token
    ? [
        { label: 'Current streak', value: String(dashboard?.streakCurrent ?? 0), tone: 'success' as const },
        { label: 'Average streak', value: String(dashboard?.streakAverage ?? 0) },
        { label: 'Last activity', value: dashboard?.lastActivityAt ?? '—' },
      ]
    : [
        { label: 'Current streak', value: '4 days', tone: 'success' as const },
        { label: 'Average streak', value: '2.3 days' },
        { label: 'Last activity', value: '2026-02-13' },
      ];

  return (
    <section className="stack-24">
      <div>
        <h1>Dashboard</h1>
        <p className="muted">Track your streak and progress across NeetCode categories.</p>
      </div>
      {loading ? <p className="muted">Loading dashboard…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="card-grid">
        {stats.map((item) => (
          <Card key={item.label}>
            <h2>{item.label}</h2>
            <p className="value-line">{item.value}</p>
            <Pill tone={item.tone ?? 'default'}>{token ? 'Live' : 'Demo'}</Pill>
          </Card>
        ))}
      </div>
      <div className="card-grid">
        <Card>
          <h2>Farthest category</h2>
          <p className="value-line">{dashboard?.farthestCategory ?? (token ? '—' : 'Arrays & Hashing')}</p>
        </Card>
        <Card>
          <h2>Latest solved</h2>
          <p className="muted">{token ? 'Open Problems to review solved items.' : 'Sign in to track solved history.'}</p>
        </Card>
      </div>
      <Card>
        <h2>Category progress</h2>
        <ul className="clean-list">
          {(dashboard?.solvedCounts.byCategory ?? [
            { category: 'Arrays & Hashing', solvedCount: 11, totalInCategory: 24 },
            { category: 'Sliding Window', solvedCount: 4, totalInCategory: 10 },
          ]).map((row) => (
            <li key={row.category}>
              <span>{row.category}</span>
              <Pill>{`${row.solvedCount}/${row.totalInCategory}`}</Pill>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function ProblemsPage() {
  const { token } = useAuth();
  const { openAuthCta, authCtaModal } = useAuthCtaModal();
  const [lists, setLists] = useState<ListItem[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [problems, setProblems] = useState<ProblemWithLatestAttempt[]>([]);

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
    void api.getProblems(token, selectedListId).then(setProblems);
  }, [token, selectedListId]);

  return (
    <section className="stack-24">
      <div>
        <h1>Problems</h1>
        <p className="muted">Practice queue and recent attempt snapshots.</p>
      </div>
      {token ? (
        <Card>
          <h2>List</h2>
          <Select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)}>
            <option value="">Select a list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </Select>
        </Card>
      ) : null}
      <div className="card-grid">
        {(token
          ? problems.slice(0, 6)
          : [
              { neet250Id: 1, title: 'Two Sum', category: 'Arrays & Hashing', latestAttempt: null },
              { neet250Id: 2, title: 'Valid Parentheses', category: 'Stack', latestAttempt: null },
            ]
        ).map((problem) => (
          <Card key={problem.neet250Id}>
            <h2>{problem.title}</h2>
            <p className="muted">{problem.category}</p>
            <Button onClick={token ? undefined : openAuthCta}>Open problem</Button>
          </Card>
        ))}
      </div>
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
