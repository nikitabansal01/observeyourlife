import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useState, useEffect, useCallback } from 'react';
import {
  getLocalApplications,
  saveLocalApplications,
  getLocalMeta,
  setLocalMeta,
  clearLocalData,
  authHeaders,
  getLocalLifeDesign,
  saveLocalLifeDesign,
  stripExamples,
  mergeApplications,
} from './storage';
import { DEFAULT_LIFE_DESIGN, normalizeLifeDesign } from './lifeDesign';

const API = '/api';

export function useAuth() {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const user = clerkUser
    ? {
        id: clerkUser.id,
        email:
          clerkUser.primaryEmailAddress?.emailAddress
          || clerkUser.emailAddresses?.[0]?.emailAddress
          || '',
      }
    : null;

  return {
    user,
    isAuthenticated: Boolean(isSignedIn),
    authLoading: !isLoaded,
    getToken,
    signOut,
  };
}

export function useApplications() {
  const { isAuthenticated, authLoading, getToken } = useAuth();
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

  const loadLocalRealApps = () => {
    const local = getLocalApplications();
    const real = local ? stripExamples(local) : [];
    if (real.length === 0) return null;
    setApplications(real);
    setDataSource('local');
    return real;
  };

  const isStorageError = (message = '') => /postgres|database|storage|cloud accounts/i.test(message);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    try {
      setError(null);

      if (isAuthenticated && getToken) {
        const token = await getToken();
        if (!token) throw new Error('Failed to get sign-in token');

        const local = getLocalApplications();
        const toMigrate = local ? stripExamples(local) : [];

        if (toMigrate.length > 0) {
          const syncRes = await fetch(`${API}/auth/sync`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ localApplications: toMigrate }),
          });
          if (!syncRes.ok) {
            const data = await syncRes.json().catch(() => ({}));
            if (isStorageError(data.error)) {
              const fallback = loadLocalRealApps();
              if (fallback) {
                setError('Database unavailable — showing browser-saved data.');
                return fallback;
              }
            }
            throw new Error(data.error || 'Failed to sync local data to your account');
          }
          clearLocalData();
          setLocalMeta({ dataSource: 'account' });
        }

        const res = await fetch(`${API}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (isStorageError(data.error)) {
            const fallback = loadLocalRealApps();
            if (fallback) {
              setError('Database unavailable — showing browser-saved data.');
              return fallback;
            }
          }
          throw new Error(data.error || 'Failed to load your saved applications');
        }
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
  }, [authLoading, isAuthenticated, getToken, loadExamples]);

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
    const existing = stripExamples(applications);

    const res = await fetch(`${API}/voice-dump`, {
      method: 'POST',
      headers: await authHeaders(getToken),
      body: JSON.stringify({ transcript, existingApplications: existing }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to process voice dump');

    const serverApps = stripExamples(data.applications || []);
    const mergedApps = mergeApplications(existing, serverApps);

    if (mergedApps.length === 0) {
      throw new Error('No companies were extracted from your voice dump. Try naming each company clearly.');
    }

    if (isAuthenticated && data.persisted) {
      setApplications(mergedApps);
      setDataSource('account');
    } else {
      persistLocal(mergedApps);
    }

    return { ...data, applications: mergedApps };
  };

  const updateApplication = async (id, updates) => {
    if (isAuthenticated) {
      const res = await fetch(`${API}/applications/${id}`, {
        method: 'PUT',
        headers: await authHeaders(getToken),
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
