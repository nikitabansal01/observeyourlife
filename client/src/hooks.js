import { useState, useEffect, useCallback } from 'react';

const API = '/api';

export function useApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API}/applications`);
      if (!res.ok) throw new Error('Failed to load applications');
      setApplications(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitVoiceDump = async (transcript) => {
    const res = await fetch(`${API}/voice-dump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) throw new Error('Failed to process voice dump');
    const data = await res.json();
    setApplications(data.applications);
    return data;
  };

  const updateApplication = async (id, updates) => {
    const res = await fetch(`${API}/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update application');
    const updated = await res.json();
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  };

  return { applications, loading, error, refresh, submitVoiceDump, updateApplication };
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
