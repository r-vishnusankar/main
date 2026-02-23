"use client";

interface TopNavProps {
  onToggleRecent?: () => void;
  recentOpen?: boolean;
}

export default function TopNav({ onToggleRecent, recentOpen }: TopNavProps) {
  return (
    <header
      className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.06]"
      style={{
        background: "var(--topbar-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* Left: Logo + nav links */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 select-none">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--gradient-btn)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight leading-none">
            Creator<span className="text-gradient font-black">AI</span>
          </span>
        </div>

        {/* Nav pills */}
        <nav className="hidden md:flex items-center gap-0.5">
          {["Create", "Templates", "Help"].map((item) => (
            <button
              key={item}
              type="button"
              className="px-3 py-1.5 text-[13px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          type="button"
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.07] transition-colors"
          aria-label="Search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.07] transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Recent banners toggle */}
        {onToggleRecent && (
          <button
            type="button"
            onClick={onToggleRecent}
            aria-label={recentOpen ? "Hide recent banners" : "Show recent banners"}
            className={`p-2 rounded-lg transition-colors ${
              recentOpen
                ? "text-[var(--accent)] bg-[var(--accent)]/10"
                : "text-gray-500 hover:text-white hover:bg-white/[0.07]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Upgrade pill */}
        <button type="button" className="btn-upgrade ml-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
          </svg>
          Upgrade
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-bold ml-1 flex-shrink-0"
          style={{ background: "var(--gradient-btn)" }}>
          U
        </div>
      </div>
    </header>
  );
}
