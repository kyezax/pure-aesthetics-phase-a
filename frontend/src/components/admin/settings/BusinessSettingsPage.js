import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS } from "./adminTheme";
import { SectionCard, FormField, PrimaryButton } from "./AdminUI";
import HoursEditor from "./HoursEditor";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "CAD", "NZD"];

const BusinessSettingsPage = () => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getBusinessSettings().then(setForm).catch(() => toast.error("Failed to load business settings")).finally(() => setLoading(false));
  }, []);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = async (successMessage) => {
    setSaving(true);
    try {
      const updated = await adminApi.updateBusinessSettings(form);
      setForm(updated);
      toast.success(successMessage || "Business settings updated");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div data-testid="business-settings-page">
      <h1 className="text-[24px] font-bold mb-1" style={{ color: COLORS.textPrimary }}>Business Settings</h1>
      <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>Everything about your business, in one place.</p>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-white border" style={{ borderColor: COLORS.border }}>
          <TabsTrigger value="info">Business Info</TabsTrigger>
          <TabsTrigger value="hours">Hours & Availability</TabsTrigger>
          <TabsTrigger value="location">Location & Contact</TabsTrigger>
          <TabsTrigger value="tax">Tax & Currency</TabsTrigger>
          <TabsTrigger value="branding" disabled className="opacity-50 cursor-not-allowed">
            <Lock size={12} className="mr-1 inline" /> Branding
          </TabsTrigger>
        </TabsList>

        {/* --- Business Info --- */}
        <TabsContent value="info" className="space-y-5">
          <SectionCard title="Business Identity">
            <FormField label="Clinic Name" required helper="This appears on invoices, emails, and the booking page">
              <Input maxLength={100} value={form.business_name || ""} onChange={(e) => set({ business_name: e.target.value })} />
              <p className="text-xs text-right mt-1" style={{ color: COLORS.textSecondary }}>{(form.business_name || "").length}/100</p>
            </FormField>
            <FormField label="ABN / Registration Number" helper="Used for invoicing and tax documents">
              <Input placeholder="XX XXX XXX XXX" value={form.abn || ""} onChange={(e) => set({ abn: e.target.value })} />
            </FormField>
            <FormField label="Business Logo" helper="Paste a hosted image URL (JPG, PNG, SVG)">
              <div className="flex items-center gap-4">
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo" className="w-[80px] h-[80px] rounded-lg object-cover border" style={{ borderColor: COLORS.border }} />
                )}
                <Input placeholder="https://..." value={form.logo_url || ""} onChange={(e) => set({ logo_url: e.target.value })} />
              </div>
            </FormField>
            <FormField label="Clinic Description" helper="Appears on your booking page (max 500 characters)">
              <Textarea maxLength={500} rows={4} value={form.description || ""} onChange={(e) => set({ description: e.target.value })} />
              <p className="text-xs text-right mt-1" style={{ color: COLORS.textSecondary }}>{(form.description || "").length}/500</p>
            </FormField>
            <FormField label="Year Established">
              <Select value={form.year_established ? String(form.year_established) : ""} onValueChange={(v) => set({ year_established: parseInt(v) })}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </SectionCard>

          <SectionCard title="How to Reach You">
            <FormField label="Main Phone" helper="Shown on booking page and in booking confirmations">
              <Input value={form.business_phone || ""} onChange={(e) => set({ business_phone: e.target.value })} placeholder="(02) 1234 5678" />
            </FormField>
            <FormField label="Main Email" helper="Used for booking confirmations and important updates">
              <Input type="email" value={form.business_email || ""} onChange={(e) => set({ business_email: e.target.value })} placeholder="hello@pureaesthetics.com.au" />
            </FormField>
            <FormField label="Booking Inquiry Email" helper="Optional: where clients should send booking inquiries">
              <Input type="email" value={form.booking_email || ""} onChange={(e) => set({ booking_email: e.target.value })} placeholder="bookings@pureaesthetics.com.au" />
            </FormField>
            <FormField label="After-Hours Contact Method">
              <Select value={form.after_hours_method || "none"} onValueChange={(v) => set({ after_hours_method: v })}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone call</SelectItem>
                  <SelectItem value="sms">SMS text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="none">None - no after-hours support</SelectItem>
                </SelectContent>
              </Select>
              {form.after_hours_method && form.after_hours_method !== "none" && (
                <Input className="mt-2" placeholder="Contact value" value={form.after_hours_value || ""} onChange={(e) => set({ after_hours_value: e.target.value })} />
              )}
            </FormField>
          </SectionCard>

          <div className="flex justify-end">
            <PrimaryButton onClick={() => save()} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>
          </div>
        </TabsContent>

        {/* --- Hours --- */}
        <TabsContent value="hours">
          <HoursEditor />
        </TabsContent>

        {/* --- Location & Contact --- */}
        <TabsContent value="location" className="space-y-5">
          <SectionCard title="Address">
            <FormField label="Street Address">
              <Input value={form.street_address || ""} onChange={(e) => set({ street_address: e.target.value })} placeholder="123 High Street" />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Suburb">
                <Input value={form.suburb || ""} onChange={(e) => set({ suburb: e.target.value })} placeholder="Mandurah" />
              </FormField>
              <FormField label="State">
                <Select value={form.state || ""} onValueChange={(v) => set({ state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {AU_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Postcode">
                <Input value={form.postcode || ""} onChange={(e) => set({ postcode: e.target.value })} placeholder="6210" maxLength={4} />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm mt-2">
              <Switch checked={!!form.show_full_address} onCheckedChange={(v) => set({ show_full_address: v })} />
              Show full address on booking page
            </label>
          </SectionCard>
          <div className="flex justify-end">
            <PrimaryButton onClick={() => save()} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>
          </div>
        </TabsContent>

        {/* --- Tax & Currency --- */}
        <TabsContent value="tax" className="space-y-5">
          <SectionCard title="Currency">
            <FormField label="Currency" helper="Changing currency will not convert prices. Review all pricing after changing.">
              <Select value={form.currency || "AUD"} onValueChange={(v) => set({ currency: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </SectionCard>
          <SectionCard title="Tax Settings">
            <FormField label="Tax Rate (GST/VAT)" helper="Applied to invoices and financial reports">
              <div className="flex items-center gap-2 w-32">
                <Input type="number" value={form.tax_rate ?? 10} onChange={(e) => set({ tax_rate: parseFloat(e.target.value) })} />
                <span>%</span>
              </div>
            </FormField>
            <FormField label="Tax ID (ABN/ACN)">
              <Input disabled value={form.abn || "Not set"} />
            </FormField>
            <FormField label="Tax Inclusive or Exclusive Pricing" helper="Affects how prices display on booking page and to clients">
              <RadioGroup value={form.tax_inclusive ? "inclusive" : "exclusive"} onValueChange={(v) => set({ tax_inclusive: v === "inclusive" })}>
                <label className="flex items-center gap-2 text-sm mb-2">
                  <RadioGroupItem value="inclusive" /> Prices shown are tax-inclusive ({form.tax_rate || 10}% GST included)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="exclusive" /> Prices shown are tax-exclusive ({form.tax_rate || 10}% GST added at checkout)
                </label>
              </RadioGroup>
            </FormField>
            <FormField label="Financial Year Start">
              <Select value={String(form.financial_year_start_month || 7)} onValueChange={(v) => set({ financial_year_start_month: parseInt(v) })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </SectionCard>
          <div className="flex justify-end">
            <PrimaryButton onClick={() => save()} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>
          </div>
        </TabsContent>

        {/* --- Branding (Phase B) --- */}
        <TabsContent value="branding">
          <SectionCard>
            <div className="text-center py-10">
              <Lock size={24} className="mx-auto mb-2" style={{ color: COLORS.textSecondary }} />
              <p className="font-medium" style={{ color: COLORS.textPrimary }}>Branding arrives in Phase B</p>
              <p className="text-sm mt-1" style={{ color: COLORS.textSecondary }}>Custom theming, fonts and brand kit management.</p>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessSettingsPage;
