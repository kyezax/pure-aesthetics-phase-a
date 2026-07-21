import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronUp, ChevronDown, MoreVertical, Search } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS, CATEGORY_COLOR_PALETTE } from "./adminTheme";
import { SectionCard, StatusPill, PrimaryButton, ColorSwatchPicker, EmptyState, FormField } from "./AdminUI";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const emptyForm = { name: "", description: "", color: CATEGORY_COLOR_PALETTE[0].value, status: "active", show_on_booking_page: true, show_on_online_booking: true };

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", color: CATEGORY_COLOR_PALETTE[0].value });

  const [editing, setEditing] = useState(null); // category object being edited (drawer)
  const [editForm, setEditForm] = useState(emptyForm);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignTo, setReassignTo] = useState("");

  useEffect(() => {
    load();
  }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getCategories({ status: statusFilter });
      setCategories(data);
    } catch (e) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const submitCreate = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      const created = await adminApi.createCategory(newCategory);
      setCategories((prev) => [...prev, created]);
      toast.success("Category created");
      setCreating(false);
      setNewCategory({ name: "", color: CATEGORY_COLOR_PALETTE[0].value });
      openEdit(created);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create category");
    }
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setEditForm({
      name: cat.name, description: cat.description || "", color: cat.color,
      status: cat.status, show_on_booking_page: cat.show_on_booking_page,
      show_on_online_booking: cat.show_on_online_booking,
    });
  };

  const saveEdit = async () => {
    try {
      const updated = await adminApi.updateCategory(editing.id, editForm);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success("Category updated");
      setEditing(null);
    } catch (e) {
      toast.error("Failed to update category");
    }
  };

  const move = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filtered.length) return;
    const reordered = [...filtered];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setCategories((prev) => {
      const rest = prev.filter((c) => !filtered.includes(c));
      return [...reordered, ...rest];
    });
    try {
      await adminApi.reorderCategories(reordered.map((c) => c.id));
    } catch (e) {
      toast.error("Failed to save order");
      load();
    }
  };

  const confirmDelete = async () => {
    try {
      let params = {};
      if (deleteTarget.service_count > 0) {
        params = reassignTo ? { reassign_to: reassignTo } : { archive_only: true };
      }
      await adminApi.deleteCategory(deleteTarget.id, params);
      toast.success("Category removed");
      setDeleteTarget(null);
      setReassignTo("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete category");
    }
  };

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  return (
    <div data-testid="categories-page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: COLORS.textPrimary }}>Service Categories</h1>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>{categories.length} categories</p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)}><Plus size={16} /> Create Category</PrimaryButton>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textSecondary }} />
          <Input className="pl-9" placeholder="Search categories by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {creating && (
        <SectionCard className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="e.g., Laser Treatments" value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} className="flex-1 min-w-[200px]" />
            <ColorSwatchPicker value={newCategory.color} palette={CATEGORY_COLOR_PALETTE} onChange={(color) => setNewCategory({ ...newCategory, color })} />
            <PrimaryButton onClick={submitCreate}>Create</PrimaryButton>
            <button className="text-sm" style={{ color: COLORS.textSecondary }} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </SectionCard>
      )}

      <SectionCard>
        {filtered.length === 0 ? (
          <EmptyState title="No categories" description="Create your first service category to get organized." />
        ) : (
          <div className="divide-y" style={{ borderColor: COLORS.border }}>
            {filtered.map((cat, index) => (
              <div key={cat.id} className="flex items-center gap-4 py-3">
                <div className="flex flex-col">
                  <button disabled={index === 0} onClick={() => move(index, -1)} className="disabled:opacity-20"><ChevronUp size={14} /></button>
                  <button disabled={index === filtered.length - 1} onClick={() => move(index, 1)} className="disabled:opacity-20"><ChevronDown size={14} /></button>
                </div>
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <button className="flex-1 text-left font-medium text-sm" style={{ color: COLORS.textPrimary }} onClick={() => openEdit(cat)}>
                  {cat.name}
                </button>
                <span className="text-xs" style={{ color: COLORS.textSecondary }}>{cat.service_count} services</span>
                <StatusPill status={cat.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button><MoreVertical size={16} /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cat)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => adminApi.updateCategory(cat.id, { status: cat.status === "hidden" ? "active" : "hidden" }).then(load)}>
                      {cat.status === "hidden" ? "Show" : "Hide"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => adminApi.updateCategory(cat.id, { status: "archived" }).then(load)}>Archive</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(cat)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Edit drawer */}
      <Sheet open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Edit Category</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <FormField label="Category name">
              <Input maxLength={50} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </FormField>
            <FormField label="Description" helper="Internal notes only">
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </FormField>
            <FormField label="Colour">
              <ColorSwatchPicker value={editForm.color} palette={CATEGORY_COLOR_PALETTE} onChange={(color) => setEditForm({ ...editForm, color })} />
            </FormField>
            <FormField label="Status">
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={editForm.show_on_booking_page} onCheckedChange={(v) => setEditForm({ ...editForm, show_on_booking_page: v })} />
              Show on booking page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={editForm.show_on_online_booking} onCheckedChange={(v) => setEditForm({ ...editForm, show_on_online_booking: v })} />
              Show on online booking
            </label>
            <div className="flex justify-between pt-4">
              <button className="text-sm font-medium text-red-600" onClick={() => { setDeleteTarget(editing); setEditing(null); }}>Delete category</button>
              <PrimaryButton onClick={saveEdit}>Save</PrimaryButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete "{deleteTarget?.name}"</DialogTitle></DialogHeader>
          {deleteTarget?.service_count > 0 ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                This category has {deleteTarget.service_count} services. What should happen to them?
              </p>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger><SelectValue placeholder="Move to another category..." /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.id !== deleteTarget.id).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-center" style={{ color: COLORS.textSecondary }}>or</p>
              <button className="text-sm underline" onClick={() => setReassignTo("")}>
                Archive category only (services stay assigned)
              </button>
            </div>
          ) : (
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>This category has no services and can be safely deleted.</p>
          )}
          <DialogFooter>
            <button className="text-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <PrimaryButton onClick={confirmDelete}>Confirm</PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
