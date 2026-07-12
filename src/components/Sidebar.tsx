"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  userName: string;
  onChatClick: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", section: "Overview" },
  { label: "Reports", href: "/dashboard/reports", section: "Health" },
  { label: "AI Analysis", href: "/dashboard/analysis", section: "Health" },
  { label: "AI Chat", href: "#chat", section: "Health" },
  { label: "Reminders", href: "/dashboard/reminders", section: "Tools" },
  { label: "Settings", href: "#", section: "Tools" },
];

export default function Sidebar({ userName, onChatClick }: SidebarProps) {
  const pathname = usePathname();

  const sections = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">VitalTrack</div>

      <nav className="sidebar-nav">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="sidebar-section">
            <span className="sidebar-section-label">{section}</span>
            {items.map((item) =>
              item.href === "#chat" ? (
                <button key={item.label} className="sidebar-link" onClick={onChatClick}>
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? "active" : ""} ${item.href === "#" ? "disabled" : ""}`}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{userName.charAt(0).toUpperCase()}</div>
        <div>
          <div className="sidebar-user-name">{userName}</div>
          <div className="sidebar-user-role">Patient</div>
        </div>
      </div>
    </aside>
  );
}