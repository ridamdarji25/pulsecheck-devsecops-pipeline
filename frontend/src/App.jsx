// App.jsx — Root component for PulseCheck
//
// State managed here:
//   services       — built-in service statuses from /api/status
//   customServices — statuses for user-added applications (from /api/ping)
//   customApps     — the user's list of { name, url } (persisted in localStorage)
//   isLoading      — true only before first successful fetch
//   error          — last API error (shown in StatusGrid)
//   lastUpdated    — Date of last successful poll
//   modalOpen      — whether the Add Service modal is visible
//
// WHY localStorage for custom apps?
//   Keeps the backend stateless — no DB needed for a dashboard of this scope.
//   localStorage survives page refreshes and browser restarts. If we later
//   want multi-device sync, replacing this with a backend store is easy
//   without touching any other component.

import { useState, useEffect, useCallback } from 'react';
import { fetchStatus, pingCustomService } from './api';
import TopBar from './components/TopBar';
import HeroSection from './components/HeroSection';
import StatusGrid from './components/StatusGrid';
import AddAppModal from './components/AddAppModal';

const POLL_INTERVAL_MS = 15_000;
const STORAGE_KEY = 'pulsecheck_custom_apps'; // localStorage key

// Read persisted custom apps on module load (safe: returns [] on first run).
function loadStoredApps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [services,        setServices]        = useState([]);
  const [customApps,      setCustomApps]      = useState(loadStoredApps); // { name, url }[]
  const [customServices,  setCustomServices]  = useState([]);              // { name, url, status, latencyMs }[]
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState(null);
  const [lastUpdated,     setLastUpdated]     = useState(null);
  const [modalOpen,       setModalOpen]       = useState(false);

  // ── Built-in polling ───────────────────────────────────────────────────────
  const loadStatuses = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setServices(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
    const id = setInterval(loadStatuses, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadStatuses]);

  // ── Custom apps polling ────────────────────────────────────────────────────
  // When `customApps` changes (add/remove), re-poll immediately.
  // Also runs on the same 15 s interval.
  const loadCustomStatuses = useCallback(async (apps) => {
    if (!apps.length) { setCustomServices([]); return; }
    const results = await Promise.allSettled(
      apps.map(app => pingCustomService(app.name, app.url))
    );
    const statuses = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { name: apps[i].name, url: apps[i].url, status: 'down', latencyMs: 0 }
    );
    setCustomServices(statuses);
  }, []);

  useEffect(() => {
    loadCustomStatuses(customApps);
    const id = setInterval(() => loadCustomStatuses(customApps), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [customApps, loadCustomStatuses]);

  // ── Custom apps CRUD ───────────────────────────────────────────────────────

  /**
   * handleAddApp — called by AddAppModal on form submit.
   *
   * We ping the URL once immediately (to show the user a result right away)
   * then persist it so it joins the polling cycle.
   */
  const handleAddApp = useCallback(async (name, url) => {
    // Prevent duplicate names.
    const exists = customApps.some(
      a => a.name.toLowerCase() === name.toLowerCase() || a.url === url
    );
    if (exists) throw new Error(`"${name}" is already being monitored.`);

    // Ping once to validate the URL is reachable (shows meaningful error in modal).
    const status = await pingCustomService(name, url);
    // status.status may be 'down' (unreachable) — we still add it so the user
    // can see the outage, but we don't throw.

    const updated = [...customApps, { name, url }];
    setCustomApps(updated);
    setCustomServices(prev => [...prev, status]);
    // Persist to localStorage.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [customApps]);

  /**
   * handleRemoveApp — removes a custom app by name.
   */
  const handleRemoveApp = useCallback((name) => {
    const updated = customApps.filter(a => a.name !== name);
    setCustomApps(updated);
    setCustomServices(prev => prev.filter(s => s.name !== name));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [customApps]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const allServices = [...services, ...customServices];

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', backgroundColor: '#eef0eb' }}>

      <TopBar onAddApp={() => setModalOpen(true)} />

      <main>
        <HeroSection
          services={allServices}
          lastUpdated={lastUpdated}
          isLoading={isLoading}
        />

        <StatusGrid
          services={services}
          customServices={customServices}
          isLoading={isLoading}
          error={error}
          onRemoveCustom={handleRemoveApp}
        />
      </main>

      {/* Footer — Krowd-style minimal */}
      <footer style={{
        borderTop: '1px solid #e2e4dd',
        backgroundColor: '#ffffff',
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '100%',
      }}>
        <span style={{ fontSize: '0.78rem', color: '#8d9086', fontWeight: 500 }}>
          <strong style={{ color: '#1a1a1a', fontWeight: 800 }}>PulseCheck</strong>
          &ensp;·&ensp; Live Service Status Monitoring
        </span>
        <span style={{ fontSize: '0.72rem', color: '#8d9086' }}>
          Auto-refreshes every 15 s
        </span>
      </footer>

      {/* Add Service modal */}
      <AddAppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddApp}
      />
    </div>
  );
}
