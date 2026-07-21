import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS, timeAgo } from "./adminTheme";
import { SectionCard, StatusPill, PrimaryButton, FormField, EmptyState } from "./AdminUI";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const POLICY_TYPES = [
  ["cancellation", "Cancellation Policy"],
  ["no_show", "No-Show Policy"],
  ["deposit", "Deposit Policy"],
  ["refund", "Refund Policy"],
  ["terms", "Terms & Conditions"],
  ["medical_disclaimer", "Medical Disclaimer"],
  ["booking_disclaimer", "Booking Disclaimer"],
];

const PolicyEditor = ({ policyType }) => {
  const [policy, setPolicy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setPolicy(null);
    adminApi.getPolicy(policyType).then(setPolicy).catch(() => toast.error("Failed to load policy"));
  }, [policyType]);

  const set = (patch) => setPolicy((prev) => ({ ...prev, ...patch }));

  const submit = async (publishAction) => {
    setSaving(true);
    try {
      const updated = await adminApi.updatePolicy(policyType, { ...policy, publish_action: publishAction });
      setPolicy(updated);
      toast.success(
        publishAction === "publish" ? `${updated.title} is now active` :
        publishAction === "schedule" ? `${updated.title} will be published at the scheduled time` :
        "Draft saved"
      );
    } catch (e) {
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      setHistory(await adminApi.getPolicyHistory(policyType));
    } catch (e) {
      toast.error("Failed to load history");
    }
  };

  if (!policy) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <SectionCard
        title={policy.title}
        action={<div className="flex items-center gap-3"><StatusPill status={policy.status} /><button className="text-xs font-medium flex items-center gap-1" style={{ color: COLORS.secondary }} onClick={openHistory}><History size={13} /> View history</button></div>}
      >
        <FormField label="Policy content" helper="Plain text or simple formatting. Max 5000 characters.">
          <Textarea rows={10} maxLength={5000} value={policy.content || ""} onChange={(e) => set({ content: e.target.value })} />
          <p className="text-xs text-right mt-1" style={{ color: COLORS.textSecondary }}>{(policy.content || "").length}/5000</p>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <label className="flex items-center gap-2 text-sm mb-2.5">
            <Switch checked={!!policy.require_acceptance} onCheckedChange={(v) => set({ require_acceptance: v })} />
            Require clients to accept before booking
          </label>
          <label className="flex items-center gap-2 text-sm mb-2.5">
            <Switch checked={!!policy.require_signature} onCheckedChange={(v) => set({ require_signature: v })} />
            Require signature
          </label>
          <label className="flex items-center gap-2 text-sm mb-2.5">
            <Switch checked={!!policy.show_on_booking_page} onCheckedChange={(v) => set({ show_on_booking_page: v })} />
            Show on booking page
          </label>
          <label className="flex items-center gap-2 text-sm mb-2.5">
            <Switch checked={!!policy.show_in_confirmation_email} onCheckedChange={(v) => set({ show_in_confirmation_email: v })} />
            Show in booking confirmation email
          </label>
          <label className="flex items-center gap-2 text-sm mb-2.5">
            <Switch checked={!!policy.show_in_client_portal} onCheckedChange={(v) => set({ show_in_client_portal: v })} />
            Show in client portal
          </label>
          <label className="flex items-center gap-2 text-sm mb-2.5">
            <Switch checked={!!policy.show_during_checkout} onCheckedChange={(v) => set({ show_during_checkout: v })} />
            Show during checkout
          </label>
        </div>

        <FormField label="Schedule new version to take effect (optional)">
          <Input type="date" value={policy.effective_date ? policy.effective_date.slice(0, 10) : ""} onChange={(e) => set({ effective_date: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </FormField>

        <div className="flex gap-2 pt-2 flex-wrap">
          <button className="text-sm font-semibold px-4 py-2 rounded-lg border" style={{ borderColor: COLORS.border, color: COLORS.textPrimary }}
            onClick={() => submit("draft")} disabled={saving}>Save as Draft</button>
          {policy.effective_date && (
            <button className="text-sm font-semibold px-4 py-2 rounded-lg border" style={{ borderColor: COLORS.border, color: COLORS.textPrimary }}
              onClick={() => submit("schedule")} disabled={saving}>Schedule Publish</button>
          )}
          <PrimaryButton onClick={() => submit("publish")} disabled={saving}>{saving ? "Saving..." : "Publish Now"}</PrimaryButton>
        </div>
      </SectionCard>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[75vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{policy.title} — Version History</DialogTitle></DialogHeader>
          {history.length === 0 ? <EmptyState title="No previous versions" /> : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="border-b last:border-0 pb-3" style={{ borderColor: COLORS.border }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">v{h.version}</span>
                    <span className="text-xs" style={{ color: COLORS.textSecondary }}>{timeAgo(h.created_at)} &middot; {h.changed_by_name}</span>
                  </div>
                  <p className="text-xs mt-1 whitespace-pre-wrap line-clamp-3" style={{ color: COLORS.textSecondary }}>{h.content}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PoliciesPage = () => {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    adminApi.getPolicies().then((list) => {
      const map = {};
      list.forEach((p) => { map[p.policy_type] = p.status; });
      setStatuses(map);
    }).catch(() => {});
  }, []);

  return (
    <div data-testid="policies-page">
      <h1 className="text-[24px] font-bold mb-1" style={{ color: COLORS.textPrimary }}>Policies</h1>
      <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>Manage the policies clients see and agree to when booking.</p>
      <Tabs defaultValue="cancellation" className="space-y-5">
        <TabsList className="bg-white border flex-wrap h-auto" style={{ borderColor: COLORS.border }}>
          {POLICY_TYPES.map(([type, label]) => (
            <TabsTrigger key={type} value={type} className="flex items-center gap-1.5">
              {label}
              {statuses[type] && <StatusPill status={statuses[type]} />}
            </TabsTrigger>
          ))}
        </TabsList>
        {POLICY_TYPES.map(([type]) => (
          <TabsContent key={type} value={type}>
            <PolicyEditor policyType={type} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default PoliciesPage;
