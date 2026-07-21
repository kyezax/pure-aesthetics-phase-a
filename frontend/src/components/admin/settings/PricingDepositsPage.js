import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, History } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS, formatMoney, timeAgo } from "./adminTheme";
import { SectionCard, FormField, PrimaryButton, EmptyState } from "./AdminUI";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Pricing tab
// ---------------------------------------------------------------------------

const PricingTab = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [quickEdit, setQuickEdit] = useState(null);
  const [quickForm, setQuickForm] = useState({});

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ mode: "percent", value: 5, category_id: "", effective_date: "", reason: "" });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    load();
    adminApi.getCategories({}).then(setCategories).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      setServices(await adminApi.getPricing());
    } catch (e) {
      toast.error("Failed to load pricing");
    } finally {
      setLoading(false);
    }
  };

  const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const openQuickEdit = (s) => {
    setQuickEdit(s);
    setQuickForm({ new_price_cents: s.price_cents, new_sale_price_cents: s.sale_price_cents, reason: "Market adjustment", effective_date: "" });
  };

  const submitQuickEdit = async () => {
    try {
      const res = await adminApi.updatePricing(quickEdit.id, quickForm);
      toast.success(res.applied_immediately ? `Pricing updated for ${quickEdit.name}` : `Price change scheduled for ${quickEdit.name}`);
      setQuickEdit(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update pricing");
    }
  };

  const submitBulk = async () => {
    try {
      const payload = {
        category_id: bulkForm.category_id || null,
        reason: bulkForm.reason || "Bulk price update",
        effective_date: bulkForm.effective_date ? new Date(bulkForm.effective_date).toISOString() : null,
      };
      if (bulkForm.mode === "percent") payload.percent = parseFloat(bulkForm.value);
      else payload.fixed_cents = Math.round(parseFloat(bulkForm.value) * 100);
      const res = await adminApi.bulkUpdatePricing(payload);
      toast.success(res.applied_immediately ? `${res.affected.length} prices updated` : `${res.affected.length} price changes scheduled`);
      setBulkOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Bulk update failed");
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      setHistory(await adminApi.getPricingHistory());
    } catch (e) {
      toast.error("Failed to load pricing history");
    }
  };

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textSecondary }} />
          <Input className="pl-9" placeholder="Search services by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="text-sm font-medium flex items-center gap-1" style={{ color: COLORS.secondary }} onClick={openHistory}>
          <History size={15} /> View Pricing History
        </button>
        <PrimaryButton onClick={() => setBulkOpen(true)}>Bulk Update Prices</PrimaryButton>
      </div>

      <SectionCard className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No services found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>
                  <th className="p-3">Service</th><th className="p-3">Category</th><th className="p-3">Price</th>
                  <th className="p-3">Sale Price</th><th className="p-3">Deposit</th><th className="p-3">Last Changed</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0" style={{ borderColor: COLORS.border }}>
                    <td className="p-3 font-medium" style={{ color: COLORS.textPrimary }}>{s.name}</td>
                    <td className="p-3" style={{ color: COLORS.textSecondary }}>{s.category_name}</td>
                    <td className="p-3">{formatMoney(s.price_cents)}</td>
                    <td className="p-3">{s.sale_price_cents ? formatMoney(s.sale_price_cents) : "-"}</td>
                    <td className="p-3" style={{ color: COLORS.textSecondary }}>
                      {s.deposit_type === "none" || !s.deposit_type ? "None" :
                        s.deposit_type === "full" ? "Full payment" :
                        s.deposit_type === "percentage" ? `${s.deposit_value}%` : formatMoney(s.deposit_value * 100)}
                    </td>
                    <td className="p-3 text-xs" style={{ color: COLORS.textSecondary }}>{s.last_changed ? timeAgo(s.last_changed) : "-"}</td>
                    <td className="p-3">
                      <button className="text-sm font-medium" style={{ color: COLORS.secondary }} onClick={() => openQuickEdit(s)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Quick edit modal */}
      <Dialog open={!!quickEdit} onOpenChange={(v) => !v && setQuickEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update pricing: {quickEdit?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FormField label="Current Price"><Input disabled value={formatMoney(quickEdit?.price_cents)} /></FormField>
            <FormField label="New Price">
              <Input type="number" step="0.01" value={(quickForm.new_price_cents ?? 0) / 100}
                onChange={(e) => setQuickForm({ ...quickForm, new_price_cents: Math.round(parseFloat(e.target.value || 0) * 100) })} />
            </FormField>
            <FormField label="New Sale Price (optional)">
              <Input type="number" step="0.01" value={quickForm.new_sale_price_cents ? quickForm.new_sale_price_cents / 100 : ""}
                onChange={(e) => setQuickForm({ ...quickForm, new_sale_price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} />
            </FormField>
            <FormField label="Effective Date (optional)" helper="Leave blank to apply immediately">
              <Input type="date" value={quickForm.effective_date} onChange={(e) => setQuickForm({ ...quickForm, effective_date: e.target.value })} />
            </FormField>
            <FormField label="Reason for change">
              <Select value={quickForm.reason} onValueChange={(v) => setQuickForm({ ...quickForm, reason: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Market adjustment">Market adjustment</SelectItem>
                  <SelectItem value="Increased demand">Increased demand</SelectItem>
                  <SelectItem value="Cost increase">Cost increase</SelectItem>
                  <SelectItem value="Promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <DialogFooter><PrimaryButton onClick={submitQuickEdit}>Save</PrimaryButton></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk update modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Multiple Services</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <RadioGroup value={bulkForm.mode} onValueChange={(v) => setBulkForm({ ...bulkForm, mode: v })} className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="percent" /> Increase all prices by %</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="fixed" /> Increase all prices by $</label>
            </RadioGroup>
            <Input type="number" value={bulkForm.value} onChange={(e) => setBulkForm({ ...bulkForm, value: e.target.value })} />
            <FormField label="Limit to category (optional)">
              <Select value={bulkForm.category_id || "all"} onValueChange={(v) => setBulkForm({ ...bulkForm, category_id: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All active services</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Schedule for future date (optional)">
              <Input type="date" value={bulkForm.effective_date} onChange={(e) => setBulkForm({ ...bulkForm, effective_date: e.target.value })} />
            </FormField>
            <Textarea placeholder="Reason (optional)" value={bulkForm.reason} onChange={(e) => setBulkForm({ ...bulkForm, reason: e.target.value })} />
          </div>
          <DialogFooter><PrimaryButton onClick={submitBulk}>Apply Changes</PrimaryButton></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pricing Changes</DialogTitle></DialogHeader>
          {history.length === 0 ? <EmptyState title="No pricing changes yet" /> : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2" style={{ borderColor: COLORS.border }}>
                  <div>
                    <p className="font-medium" style={{ color: COLORS.textPrimary }}>{h.service_name}</p>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>{h.reason} &middot; {h.changed_by_name}</p>
                  </div>
                  <div className="text-right">
                    <p>{formatMoney(h.old_price_cents)} &rarr; {formatMoney(h.new_price_cents)}</p>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>{timeAgo(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Deposit & payment rules tab
// ---------------------------------------------------------------------------

const DepositRulesTab = () => {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getDepositRules().then(setForm).catch(() => toast.error("Failed to load deposit rules"));
  }, []);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await adminApi.updateDepositRules(form);
      setForm(updated);
      toast.success("Deposit & payment rules updated");
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5">
      <SectionCard title="Default Deposit Policy" description="Applies to all services unless overridden on the individual service.">
        <RadioGroup value={form.default_deposit_type} onValueChange={(v) => set({ default_deposit_type: v })} className="space-y-2 mb-3">
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="none" /> No deposit required</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="fixed" /> Fixed deposit $</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="percentage" /> Percentage deposit %</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="full" /> Full payment required upfront</label>
        </RadioGroup>
        {(form.default_deposit_type === "fixed" || form.default_deposit_type === "percentage") && (
          <Input className="w-32 mb-3" type="number" value={form.default_deposit_value} onChange={(e) => set({ default_deposit_value: parseFloat(e.target.value) })} />
        )}

        <label className="flex items-center gap-2 text-sm mb-2">
          <Switch checked={form.new_client_deposit_enabled} onCheckedChange={(v) => set({ new_client_deposit_enabled: v })} />
          Higher deposit for new clients
        </label>
        {form.new_client_deposit_enabled && (
          <div className="flex items-center gap-2 mb-3 pl-8">
            <Select value={form.new_client_deposit_type} onValueChange={(v) => set({ new_client_deposit_type: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="fixed">Fixed $</SelectItem><SelectItem value="percentage">Percentage %</SelectItem></SelectContent>
            </Select>
            <Input className="w-28" type="number" value={form.new_client_deposit_value} onChange={(e) => set({ new_client_deposit_value: parseFloat(e.target.value) })} />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm mb-2">
          <Switch checked={form.at_risk_deposit_enabled} onCheckedChange={(v) => set({ at_risk_deposit_enabled: v })} />
          Higher deposit for at-risk clients (2+ no-shows)
        </label>
        {form.at_risk_deposit_enabled && (
          <FormField label="No-shows threshold" className="pl-8">
            <Input className="w-24" type="number" value={form.at_risk_no_show_threshold} onChange={(e) => set({ at_risk_no_show_threshold: parseInt(e.target.value) })} />
          </FormField>
        )}

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.require_saved_card} onCheckedChange={(v) => set({ require_saved_card: v })} />
          Require saved card on file
        </label>
      </SectionCard>

      <SectionCard title="Cancellation Fees">
        <label className="flex items-center gap-2 text-sm mb-3">
          <Switch checked={form.allow_cancellations} onCheckedChange={(v) => set({ allow_cancellations: v })} />
          Allow clients to cancel bookings online
        </label>
        {form.allow_cancellations && (
          <>
            <FormField label="Cancellation deadline (hours before appointment)">
              <Input className="w-32" type="number" value={form.cancellation_deadline_hours} onChange={(e) => set({ cancellation_deadline_hours: parseInt(e.target.value) })} />
            </FormField>
            <FormField label="Fee if cancelled after deadline">
              <RadioGroup value={form.cancellation_fee_type} onValueChange={(v) => set({ cancellation_fee_type: v })} className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="none" /> No fee - full refund</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="fixed" /> Fixed amount $</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="percentage" /> Percentage of service %</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="deposit" /> Lose deposit only</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="credit" /> Service credit - no refund</label>
              </RadioGroup>
              {(form.cancellation_fee_type === "fixed" || form.cancellation_fee_type === "percentage") && (
                <Input className="w-32 mt-2" type="number" value={form.cancellation_fee_value} onChange={(e) => set({ cancellation_fee_value: parseFloat(e.target.value) })} />
              )}
            </FormField>
            <FormField label="Grace period (days, free cancellation before this)">
              <Input className="w-32" type="number" value={form.grace_period_days ?? ""} onChange={(e) => set({ grace_period_days: e.target.value ? parseInt(e.target.value) : null })} />
            </FormField>
            <label className="flex items-center gap-2 text-sm mb-2">
              <Switch checked={form.reschedule_same_as_cancel} onCheckedChange={(v) => set({ reschedule_same_as_cancel: v })} />
              Treat reschedule the same as cancellation
            </label>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.show_cancellation_policy} onCheckedChange={(v) => set({ show_cancellation_policy: v })} />
          Show cancellation policy on booking page
        </label>
      </SectionCard>

      <SectionCard title="No-Show Fees">
        <label className="flex items-center gap-2 text-sm mb-3">
          <Switch checked={form.no_show_fee_enabled} onCheckedChange={(v) => set({ no_show_fee_enabled: v })} />
          Charge no-show fee
        </label>
        {form.no_show_fee_enabled && (
          <>
            <FormField label="Fee">
              <div className="flex items-center gap-2">
                <Select value={form.no_show_fee_type} onValueChange={(v) => set({ no_show_fee_type: v })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixed">Fixed $</SelectItem><SelectItem value="percentage">Percentage %</SelectItem></SelectContent>
                </Select>
                <Input className="w-28" type="number" value={form.no_show_fee_value} onChange={(e) => set({ no_show_fee_value: parseFloat(e.target.value) })} />
              </div>
            </FormField>
            <label className="flex items-center gap-2 text-sm mb-2">
              <Switch checked={form.auto_charge_no_show} onCheckedChange={(v) => set({ auto_charge_no_show: v })} />
              Automatically charge saved card
            </label>
            <FormField label="Block online booking after this many no-shows">
              <Input className="w-24" type="number" value={form.max_no_shows_before_block} onChange={(e) => set({ max_no_shows_before_block: parseInt(e.target.value) })} />
            </FormField>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.show_no_show_policy} onCheckedChange={(v) => set({ show_no_show_policy: v })} />
          Show no-show policy on booking page
        </label>
      </SectionCard>

      <div className="flex justify-end">
        <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const PricingDepositsPage = () => (
  <div data-testid="pricing-deposits-page">
    <h1 className="text-[24px] font-bold mb-1" style={{ color: COLORS.textPrimary }}>Pricing & Deposits</h1>
    <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>Manage service pricing and clinic-wide deposit, cancellation and no-show rules.</p>
    <Tabs defaultValue="pricing" className="space-y-5">
      <TabsList className="bg-white border" style={{ borderColor: COLORS.border }}>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="deposits">Deposit Rules</TabsTrigger>
      </TabsList>
      <TabsContent value="pricing"><PricingTab /></TabsContent>
      <TabsContent value="deposits"><DepositRulesTab /></TabsContent>
    </Tabs>
  </div>
);

export default PricingDepositsPage;
