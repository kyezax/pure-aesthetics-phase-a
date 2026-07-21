import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS, CATEGORY_COLOR_PALETTE } from "./adminTheme";
import { SectionCard, FormField, PrimaryButton } from "./AdminUI";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const TREATMENT_TAGS = [
  "Facial", "Laser", "Needling", "Peel", "Whitening", "Body", "Tattoo removal",
  "Consultation", "Add-on", "Package component", "Membership component", "Follow-up", "Review",
];

const REBOOKING_OPTIONS = ["1 week", "2 weeks", "3 weeks", "Monthly", "6 weeks", "2 months", "3 months", "6 months", "As needed", "Custom"];

const SECTIONS = [
  ["basic", "Basic Info"], ["description", "Description"], ["pricing", "Pricing"],
  ["booking", "Booking Settings"], ["staff", "Staff & Resources"], ["requirements", "Requirements"],
  ["instructions", "Instructions"], ["images", "Images"], ["status", "Status & Actions"],
];

const defaultForm = {
  name: "", category_id: "", internal_code: "", treatment_tags: [], color_code: CATEGORY_COLOR_PALETTE[0].value,
  short_description: "", long_description: "", expected_results: "", ideal_for: "", not_suitable_for: "",
  price_cents: 0, sale_price_cents: null, sale_start_date: "", sale_end_date: "",
  deposit_type: "none", deposit_value: 0, cost_cents: null, staff_cost_cents: null,
  duration_minutes: 60, buffer_before_minutes: 0, buffer_after_minutes: 0,
  online_booking_enabled: true, booking_disabled_reason: "", new_clients_only: false, existing_clients_only: false,
  min_prior_bookings: null, min_notice_days: 1, max_advance_weeks: 12, max_daily_bookings: null,
  staff_ids: [], room: "", equipment: [],
  requires_consultation_form: false, requires_consent_form: false, requires_medical_history: false,
  requires_photo_consent: false, requires_contraindication_screening: false, requires_patch_test: false,
  requires_doctor_clearance: false, min_age: null, max_age: null, block_if_incomplete: true,
  booking_instructions: "", preparation_instructions: "", aftercare_instructions: "", rebooking_interval: "",
  image_url: "", gallery_images: [], status: "active", hide_reason: "",
};

const dollars = (cents) => (cents === null || cents === undefined ? "" : (cents / 100).toFixed(2));
const toCents = (val) => (val === "" || val === null || val === undefined ? null : Math.round(parseFloat(val) * 100));

const ServiceEditorPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const isNew = !serviceId || serviceId === "new";

  const [form, setForm] = useState(defaultForm);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getCategories({ status: "active" }).then(setCategories).catch(() => {});
    axios.get("/staff").then((r) => setStaff(r.data)).catch(() => {});
    if (!isNew) {
      adminApi.getService(serviceId).then((s) => {
        setForm({
          ...defaultForm, ...s,
          treatment_tags: s.treatment_tags || [], staff_ids: s.staff_ids || [], equipment: s.equipment || [],
          gallery_images: s.gallery_images || [],
          sale_start_date: s.sale_start_date ? s.sale_start_date.slice(0, 10) : "",
          sale_end_date: s.sale_end_date ? s.sale_end_date.slice(0, 10) : "",
        });
      }).catch(() => toast.error("Failed to load service")).finally(() => setLoading(false));
    }
  }, [serviceId, isNew]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleInArray = (field, value) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const buildPayload = () => {
    const payload = { ...form };
    if (!payload.category_id) delete payload.category_id;
    ["sale_start_date", "sale_end_date"].forEach((f) => {
      payload[f] = payload[f] ? new Date(payload[f]).toISOString() : null;
    });
    return payload;
  };

  const save = async (nextStatus) => {
    if (!form.name.trim()) { toast.error("Service name is required"); return; }
    if (!form.short_description.trim()) { toast.error("Short description is required"); return; }
    if (!form.price_cents || form.price_cents <= 0) { toast.error("Price must be greater than $0"); return; }
    if (!form.duration_minutes || form.duration_minutes <= 0) { toast.error("Duration must be greater than 0"); return; }

    setSaving(true);
    const payload = buildPayload();
    if (nextStatus) payload.status = nextStatus;
    try {
      if (isNew) {
        const created = await adminApi.createService(payload);
        toast.success("Service created");
        navigate(`/admin/services/${created.id}`, { replace: true });
      } else {
        await adminApi.updateService(serviceId, payload);
        toast.success("Service updated");
        set({ status: payload.status });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (isNew) return;
    if (!window.confirm("Archive this service? It will be hidden everywhere but kept for records.")) return;
    try {
      await adminApi.archiveService(serviceId);
      toast.success("Service archived");
      navigate("/admin/services");
    } catch (e) {
      toast.error("Failed to archive service");
    }
  };

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  return (
    <div data-testid="service-editor-page" className="pb-20">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 sticky top-0 z-10 bg-[#f9f9f9] py-2 -mx-1 px-1">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: COLORS.textPrimary }}>
            {isNew ? "Create New Service" : form.name || "Edit Service"}
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="text-sm px-4 py-2" style={{ color: COLORS.textSecondary }} onClick={() => navigate("/admin/services")}>Cancel</button>
          {!isNew && (
            <button
              className="text-sm font-semibold px-4 py-2 rounded-lg border"
              style={{ color: COLORS.textPrimary, borderColor: COLORS.border }}
              onClick={() => save("hidden")}
              disabled={saving}
            >
              Save as Draft
            </button>
          )}
          <PrimaryButton onClick={() => save("active")} disabled={saving}>{saving ? "Saving..." : "Save & Publish"}</PrimaryButton>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6 sticky top-14 z-10 bg-[#f9f9f9] py-2">
        {SECTIONS.map(([key, label]) => (
          <a key={key} href={`#section-${key}`} className="text-xs px-3 py-1.5 rounded-full border hover:bg-white"
            style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>
            {label}
          </a>
        ))}
      </div>

      <div className="space-y-6">
        <section id="section-basic">
          <SectionCard title="Basic Info">
            <FormField label="Service Name" required helper="This is how clients see it on booking page">
              <Input maxLength={100} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g., Clinical Facial, Laser Genesis" />
              <p className="text-xs text-right mt-1" style={{ color: COLORS.textSecondary }}>{form.name.length}/100</p>
            </FormField>
            <FormField label="Category" required helper="Used to organize on calendar and booking page">
              <Select value={form.category_id || ""} onValueChange={(v) => set({ category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Internal Code" helper="Used for internal referencing (invoices, systems)">
              <div className="flex gap-2">
                <Input value={form.internal_code || ""} onChange={(e) => set({ internal_code: e.target.value })} placeholder="e.g., FAC-001" />
                <button type="button" className="text-xs whitespace-nowrap px-3 rounded-md border" style={{ borderColor: COLORS.border }}
                  onClick={() => set({ internal_code: `SVC-${Math.floor(1000 + Math.random() * 9000)}` })}>Generate</button>
              </div>
            </FormField>
            <FormField label="Treatment Type Tags" helper="Helps categorize for booking and recommendations">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TREATMENT_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.treatment_tags.includes(tag)} onCheckedChange={() => toggleInArray("treatment_tags", tag)} />
                    {tag}
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Calendar Display Colour">
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_PALETTE.map((c) => (
                  <button type="button" key={c.value} onClick={() => set({ color_code: c.value })}
                    className="w-8 h-8 rounded-full border-2"
                    style={{ backgroundColor: c.value, borderColor: form.color_code === c.value ? COLORS.secondary : "transparent" }} />
                ))}
              </div>
            </FormField>
          </SectionCard>
        </section>

        <section id="section-description">
          <SectionCard title="Description & Details">
            <FormField label="Short Description" required helper="Appears in booking service list and calendar (max 150 characters)">
              <Textarea maxLength={150} rows={2} value={form.short_description} onChange={(e) => set({ short_description: e.target.value })}
                placeholder="Brief, punchy description for booking page" />
              <p className="text-xs text-right mt-1" style={{ color: COLORS.textSecondary }}>{form.short_description.length}/150</p>
            </FormField>
            <FormField label="Long Description" helper="Appears on booking page service details (max 1000 characters)">
              <Textarea maxLength={1000} rows={5} value={form.long_description || ""} onChange={(e) => set({ long_description: e.target.value })}
                placeholder="Describe the treatment, benefits, ideal client, what to expect..." />
              <p className="text-xs text-right mt-1" style={{ color: COLORS.textSecondary }}>{(form.long_description || "").length}/1000</p>
            </FormField>
            <FormField label="Expected Results">
              <Textarea rows={2} value={form.expected_results || ""} onChange={(e) => set({ expected_results: e.target.value })}
                placeholder="e.g., Results typically visible after 3 sessions." />
            </FormField>
            <FormField label="Ideal For">
              <Textarea rows={2} value={form.ideal_for || ""} onChange={(e) => set({ ideal_for: e.target.value })}
                placeholder="e.g., Clients with pigmentation concerns, sun damage" />
            </FormField>
            <FormField label="Not Suitable For">
              <Textarea rows={2} value={form.not_suitable_for || ""} onChange={(e) => set({ not_suitable_for: e.target.value })}
                placeholder="e.g., Pregnant clients, recent injectables" />
            </FormField>
          </SectionCard>
        </section>

        <section id="section-pricing">
          <SectionCard title="Pricing">
            <FormField label="Service Price" required helper="Price shown to clients">
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.textSecondary }}>$</span>
                <Input className="pl-6" type="number" step="0.01" value={dollars(form.price_cents)}
                  onChange={(e) => set({ price_cents: toCents(e.target.value) || 0 })} />
              </div>
            </FormField>
            <FormField label="Sale Price (Optional)">
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.textSecondary }}>$</span>
                <Input className="pl-6" type="number" step="0.01" value={dollars(form.sale_price_cents)}
                  onChange={(e) => set({ sale_price_cents: toCents(e.target.value) })} />
              </div>
              {form.sale_price_cents > 0 && form.sale_price_cents < form.price_cents && (
                <p className="text-xs mt-1" style={{ color: COLORS.accent }}>
                  Save {dollars(form.price_cents - form.sale_price_cents)}
                </p>
              )}
              {form.sale_price_cents > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Input type="date" value={form.sale_start_date} onChange={(e) => set({ sale_start_date: e.target.value })} />
                  <Input type="date" value={form.sale_end_date} onChange={(e) => set({ sale_end_date: e.target.value })} />
                </div>
              )}
            </FormField>
            <FormField label="Deposit">
              <RadioGroup value={form.deposit_type} onValueChange={(v) => set({ deposit_type: v })} className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="none" /> No deposit</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="fixed" /> Fixed amount $</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="percentage" /> Percentage of price %</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="full" /> Require full payment upfront</label>
              </RadioGroup>
              {(form.deposit_type === "fixed" || form.deposit_type === "percentage") && (
                <Input className="w-32 mt-2" type="number" value={form.deposit_value || ""} onChange={(e) => set({ deposit_value: parseFloat(e.target.value) })} />
              )}
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Service Cost (optional)" helper="Used for profitability tracking">
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.textSecondary }}>$</span>
                  <Input className="pl-6" type="number" step="0.01" value={dollars(form.cost_cents)} onChange={(e) => set({ cost_cents: toCents(e.target.value) })} />
                </div>
              </FormField>
              <FormField label="Staff Cost (optional)">
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.textSecondary }}>$</span>
                  <Input className="pl-6" type="number" step="0.01" value={dollars(form.staff_cost_cents)} onChange={(e) => set({ staff_cost_cents: toCents(e.target.value) })} />
                </div>
              </FormField>
            </div>
          </SectionCard>
        </section>

        <section id="section-booking">
          <SectionCard title="Booking Settings">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Duration (minutes)" required>
                <Input type="number" value={form.duration_minutes} onChange={(e) => set({ duration_minutes: parseInt(e.target.value) || 0 })} />
              </FormField>
              <FormField label="Buffer Before (minutes)">
                <Input type="number" value={form.buffer_before_minutes ?? 0} onChange={(e) => set({ buffer_before_minutes: parseInt(e.target.value) || 0 })} />
              </FormField>
              <FormField label="Buffer After (minutes)">
                <Input type="number" value={form.buffer_after_minutes ?? 0} onChange={(e) => set({ buffer_after_minutes: parseInt(e.target.value) || 0 })} />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm mb-3">
              <Switch checked={form.online_booking_enabled ?? true} onCheckedChange={(v) => set({ online_booking_enabled: v })} />
              Allow online booking
            </label>
            {!(form.online_booking_enabled ?? true) && (
              <FormField label="Reason shown to clients">
                <Select value={form.booking_disabled_reason || ""} onValueChange={(v) => set({ booking_disabled_reason: v })}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Coming soon">Coming soon</SelectItem>
                    <SelectItem value="By consultation only">By consultation only</SelectItem>
                    <SelectItem value="Staff booking only">Staff booking only</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.new_clients_only} onCheckedChange={(v) => set({ new_clients_only: v })} /> New clients only</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.existing_clients_only} onCheckedChange={(v) => set({ existing_clients_only: v })} /> Existing clients only</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <FormField label="Minimum Notice (days)">
                <Input type="number" value={form.min_notice_days ?? 1} onChange={(e) => set({ min_notice_days: parseInt(e.target.value) || 0 })} />
              </FormField>
              <FormField label="Maximum Advance (weeks)">
                <Input type="number" value={form.max_advance_weeks ?? 12} onChange={(e) => set({ max_advance_weeks: parseInt(e.target.value) || 0 })} />
              </FormField>
              <FormField label="Max Bookings / Day">
                <Input type="number" value={form.max_daily_bookings ?? ""} onChange={(e) => set({ max_daily_bookings: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" />
              </FormField>
            </div>
          </SectionCard>
        </section>

        <section id="section-staff">
          <SectionCard title="Staff & Resources">
            <FormField label="Which staff can perform this service?">
              <div className="space-y-2">
                {staff.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.staff_ids.includes(m.id)} onCheckedChange={() => toggleInArray("staff_ids", m.id)} />
                    {m.first_name} {m.last_name}
                  </label>
                ))}
                {staff.length === 0 && <p className="text-sm" style={{ color: COLORS.textSecondary }}>No staff found.</p>}
              </div>
            </FormField>
            <FormField label="Room / Location Required">
              <Input value={form.room || ""} onChange={(e) => set({ room: e.target.value })} placeholder="e.g., Main Treatment Room" />
            </FormField>
            <FormField label="Equipment Required" helper="Comma-separated">
              <Input value={(form.equipment || []).join(", ")}
                onChange={(e) => set({ equipment: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="e.g., Laser Machine, Protective Eyewear" />
            </FormField>
          </SectionCard>
        </section>

        <section id="section-requirements">
          <SectionCard title="Requirements & Forms">
            {[
              ["requires_consultation_form", "Requires Consultation Form"],
              ["requires_consent_form", "Requires Treatment Consent"],
              ["requires_medical_history", "Requires Medical History"],
              ["requires_photo_consent", "Requires Photo Consent"],
              ["requires_contraindication_screening", "Requires Contraindication Screening"],
              ["requires_patch_test", "Patch Test Required"],
              ["requires_doctor_clearance", "Requires Doctor Clearance"],
            ].map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 text-sm mb-2.5">
                <Switch checked={!!form[field]} onCheckedChange={(v) => set({ [field]: v })} />
                {label}
              </label>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <FormField label="Minimum Age">
                <Input type="number" value={form.min_age ?? ""} onChange={(e) => set({ min_age: e.target.value ? parseInt(e.target.value) : null })} placeholder="No minimum" />
              </FormField>
              <FormField label="Maximum Age">
                <Input type="number" value={form.max_age ?? ""} onChange={(e) => set({ max_age: e.target.value ? parseInt(e.target.value) : null })} placeholder="No maximum" />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm mt-2">
              <Switch checked={form.block_if_incomplete ?? true} onCheckedChange={(v) => set({ block_if_incomplete: v })} />
              Prevent booking if requirements not met
            </label>
          </SectionCard>
        </section>

        <section id="section-instructions">
          <SectionCard title="Instructions & Messaging">
            <FormField label="Booking Instructions" helper="Shown to client during checkout, max 500 characters">
              <Textarea maxLength={500} rows={3} value={form.booking_instructions || ""} onChange={(e) => set({ booking_instructions: e.target.value })} />
            </FormField>
            <FormField label="Pre-Treatment Preparation">
              <Textarea rows={3} value={form.preparation_instructions || ""} onChange={(e) => set({ preparation_instructions: e.target.value })} />
            </FormField>
            <FormField label="Post-Treatment Aftercare">
              <Textarea rows={3} value={form.aftercare_instructions || ""} onChange={(e) => set({ aftercare_instructions: e.target.value })} />
            </FormField>
            <FormField label="Recommended Rebooking Interval">
              <Select value={form.rebooking_interval || ""} onValueChange={(v) => set({ rebooking_interval: v })}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Select interval" /></SelectTrigger>
                <SelectContent>
                  {REBOOKING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.rebooking_interval === "Custom" && (
                <Input className="mt-2" placeholder="e.g., 4-6 weeks" onChange={(e) => set({ rebooking_interval: e.target.value })} />
              )}
            </FormField>
          </SectionCard>
        </section>

        <section id="section-images">
          <SectionCard title="Images & Media" description="Paste hosted image URLs (recommended 1200x800px, landscape).">
            <FormField label="Service Image">
              <div className="flex items-center gap-4">
                {form.image_url && <img src={form.image_url} alt="" className="w-[120px] h-[80px] object-cover rounded-lg border" style={{ borderColor: COLORS.border }} />}
                <Input value={form.image_url || ""} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://..." />
              </div>
            </FormField>
            <FormField label="Gallery Images (up to 3)">
              <div className="space-y-2">
                {(form.gallery_images || []).map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={url} onChange={(e) => {
                      const next = [...form.gallery_images]; next[i] = e.target.value; set({ gallery_images: next });
                    }} />
                    <button onClick={() => set({ gallery_images: form.gallery_images.filter((_, idx) => idx !== i) })}><Trash2 size={15} className="text-red-500" /></button>
                  </div>
                ))}
                {(form.gallery_images || []).length < 3 && (
                  <button type="button" className="text-xs font-medium flex items-center gap-1" style={{ color: COLORS.secondary }}
                    onClick={() => set({ gallery_images: [...(form.gallery_images || []), ""] })}>
                    <Plus size={13} /> Add Image
                  </button>
                )}
              </div>
            </FormField>
          </SectionCard>
        </section>

        <section id="section-status">
          <SectionCard title="Status & Actions">
            <RadioGroup value={form.status} onValueChange={(v) => set({ status: v })} className="space-y-2 mb-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="active" /> Active (visible on booking page and calendar)</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="hidden" /> Hidden from online booking (admin only)</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="archived" /> Archived (hidden everywhere, kept for records)</label>
            </RadioGroup>
            {form.status === "hidden" && (
              <FormField label="Hide reason">
                <Select value={form.hide_reason || ""} onValueChange={(v) => set({ hide_reason: v })}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Coming soon">Coming soon</SelectItem>
                    <SelectItem value="By consultation only">By consultation only</SelectItem>
                    <SelectItem value="Staff booking only">Staff booking only</SelectItem>
                    <SelectItem value="Temporarily unavailable">Temporarily unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
            {!isNew && (
              <button className="text-sm font-medium text-red-600 mt-2" onClick={archive}>Archive Service</button>
            )}
          </SectionCard>
        </section>
      </div>

      <div className="flex justify-end gap-2 mt-6 border-t pt-4" style={{ borderColor: COLORS.border }}>
        <button className="text-sm px-4 py-2" style={{ color: COLORS.textSecondary }} onClick={() => navigate("/admin/services")}>Cancel</button>
        <PrimaryButton onClick={() => save(form.status)} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>
      </div>
    </div>
  );
};

export default ServiceEditorPage;
