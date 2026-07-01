import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  getToken,
  setAuth,
  getStoredUser,
  getLocalApplications,
  saveLocalApplications,
  getLocalMeta,
  setLocalMeta,
  clearLocalData,
  authHeaders,
  getLocalLifeDesign,
  saveLocalLifeDesign,
} from './storage';
import { DEFAULT_LIFE_DESIGN, normalizeLifeDesign } from './lifeDesign';

const API = '/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getToken);
  const [authLoading, setAuthLoading] = useState(Boolean(getToken()));

  const signOut = useCallback(() => {
    setAuth(null, null);
    setUser(null);
    setToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) {
      setAuthLoading(false);
      return null;
    }

    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) throw new Error('Session expired');
      const data = await res.json();
      setUser(data.user);
      setToken(currentToken);
      return data;
    } catch {
      signOut();
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    if (token) refreshSession();
    else setAuthLoading(false);
  }, [token, refreshSession]);

  const register = async (email, password, localApplications) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, localApplications }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    setAuth(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    clearLocalData();
    setLocalMeta({ dataSource: 'account' });
    return data;
  };

  const login = async (email, password, localApplications) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, localApplications }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setAuth(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    clearLocalData();
    setLocalMeta({ dataSource: 'account' });
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        authLoading,
        register,
        login,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useApplications() {
  const { isAuthenticated, authLoading, token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const loadExamples = useCallback(async () => {
    const res = await fetch(`${API}/examples`);
    if (!res.ok) throw new Error('Failed to load examples');
    const data = await res.json();
    saveLocalApplications(data.applications);
    setLocalMeta({ dataSource: 'examples' });
    setApplications(data.applications);
    setDataSource('examples');
    return data.applications;
  }, []);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    try {
      setError(null);

      if (isAuthenticated && token) {
        const res = await fetch(`${API}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load your saved applications');
        const data = await res.json();
        setApplications(data);
        setDataSource('account');
        return data;
      }

      const local = getLocalApplications();
      const meta = getLocalMeta();

      if (local && local.length > 0) {
        setApplications(local);
        setDataSource(meta.dataSource || 'local');
        return local;
      }

      if (meta.dataSource === 'empty') {
        setApplications([]);
        setDataSource('empty');
        return [];
      }

      const legacyRes = await fetch(`${API}/legacy/import`);
      if (legacyRes.ok) {
        const legacy = await legacyRes.json();
        if (legacy.imported && legacy.applications?.length) {
          saveLocalApplications(legacy.applications);
          setLocalMeta({ dataSource: 'local' });
          setApplications(legacy.applications);
          setDataSource('local');
          return legacy.applications;
        }
      }

      return loadExamples();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, token, loadExamples]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persistLocal = (apps) => {
    saveLocalApplications(apps);
    setLocalMeta({ dataSource: apps.length ? 'local' : 'empty' });
    setDataSource(apps.length ? 'local' : 'empty');
    setApplications(apps);
  };

  const submitVoiceDump = async (transcript) => {
    const existing = isAuthenticated
      ? applications
      : applications.filter((a) => !a.isExample);

    const res = await fetch(`${API}/voice-dump`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ transcript, existingApplications: existing }),
    });
    if (!res.ok) throw new Error('Failed to process voice dump');
    const data = await res.json();

    if (isAuthenticated) {
      setApplications(data.applications);
      setDataSource('account');
    } else {
      persistLocal(data.applications);
    }

    return data;
  };

  const updateApplication = async (id, updates) => {
    if (isAuthenticated) {
      const res = await fetch(`${API}/applications/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update application');
      const updated = await res.json();
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
      return updated;
    }

    const next = applications.map((a) =>
      a.id === id
        ? { ...a, ...updates, isExample: false, updatedAt: new Date().toISOString() }
        : a
    );
    persistLocal(next);
    return next.find((a) => a.id === id);
  };

  const clearExamples = async () => {
    if (isAuthenticated) return;
    clearLocalData();
    setApplications([]);
    setDataSource('empty');
  };

  const resetToExamples = async () => {
    if (isAuthenticated) return;
    await loadExamples();
  };

  return {
    applications,
    loading: loading || authLoading,
    error,
    dataSource,
    refresh,
    submitVoiceDump,
    updateApplication,
    clearExamples,
    resetToExamples,
  };
}

export function useLifeDesign() {
  const [data, setData] = useState(() => normalizeLifeDesign(getLocalLifeDesign()));

  const persist = useCallback((next) => {
    const normalized = normalizeLifeDesign(next);
    setData(normalized);
    saveLocalLifeDesign(normalized);
  }, []);

  const setGauge = useCallback(
    (areaId, value) => {
      persist({
        ...data,
        dashboard: { ...data.dashboard, [areaId]: value },
      });
    },
    [data, persist]
  );

  const setGaugeNote = useCallback(
    (areaId, note) => {
      persist({
        ...data,
        dashboardNotes: { ...data.dashboardNotes, [areaId]: note },
      });
    },
    [data, persist]
  );

  const setWorkview = useCallback(
    (text) => persist({ ...data, workview: text }),
    [data, persist]
  );

  const setLifeview = useCallback(
    (text) => persist({ ...data, lifeview: text }),
    [data, persist]
  );

  const addAreaLogEntry = useCallback(
    (areaId, { text, source = 'manual', energy, activity, person, focus } = {}) => {
      const trimmed = text?.trim();
      if (!trimmed) return null;

      const newEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: trimmed,
        createdAt: new Date().toISOString(),
        source,
      };

      if (energy != null) newEntry.energy = energy;
      if (activity?.trim()) newEntry.activity = activity.trim();
      if (person?.trim()) newEntry.person = person.trim();
      if (focus?.trim()) newEntry.focus = focus.trim();

      persist({
        ...data,
        areaLogs: {
          ...data.areaLogs,
          [areaId]: [newEntry, ...(data.areaLogs[areaId] || [])],
        },
      });
      return newEntry;
    },
    [data, persist]
  );

  const deleteAreaLogEntry = useCallback(
    (areaId, entryId) => {
      persist({
        ...data,
        areaLogs: {
          ...data.areaLogs,
          [areaId]: (data.areaLogs[areaId] || []).filter((e) => e.id !== entryId),
        },
      });
    },
    [data, persist]
  );

  return {
    data,
    setGauge,
    setGaugeNote,
    setWorkview,
    setLifeview,
    addAreaLogEntry,
    deleteAreaLogEntry,
  };
}

export function useHealth() {
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setAiEnabled(d.aiEnabled))
      .catch(() => {});
  }, []);

  return { aiEnabled };
}
