import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Inbox,
  ListChecks,
  Plus,
  RotateCw,
  UserRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/common/PageHeader";
import { Button, Card, Badge, Spinner } from "../components/ui";
import { LeadDrawer } from "../components/leads/LeadDrawer";
import { actionCenterApi, leadsApi } from "../lib/services";
import { currency, shortDate, timeOf } from "../lib/format";
import { PRIORITY_STYLES, STAGE_STYLES } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const SECTIONS = [
  {key: "overdue", title: "Overdue", eyebrow: "Urgent", icon: AlertTriangle, tone: "rose", action: "Review overdue actions"},
  {key: "dueToday", title: "Due today", eyebrow: "Today", icon: CalendarCheck, tone: "amber", action: "Actions due today"},
  {key: "awaitingResponse", title: "Awaiting first response", eyebrow: "Needs response", icon: Inbox, tone: "orange", action: "New leads without interaction"},
  {key: "noNextAction", title: "No next action", eyebrow: "Needs planning", icon: Zap, tone: "yellow", action: "Active leads without a plan"},
  {key: "proposalFollowUps", title: "Proposals awaiting follow-up", eyebrow: "Pipeline", icon: RotateCw, tone: "sky", action: "Proposal leads to review"},
];

export default function ActionCenter() {
  const {user} = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);

  const load = () => {
    setError("");
    actionCenterApi.get().then(setData).catch((err) => setError(err.message || "Could not load Action Center"));
  };
  useEffect(load, []);

  const complete = async (lead) => {
    try {
      await leadsApi.completeNextAction(lead._id);
      toast.success("Next action completed");
      load();
    } catch (err) {
      toast.error(err.message || "Could not complete action");
    }
  };

  const openLead = (lead) => setSelectedLead(lead);
  const total = data?.summary?.total || 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Action Center" subtitle={`Good morning, ${user?.name?.split(" ")[0] || "there"}.`}>
        <Button variant="outline" onClick={load} disabled={!data}><RotateCw className="h-4 w-4" /> Refresh</Button>
      </PageHeader>

      {data === null ? <Card><Spinner /></Card> : error ? (
        <Card className="p-8 text-center"><p className="text-sm text-rose-700">{error}</p><Button size="sm" className="mt-4" onClick={load}>Try again</Button></Card>
      ) : (
        <>
          <Summary data={data} total={total} />
          {total === 0 ? <EmptyActionCenter /> : <div className="space-y-8">{SECTIONS.map((section) => <ActionSection key={section.key} section={section} items={data[section.key] || []} onOpen={openLead} onComplete={complete} />)}</div>}
        </>
      )}

      <LeadDrawer
        open={Boolean(selectedLead)}
        lead={selectedLead}
        onClose={() => { setSelectedLead(null); load(); }}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}

function Summary({data, total}) {
  const stats = [
    ["overdue", "Overdue", "text-rose-700", "bg-rose-50"],
    ["dueToday", "Due today", "text-amber-700", "bg-amber-50"],
    ["awaitingResponse", "Awaiting response", "text-orange-700", "bg-orange-50"],
    ["noNextAction", "Without next action", "text-yellow-700", "bg-yellow-50"],
  ];
  return <Card className="p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-brand-700"><ListChecks className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wide">Action Center</span></div><p className="mt-2 font-display text-2xl font-bold text-ink">{total} {total === 1 ? "item needs" : "items need"} your attention.</p><p className="mt-1 text-sm text-ink-soft">Work the most urgent items first and keep every active lead moving.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stats.map(([key,label,text,bg]) => <div key={key} className={cn("min-w-[116px] rounded-xl px-3 py-2", bg)}><p className={cn("text-xl font-bold", text)}>{data.summary[key]}</p><p className={cn("text-xs font-medium", text)}>{label}</p></div>)}</div></div></Card>;
}

function ActionSection({section, items, onOpen, onComplete}) {
  const Icon = section.icon;
  if (!items.length) return null;
  const tone = {rose: "text-rose-700", amber: "text-amber-700", orange: "text-orange-700", yellow: "text-yellow-700", sky: "text-sky-700"}[section.tone];
  return <section><div className="mb-3 flex items-center gap-2"><Icon className={cn("h-5 w-5", tone)} /><div><h2 className="text-base font-semibold text-ink">{section.title}</h2><p className="text-xs text-ink-soft">{section.eyebrow} · {items.length} {items.length === 1 ? "item" : "items"}</p></div></div><div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{items.map((lead) => <ActionItem key={`${section.key}-${lead._id}`} lead={lead} section={section} onOpen={onOpen} onComplete={onComplete} />)}</div></section>;
}

function ActionItem({lead, section, onOpen, onComplete}) {
  const due = lead.nextActionDueAt ? new Date(lead.nextActionDueAt) : null;
  const hasAction = Boolean(lead.nextAction);
  return <Card className="p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-soft"><UserRound className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-ink">{lead.name}</p><p className="truncate text-sm text-ink-soft">{lead.company || "No company"}</p></div><Badge className={PRIORITY_STYLES[lead.priority]}>{lead.priority}</Badge></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><Badge className={(STAGE_STYLES[lead.status] || STAGE_STYLES.New).badge}>{lead.status}</Badge><span className="font-medium text-ink">{currency(lead.value)}</span></div><p className="mt-3 text-sm font-medium text-ink">{hasAction ? lead.nextAction : section.key === "awaitingResponse" ? "New enquiry" : "No next action scheduled"}</p>{due && <p className={cn("mt-1 flex items-center gap-1.5 text-xs", section.key === "overdue" ? "text-rose-700" : "text-ink-soft")}><Clock3 className="h-3.5 w-3.5" />Due {shortDate(due)} · {timeOf(due)}</p>}{lead.nextActionTask?.status && <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft"><CheckCircle2 className="h-3.5 w-3.5" />Task {lead.nextActionTask.status.toLowerCase()}</p>}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onOpen(lead)}><UserRound className="h-4 w-4" /> Open lead</Button>{hasAction ? <Button size="sm" onClick={() => onComplete(lead)}><CheckCircle2 className="h-4 w-4" /> Complete</Button> : <Button size="sm" variant="subtle" onClick={() => onOpen(lead)}><Plus className="h-4 w-4" /> Add action</Button>}</div></div></div></Card>;
}

function EmptyActionCenter() {
  return <Card className="p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div><h2 className="mt-4 font-display text-xl font-bold text-ink">All clear.</h2><p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">You have no urgent follow-ups right now.</p></Card>;
}