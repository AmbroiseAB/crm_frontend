import { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  Building2,
  CalendarDays,
  MessageCircle,
  MessageSquareText,
  StickyNote,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Sparkles,
  RefreshCw,
  Pencil,
  Trash2,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { Drawer, Button, Badge, Avatar, Spinner, Dialog, Input, Textarea, Select, Field } from "../ui";
import { AiEmailDialog } from "../ai/AiEmailDialog";
import { aiApi, leadsApi } from "../../lib/services";
import { currency, relative, shortDate, timeOf } from "../../lib/format";
import { STAGE_STYLES, PRIORITY_STYLES } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useNotifications } from "../../context/NotificationContext";

const displayAIText = (value) => typeof value === "string" ? value.replace(/\$/g, "FCFA ") : value;

/** Detailed slide-over for a single lead: info, AI summary, email generator. */
export function LeadDrawer({ open, onClose, lead, onEdit, onDelete }) {
  const [currentLead, setCurrentLead] = useState(lead);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactions, setInteractions] = useState(null);
  const [stageHistory, setStageHistory] = useState(null);
  const [interactionError, setInteractionError] = useState("");
  const {refreshNotifications} = useNotifications();

  useEffect(() => {
    setCurrentLead(lead);
  }, [lead]);

  useEffect(() => {
    if (!open || !lead?._id) return;
    setInteractions(null);
    setInteractionError("");
    aiApi.results({type: "SUMMARY", leadId: lead._id}).then((res) => setSummary(res.results?.[0]?.result || null)).catch(() => {});
    Promise.all([leadsApi.interactions(lead._id), leadsApi.stageHistory(lead._id)])
      .then(([activity, history]) => {
        setInteractions(activity.interactions || []);
        setStageHistory(history.histories || []);
      })
      .catch((err) => {
        setInteractions([]);
        setStageHistory([]);
        setInteractionError(err.message || "Could not load activity");
      });
  }, [open, lead?._id]);

  if (!lead) return null;
  const activeLead = currentLead || lead;
  const stage = STAGE_STYLES[activeLead.status] || STAGE_STYLES.New;

  const runSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await aiApi.leadSummary({ leadId: activeLead._id });
      setSummary(res);
      await refreshNotifications();
    } catch (err) {
      toast.error(err.message || "Could not summarize lead");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleLeadUpdated = (updatedLead) => {
    setCurrentLead(updatedLead);
    setSummary(null);
  };

  const riskTone =
    summary?.riskScore >= 66
      ? "text-rose-600"
      : summary?.riskScore >= 33
      ? "text-amber-600"
      : "text-brand-700";

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Lead details">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar name={lead.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-ink">{lead.name}</h2>
            <p className="truncate text-sm text-ink-soft">{lead.company || "—"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={stage.badge} dot={stage.dot}>
            {lead.status}
          </Badge>
          <Badge className={PRIORITY_STYLES[lead.priority]}>{lead.priority} priority</Badge>
          <Badge>{lead.source}</Badge>
        </div>

        {/* Value */}
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Deal value</p>
          <p className="mt-1 text-2xl font-bold text-ink">{currency(lead.value)}</p>
        </div>

        {/* Contact info */}
        <div className="mt-4 space-y-2">
          <InfoRow icon={Mail} value={lead.email} href={`mailto:${lead.email}`} />
          <InfoRow icon={Phone} value={lead.phone} href={`tel:${lead.phone}`} />
          <InfoRow icon={Building2} value={lead.company} />
        </div>

        {lead.notes && (
          <div className="mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Notes
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{lead.notes}</p>
          </div>
        )}

        <QualificationPanel
          lead={activeLead}
          onUpdated={(updatedLead) => {
            handleLeadUpdated(updatedLead);
            setInteractionError("");
            leadsApi.interactions(updatedLead._id)
              .then((res) => setInteractions(res.interactions || []))
              .catch((err) => setInteractionError(err.message || "Could not load activity"));
          }}
        />

        <NextActionPanel
          lead={activeLead}
          onUpdated={(updatedLead) => {
            handleLeadUpdated(updatedLead);
            setInteractions(null);
            Promise.all([leadsApi.interactions(updatedLead._id), leadsApi.stageHistory(updatedLead._id)])
              .then(([activity, history]) => {
                setInteractions(activity.interactions || []);
                setStageHistory(history.histories || []);
              })
              .catch((err) => setInteractionError(err.message || "Could not load activity"));
          }}
        />

        <ActivityTimeline
          interactions={mergeTimeline(interactions, stageHistory)}
          error={interactionError}
          onLog={() => setInteractionOpen(true)}
        />

        <PipelineHistory histories={stageHistory} currentStage={activeLead.status} />

        {/* AI summary */}
        <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <Sparkles className="h-4 w-4" /> AI Lead Summary
            </div>
            <Button size="sm" variant="subtle" onClick={runSummary} loading={loadingSummary}>
              {summary ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {summary ? "Regenerate" : "Analyze"}
            </Button>
          </div>

          {loadingSummary && <Spinner className="p-4" />}

          {summary && (
            <div className="mt-3 space-y-3 animate-fade-up">
              <p className="text-sm leading-relaxed text-ink">{displayAIText(summary.summary)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="text-xs text-ink-soft">Risk score</p>
                  <p className={cn("text-lg font-bold", riskTone)}>
                    {summary.riskScore}
                    <span className="text-sm text-ink-soft">/100</span>
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="text-xs text-ink-soft">Suggested priority</p>
                  <p className="text-lg font-bold text-ink">{summary.suggestedPriority}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-surface p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <p className="text-sm text-ink">
                  <span className="font-medium">Next best action: </span>
                  {displayAIText(summary.nextBestAction)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setEmailOpen(true)} className="col-span-2">
            <Wand2 className="h-4 w-4" /> Generate AI email
          </Button>
          <Button variant="secondary" onClick={() => onEdit(lead)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="danger" onClick={() => onDelete(lead)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Added {shortDate(lead.createdAt)}
        </p>
      </Drawer>

      <AiEmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} lead={activeLead} />
      <InteractionDialog
        open={interactionOpen}
        lead={activeLead}
        onClose={() => setInteractionOpen(false)}
        onCreated={(interaction) => {
          setInteractions((current) => [interaction, ...(current || [])]);
          setInteractionOpen(false);
        }}
      />
    </>
  );
}

const QUALIFICATION_STATUSES = {UNQUALIFIED: "Unqualified", QUALIFIED: "Qualified", DISQUALIFIED: "Disqualified"};
const BUYING_INTENTS = {LOW: "Low", MEDIUM: "Medium", HIGH: "High"};

function QualificationPanel({lead, onUpdated}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({});
  const score = lead.score ?? 0;
  const factors = lead.factors || [];
  const missing = lead.missing || [];

  const edit = () => {
    setForm({qualificationStatus: lead.qualificationStatus || "UNQUALIFIED", buyingIntent: lead.buyingIntent || "", decisionMakerIdentified: Boolean(lead.decisionMakerIdentified), budgetKnown: Boolean(lead.budgetKnown), timelineKnown: Boolean(lead.timelineKnown), needIdentified: Boolean(lead.needIdentified)});
    setError(""); setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await leadsApi.updateQualification(lead._id, form);
      onUpdated(response.lead); setOpen(false); toast.success("Qualification updated");
    } catch (err) { setError(err.message || "Could not update qualification"); }
    finally { setSaving(false); }
  };
  return <>
    <section className="mt-5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Qualification</p><p className="mt-1 text-sm font-semibold text-ink">{QUALIFICATION_STATUSES[lead.qualificationStatus] || "Unqualified"}</p></div><Button size="sm" variant="outline" onClick={edit}><Pencil className="h-4 w-4" /> Edit qualification</Button></div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Info value={BUYING_INTENTS[lead.buyingIntent] || "Not set"} label="Buying intent" /><Info value={lead.decisionMakerIdentified ? "Yes" : "No"} label="Decision maker" /><Info value={lead.budgetKnown ? "Known" : "Unknown"} label="Budget" /><Info value={lead.timelineKnown ? "Known" : "Unknown"} label="Timeline" /><Info value={lead.needIdentified ? "Identified" : "Missing"} label="Need" /></div>
    </section>
    <section className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Lead priority</p><p className="mt-1 text-2xl font-bold text-ink">{score} <span className="text-sm font-medium text-ink-soft">/ 100</span></p><p className="text-sm font-semibold text-brand-700">{lead.category || "Low"} priority</p></div><div className="text-right"><p className="text-xs text-ink-soft">Why?</p><div className="mt-1 space-y-1 text-xs text-left">{factors.filter((factor) => factor.points > 0).slice(0, 4).map((factor) => <p key={factor.label} className="text-emerald-700">+ {factor.label}</p>)}{factors.filter((factor) => !factor.positive).slice(0, 2).map((factor) => <p key={factor.label} className="text-rose-700">− {factor.label}</p>)}</div></div></div>{missing.length > 0 && <p className="mt-3 border-t border-brand-100 pt-2 text-xs text-ink-soft">Missing information: {missing.join(", ")}</p>}</section>
    <Dialog open={open} onClose={() => setOpen(false)} title="Edit qualification" description="Record only what is known about this lead."><form onSubmit={save} className="space-y-4">{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<Field label="Qualification status"><Select value={form.qualificationStatus || "UNQUALIFIED"} onChange={(event) => setForm({...form, qualificationStatus: event.target.value})}>{Object.entries(QUALIFICATION_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field><Field label="Buying intent"><Select value={form.buyingIntent || ""} onChange={(event) => setForm({...form, buyingIntent: event.target.value})}><option value="">Not set</option>{Object.entries(BUYING_INTENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field><div className="space-y-2">{[["decisionMakerIdentified", "Decision maker identified"], ["budgetKnown", "Budget known"], ["timelineKnown", "Timeline known"], ["needIdentified", "Need/problem identified"]].map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted/40 px-3 py-2.5 text-sm text-ink"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm({...form, [key]: event.target.checked})} className="h-4 w-4 accent-brand-600" />{label}</label>)}</div><div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" className="flex-1" loading={saving}>Save</Button></div></form></Dialog>
  </>;
}

function Info({label, value}) { return <div className="rounded-xl bg-surface-muted/60 p-2"><p className="text-ink-soft">{label}</p><p className="mt-0.5 font-medium text-ink">{value}</p></div>; }

function mergeTimeline(interactions, histories) {
  if (interactions === null || histories === null) return null;
  return [
    ...(interactions || []),
    ...(histories || []).map((history) => ({
      _id: `stage-${history._id}`,
      timelineType: "stage",
      fromStage: history.fromStage,
      toStage: history.toStage,
      timestamp: history.changedAt,
      changedBy: history.changedBy,
    })),
  ].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
}

function PipelineHistory({histories, currentStage}) {
  if (histories === null) return <div className="mt-5"><Spinner className="p-4" /></div>;
  return (
    <section className="mt-5 rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div><h3 className="text-sm font-semibold text-ink">Pipeline history</h3><p className="text-xs text-ink-soft">Stage transitions and time in stage</p></div>
        {currentStage && <Badge>{currentStage}</Badge>}
      </div>
      {!histories.length ? <p className="py-3 text-center text-sm text-ink-soft">No stage history yet.</p> : <div className="space-y-3">{[...histories].reverse().map((history, index, ordered) => { const next = ordered[index + 1]; const end = next?.changedAt || new Date(); const duration = formatStageDuration(history.changedAt, end); return <div key={history._id} className="relative pl-5 before:absolute before:bottom-[-12px] before:left-[5px] before:top-2 before:w-px before:bg-line last:before:hidden"><span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-50" /><div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium text-ink">{history.fromStage || "Created"}</span><span className="text-ink-soft">→</span><span className="font-semibold text-ink">{history.toStage}</span></div><p className="mt-1 text-xs text-ink-soft">{shortDate(history.changedAt)} · {timeOf(history.changedAt)} · {history.changedBy?.name || "User"} · {index === ordered.length - 1 ? "Still active" : duration}</p></div>; })}</div>}
    </section>
  );
}

function formatStageDuration(start, end) {
  const hours = Math.max(0, (new Date(end) - new Date(start)) / 3600000);
  if (hours < 24) return `${Math.round(hours * 10) / 10}h in stage`;
  return `${Math.round((hours / 24) * 10) / 10}d in stage`;
}

function NextActionPanel({ lead, onUpdated }) {
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());
  const hasAction = Boolean(lead.nextAction);
  const due = lead.nextActionDueAt ? new Date(lead.nextActionDueAt) : null;
  const overdue = due && due.getTime() < now;
  const today = due && due.toDateString() === new Date(now).toDateString();
  const dueLabel = overdue ? "Overdue" : today ? "Due today" : "Due soon";

  const save = async (values) => {
    setSaving(true);
    setError("");
    try {
      const response = await leadsApi.updateNextAction(lead._id, values);
      onUpdated(response.lead);
      setFormOpen(false);
      toast.success(values.createTask ? "Next action and task saved" : "Next action saved");
    } catch (err) {
      setError(err.message || "Could not save next action");
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await leadsApi.completeNextAction(lead._id);
      onUpdated(response.lead);
      toast.success("Next action completed");
    } catch (err) {
      setError(err.message || "Could not complete next action");
    } finally {
      setSaving(false);
    }
  };

  const clear = () => save({nextAction: null, nextActionDueAt: null});

  return (
    <section className={cn("mt-5 rounded-2xl border p-4", hasAction ? overdue ? "border-rose-200 bg-rose-50/60" : "border-brand-100 bg-brand-50/50" : "border-amber-200 bg-amber-50/50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasAction ? <Zap className="h-4 w-4 text-brand-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Next action</p>
            <p className="mt-1 text-sm font-semibold text-ink">{hasAction ? lead.nextAction : "No next action"}</p>
          </div>
        </div>
        {hasAction && <Badge className={overdue ? "bg-rose-100 text-rose-700" : today ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>{dueLabel}</Badge>}
      </div>
      {hasAction ? (
        <>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft"><Clock3 className="h-3.5 w-3.5" /> Due {due ? `${shortDate(due)} · ${timeOf(due)}` : "—"}</p>
          {lead.nextActionTask?.title && <p className="mt-1 text-xs text-ink-soft">Linked task: {lead.nextActionTask.title}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={complete} loading={saving}><CheckCircle2 className="h-4 w-4" /> Complete</Button>
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)} disabled={saving}><Pencil className="h-4 w-4" /> Edit</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-soft">This lead currently has nothing scheduled.</p>
          <Button size="sm" variant="subtle" className="mt-3" onClick={() => setFormOpen(true)}><Zap className="h-4 w-4" /> Add next action</Button>
        </>
      )}
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      <NextActionDialog open={formOpen} lead={lead} onClose={() => setFormOpen(false)} onSave={save} onClear={clear} saving={saving} />
    </section>
  );
}

const QUICK_ACTIONS = ["Call client", "Send WhatsApp", "Send email", "Follow up", "Schedule meeting", "Send quotation"];

function NextActionDialog({ open, lead, onClose, onSave, onClear, saving }) {
  const [action, setAction] = useState(lead.nextAction || "");
  const [due, setDue] = useState(() => toDateTimeLocal(lead.nextActionDueAt ? new Date(lead.nextActionDueAt) : new Date(Date.now() + 86400000)));
  const [createTask, setCreateTask] = useState(Boolean(lead.nextActionTask));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAction(lead.nextAction || "");
      setDue(toDateTimeLocal(lead.nextActionDueAt ? new Date(lead.nextActionDueAt) : new Date(Date.now() + 86400000)));
      setCreateTask(Boolean(lead.nextActionTask));
      setError("");
    }
  }, [open, lead]);

  const submit = (event) => {
    event.preventDefault();
    if (!action.trim()) { setError("Action is required. Use Clear action to remove it."); return; }
    if (action.trim().length > 500) { setError("Action cannot exceed 500 characters."); return; }
    const dueDate = new Date(due);
    if (!due || Number.isNaN(dueDate.getTime())) { setError("Enter a valid due date and time."); return; }
    onSave({nextAction: action.trim(), nextActionDueAt: dueDate.toISOString(), createTask});
  };

  return (
    <Dialog open={open} onClose={onClose} title={lead.nextAction ? "Edit next action" : "Add next action"} description="Decide what needs to happen next for this lead.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Action" error={error}><Textarea autoFocus rows={3} value={action} onChange={(event) => { setAction(event.target.value); setError(""); }} placeholder="Call client about proposal" /></Field>
        <div className="flex flex-wrap gap-2">{QUICK_ACTIONS.map((item) => <button type="button" key={item} onClick={() => setAction(item)} className="rounded-full border border-line bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700">{item}</button>)}</div>
        <Field label="Due date and time"><Input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} /></Field>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-muted/40 px-4 py-3"><input type="checkbox" checked={createTask} onChange={(event) => setCreateTask(event.target.checked)} className="h-4 w-4 accent-brand-600" /><span className="text-sm text-ink">Create or update a linked task</span></label>
        <div className="flex flex-wrap gap-2 pt-1"><Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>{lead.nextAction && <Button type="button" variant="ghost" onClick={onClear} loading={saving}>Clear action</Button>}<Button type="submit" className="flex-1" loading={saving}>{createTask ? "Save + create task" : "Save"}</Button></div>
      </form>
    </Dialog>
  );
}

const INTERACTION_TYPES = ["CALL", "WHATSAPP", "EMAIL", "SMS", "MEETING", "NOTE"];
const INTERACTION_OUTCOMES = [
  "CONNECTED", "NO_ANSWER", "REPLIED", "MEETING_BOOKED", "QUOTE_REQUESTED",
  "QUOTE_SENT", "FOLLOW_UP", "WON", "LOST", "OTHER",
];
const interactionLabels = {
  CALL: "Call", WHATSAPP: "WhatsApp", EMAIL: "Email", SMS: "SMS", MEETING: "Meeting", NOTE: "Note",
  CONNECTED: "Connected", NO_ANSWER: "No answer", REPLIED: "Replied", MEETING_BOOKED: "Meeting booked",
  QUOTE_REQUESTED: "Quote requested", QUOTE_SENT: "Quote sent", FOLLOW_UP: "Follow-up", WON: "Won", LOST: "Lost", OTHER: "Other",
};
const interactionIcons = { CALL: Phone, WHATSAPP: MessageCircle, EMAIL: Mail, SMS: MessageSquareText, MEETING: CalendarDays, NOTE: StickyNote };

function ActivityTimeline({ interactions, error, onLog }) {
  return (
    <section className="mt-6" aria-label="Lead activity">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Activity</h3>
          <p className="text-xs text-ink-soft">Every recorded touchpoint</p>
        </div>
        <Button size="sm" variant="subtle" onClick={onLog}>+ Log interaction</Button>
      </div>
      {interactions === null ? <Spinner className="p-5" /> : error ? (
        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      ) : interactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-ink-soft">
          No activity recorded yet.
        </div>
      ) : (
        <div className="relative space-y-4 pl-3 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-line">
          {interactions.map((interaction) => <ActivityItem key={interaction._id} interaction={interaction} />)}
        </div>
      )}
    </section>
  );
}

function ActivityItem({ interaction }) {
  if (interaction.timelineType === "stage") {
    return <article className="relative flex gap-3"><div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-4 ring-canvas"><Zap className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1 rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft)]"><p className="text-xs font-semibold text-ink">Stage changed</p><p className="mt-1 text-sm font-medium text-ink">{interaction.fromStage || "Created"} → {interaction.toStage}</p><p className="mt-2 text-xs text-ink-soft">{relative(interaction.timestamp)} · {timeOf(interaction.timestamp)}{interaction.changedBy?.name ? ` · ${interaction.changedBy.name}` : ""}</p></div></article>;
  }
  const Icon = interactionIcons[interaction.channel] || StickyNote;
  const date = interaction.timestamp || interaction.createdAt;
  return (
    <article className="relative flex gap-3">
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-4 ring-canvas">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-ink">{interactionLabels[interaction.channel] || interaction.channel}</span>
          {interaction.direction && <span className="text-ink-soft">{interaction.direction === "OUTBOUND" ? "Outbound" : "Inbound"}</span>}
          {interaction.outcome && <Badge className="bg-brand-50 text-brand-700">{interactionLabels[interaction.outcome] || interaction.outcome}</Badge>}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">{interaction.summary}</p>
        <p className="mt-2 text-xs text-ink-soft" title={date ? `${shortDate(date)} · ${timeOf(date)}` : ""}>
          {date ? `${relative(date)} · ${timeOf(date)}` : ""}{interaction.createdBy?.name ? ` · ${interaction.createdBy.name}` : ""}
        </p>
      </div>
    </article>
  );
}

function InteractionDialog({ open, lead, onClose, onCreated }) {
  const [form, setForm] = useState({type: "CALL", channel: "CALL", direction: "OUTBOUND", outcome: "CONNECTED", summary: "", timestamp: toDateTimeLocal(new Date())});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({type: "CALL", channel: "CALL", direction: "OUTBOUND", outcome: "CONNECTED", summary: "", timestamp: toDateTimeLocal(new Date())});
      setError("");
    }
  }, [open]);

  const update = (field) => (event) => setForm((current) => ({...current, [field]: event.target.value}));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.summary.trim()) { setError("Summary is required."); return; }
    setSaving(true); setError("");
    try {
      const parsedTimestamp = new Date(form.timestamp);
      if (Number.isNaN(parsedTimestamp.getTime())) { setError("Date and time must be valid."); return; }
      if (form.summary.trim().length > 2000) { setError("Summary cannot exceed 2000 characters."); return; }
      const res = await leadsApi.createInteraction(lead._id, {...form, summary: form.summary.trim(), timestamp: parsedTimestamp.toISOString()});
      onCreated(res.interaction);
    } catch (err) {
      setError(err.message || "Could not log interaction");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Log interaction" description={`Record activity for ${lead?.name || "this lead"}.`}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel"><Select value={form.type} onChange={(event) => setForm((current) => ({...current, type: event.target.value, channel: event.target.value}))}>{INTERACTION_TYPES.map((type) => <option key={type} value={type}>{interactionLabels[type]}</option>)}</Select></Field>
          <Field label="Direction"><Select value={form.direction} onChange={update("direction")}><option value="INBOUND">Incoming</option><option value="OUTBOUND">Outgoing</option></Select></Field>
        </div>
        <Field label="Outcome"><Select value={form.outcome} onChange={update("outcome")}>{INTERACTION_OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{interactionLabels[outcome]}</option>)}</Select></Field>
        <Field label="Summary"><Textarea autoFocus rows={4} value={form.summary} onChange={update("summary")} placeholder="What happened?" /></Field>
        <Field label="Date and time"><Input type="datetime-local" value={form.timestamp} onChange={update("timestamp")} /></Field>
        <div className="flex gap-3 pt-1"><Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button><Button type="submit" className="flex-1" loading={saving}>Log interaction</Button></div>
      </form>
    </Dialog>
  );
}

function toDateTimeLocal(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function InfoRow({ icon: Icon, value, href }) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-3 rounded-xl px-1 py-1.5 text-sm text-ink transition hover:text-brand-700">
      <Icon className="h-4 w-4 text-ink-soft" />
      <span className="truncate">{value}</span>
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  );
}
