import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Copy } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS } from "./adminTheme";
import { SectionCard, PrimaryButton, EmptyState } from "./AdminUI";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const DAYS = [
  ["monday", "Monday"], ["tuesday", "Tuesday"], ["wednesday", "Wednesday"],
  ["thursday", "Thursday"], ["friday", "Friday"], ["saturday", "Saturday"], ["sunday", "Sunday"],
];

const DEFAULT_DAY = { open: "09:00", close: "17:00", closed: false, breaks: [] };

const emptyClosure = () => ({
  title: "", closure_type: "closed", start_date: "", end_date: "",
  reason: "", open_time: "09:00", close_time: "17:00",
  show_on_booking_page: true, notify_clients: false,
});

const HoursEditor = () => {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copyFrom, setCopyFrom] = useState(null);
  const [copyTargets, setCopyTargets] = useState([]);

  const [closures, setClosures] = useState([]);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [closureForm, setClosureForm] = useState(emptyClosure());
  const [editingClosureId, setEditingClosureId] = useState(null);

  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [h, c, hol] = await Promise.all([
        adminApi.getHours(), adminApi.getClosures(), adminApi.getPublicHolidays(),
      ]);
      const filled = {};
      DAYS.forEach(([key]) => {
        filled[key] = { ...DEFAULT_DAY, ...(h.operating_hours?.[key] || {}) };
        if (!filled[key].breaks) filled[key].breaks = [];
      });
      setHours(filled);
      setClosures(c);
      setHolidays(hol);
    } catch (e) {
      toast.error("Failed to load hours");
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (day, patch) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const addBreak = (day) => {
    updateDay(day, { breaks: [...hours[day].breaks, { start: "12:00", end: "13:00" }] });
  };

  const updateBreak = (day, index, patch) => {
    const breaks = hours[day].breaks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    updateDay(day, { breaks });
  };

  const removeBreak = (day, index) => {
    updateDay(day, { breaks: hours[day].breaks.filter((_, i) => i !== index) });
  };

  const saveHours = async () => {
    setSaving(true);
    try {
      await adminApi.updateHours(hours);
      toast.success("Opening hours updated. Changes take effect immediately.");
    } catch (e) {
      toast.error("Failed to save hours");
    } finally {
      setSaving(false);
    }
  };

  const openCopyModal = (day) => {
    setCopyFrom(day);
    setCopyTargets([]);
  };

  const submitCopy = async () => {
    if (!copyTargets.length) return;
    try {
      const res = await adminApi.copyHours(copyFrom, copyTargets);
      const filled = { ...hours };
      copyTargets.forEach((d) => {
        filled[d] = { ...DEFAULT_DAY, ...(res.operating_hours?.[d] || {}) };
      });
      setHours(filled);
      toast.success(`Hours copied to ${copyTargets.join(", ")}`);
      setCopyFrom(null);
    } catch (e) {
      toast.error("Failed to copy hours");
    }
  };

  const submitClosure = async () => {
    if (!closureForm.title || !closureForm.start_date || !closureForm.end_date) {
      toast.error("Title, start date and end date are required");
      return;
    }
    try {
      const payload = {
        ...closureForm,
        start_date: new Date(closureForm.start_date).toISOString(),
        end_date: new Date(closureForm.end_date).toISOString(),
      };
      if (editingClosureId) {
        await adminApi.updateClosure(editingClosureId, payload);
      } else {
        await adminApi.createClosure(payload);
      }
      toast.success("Closure saved");
      setClosureDialogOpen(false);
      setEditingClosureId(null);
      setClosureForm(emptyClosure());
      const c = await adminApi.getClosures();
      setClosures(c);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save closure");
    }
  };

  const editClosure = (c) => {
    setEditingClosureId(c.id);
    setClosureForm({
      ...c,
      start_date: c.start_date?.slice(0, 10),
      end_date: c.end_date?.slice(0, 10),
    });
    setClosureDialogOpen(true);
  };

  const deleteClosureRow = async (id) => {
    if (!window.confirm("Delete this closure?")) return;
    try {
      await adminApi.deleteClosure(id);
      setClosures((prev) => prev.filter((c) => c.id !== id));
      toast.success("Closure deleted");
    } catch (e) {
      toast.error("Failed to delete closure");
    }
  };

  const toggleHoliday = async (h) => {
    try {
      await adminApi.updatePublicHoliday(h.key, { closed: !h.closed, message: h.message });
      setHolidays((prev) => prev.map((x) => (x.key === h.key ? { ...x, closed: !x.closed } : x)));
    } catch (e) {
      toast.error("Failed to update holiday");
    }
  };

  if (loading || !hours) return <p style={{ color: COLORS.textSecondary }}>Loading hours...</p>;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Opening Hours"
        description="Manage when your clinic is open to bookings. Changes take effect immediately."
        action={<PrimaryButton onClick={saveHours} disabled={saving}>{saving ? "Saving..." : "Save Hours"}</PrimaryButton>}
      >
        <div className="space-y-3">
          {DAYS.map(([key, label]) => (
            <div key={key} className="border rounded-lg p-3" style={{ borderColor: COLORS.border }}>
              <div className="flex flex-wrap items-center gap-4">
                <span className="w-24 font-medium text-sm" style={{ color: COLORS.textPrimary }}>{label}</span>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!hours[key].closed} onCheckedChange={(v) => updateDay(key, { closed: !v })} />
                  {hours[key].closed ? "Closed" : "Open"}
                </label>
                {!hours[key].closed && (
                  <>
                    <Input type="time" className="w-28" value={hours[key].open}
                      onChange={(e) => updateDay(key, { open: e.target.value })} />
                    <span className="text-sm" style={{ color: COLORS.textSecondary }}>to</span>
                    <Input type="time" className="w-28" value={hours[key].close}
                      onChange={(e) => updateDay(key, { close: e.target.value })} />
                    {hours[key].close <= hours[key].open && (
                      <span className="text-xs text-red-600">Close time must be after open time</span>
                    )}
                    <button className="text-xs font-medium flex items-center gap-1" style={{ color: COLORS.secondary }}
                      onClick={() => addBreak(key)}>
                      <Plus size={13} /> Add break
                    </button>
                    <button className="text-xs font-medium flex items-center gap-1 ml-auto" style={{ color: COLORS.textSecondary }}
                      onClick={() => openCopyModal(key)}>
                      <Copy size={13} /> Copy to...
                    </button>
                  </>
                )}
              </div>
              {!hours[key].closed && hours[key].breaks.length > 0 && (
                <div className="mt-2 pl-24 space-y-2">
                  {hours[key].breaks.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span style={{ color: COLORS.textSecondary }}>Break</span>
                      <Input type="time" className="w-28" value={b.start} onChange={(e) => updateBreak(key, i, { start: e.target.value })} />
                      <span style={{ color: COLORS.textSecondary }}>to</span>
                      <Input type="time" className="w-28" value={b.end} onChange={(e) => updateBreak(key, i, { end: e.target.value })} />
                      <button onClick={() => removeBreak(key, i)} className="text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Special Hours & Closures"
        action={
          <PrimaryButton onClick={() => { setEditingClosureId(null); setClosureForm(emptyClosure()); setClosureDialogOpen(true); }}>
            <Plus size={15} /> Add closure or special hours
          </PrimaryButton>
        }
      >
        {closures.length === 0 ? (
          <EmptyState title="No closures scheduled" description="Add holiday closures or reduced-hours periods." />
        ) : (
          <div className="space-y-2">
            {closures.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded-lg p-3" style={{ borderColor: COLORS.border }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
                    {c.title}{" "}
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: c.is_active ? "#e6f4ef" : "#ececec", color: c.is_active ? COLORS.accent : "#666" }}>
                      {c.is_active ? "Active" : "Past"}
                    </span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>
                    {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()} &middot;{" "}
                    {c.closure_type === "closed" ? "Fully closed" : `Reduced hours (${c.open_time}-${c.close_time})`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="text-sm font-medium" style={{ color: COLORS.secondary }} onClick={() => editClosure(c)}>Edit</button>
                  <button className="text-sm font-medium text-red-600" onClick={() => deleteClosureRow(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Australian Public Holidays" description="Toggle which public holidays your clinic is closed on.">
        <div className="divide-y" style={{ borderColor: COLORS.border }}>
          {holidays.map((h) => (
            <div key={h.key} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>{h.name}</p>
                <p className="text-xs" style={{ color: COLORS.textSecondary }}>{h.date}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={h.closed} onCheckedChange={() => toggleHoliday(h)} />
                Closed
              </label>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Copy to... modal */}
      <Dialog open={!!copyFrom} onOpenChange={(v) => !v && setCopyFrom(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copy {copyFrom} hours to...</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {DAYS.filter(([key]) => key !== copyFrom).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={copyTargets.includes(key)}
                  onCheckedChange={(v) => setCopyTargets((prev) => (v ? [...prev, key] : prev.filter((d) => d !== key)))}
                />
                {label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <PrimaryButton onClick={submitCopy}>Copy hours</PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Closure dialog */}
      <Dialog open={closureDialogOpen} onOpenChange={setClosureDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingClosureId ? "Edit closure" : "Add closure or special hours"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Closure reason (e.g. Christmas break)" value={closureForm.title}
              onChange={(e) => setClosureForm({ ...closureForm, title: e.target.value })} />
            <Select value={closureForm.closure_type} onValueChange={(v) => setClosureForm({ ...closureForm, closure_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="closed">Fully closed</SelectItem>
                <SelectItem value="reduced">Reduced hours</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={closureForm.start_date} onChange={(e) => setClosureForm({ ...closureForm, start_date: e.target.value })} />
              <Input type="date" value={closureForm.end_date} onChange={(e) => setClosureForm({ ...closureForm, end_date: e.target.value })} />
            </div>
            {closureForm.closure_type === "reduced" && (
              <div className="grid grid-cols-2 gap-3">
                <Input type="time" value={closureForm.open_time} onChange={(e) => setClosureForm({ ...closureForm, open_time: e.target.value })} />
                <Input type="time" value={closureForm.close_time} onChange={(e) => setClosureForm({ ...closureForm, close_time: e.target.value })} />
              </div>
            )}
            <Textarea placeholder="Internal note (optional)" value={closureForm.reason || ""}
              onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={closureForm.show_on_booking_page} onCheckedChange={(v) => setClosureForm({ ...closureForm, show_on_booking_page: v })} />
              Show on booking page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={closureForm.notify_clients} onCheckedChange={(v) => setClosureForm({ ...closureForm, notify_clients: v })} />
              Notify clients
            </label>
          </div>
          <DialogFooter>
            <PrimaryButton onClick={submitClosure}>Save</PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HoursEditor;
