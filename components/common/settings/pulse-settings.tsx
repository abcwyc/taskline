'use client';

import { useMemo } from 'react';
import { format, startOfWeek, subWeeks } from 'date-fns';
import {
   Bar,
   BarChart,
   CartesianGrid,
   Cell,
   Pie,
   PieChart,
   ResponsiveContainer,
   Tooltip,
   XAxis,
   YAxis,
} from 'recharts';
import type { Issue } from '@/mock-data/issues';
import { priorities } from '@/mock-data/priorities';
import type { StatusCategory } from '@/mock-data/status';
import { useIssuesStore } from '@/store/issues-store';
import { SettingsCard, SettingsSection, SettingsStatCard } from './shared';

/** Status categories in workflow order, with a stable chart color each. */
const CATEGORY_ORDER: { category: StatusCategory; label: string; color: string }[] = [
   { category: 'triage', label: 'Triage', color: '#f2790f' },
   { category: 'backlog', label: 'Backlog', color: '#95a2b3' },
   { category: 'unstarted', label: 'Unstarted', color: '#99a2b2' },
   { category: 'started', label: 'Started', color: '#facc15' },
   { category: 'completed', label: 'Completed', color: '#6771c5' },
   { category: 'canceled', label: 'Canceled', color: '#64748b' },
];

/** Same palette the insights panel uses for priorities. */
const PRIORITY_COLORS: Record<string, string> = {
   'no-priority': '#64748b',
   'urgent': '#eb5757',
   'high': '#f2994a',
   'medium': '#facc15',
   'low': '#4cb782',
};

const isOpen = (issue: Issue) =>
   issue.status.category !== 'completed' && issue.status.category !== 'canceled';

const TOOLTIP_STYLE = {
   background: 'var(--popover)',
   border: '1px solid var(--border)',
   borderRadius: 6,
   fontSize: 12,
   color: 'var(--popover-foreground)',
} as const;

const TICK = { fontSize: 11, fill: 'currentColor', opacity: 0.6 } as const;

/** Workspace "Pulse" settings: analytics computed client-side from the issue cache. */
export default function PulseSettings() {
   const issues = useIssuesStore((s) => s.issues);

   const stats = useMemo(() => {
      const open = issues.filter(isOpen);
      return {
         total: issues.length,
         open: open.length,
         completed: issues.filter((i) => i.status.category === 'completed').length,
         unassigned: issues.filter((i) => i.assignee === null).length,
      };
   }, [issues]);

   /* Issues created per ISO week, last 8 weeks. */
   const createdPerWeek = useMemo(() => {
      const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
      return Array.from({ length: 8 }, (_, i) => {
         const start = subWeeks(thisWeek, 7 - i);
         const end = subWeeks(thisWeek, 6 - i);
         const created = issues.filter((issue) => {
            const t = new Date(issue.createdAt).getTime();
            return t >= start.getTime() && t < end.getTime();
         }).length;
         return { week: format(start, 'MMM d'), created };
      });
   }, [issues]);

   const statusDistribution = useMemo(
      () =>
         CATEGORY_ORDER.map(({ category, label }) => ({
            label,
            count: issues.filter((i) => i.status.category === category).length,
         })),
      [issues]
   );

   /* Open issues per assignee (top 8, "Unassigned" bucket). */
   const assigneeLoad = useMemo(() => {
      const counts = new Map<string, number>();
      for (const issue of issues) {
         if (!isOpen(issue)) continue;
         const name = issue.assignee?.name ?? 'Unassigned';
         counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      return [...counts.entries()]
         .map(([name, count]) => ({ name, count }))
         .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
         .slice(0, 8);
   }, [issues]);

   const priorityMix = useMemo(
      () =>
         priorities.map((p) => ({
            id: p.id,
            name: p.name,
            value: issues.filter((i) => i.priority.id === p.id).length,
         })),
      [issues]
   );

   const isEmpty = issues.length === 0;

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-5xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium">Pulse</h1>
            <p className="text-sm text-muted-foreground mt-1">
               Analytics across every issue in this workspace.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
               <SettingsStatCard label="Total issues" value={stats.total} />
               <SettingsStatCard label="Open issues" value={stats.open} />
               <SettingsStatCard label="Completed" value={stats.completed} />
               <SettingsStatCard label="Unassigned" value={stats.unassigned} />
            </div>

            <div className="flex flex-col gap-10 mt-10">
               <SettingsSection
                  title="Throughput"
                  description="Issues created per week over the last 8 weeks."
               >
                  <SettingsCard className="p-4">
                     {isEmpty ? (
                        <EmptyChart />
                     ) : (
                        <ResponsiveContainer width="100%" height={220}>
                           <BarChart
                              data={createdPerWeek}
                              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                           >
                              <CartesianGrid
                                 vertical={false}
                                 strokeOpacity={0.15}
                                 strokeDasharray="3 3"
                              />
                              <XAxis dataKey="week" tick={TICK} axisLine={false} tickLine={false} />
                              <YAxis
                                 width={34}
                                 tick={TICK}
                                 axisLine={false}
                                 tickLine={false}
                                 allowDecimals={false}
                              />
                              <Tooltip
                                 cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                                 contentStyle={TOOLTIP_STYLE}
                              />
                              <Bar
                                 dataKey="created"
                                 name="Created"
                                 fill="#6771c5"
                                 maxBarSize={28}
                                 isAnimationActive={false}
                              />
                           </BarChart>
                        </ResponsiveContainer>
                     )}
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection
                  title="Status distribution"
                  description="Issues per status category."
               >
                  <SettingsCard className="p-4">
                     {isEmpty ? (
                        <EmptyChart />
                     ) : (
                        <ResponsiveContainer width="100%" height={220}>
                           <BarChart
                              data={statusDistribution}
                              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                           >
                              <CartesianGrid
                                 vertical={false}
                                 strokeOpacity={0.15}
                                 strokeDasharray="3 3"
                              />
                              <XAxis
                                 dataKey="label"
                                 tick={TICK}
                                 axisLine={false}
                                 tickLine={false}
                              />
                              <YAxis
                                 width={34}
                                 tick={TICK}
                                 axisLine={false}
                                 tickLine={false}
                                 allowDecimals={false}
                              />
                              <Tooltip
                                 cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                                 contentStyle={TOOLTIP_STYLE}
                              />
                              <Bar
                                 dataKey="count"
                                 name="Issues"
                                 maxBarSize={28}
                                 isAnimationActive={false}
                              >
                                 {statusDistribution.map((entry) => (
                                    <Cell
                                       key={entry.label}
                                       fill={
                                          CATEGORY_ORDER.find((c) => c.label === entry.label)?.color
                                       }
                                    />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     )}
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection
                  title="Assignee load"
                  description="Open issues per assignee (top 8)."
               >
                  <SettingsCard className="p-4">
                     {assigneeLoad.length === 0 ? (
                        <EmptyChart />
                     ) : (
                        <ResponsiveContainer
                           width="100%"
                           height={Math.max(160, assigneeLoad.length * 32)}
                        >
                           <BarChart
                              data={assigneeLoad}
                              layout="vertical"
                              margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
                           >
                              <CartesianGrid
                                 horizontal={false}
                                 strokeOpacity={0.15}
                                 strokeDasharray="3 3"
                              />
                              <XAxis
                                 type="number"
                                 tick={TICK}
                                 axisLine={false}
                                 tickLine={false}
                                 allowDecimals={false}
                              />
                              <YAxis
                                 type="category"
                                 dataKey="name"
                                 width={120}
                                 tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.8 }}
                                 axisLine={false}
                                 tickLine={false}
                              />
                              <Tooltip
                                 cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
                                 contentStyle={TOOLTIP_STYLE}
                              />
                              <Bar
                                 dataKey="count"
                                 name="Open issues"
                                 fill="#facc15"
                                 maxBarSize={18}
                                 isAnimationActive={false}
                              />
                           </BarChart>
                        </ResponsiveContainer>
                     )}
                  </SettingsCard>
               </SettingsSection>

               <SettingsSection title="Priority mix" description="Issues per priority.">
                  <SettingsCard className="p-4">
                     {isEmpty ? (
                        <EmptyChart />
                     ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                           <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                 <Pie
                                    data={priorityMix}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius="55%"
                                    outerRadius="85%"
                                    paddingAngle={2}
                                    isAnimationActive={false}
                                    stroke="none"
                                 >
                                    {priorityMix.map((entry) => (
                                       <Cell key={entry.id} fill={PRIORITY_COLORS[entry.id]} />
                                    ))}
                                 </Pie>
                                 <Tooltip contentStyle={TOOLTIP_STYLE} />
                              </PieChart>
                           </ResponsiveContainer>
                           <div className="flex flex-col divide-y divide-border/60 w-full max-w-xs">
                              {priorityMix.map((entry) => (
                                 <div
                                    key={entry.id}
                                    className="flex items-center justify-between gap-6 py-2"
                                 >
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                       <span
                                          className="size-2 rounded-[2px] shrink-0"
                                          style={{ backgroundColor: PRIORITY_COLORS[entry.id] }}
                                          aria-hidden="true"
                                       />
                                       {entry.name}
                                    </span>
                                    <span className="text-sm font-medium tabular-nums">
                                       {entry.value}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </SettingsCard>
               </SettingsSection>
            </div>

            <p className="text-xs text-muted-foreground mt-10">
               Analytics are computed from all issues in this workspace.
            </p>
         </div>
      </div>
   );
}

function EmptyChart() {
   return (
      <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground border border-dashed rounded-md">
         No data yet
      </div>
   );
}
