import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { EmailList } from "../components/EmailList";
import { EmailDetailView } from "../components/EmailDetail";
import { ComposeModal } from "../components/ComposeModal";
import { api, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmailKind, EmailStats, EmailSummary } from "../types/email";

const REFRESH_MS = 15000;

export function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<EmailKind>("scheduled");
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [stats, setStats] = useState<EmailStats>({ scheduled: 0, sent: 0 });
  const [selected, setSelected] = useState<EmailSummary | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);

  // Background polls pass silent = true so they refresh data without
  // blanking the list out with the loading skeleton every time.
  const load = useCallback(async (kind: EmailKind, q: string, silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const [list, statsRes] = await Promise.all([api.emails.list(kind, { q, limit: 100 }), api.emails.stats()]);
      setEmails(list.emails);
      setStats(statsRes);
    } catch (err) {
      if (!silent) setError(errorMessage(err, "Unable to load emails"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab, debouncedQuery);
  }, [load, tab, debouncedQuery]);

  // Light polling so "Sending" -> "Sent" and new campaigns show up without a manual refresh.
  useEffect(() => {
    const timer = setInterval(() => load(tab, debouncedQuery, true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, tab, debouncedQuery]);

  useEffect(() => {
    setSelected(null);
  }, [tab]);

  const refreshAll = useCallback(() => load(tab, debouncedQuery), [load, tab, debouncedQuery]);

  const heading = useMemo(
    () => (tab === "scheduled" ? "Scheduled emails" : "Sent emails"),
    [tab]
  );

  if (!user) return null;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        user={user}
        stats={stats}
        tab={tab}
        onTabChange={setTab}
        onCompose={() => setComposeOpen(true)}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1">
        <section className={`flex min-w-0 flex-1 flex-col border-r border-line ${selected ? "hidden lg:flex" : ""}`}>
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
            <h1 className="text-lg font-semibold text-ink">{heading}</h1>

            <div className="flex items-center gap-2">
              <div className="relative">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="w-48 rounded-full bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <button onClick={refreshAll} title="Refresh" className="rounded-full p-2 text-ink-muted hover:bg-surface">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h5M20 20v-5h-5M4.6 15A8 8 0 0019.4 9M19.4 9V4M4.6 15v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {error && <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex-1 overflow-y-auto">
            <EmailList
              kind={tab}
              emails={emails}
              loading={loading}
              hasQuery={debouncedQuery.length > 0}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onCompose={() => setComposeOpen(true)}
            />
          </div>
        </section>

        {selected && (
          <section className="flex w-full min-w-0 flex-1 flex-col lg:max-w-2xl">
            <EmailDetailView summary={selected} onBack={() => setSelected(null)} onCancelled={refreshAll} />
          </section>
        )}
      </div>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} onScheduled={refreshAll} />}
    </div>
  );
}