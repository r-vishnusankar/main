"use client";

export type NavItemId = "home" | "create" | "banners" | "gallery" | "templates" | "content-publish" | "help";

interface NavItem {
  id: NavItemId;
  label: string;
  icon: React.ReactNode;
}

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24Z" />
      <path d="M5 3v4M19 17v4M3 5h4M17 19h4" />
    </svg>
  );
}


function IconFolder() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconGallery() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconLayout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: <IconHome /> },
  { id: "create", label: "Create", icon: <IconSparkles /> },
  { id: "templates", label: "Templates", icon: <IconLayout /> },
  { id: "banners", label: "Banners", icon: <IconFolder /> },
  { id: "gallery", label: "Gallery", icon: <IconGallery /> },
  { id: "content-publish", label: "Publish", icon: <IconSend /> },
  { id: "help", label: "Help", icon: <IconHelp /> },
];

interface LeftSidebarProps {
  activeId: NavItemId;
  onNavChange: (id: NavItemId) => void;
}

export default function LeftSidebar({ activeId, onNavChange }: LeftSidebarProps) {
  return (
    <nav
      className="flex-shrink-0 flex flex-col items-center py-3 gap-0.5 border-r border-white/[0.06]"
      style={{
        width: "var(--left-panel-width)",
        background: "var(--panel-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            title={item.label}
            className={`
              relative w-14 h-[52px] rounded-xl flex flex-col items-center justify-center gap-1
              transition-all duration-150 ease-out select-none
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent
              ${isActive
                ? "text-white"
                : "text-gray-500 hover:text-gray-200 active:scale-95"
              }
            `}
          >
            {isActive && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r-full bg-[var(--accent)]"
                aria-hidden="true"
              />
            )}
            <span
              className={`
                flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150
                ${isActive
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "hover:bg-white/[0.07]"
                }
              `}
            >
              {item.icon}
            </span>
            <span className={`text-[10px] font-medium leading-none tracking-wide ${isActive ? "text-[var(--accent)]" : "text-gray-500"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
