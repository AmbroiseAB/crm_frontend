import { useEffect, useState } from "react";
import { Users as UsersIcon, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, Badge, Avatar, Spinner } from "../../components/ui";
import { adminApi } from "../../lib/services";
import { currency } from "../../lib/format";

const ROLE_LABELS = { admin: "Admin", manager: "Manager", agent: "Agent" };

export default function AdminTeam() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi.team().then(setData).catch(() => setData({ team: [], unassigned: null }));
  }, []);

  if (data === null) return <Card><Spinner /></Card>;

  const rows = data.team || [];
  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      won: acc.won + r.won,
      wonValue: acc.wonValue + r.wonValue,
      pipelineValue: acc.pipelineValue + r.pipelineValue,
    }),
    { total: 0, won: 0, wonValue: 0, pipelineValue: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Team performance" subtitle="Leads and conversions by team member." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile icon={UsersIcon} tint="bg-brand-50 text-brand-600" label="Total leads" value={totals.total} />
        <Tile icon={Trophy} tint="bg-emerald-50 text-emerald-600" label="Won" value={totals.won} />
        <Tile icon={TrendingUp} tint="bg-sky-50 text-sky-600" label="Won value" value={currency(totals.wonValue, { compact: true })} />
        <Tile icon={TrendingUp} tint="bg-violet-50 text-violet-600" label="Open pipeline" value={currency(totals.pipelineValue, { compact: true })} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted/40">
              <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-6 py-3.5 font-medium">Member</th>
                <th className="px-6 py-3.5 font-medium">Leads</th>
                <th className="px-6 py-3.5 font-medium">Open</th>
                <th className="px-6 py-3.5 font-medium">Won</th>
                <th className="px-6 py-3.5 font-medium">Conversion</th>
                <th className="px-6 py-3.5 text-right font-medium">Won value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} size="sm" />
                      <div>
                        <p className="font-medium text-ink">{r.name}</p>
                        <Badge className="bg-surface-muted text-ink-soft">{ROLE_LABELS[r.role] || r.role}</Badge>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-ink">{r.total}</td>
                  <td className="px-6 py-3.5 text-ink-soft">{r.open}</td>
                  <td className="px-6 py-3.5 text-ink-soft">{r.won} / {r.lost} lost</td>
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-brand-700">{r.conversionRate}%</span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-semibold text-ink">{currency(r.wonValue)}</td>
                </tr>
              ))}
              {data.unassigned && data.unassigned.total > 0 && (
                <tr className="border-b border-line last:border-0 bg-amber-50/40">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-amber-800">Unassigned</p>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-ink">{data.unassigned.total}</td>
                  <td className="px-6 py-3.5 text-ink-soft">{data.unassigned.open}</td>
                  <td className="px-6 py-3.5 text-ink-soft">{data.unassigned.won} / {data.unassigned.lost} lost</td>
                  <td className="px-6 py-3.5">—</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-ink">{currency(data.unassigned.wonValue)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, label, value, tint }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
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
