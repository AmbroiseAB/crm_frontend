import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { UserPlus, Users as UsersIcon, ShieldCheck, Copy, CheckCircle2 } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { EmptyState } from "../../components/common/EmptyState";
import { Card, Button, Badge, Avatar, Select, Dialog, Field, Input, Spinner } from "../../components/ui";
import { adminApi } from "../../lib/services";
import { useAuth } from "../../context/AuthContext";
import { emailValidation, nameValidation, normalizeEmail, normalizeName } from "../../lib/validation";

const ROLE_LABELS = { admin: "Admin", manager: "Manager", agent: "Agent" };
const ROLE_STYLES = {
  admin: "bg-brand-50 text-brand-700",
  manager: "bg-violet-50 text-violet-700",
  agent: "bg-sky-50 text-sky-700",
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invited, setInvited] = useState(null); // {user, tempPassword}

  const load = () => {
    setUsers(null);
    adminApi.listUsers().then((res) => setUsers(res.users)).catch(() => setUsers([]));
  };
  useEffect(load, []);

  const changeRole = async (member, role) => {
    try {
      await adminApi.setRole(member.id, role);
      toast.success(`${member.name} is now ${ROLE_LABELS[role]}`);
      load();
    } catch (err) {
      toast.error(err.message || "Could not change role");
    }
  };

  const toggleActive = async (member) => {
    try {
      await adminApi.setActive(member.id, !member.active);
      toast.success(member.active ? `${member.name} deactivated` : `${member.name} reactivated`);
      load();
    } catch (err) {
      toast.error(err.message || "Could not update user");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Team members" subtitle="Invite teammates and manage their roles.">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite user
        </Button>
      </PageHeader>

      {users === null ? (
        <Card><Spinner /></Card>
      ) : users.length === 0 ? (
        <Card>
          <EmptyState icon={UsersIcon} title="No team members yet" description="Invite your first teammate to collaborate on leads." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted/40">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-6 py-3.5 font-medium">Member</th>
                  <th className="px-6 py-3.5 font-medium">Role</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {users.map((member) => {
                  const isSelf = String(member.id) === String(user?.id);
                  const locked = member.isOwner || isSelf;
                  return (
                    <tr key={member.id} className="border-b border-line last:border-0">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} size="sm" />
                          <div>
                            <p className="font-medium text-ink">
                              {member.name} {member.isOwner && <span className="text-xs text-ink-soft">(owner)</span>}
                            </p>
                            <p className="text-xs text-ink-soft">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {locked ? (
                          <Badge className={ROLE_STYLES[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                        ) : (
                          <Select value={member.role} onChange={(e) => changeRole(member, e.target.value)} className="w-32">
                            <option value="manager">Manager</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                          </Select>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge className={member.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
                          {member.active ? "Active" : "Deactivated"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {!locked && (
                          <Button size="sm" variant={member.active ? "outline" : "secondary"} onClick={() => toggleActive(member)}>
                            {member.active ? "Deactivate" : "Reactivate"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(result) => { setInviteOpen(false); setInvited(result); load(); }}
      />
      <CredentialsDialog invited={invited} onClose={() => setInvited(null)} />
    </div>
  );
}

function InviteDialog({ open, onClose, onInvited }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { role: "agent" } });

  useEffect(() => { if (open) reset({ role: "agent", name: "", email: "" }); }, [open, reset]);

  const onSubmit = async (form) => {
    try {
      const res = await adminApi.inviteUser({ name: normalizeName(form.name), email: normalizeEmail(form.email), role: form.role });
      toast.success(`${res.user.name} invited`);
      onInvited(res);
    } catch (err) {
      toast.error(err.message || "Could not invite user");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Invite a team member" description="They'll join your organization with the role you choose.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full name" error={errors.name?.message}>
          <Input placeholder="Teammate name" {...register("name", { validate: nameValidation() })} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" placeholder="teammate@company.com" {...register("email", { validate: emailValidation(true) })} />
        </Field>
        <Field label="Role">
          <Select {...register("role")}>
            <option value="agent">Agent — sees only leads assigned to them</option>
            <option value="manager">Manager — sees all leads, can assign</option>
            <option value="admin">Admin — full access</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}><UserPlus className="h-4 w-4" /> Invite</Button>
        </div>
      </form>
    </Dialog>
  );
}

function CredentialsDialog({ invited, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!invited) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invited.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard may be unavailable */ }
  };
  return (
    <Dialog open={Boolean(invited)} onClose={onClose} title="User invited" description="Share these temporary credentials securely. They can change the password from Settings after signing in.">
      <div className="space-y-3">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <ShieldCheck className="h-4 w-4" /> {invited.user.name} · {invited.user.email}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2">
            <code className="font-mono text-sm text-ink">{invited.tempPassword}</code>
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}
