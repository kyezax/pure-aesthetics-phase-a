import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus, Layers, DollarSign, ArrowRight } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS, timeAgo } from "./adminTheme";
import { SectionCard, EmptyState } from "./AdminUI";
import LoadingSpinner from "../../ui/LoadingSpinner";

const MetricCard = ({ label, value, tone }) => (
  <div className="bg-white rounded-xl border p-5" style={{ borderColor: COLORS.border }}>
    <p className="text-sm" style={{ color: COLORS.textSecondary }}>{label}</p>
    <p className="text-[28px] font-bold mt-1" style={{ color: tone || COLORS.textPrimary }}>{value}</p>
  </div>
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const d = await adminApi.getDashboard();
      setData(d);
    } catch (e) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) return null;

  const { metrics, recent_changes, action_items, scheduled_changes } = data;
  const allClear = action_items.every((a) => a.count === 0);

  return (
    <div data-testid="admin-dashboard">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold" style={{ color: COLORS.textPrimary }}>Business Settings</h1>
        <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>
          {metrics.last_change
            ? `Last updated ${timeAgo(metrics.last_change.at)} by ${metrics.last_change.by}`
            : "No changes recorded yet"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Active services" value={metrics.total_active_services} tone={COLORS.accent} />
        <MetricCard
          label="Last change"
          value={metrics.last_change ? metrics.last_change.summary : "-"}
        />
        <MetricCard label="Pending updates" value={metrics.pending_updates} />
        <MetricCard
          label="System alerts"
          value={metrics.system_alerts}
          tone={metrics.system_alerts > 0 ? "#b45309" : COLORS.accent}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Recently Updated">
          {recent_changes.length === 0 ? (
            <EmptyState title="No changes yet" description="Edits to services, pricing and policies will show up here." />
          ) : (
            <div className="space-y-3">
              {recent_changes.map((c) => (
                <div key={c.id} className="flex items-start justify-between border-b last:border-0 pb-3" style={{ borderColor: COLORS.border }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>{c.summary}</p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>
                      {timeAgo(c.at)} &middot; By {c.by || "system"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            className="text-sm font-medium mt-3"
            style={{ color: COLORS.secondary }}
            onClick={() => navigate("/admin/change-log")}
          >
            View all changes &rarr;
          </button>
        </SectionCard>

        <SectionCard title="Things to Attend To">
          {allClear ? (
            <div className="flex items-center gap-2 py-6 justify-center" style={{ color: COLORS.accent }}>
              <CheckCircle2 size={20} />
              <span className="font-medium">All caught up</span>
            </div>
          ) : (
            <div className="space-y-2">
              {action_items.filter((a) => a.count > 0).map((item) => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.route)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-black/[0.03]"
                >
                  <span className="flex items-center gap-2 text-sm" style={{ color: COLORS.textPrimary }}>
                    <AlertTriangle size={16} className="text-amber-500" />
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: COLORS.secondary }}>{item.count}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upcoming Updates">
          {scheduled_changes.length === 0 ? (
            <EmptyState title="Nothing scheduled" description="Scheduled price changes and policy updates will appear here." />
          ) : (
            <div className="space-y-2">
              {scheduled_changes.map((s) => (
                <div key={s.id} className="text-sm border-b last:border-0 pb-2" style={{ borderColor: COLORS.border }}>
                  <p style={{ color: COLORS.textPrimary }}>{s.description}</p>
                  <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                    Effective {new Date(s.effective_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-lg border py-5 hover:shadow-sm transition-shadow"
              style={{ borderColor: COLORS.border }}
              onClick={() => navigate("/admin/services/new")}
            >
              <Plus size={20} style={{ color: COLORS.secondary }} />
              <span className="text-sm font-medium">Create Service</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-lg border py-5 hover:shadow-sm transition-shadow"
              style={{ borderColor: COLORS.border }}
              onClick={() => navigate("/admin/categories")}
            >
              <Layers size={20} style={{ color: COLORS.secondary }} />
              <span className="text-sm font-medium">Create Category</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-lg border py-5 hover:shadow-sm transition-shadow"
              style={{ borderColor: COLORS.border }}
              onClick={() => navigate("/admin/pricing")}
            >
              <DollarSign size={20} style={{ color: COLORS.secondary }} />
              <span className="text-sm font-medium">Update Pricing</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-lg border py-5 hover:shadow-sm transition-shadow"
              style={{ borderColor: COLORS.border }}
              onClick={() => navigate("/admin/services")}
            >
              <ArrowRight size={20} style={{ color: COLORS.secondary }} />
              <span className="text-sm font-medium">View All Services</span>
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
