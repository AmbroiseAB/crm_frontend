import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Sparkles, GripVertical, Building2, TrendingUp, Layers, Target, DollarSign } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { Spinner, Avatar, Badge, Card } from "../components/ui";
import { leadsApi, aiApi, pipelineApi } from "../lib/services";
import { currency } from "../lib/format";
import { PIPELINE_STAGES, STAGE_STYLES, PRIORITY_STYLES } from "../lib/constants";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useNotifications } from "../context/NotificationContext";

/* Group a flat lead list into { stage: Lead[] } buckets. */
const toBoard = (leads) => {
  const board = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, []]));
  for (const l of leads) (board[l.status] || board.New).push(l);
  return board;
};

export default function Pipeline() {
  const [board, setBoard] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [intelligence, setIntelligence] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    leadsApi
      .list()
      .then((res) => setBoard(toBoard(res.leads)))
      .catch(() => setBoard(toBoard([])));
  }, []);

  useEffect(() => {
    pipelineApi.intelligence().then(setIntelligence).catch(() => setIntelligence(false));
  }, []);

  if (!board) return <Spinner />;

  const findContainer = (id) => {
    if (id in board) return id;
    return PIPELINE_STAGES.find((s) => board[s].some((l) => l._id === id));
  };

  const activeLead = activeId
    ? Object.values(board).flat().find((l) => l._id === activeId)
    : null;

  /* Move cards between columns live as the user drags over them. */
  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to || from === to) return;

    setBoard((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const idx = fromItems.findIndex((l) => l._id === active.id);
      if (idx === -1) return prev;
      const [moved] = fromItems.splice(idx, 1);
      moved.status = to;
      // Insert near the hovered card (or append if hovering the column).
      const overIdx = toItems.findIndex((l) => l._id === over.id);
      toItems.splice(overIdx === -1 ? toItems.length : overIdx, 0, moved);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  /* Persist the final ordering + stage to the backend. */
  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const container = findContainer(over.id);
    if (!container) return;

    setBoard((prev) => {
      const items = [...prev[container]];
      const oldIdx = items.findIndex((l) => l._id === active.id);
      const newIdx = items.findIndex((l) => l._id === over.id);
      const reordered =
        oldIdx !== -1 && newIdx !== -1 ? arrayMove(items, oldIdx, newIdx) : items;
      const next = { ...prev, [container]: reordered };

      // Build the persistence payload across all affected columns.
      const updates = [];
      PIPELINE_STAGES.forEach((stage) => {
        next[stage].forEach((l, order) =>
          updates.push({ id: l._id, status: stage, order })
        );
      });
      leadsApi.reorder(updates).catch(() => toast.error("Could not save pipeline"));
      return next;
    });
  };

  const handleStageChange = (leadId, targetStage) => {
    setBoard((prev) => {
      const fromStage = PIPELINE_STAGES.find((stage) =>
        prev[stage].some((l) => l._id === leadId)
      );
      if (!fromStage || fromStage === targetStage) return prev;

      const lead = prev[fromStage].find((l) => l._id === leadId);
      if (!lead) return prev;

      const next = {
        ...prev,
        [fromStage]: prev[fromStage].filter((l) => l._id !== leadId),
        [targetStage]: [...prev[targetStage], { ...lead, status: targetStage }],
      };

      const updates = [];
      PIPELINE_STAGES.forEach((stage) => {
        next[stage].forEach((l, order) =>
          updates.push({ id: l._id, status: stage, order })
        );
      });
      leadsApi.reorder(updates).catch(() => toast.error("Could not save pipeline"));
      return next;
    });
  };

  /* ── KPI computations ─────────────────────────────────────────────── */
  const allLeads = Object.values(board).flat();
  const totalValue = allLeads.reduce((s, l) => s + (l.value || 0), 0);
  const openDeals = allLeads.filter((l) => l.status !== "Won" && l.status !== "Lost");
  const wonLeads = allLeads.filter((l) => l.status === "Won");
  const wonValue = wonLeads.reduce((s, l) => s + (l.value || 0), 0);
  const closedCount = wonLeads.length + (board.Lost?.length || 0);
  const winRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        subtitle={`${allLeads.length} leads · ${currency(totalValue, { compact: true })} in play`}
      />

      {/* KPI summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={DollarSign}
          tint="bg-brand-50 text-brand-600"
          label="Total pipeline"
          value={currency(totalValue, { compact: true })}
        />
        <StatTile
          icon={Layers}
          tint="bg-sky-50 text-sky-600"
          label="Open deals"
          value={openDeals.length}
        />
        <StatTile
          icon={Target}
          tint="bg-emerald-50 text-emerald-600"
          label="Won value"
          value={currency(wonValue, { compact: true })}
        />
        <StatTile
          icon={TrendingUp}
          tint="bg-violet-50 text-violet-600"
          label="Win rate"
          value={`${winRate}%`}
        />
      </div>

      <PipelineIntelligence data={intelligence} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              leads={board[stage]}
              onStageChange={handleStageChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function PipelineIntelligence({data}) {
  return <Card className="p-6"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-600" /><div><h2 className="text-base font-semibold text-ink">Pipeline intelligence</h2><p className="text-xs text-ink-soft">Based on recorded stage transitions</p></div></div>{data === null ? <Spinner className="p-6" /> : data === false ? <p className="py-5 text-sm text-rose-700">Could not load pipeline history.</p> : !data?.historyCount ? <p className="py-5 text-sm text-ink-soft">Not enough historical data yet.</p> : <div className="mt-5 grid gap-6 lg:grid-cols-3"><div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Stage conversion</h3><div className="mt-3 space-y-2">{data.conversion.map((item) => <div key={`${item.from}-${item.to}`} className="flex items-center justify-between text-sm"><span className="text-ink">{item.from} → {item.to}</span><span className="font-semibold text-ink">{item.rate === null ? "Not enough data" : `${item.rate}%`}</span></div>)}</div></div><div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Average time in stage</h3><div className="mt-3 space-y-2">{data.durations.map((item) => <div key={item.stage} className="flex items-center justify-between text-sm"><span className="text-ink">{item.stage}</span><span className="font-semibold text-ink">{item.average || "Not enough data"}</span></div>)}</div></div><div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Pipeline leakage</h3>{data.leakage.length ? <div className="mt-3 space-y-2">{data.leakage.map((item) => <div key={item.stage} className="flex items-center justify-between text-sm"><span className="text-ink">{item.stage} → Lost</span><span className="font-semibold text-rose-700">{item.lost}</span></div>)}</div> : <p className="mt-3 text-sm text-ink-soft">Not enough historical data yet.</p>}</div></div>}</Card>;
}

/* ── KPI stat tile (matches Leads page pattern) ─────────────────────── */
function StatTile({ icon: Icon, label, value, tint }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-soft">{label}</p>
          <p className="font-display text-lg font-bold text-ink">{value}</p>
        </div>
      </div>
    </Card>
  );
}

/* ── Column ─────────────────────────────────────────────────────────── */
function Column({ stage, leads, onStageChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const style = STAGE_STYLES[stage];
  const value = leads.reduce((s, l) => s + (l.value || 0), 0);

  return (
    <div className="flex w-80 shrink-0 flex-col">
      {/* Colored top accent bar */}
      <div className={cn("mb-2 h-1 w-full rounded-full", style.bar)} />

      {/* Column header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
          <h3 className="text-sm font-semibold text-ink">{stage}</h3>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-soft shadow-sm border border-line">
            {leads.length}
          </span>
        </div>
        <span className="text-xs font-medium text-ink-soft">
          {currency(value, { compact: true })}
        </span>
      </div>

      {/* Droppable column body */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[60vh] flex-1 flex-col gap-3 rounded-3xl border-2 border-dashed border-transparent bg-surface-muted/60 p-3 transition",
          isOver && "border-brand-300 bg-brand-50/60"
        )}
      >
        <SortableContext
          items={leads.map((l) => l._id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableCard key={lead._id} lead={lead} onStageChange={onStageChange} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <p className="mt-6 text-center text-xs text-ink-soft">Drop leads here</p>
        )}
      </div>
    </div>
  );
}

/* ── Sortable card wrapper ──────────────────────────────────────────── */
function SortableCard({ lead, onStageChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} dragHandle={{ attributes, listeners }} onStageChange={onStageChange} />
    </div>
  );
}

/* ── Card UI ────────────────────────────────────────────────────────── */
function LeadCard({ lead, dragHandle, overlay, onStageChange }) {
  const [suggesting, setSuggesting] = useState(false);
  const {refreshNotifications} = useNotifications();

  // AI: suggest the next best action / priority for this lead.
  const suggest = async (e) => {
    e.stopPropagation();
    setSuggesting(true);
    try {
      const res = await aiApi.leadSummary({ leadId: lead._id });
      await refreshNotifications();
      toast(`AI suggestion for ${lead.name}`, {
        description: `${res.nextBestAction} (suggested priority: ${res.suggestedPriority})`,
        duration: 7000,
      });
    } catch (err) {
      toast.error(err.message || "AI unavailable");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div
      className={cn(
        "group rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-soft)] transition border border-line/60",
        overlay ? "shadow-[var(--shadow-pop)] rotate-2" : "hover:shadow-[var(--shadow-card)]"
      )}
    >
      {/* Name / company row + drag handle */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={lead.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink max-w-[10rem] md:max-w-[12rem]">
              {lead.name}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-soft max-w-[10rem] md:max-w-[12rem]">
              <Building2 className="h-3 w-3 shrink-0" />
              {lead.company || "—"}
            </p>
          </div>
        </div>
        {dragHandle && (
          <button
            {...dragHandle.attributes}
            {...dragHandle.listeners}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-line/60 bg-surface text-ink-soft/70 transition hover:bg-surface-hover hover:text-ink-soft active:cursor-grabbing lg:flex lg:ml-2"
            aria-label="Drag"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>

      {!overlay && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-ink">{currency(lead.value)}</span>
            <Badge className={cn(PRIORITY_STYLES[lead.priority], "hidden lg:inline-flex")}>{lead.priority}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            <Badge className={PRIORITY_STYLES[lead.priority]}>{lead.priority}</Badge>
            <select
              value={lead.status}
              onChange={(e) => onStageChange?.(lead._id, e.target.value)}
              className="w-auto min-w-[7rem] max-w-[10rem] rounded-xl border border-line/70 bg-surface px-3 py-1.5 text-xs text-ink-soft shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* AI suggest button — appears on hover, hidden in DragOverlay */}
      {!overlay && (
        <button
          onClick={suggest}
          disabled={suggesting}
          title="AI suggest next step"
          aria-label="AI suggest next step"
          className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-1.5 text-xs font-medium text-brand-700 opacity-100 transition hover:bg-brand-100 lg:opacity-0 lg:group-hover:opacity-100 disabled:opacity-60"
        >
          <Sparkles className={cn("h-3.5 w-3.5", suggesting && "animate-pulse")} />
          <span>{suggesting ? "Thinking…" : "AI suggest next step"}</span>
        </button>
      )}
    </div>
  );
}
