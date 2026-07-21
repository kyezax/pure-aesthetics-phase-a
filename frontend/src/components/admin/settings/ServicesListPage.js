import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, MoreVertical, Copy, Archive, EyeOff } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS, formatMoney } from "./adminTheme";
import { SectionCard, StatusPill, PrimaryButton, EmptyState } from "./AdminUI";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const SORT_OPTIONS = [
  ["name", "Name (A-Z)"],
  ["price_low", "Price (low-high)"],
  ["price_high", "Price (high-low)"],
  ["duration", "Duration"],
  ["recently_updated", "Recently updated"],
  ["recently_created", "Recently created"],
];

const ServicesListPage = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const filter = params.get("filter");
    if (filter === "missing_pricing" || filter === "missing_images") {
      setStatus("active");
    }
  }, [params]);

  useEffect(() => {
    load();
    adminApi.getCategories({}).then(setCategories).catch(() => {});
  }, [status, categoryId, sort]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getServices({
        status: status === "all" ? undefined : status,
        category_id: categoryId === "all" ? undefined : categoryId,
        sort,
      });
      setServices(data);
    } catch (e) {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const filter = params.get("filter");
    if (filter === "missing_images") list = list.filter((s) => !s.image_url);
    if (filter === "missing_pricing") list = list.filter((s) => !s.price_cents);
    return list;
  }, [services, search, params]);

  const toggleSelect = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const runBulk = async (action, extra = {}) => {
    try {
      await adminApi.bulkServiceAction({ ids: selected, action, ...extra });
      toast.success("Bulk action applied");
      setSelected([]);
      load();
    } catch (e) {
      toast.error("Bulk action failed");
    }
  };

  const duplicate = async (id) => {
    try {
      await adminApi.duplicateService(id);
      toast.success("Service duplicated");
      load();
    } catch (e) {
      toast.error("Failed to duplicate");
    }
  };

  const archive = async (id) => {
    if (!window.confirm("Archive this service?")) return;
    try {
      await adminApi.archiveService(id);
      toast.success("Service archived");
      load();
    } catch (e) {
      toast.error("Failed to archive");
    }
  };

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  return (
    <div data-testid="services-list-page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: COLORS.textPrimary }}>Services</h1>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>{filtered.length} services</p>
        </div>
        <PrimaryButton onClick={() => navigate("/admin/services/new")}><Plus size={16} /> Create Service</PrimaryButton>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textSecondary }} />
          <Input className="pl-9" placeholder="Search services by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="hidden">Hidden from booking</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: `${COLORS.primary}33` }}>
          <span className="text-sm font-medium" style={{ color: COLORS.secondary }}>{selected.length} services selected</span>
          <button className="text-sm" onClick={() => runBulk("activate")}>Activate</button>
          <button className="text-sm" onClick={() => runBulk("hide")}>Hide</button>
          <button className="text-sm" onClick={() => runBulk("archive")}>Archive</button>
          <button className="text-sm" onClick={() => runBulk("update_price", { percent: 10 })}>+10% price</button>
          <button className="text-sm ml-auto" style={{ color: COLORS.textSecondary }} onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <SectionCard className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="No services yet" description="Create your first service to get started."
            action={<PrimaryButton onClick={() => navigate("/admin/services/new")}><Plus size={16} /> Create Service</PrimaryButton>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="services-table">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Bookings</th>
                  <th className="p-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-black/[0.02]" style={{ borderColor: COLORS.border }}>
                    <td className="p-3"><Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></td>
                    <td className="p-3">
                      <button className="flex items-center gap-2 font-medium text-left" style={{ color: COLORS.textPrimary }}
                        onClick={() => navigate(`/admin/services/${s.id}`)}>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.category_color }} />
                        {s.name}
                      </button>
                    </td>
                    <td className="p-3" style={{ color: COLORS.textSecondary }}>{s.category_name}</td>
                    <td className="p-3 font-medium">{formatMoney(s.price_cents)}</td>
                    <td className="p-3" style={{ color: COLORS.textSecondary }}>{s.duration_minutes} min</td>
                    <td className="p-3"><StatusPill status={s.status} /></td>
                    <td className="p-3" style={{ color: COLORS.textSecondary }}>{s.booking_count} total</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button><MoreVertical size={16} /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/services/${s.id}`)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate(s.id)}><Copy size={13} className="mr-2" /> Duplicate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => adminApi.updateService(s.id, { status: s.status === "hidden" ? "active" : "hidden" }).then(load)}>
                            <EyeOff size={13} className="mr-2" /> {s.status === "hidden" ? "Unhide" : "Hide from booking"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => archive(s.id)}>
                            <Archive size={13} className="mr-2" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ServicesListPage;
