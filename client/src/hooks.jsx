import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getLocalApplications,
  saveLocalApplications,
  getLocalLabels,
  saveLocalLabels,
  ensureLocalLabels,
  getLocalMeta,
  setLocalMeta,
  clearLocalData,
  authHeaders,
  stripExamples,
  mergeApplications,
  getCareerProfile,
  saveCareerProfile,
  getLocalCareerOs,
  applyCareerOsPayload,
  registerCareerOsCloudSync,
  pauseCareerOsCloudSync,
} from './storage';
import { isClerkConfigured } from './clerk';
import {
  applyResumeImport,
  applySnapshot,
  applyReflection,
  applyGeneratedPaths,
  applyPathSelection,
  appendLearningTopicFromReflection,
  getDirectionSnapshot,
} from './careerProfile';
import { buildAssumptionsFromAnswers, buildCareerPaths } from './careerMocks';

const API = '/api';

function useGuestAuth() {
  return {
    user: null,
    isAuthenticated: false,
    authLoading: false,
    getToken: async () => null,
    signOut: async () => {},
  };
}

function useClerkAppAuth() {
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

export const useAuth = isClerkConfigured ? useClerkAppAuth : useGuestAuth;

export function useApplications() {
  const { isAuthenticated, authLoading, getToken } = useAuth();
  const [applications, setApplications] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const loadExamples = useCallback(async () => {
    const res = await fetch(`${API}/examples`);
    if (!res.ok) throw new Error('Failed to load examples');
    const data = await res.json();
    saveLocalApplications(data.applications);
    const seededLabels = ensureLocalLabels();
    setLocalMeta({ dataSource: 'examples' });
    setApplications(data.applications);
    setLabels(seededLabels);
    setDataSource('examples');
    return data.applications;
  }, []);

  const loadLocalRealApps = () => {
    const local = getLocalApplications();
    const real = local ? stripExamples(local) : [];
    if (real.length === 0) return null;
    setApplications(real);
    setLabels(ensureLocalLabels());
    setDataSource('local');
    return real;
  };

  const isStorageError = (message = '') => /postgres|database|storage|cloud accounts/i.test(message);

  const readApiError = async (res, fallback) => {
    const data = await res.json().catch(() => ({}));
    if (data?.error) return data.error;
    // Vite proxy returns 5xx HTML/empty when the API is down
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return 'API server is offline. Restart it (npm run server), then refresh.';
    }
    return fallback;
  };

  const syncToAccount = useCallback(async (apps) => {
    if (!isAuthenticated || !getToken) return null;

    const token = await getToken();
    if (!token) throw new Error('Sign-in session expired. Sign out and sign in again.');

    const localLabels = getLocalLabels() || [];
    const localCareerOs = getLocalCareerOs();
    let res;
    try {
      res = await fetch(`${API}/auth/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localApplications: stripExamples(apps),
          localLabels,
          localCareerOs,
        }),
      });
    } catch {
      throw new Error('API server is offline. Restart it (npm run server), then refresh.');
    }

    if (!res.ok) {
      throw new Error(await readApiError(res, 'Failed to sync to your account'));
    }

    const data = await res.json().catch(() => ({}));
    clearLocalData();
    setLocalMeta({ dataSource: 'account' });
    setApplications(data.applications);
    setLabels(Array.isArray(data.labels) ? data.labels : []);
    setDataSource('account');
    if (data.careerOs) {
      pauseCareerOsCloudSync(true);
      applyCareerOsPayload(data.careerOs);
      pauseCareerOsCloudSync(false);
    }
    return data.applications;
  }, [isAuthenticated, getToken]);

  const pushCareerOs = useCallback(async (payload) => {
    if (!isAuthenticated || !getToken) return null;
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(`${API}/career-os`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || getLocalCareerOs()),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save career data');
    }
    return res.json();
  }, [isAuthenticated, getToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      registerCareerOsCloudSync(null);
      return undefined;
    }
    registerCareerOsCloudSync((payload) => {
      pushCareerOs(payload).catch((error) => {
        console.warn('Career OS cloud sync failed:', error.message);
      });
    });
    return () => registerCareerOsCloudSync(null);
  }, [isAuthenticated, pushCareerOs]);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    try {
      setError(null);

      if (isAuthenticated && getToken) {
        const token = await getToken();
        if (!token) throw new Error('Failed to get sign-in token');

        const local = getLocalApplications();
        const toMigrate = local ? stripExamples(local) : [];
        const localLabels = getLocalLabels() || [];
        const localCareerOs = getLocalCareerOs();
        const hasCareerOsLocal = Boolean(
          localCareerOs.profile
          || localCareerOs.storyBank
          || Object.keys(localCareerOs.roadmapProgress || {}).length
          || (localCareerOs.practicedQuestions || []).length
          || Object.keys(localCareerOs.learningPlanStatuses || {}).length
        );

        if (toMigrate.length > 0 || localLabels.length > 0 || hasCareerOsLocal) {
          let syncRes;
          try {
            syncRes = await fetch(`${API}/auth/sync`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                localApplications: toMigrate,
                localLabels,
                localCareerOs,
              }),
            });
          } catch {
            throw new Error('API server is offline. Restart it (npm run server), then refresh.');
          }
          if (!syncRes.ok) {
            const message = await readApiError(syncRes, 'Failed to sync local data to your account');
            if (isStorageError(message)) {
              const fallback = loadLocalRealApps();
              if (fallback) {
                setError('Database unavailable — showing browser-saved data.');
                return fallback;
              }
            }
            throw new Error(message);
          }
          const syncData = await syncRes.json().catch(() => ({}));
          clearLocalData();
          setLocalMeta({ dataSource: 'account' });
          if (Array.isArray(syncData.labels)) setLabels(syncData.labels);
          if (syncData.careerOs) {
            pauseCareerOsCloudSync(true);
            applyCareerOsPayload(syncData.careerOs);
            pauseCareerOsCloudSync(false);
          }
        }

        const [appsRes, labelsRes, careerOsRes] = await Promise.all([
          fetch(`${API}/applications`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/labels`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/career-os`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!appsRes.ok) {
          const data = await appsRes.json().catch(() => ({}));
          if (isStorageError(data.error)) {
            const fallback = loadLocalRealApps();
            if (fallback) {
              setError('Database unavailable — showing browser-saved data.');
              return fallback;
            }
          }
          throw new Error(data.error || 'Failed to load your saved applications');
        }

        const data = await appsRes.json();
        if (labelsRes.ok) {
          const labelsData = await labelsRes.json();
          setLabels(Array.isArray(labelsData) ? labelsData : []);
        }
        if (careerOsRes.ok) {
          const careerOs = await careerOsRes.json().catch(() => null);
          if (careerOs) {
            pauseCareerOsCloudSync(true);
            applyCareerOsPayload(careerOs);
            pauseCareerOsCloudSync(false);
          }
        }

        const remainingLocal = getLocalApplications();
        const localReal = remainingLocal ? stripExamples(remainingLocal) : [];

        if (localReal.length > data.length) {
          const synced = await syncToAccount(localReal);
          if (synced) return synced;
        }

        setApplications(data);
        setDataSource('account');
        return data;
      }

      const local = getLocalApplications();
      const meta = getLocalMeta();
      setLabels(ensureLocalLabels());

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
  }, [authLoading, isAuthenticated, getToken, loadExamples, syncToAccount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persistLocal = (apps) => {
    saveLocalApplications(apps);
    setLocalMeta({ dataSource: apps.length ? 'local' : 'empty' });
    setDataSource(apps.length ? 'local' : 'empty');
    setApplications(apps);
  };

  const persistLocalLabels = (nextLabels) => {
    saveLocalLabels(nextLabels);
    setLabels(nextLabels);
  };

  const submitVoiceDump = async (transcript) => {
    const existing = stripExamples(applications);

    if (isAuthenticated && getToken) {
      const token = await getToken();
      if (!token) {
        throw new Error('Sign-in session expired. Sign out and sign in again, then retry.');
      }
    }

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

    if (isAuthenticated) {
      if (data.persisted) {
        setApplications(mergedApps);
        setDataSource('account');
      } else if (!data.authDetected) {
        persistLocal(mergedApps);
        throw new Error('Server did not detect your sign-in. Data saved in this browser only.');
      } else {
        try {
          await syncToAccount(mergedApps);
        } catch (error) {
          persistLocal(mergedApps);
          throw new Error(
            data.storageWarning
              ? `${data.storageWarning} Data saved in this browser only.`
              : error.message
          );
        }
      }
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

  const createLabel = async (name) => {
    const trimmed = name?.trim();
    if (!trimmed) throw new Error('Label name is required');

    if (isAuthenticated) {
      const res = await fetch(`${API}/labels`, {
        method: 'POST',
        headers: await authHeaders(getToken),
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create label');
      setLabels((prev) => [...prev, data]);
      return data;
    }

    const now = new Date().toISOString();
    const label = {
      id: `label-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    persistLocalLabels([...labels, label]);
    return label;
  };

  const updateLabel = async (id, name) => {
    const trimmed = name?.trim();
    if (!trimmed) throw new Error('Label name is required');

    if (isAuthenticated) {
      const res = await fetch(`${API}/labels/${id}`, {
        method: 'PUT',
        headers: await authHeaders(getToken),
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update label');
      setLabels((prev) => prev.map((l) => (l.id === id ? data : l)));
      return data;
    }

    const next = labels.map((l) =>
      l.id === id ? { ...l, name: trimmed, updatedAt: new Date().toISOString() } : l
    );
    persistLocalLabels(next);
    return next.find((l) => l.id === id);
  };

  const deleteLabel = async (id) => {
    if (isAuthenticated) {
      const res = await fetch(`${API}/labels/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(getToken),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete label');
      }
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setApplications((prev) =>
        prev.map((app) => ({
          ...app,
          labelIds: (app.labelIds || []).filter((labelId) => labelId !== id),
        }))
      );
      return;
    }

    persistLocalLabels(labels.filter((l) => l.id !== id));
    const nextApps = applications.map((app) => ({
      ...app,
      labelIds: (app.labelIds || []).filter((labelId) => labelId !== id),
    }));
    persistLocal(nextApps);
  };

  const clearExamples = async () => {
    if (isAuthenticated) return;
    clearLocalData();
    setApplications([]);
    setLabels(ensureLocalLabels());
    setDataSource('empty');
  };

  const resetToExamples = async () => {
    if (isAuthenticated) return;
    await loadExamples();
  };

  const applySyncedApplications = (apps) => {
    if (!Array.isArray(apps)) return;
    // Merge with whatever is already on screen so calendar sync cannot replace the pipeline.
    setApplications((prev) => mergeApplications(prev, apps));
    setDataSource(isAuthenticated ? 'account' : 'local');
    if (!isAuthenticated) {
      const merged = mergeApplications(getLocalApplications() || [], apps);
      saveLocalApplications(merged);
      setLocalMeta({ dataSource: merged.length ? 'local' : 'empty' });
    }
  };

  return {
    applications,
    labels,
    loading: loading || authLoading,
    error,
    dataSource,
    refresh,
    submitVoiceDump,
    updateApplication,
    createLabel,
    updateLabel,
    deleteLabel,
    clearExamples,
    resetToExamples,
    syncToAccount,
    applySyncedApplications,
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

export function useCareerProfile() {
  const [profile, setProfile] = useState(() => getCareerProfile());

  const commit = useCallback((next) => {
    const saved = saveCareerProfile(next);
    setProfile(saved);
    return saved;
  }, []);

  const refreshProfile = useCallback(() => {
    const latest = getCareerProfile();
    setProfile(latest);
    return latest;
  }, []);

  useEffect(() => {
    const onSync = () => refreshProfile();
    window.addEventListener('career-os-synced', onSync);
    return () => window.removeEventListener('career-os-synced', onSync);
  }, [refreshProfile]);

  const importResume = useCallback((payload) => {
    return commit(applyResumeImport(getCareerProfile(), payload));
  }, [commit]);

  const updateSnapshot = useCallback((snapshot) => {
    return commit(applySnapshot(getCareerProfile(), snapshot));
  }, [commit]);

  const updateReflection = useCallback((answers, { complete = false } = {}) => {
    return commit(applyReflection(getCareerProfile(), { answers, complete }));
  }, [commit]);

  const generatePaths = useCallback(async (overrides = {}) => {
    const current = getCareerProfile();
    const assumptions = overrides.assumptions
      || current.assumptions
      || buildAssumptionsFromAnswers(current.reflection, current.snapshot);
    const reflection = overrides.answers || current.reflection || {};

    if (overrides.paths) {
      return commit(applyGeneratedPaths(current, { paths: overrides.paths, assumptions }));
    }

    let paths = null;
    let recommendMode = 'heuristic';

    try {
      const res = await fetch('/api/career/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: current.snapshot,
          reflection,
          assumptions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.paths) && data.paths.length > 0) {
          paths = data.paths;
          recommendMode = data.mode || 'llm';
        }
      }
    } catch (error) {
      console.warn('Career recommend API unavailable, using local ranking:', error.message);
    }

    if (!paths) {
      paths = buildCareerPaths(current.snapshot, assumptions, { answers: reflection });
      recommendMode = 'heuristic';
    }

    const saved = commit(applyGeneratedPaths(current, { paths, assumptions }));
    return { ...saved, recommendMode };
  }, [commit]);

  const selectPaths = useCallback(({ primaryPathId, secondaryPathId }) => {
    return commit(applyPathSelection(getCareerProfile(), { primaryPathId, secondaryPathId }));
  }, [commit]);

  const updateAssumptions = useCallback((assumptions) => {
    const current = getCareerProfile();
    return commit({
      ...current,
      assumptions,
      updatedAt: new Date().toISOString(),
    });
  }, [commit]);

  const addLearningFromReflection = useCallback((payload) => {
    return commit(appendLearningTopicFromReflection(getCareerProfile(), payload));
  }, [commit]);

  const direction = useMemo(() => getDirectionSnapshot(profile), [profile]);

  return {
    profile,
    direction,
    workflow: profile.workflow,
    refreshProfile,
    importResume,
    updateSnapshot,
    updateReflection,
    generatePaths,
    selectPaths,
    updateAssumptions,
    addLearningFromReflection,
    setProfile: commit,
  };
}
