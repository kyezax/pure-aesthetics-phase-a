import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Download } from "lucide-react";
import adminApi from "./adminApi";
import { COLORS, timeAgo } from "./adminTheme";
import { SectionCard, EmptyState } from "./AdminUI";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const ENTITY_TYPES = ["service", "category", "pricing", "policy", "hours", "business_settings", "deposit_rules", "closure"];
const ACTIONS = ["created", "updated", "deleted", "archived"];

const ChangeLogPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, [entityType, action]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getChangeLog({
        entity_type: entityType === "all" ? undefined : entityType,
        action: action === "all" ? undefined : action,
      });
      setEntries(data);
    } catch (e) {
      toast.error("Failed to load change log");
    } finally {
      setLoading(false);
    }
  };

  const filtered = entries.filter((e) => e.summary.toLowerCase().includes(search.toLowerCase()));

  const exportCsv = () => {
    const rows = [["Date", "Type", "Action", "Summary", "Changed By"]];
    filtered.forEach((e) => rows.push([e.created_at, e.entity_type, e.action, e.summary, e.changed_by_name || ""]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "change-log.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="change-log-page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold" style={{ color: COLORS.textPrimary }}>Change Log</h1>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>Full audit trail of admin changes.</p>
        </div>
        <button className="text-sm font-medium flex items-center gap-1" style={{ color: COLORS.secondary }} onClick={exportCsv}>
          <Download size={15} /> Download CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textSecondary }} />
          <Input className="pl-9" placeholder="Find specific change" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <SectionCard>
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No changes recorded" description="Admin actions will be logged here as they happen." />
        ) : (
          <div className="space-y-0 divide-y" style={{ borderColor: COLORS.border }}>
            {filtered.map((e) => (
              <div key={e.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>{e.summary}</p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>
                    {e.entity_type.replace("_", " ")} &middot; {e.action} &middot; By {e.changed_by_name || "system"}
                  </p>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: COLORS.textSecondary }}>{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ChangeLogPage;
