import React from "react";
import { Settings, HelpCircle } from "lucide-react";
import { COLORS } from "./adminTheme";
import { SectionCard } from "./AdminUI";

export const AdminSettingsPlaceholder = () => (
  <div data-testid="admin-settings-placeholder">
    <h1 className="text-[24px] font-bold mb-1" style={{ color: COLORS.textPrimary }}>Admin Settings</h1>
    <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>User accounts, roles and system-level configuration.</p>
    <SectionCard>
      <div className="text-center py-14">
        <Settings size={26} className="mx-auto mb-2" style={{ color: COLORS.textSecondary }} />
        <p className="font-medium" style={{ color: COLORS.textPrimary }}>Admin user management is coming soon</p>
        <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>Staff accounts, roles and permissions will be managed here in a future phase.</p>
      </div>
    </SectionCard>
  </div>
);

export const HelpPlaceholder = () => (
  <div data-testid="admin-help-placeholder">
    <h1 className="text-[24px] font-bold mb-1" style={{ color: COLORS.textPrimary }}>Help</h1>
    <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>Guides and support for the business settings backend.</p>
    <SectionCard>
      <div className="text-center py-14">
        <HelpCircle size={26} className="mx-auto mb-2" style={{ color: COLORS.textSecondary }} />
        <p className="font-medium" style={{ color: COLORS.textPrimary }}>Need a hand?</p>
        <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>Reach out to your Pure Aesthetics support contact for help with any admin setting.</p>
      </div>
    </SectionCard>
  </div>
);
