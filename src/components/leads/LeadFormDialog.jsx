import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, Button, Field, Input, Select, Textarea } from "../ui";
import { WonOverridePrompt } from "./WonOverridePrompt";
import { leadsApi, adminApi } from "../../lib/services";
import { useAuth } from "../../context/AuthContext";
import { LEAD_STAGES, LEAD_PRIORITIES, LEAD_SOURCES } from "../../lib/constants";
import {emailValidation, nameValidation, normalizeEmail, normalizeName, PHONE_COUNTRIES, phoneValidation} from "../../lib/validation";

/**
 * Create / edit a lead. When `lead` is provided we're editing; otherwise
 * creating. Calls `onSaved(lead)` so the parent can refresh its list.
 */
export function LeadFormDialog({ open, onClose, lead, onSaved }) {
  const editing = Boolean(lead?._id);
  const { canManageTeam } = useAuth();
  const [team, setTeam] = useState([]);
  const [wonBlock, setWonBlock] = useState(null); // pending payload when Won is gated
  const [overrideReason, setOverrideReason] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  // Managers/admins may pick an assignee when creating a lead.
  useEffect(() => {
    if (!open || !canManageTeam) return;
    adminApi.team().then((res) => setTeam(res.team || [])).catch(() => setTeam([]));
  }, [open, canManageTeam]);

  // Reset the form whenever the target lead changes / dialog opens.
  useEffect(() => {
    if (!open) return;
    setWonBlock(null);
    setOverrideReason("");
    reset({
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      phoneCountry: lead?.phoneCountry || "CM",
      company: lead?.company || "",
      status: lead?.status || "New",
      priority: lead?.priority || "Medium",
      source: lead?.source || "Website",
      value: lead?.value || 0,
      notes: lead?.notes || "",
      assignedTo: (lead?.assignedTo?._id || lead?.assignedTo || ""),
    });
  }, [open, lead, reset]);

  const save = async (payload) => {
    const res = editing
      ? await leadsApi.update(lead._id, payload)
      : await leadsApi.create(payload);
    toast.success(editing ? "Lead updated" : "Lead created");
    onSaved?.(res.lead);
    setWonBlock(null);
    onClose();
  };

  const onSubmit = async (form) => {
    const payload = { ...form, name: normalizeName(form.name), email: normalizeEmail(form.email || ""), phone: form.phone?.trim() || "", value: Number(form.value) };
    // Only managers/admins may set an assignee; otherwise let the server decide.
    if (!canManageTeam || editing) delete payload.assignedTo;
    try {
      await save(payload);
    } catch (err) {
      // Blocked Won transition → let managers/admins override with a reason.
      if (canManageTeam && /marked Qualified/i.test(err.message || "")) {
        setWonBlock(payload);
        return;
      }
      toast.error(err.message || "Could not save lead");
    }
  };

  const confirmOverride = async () => {
    if (!overrideReason.trim()) { toast.error("Please give a reason for the override"); return; }
    try {
      await save({ ...wonBlock, overrideReason: overrideReason.trim() });
      setOverrideReason("");
    } catch (err) {
      toast.error(err.message || "Could not override");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit lead" : "New lead"}
      description={editing ? "Update this lead's details." : "Add a lead to your pipeline."}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" error={errors.name?.message} className="col-span-2">
            <Input
              placeholder="Contact name"
              {...register("name", { validate: nameValidation("Lead name") })}
            />
          </Field>
          <Field label="Company">
            <Input placeholder="Company" {...register("company")} />
          </Field>
          <Field label="Email">
            <Input type="email" placeholder="email@company.com" {...register("email", { validate: emailValidation() })} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <div className="flex gap-2">
              <select className="w-28 rounded-xl border border-line bg-surface px-2 text-sm" {...register("phoneCountry")}>
                {PHONE_COUNTRIES.map(([code, callingCode, label]) => <option key={code} value={code}>{callingCode} {label}</option>)}
              </select>
              <Input placeholder="6 55 00 00 00" {...register("phone", { validate: (value, values) => phoneValidation(values.phoneCountry)(value) })} />
            </div>
          </Field>
          <Field label="Deal value (FCFA)">
            <Input type="number" min="0" placeholder="0" {...register("value")} />
          </Field>
          <Field label="Stage">
            <Select {...register("status")}>
              {LEAD_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select {...register("priority")}>
              {LEAD_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Source" className={canManageTeam && !editing ? "" : "col-span-2"}>
            <Select {...register("source")}>
              {LEAD_SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          {canManageTeam && !editing && (
            <Field label="Assign to">
              <Select {...register("assignedTo")}>
                <option value="">Auto / me</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Notes" className="col-span-2">
            <Textarea placeholder="Context, next steps…" {...register("notes")} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? "Save changes" : "Create lead"}
          </Button>
        </div>
      </form>

      {/* Won gate override — managers/admins only. */}
      {wonBlock && (
        <WonOverridePrompt
          className="mt-4"
          reason={overrideReason}
          onReasonChange={setOverrideReason}
          onCancel={() => { setWonBlock(null); setOverrideReason(""); }}
          onConfirm={confirmOverride}
        />
      )}
    </Dialog>
  );
}
