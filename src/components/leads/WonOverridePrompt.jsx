import { Button, Textarea } from "../ui";
import { cn } from "../../lib/utils";

/**
 * Shared manager/admin prompt shown when a lead is moved to "Won" without being
 * fully qualified. Collects a reason and confirms the override. Purely
 * presentational — the host owns the reason state and the confirm/cancel calls
 * (which send `overrideReason` to the existing update/reorder endpoints).
 */
export function WonOverridePrompt({ reason, onReasonChange, onCancel, onConfirm, busy, className }) {
  return (
    <div className={cn("rounded-2xl border border-amber-200 bg-amber-50/70 p-4", className)}>
      <p className="text-sm font-semibold text-amber-800">This lead isn't fully qualified</p>
      <p className="mt-1 text-xs text-amber-700/90">
        As a manager you can still mark it Won by recording why.
      </p>
      <Textarea
        className="mt-3"
        rows={2}
        autoFocus
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Reason for winning without full qualification…"
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} loading={busy}>
          Mark Won anyway
        </Button>
      </div>
    </div>
  );
}
