"use client";

export type NavItemId = "home" | "create" | "banners" | "templates" | "help";

interface NavItem {
  id: NavItemId;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "create", label: "Create", icon: "➕" },
  { id: "banners", label: "Banners", icon: "📁" },
  { id: "templates", label: "Templates", icon: "🎨" },
  { id: "help", label: "Help", icon: "❓" },
];

interface LeftSidebarProps {
  activeId: NavItemId;
  onNavChange: (id: NavItemId) => void;
}

export default function LeftSidebar({ activeId, onNavChange }: LeftSidebarProps) {
  return (
    <div className="w-20 bg-[#2a2a2a] border-r border-[#3a3a3a] flex flex-col items-center py-4 gap-2">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavChange(item.id)}
          className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${
            activeId === item.id
              ? "bg-[#3a3a3a] text-white"
              : "text-gray-400 hover:bg-[#3a3a3a] hover:text-white"
          }`}
          title={item.label}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
