import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home, Building2, Briefcase, Layers, DollarSign, FileText,
  Megaphone, ClipboardList, Zap, Sparkles, Settings, History,
  HelpCircle, Menu, X, CalendarClock,
} from "lucide-react";
import { COLORS } from "./adminTheme";

const MAIN_ITEMS = [
  { to: "/admin", end: true, label: "Dashboard", icon: Home },
  { to: "/admin/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/admin/business-settings", label: "Business Settings", icon: Building2 },
  { to: "/admin/services", label: "Services", icon: Briefcase },
  { to: "/admin/categories", label: "Service Categories", icon: Layers },
  { to: "/admin/pricing", label: "Pricing & Deposits", icon: DollarSign },
  { to: "/admin/policies", label: "Policies", icon: FileText },
];

const LATER_ITEMS = [
  { label: "Marketing", icon: Megaphone },
  { label: "Forms", icon: ClipboardList },
  { label: "Automations", icon: Zap },
  { label: "AI Assistant", icon: Sparkles },
];

const SYSTEM_ITEMS = [
  { to: "/admin/admin-settings", label: "Admin Settings", icon: Settings },
  { to: "/admin/change-log", label: "Change Log", icon: History },
  { to: "/admin/help", label: "Help", icon: HelpCircle },
];

const BREADCRUMB_LABELS = {
  "": "Dashboard",
  appointments: "Appointments",
  "business-settings": "Business Settings",
  services: "Services",
  categories: "Service Categories",
  pricing: "Pricing & Deposits",
  policies: "Policies",
  "admin-settings": "Admin Settings",
  "change-log": "Change Log",
  help: "Help",
  new: "New",
};

const NavItem = ({ to, end, label, icon: Icon, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-[3px] ${
        isActive ? "" : "border-transparent hover:bg-black/[0.03]"
      }`
    }
    style={({ isActive }) => ({
      color: isActive ? COLORS.secondary : COLORS.textPrimary,
      backgroundColor: isActive ? `${COLORS.primary}33` : "transparent",
      borderLeftColor: isActive ? COLORS.secondary : "transparent",
    })}
  >
    <Icon size={17} />
    <span>{label}</span>
  </NavLink>
);

const SidebarContent = ({ onNavigate }) => (
  <div className="flex flex-col h-full py-6 px-3">
    <div className="px-3 mb-6">
      <p className="text-xs font-semibold tracking-wider" style={{ color: COLORS.textSecondary }}>
        PURE AESTHETICS
      </p>
      <p className="text-sm font-semibold" style={{ color: COLORS.secondary }}>
        Business Settings
      </p>
    </div>

    <div className="mb-6">
      <p className="px-3 text-[11px] font-semibold tracking-wider mb-2" style={{ color: COLORS.textSecondary }}>
        MAIN
      </p>
      <div className="space-y-1">
        {MAIN_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNavigate} />
        ))}
      </div>
    </div>

    <div className="mb-6">
      <p className="px-3 text-[11px] font-semibold tracking-wider mb-2" style={{ color: COLORS.textSecondary }}>
        LATER PHASES
      </p>
      <div className="space-y-1">
        {LATER_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm cursor-not-allowed opacity-50"
            style={{ color: COLORS.textSecondary }}
            title="Coming soon"
          >
            <span className="flex items-center gap-3">
              <item.icon size={17} />
              {item.label}
            </span>
            <span className="text-[10px] border rounded-full px-1.5 py-0.5" style={{ borderColor: COLORS.border }}>
              Soon
            </span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-auto">
      <p className="px-3 text-[11px] font-semibold tracking-wider mb-2" style={{ color: COLORS.textSecondary }}>
        SYSTEM
      </p>
      <div className="space-y-1">
        {SYSTEM_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNavigate} />
        ))}
      </div>
    </div>
  </div>
);

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const segments = location.pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbLabel = BREADCRUMB_LABELS[segments[0] || ""] || segments[0];
  const isServiceDetail = segments[0] === "services" && segments[1];

  return (
    <div className="min-h-[calc(100vh-5rem)]" style={{ backgroundColor: COLORS.bg }} data-testid="admin-layout">
      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-30"
        style={{ borderColor: COLORS.border }}
      >
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <span className="font-semibold text-sm" style={{ color: COLORS.secondary }}>
          Admin &middot; {crumbLabel}
        </span>
        <div className="w-6" />
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-[260px] bg-white h-full shadow-xl overflow-y-auto">
            <div className="flex justify-end p-3">
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex max-w-[1400px] mx-auto">
        {/* Desktop sidebar */}
        <aside
          className="hidden md:block w-[220px] shrink-0 border-r bg-white sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto"
          style={{ borderColor: COLORS.border }}
        >
          <SidebarContent />
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-6 py-6">
          <div className="text-xs mb-4" style={{ color: COLORS.textSecondary }}>
            Admin{" "}
            {segments.length > 0 && (
              <>
                <span className="mx-1">&rsaquo;</span>
                <span style={{ color: COLORS.textPrimary }}>{crumbLabel}</span>
              </>
            )}
            {isServiceDetail && (
              <>
                <span className="mx-1">&rsaquo;</span>
                <span style={{ color: COLORS.textPrimary }}>
                  {segments[1] === "new" ? "New Service" : "Edit Service"}
                </span>
              </>
            )}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
