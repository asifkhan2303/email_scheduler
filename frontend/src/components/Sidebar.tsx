import { useState } from "react";
import { Avatar } from "./ui/Avatar";
import { EmailKind, EmailStats, User } from "../types/email";

interface SidebarProps {
  user: User;
  stats: EmailStats;
  tab: EmailKind;
  onTabChange: (tab: EmailKind) => void;
  onCompose: () => void;
  onLogout: () => void;
}

const NAV: { key: EmailKind; label: string; icon: string }[] = [
  { key: "scheduled", label: "Scheduled", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "sent", label: "Sent", icon: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" }
];

export function Sidebar({ user, stats, tab, onTabChange, onCompose, onLogout }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-5">
      <div className="mb-6 px-2 font-pixel text-2xl tracking-wide text-ink">ONB</div>

      <div className="relative mb-5">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface"
        >
          <Avatar name={user.name} src={user.avatar} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-muted">{user.email}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0 text-ink-muted">
            <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-line bg-white py-1 shadow-lg">
            <button
              onClick={onLogout}
              className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onCompose}
        className="mb-6 w-full rounded-full border border-brand py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
      >
        Compose
      </button>

      <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Core</div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-brand-soft font-medium text-brand-dark" : "text-ink hover:bg-surface"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white text-brand-dark" : "bg-surface text-ink-muted"}`}>
                {stats[item.key]}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
