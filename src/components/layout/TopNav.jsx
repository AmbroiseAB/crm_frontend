import { NavLink, useNavigate } from "react-router-dom";
import { Search, Bell, Menu, ChevronDown, User, LogOut, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Avatar,
  IconButton,
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "../ui";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { useNotifications } from "../../context/NotificationContext";

const displayNotificationText = (value) => typeof value === "string" ? value.replace(/\$/g, "FCFA ") : value;

/* Centered text links — a subset of the primary nav, rendered in a white pill
   exactly like the reference top bar. */
const LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/leads", label: "Leads" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/contacts", label: "Contacts" },
  { to: "/tasks", label: "Follow-ups" },
  { to: "/action-center", label: "Action Center" },
];

export function TopNav({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, deleteNotification, clearNotifications } = useNotifications();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/leads?search=${encodeURIComponent(query)}` : "/leads");
  };

  return (
    <header className="flex items-center gap-3">
      {/* Brand */}
      <div className="flex items-center gap-2.5 pr-2">
        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="hidden font-display text-lg font-bold text-ink sm:block">
          INFONOVA CRM
        </span>
      </div>

      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="rounded-xl p-2 text-ink-soft hover:bg-surface-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Centered nav pill */}
      <nav className="mx-auto hidden items-center gap-1 rounded-full bg-surface p-1.5 shadow-[var(--shadow-soft)] lg:flex">
        {LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "rounded-full px-5 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-surface-muted text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <form onSubmit={submitSearch} className="relative hidden w-40 sm:block md:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leads..."
            aria-label="Search leads"
            className="h-10 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/70 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </form>
        <Dropdown
          className="w-[min(22rem,calc(100vw-2rem))]"
          trigger={
            <IconButton aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`} className="relative">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-surface" />
              )}
            </IconButton>
          }
        >
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Notifications</p>
            {notifications.length > 0 && (
              <button onClick={clearNotifications} className="text-xs font-medium text-brand-700 hover:text-brand-800">
                Clear all
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-soft">No saved notifications</p>
          ) : (
            <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={cn(
                    "w-full border-t border-line px-3 py-3 text-left transition hover:bg-surface-muted",
                    !notification.read && "bg-brand-50/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <button type="button" onClick={() => markAsRead(notification._id)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-semibold text-ink">{displayNotificationText(notification.title)}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{displayNotificationText(notification.message)}</p>
                      {notification.details && (
                        <p className="mt-1.5 text-xs font-medium text-brand-700">{displayNotificationText(notification.details)}</p>
                      )}
                      <p className="mt-1 text-[11px] text-ink-soft/70">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </button>
                    <button type="button" aria-label="Delete notification" onClick={() => deleteNotification(notification._id)} className="shrink-0 rounded-lg p-1 text-ink-soft hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Dropdown>

        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 transition hover:bg-surface-muted">
              <Avatar name={user?.name} size="sm" />
              <ChevronDown className="h-4 w-4 text-ink-soft" />
            </button>
          }
        >
          <DropdownLabel>{user?.email}</DropdownLabel>
          <DropdownSeparator />
          <DropdownItem onClick={() => navigate("/settings")}>
            <User className="h-4 w-4" /> Profile & settings
          </DropdownItem>
          <DropdownItem danger onClick={logout}>
            <LogOut className="h-4 w-4" /> Log out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
