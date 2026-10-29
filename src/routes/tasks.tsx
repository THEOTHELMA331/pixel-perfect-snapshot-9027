import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CalendarRange, Mail, Pencil, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Empty, PageHeader, Panel } from "@/components/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { TaskForm } from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, fmtMin, generateSchedule, isoDate, isOverdue, recommendNext } from "@/lib/scheduler";
import { setData, useData } from "@/lib/store";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — AI Productivity Assistant" },
      { name: "description", content: "Prioritize tasks and generate realistic daily or weekly schedules." },
      { property: "og:title", content: "AI Task Planner" },
      { property: "og:description", content: "Prioritize tasks and generate realistic daily or weekly schedules." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { tasks, settings, schedule } = useData();
  const navigate = useNavigate();
  const today = isoDate(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [f, setF] = useState({ status: "open", priority: "all", category: "all", deadline: "all" });
  const [plan, setPlan] = useState({ date: today, mode: "day" as "day" | "week" });

  const categories = Array.from(new Set(tasks.map((t) => t.category))).filter(Boolean);
  const next = recommendNext(tasks, today);

  const filtered = useMemo(() => tasks.filter((t) => {
    if (f.status === "open" && t.status === "done") return false;
    if (!["open", "all"].includes(f.status) && t.status !== f.status) return false;
    if (f.priority !== "all" && t.priority !== f.priority) return false;
    if (f.category !== "all" && t.category !== f.category) return false;
    if (f.deadline === "overdue" && !isOverdue(t, today)) return false;
    if (f.deadline === "week" && !(t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 7))) return false;
    if (f.deadline === "none" && t.dueDate) return false;
    return true;
  }), [tasks, f, today]);

  const toggleDone = (t: Task) =>
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status: x.status === "done" ? "todo" : "done", completedAt: x.status === "done" ? undefined : new Date().toISOString() } : x)) }));
  const setPriority = (t: Task, p: Task["priority"]) => setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, priority: p } : x)) }));

  function makeSchedule(start = plan.date, mode = plan.mode) {
    const s = generateSchedule(tasks, settings, start, mode, today);
    setData((d) => ({ ...d, schedule: s }));
    const n = s.blocks.filter((b) => b.kind === "task").length;
    if (s.unscheduled.length) toast.warning(`${n} blocks planned. ${s.unscheduled.length} task(s) didn't fit — see below.`);
    else toast.success(`Schedule ready with ${n} time blocks.`);
  }

  const doneThisWeek = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= addDays(today, -6)).length;
  const doneToday = tasks.filter((t) => t.completedAt?.startsWith(today)).length;
  const openMinutes = tasks.filter((t) => t.status !== "done").reduce((s, t) => s + t.duration, 0);

  return (
    <>
      <PageHeader
        title="AI Task Planner"
        description="Add tasks, let the planner rank them by urgency and importance, then build a schedule that fits your hours."
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> New task</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Panel><p className="text-xs uppercase text-muted-foreground">Completed today</p><p className="font-display text-2xl font-semibold text-success">{doneToday}</p></Panel>
        <Panel><p className="text-xs uppercase text-muted-foreground">Completed last 7 days</p><p className="font-display text-2xl font-semibold text-success">{doneThisWeek}</p></Panel>
        <Panel><p className="text-xs uppercase text-muted-foreground">Open workload</p><p className="font-display text-2xl font-semibold">{Math.round(openMinutes / 6) / 10} h</p></Panel>
      </div>

      {next && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-accent p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-primary" />
            <div><p className="text-xs font-semibold uppercase text-accent-foreground">Recommended next</p><p className="font-medium">{next.title}</p>
              <p className="text-xs text-muted-foreground">{next.priority} priority{next.dueDate ? ` · due ${next.dueDate}` : ""} · {next.duration} min</p></div>
          </div>
          <Button size="sm" variant="outline" onClick={() => toggleDone(next)}>Mark done</Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open tasks</SelectItem><SelectItem value="all">All statuses</SelectItem><SelectItem value="todo">To do</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent></Select>
            <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}><SelectTrigger aria-label="Filter by priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}><SelectTrigger aria-label="Filter by category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Select value={f.deadline} onValueChange={(v) => setF({ ...f, deadline: v })}><SelectTrigger aria-label="Filter by deadline"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any deadline</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="week">Due in 7 days</SelectItem><SelectItem value="none">No deadline</SelectItem></SelectContent></Select>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-secondary p-3 text-sm">
              <span>{selected.length} selected</span>
              <Button size="sm" onClick={() => navigate({ to: "/email", search: { tasks: selected.join(",") } })}><Mail /> Write email about these</Button>
            </div>
          )}

          {filtered.length === 0 ? <Empty>{tasks.length ? "No tasks match these filters." : "No tasks yet. Add one, or import action items from a meeting."}</Empty> : (
            <ul className="space-y-2">
              {filtered.map((t) => {
                const overdue = isOverdue(t, today);
                const soon = !overdue && t.dueDate && t.dueDate <= addDays(today, 2) && t.status !== "done";
                return (
                  <li key={t.id} className={`rounded-xl border bg-card p-4 shadow-card ${overdue ? "border-destructive/40" : ""}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox className="mt-1" checked={selected.includes(t.id)} onCheckedChange={(c) => setSelected((s) => (c ? [...s, t.id] : s.filter((x) => x !== t.id)))} aria-label={`Select ${t.title}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`font-medium ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                          <StatusBadge s={t.status} />
                          {overdue && <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle className="size-3" /> Overdue</span>}
                          {soon && <span className="text-xs font-semibold text-warning">Due soon</span>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.category} · {t.duration} min{t.dueDate ? ` · due ${t.dueDate}` : ""}{t.owner ? ` · ${t.owner}` : ""}
                          {t.sourceMeetingTitle && <> · from <Link to="/meetings" className="text-primary hover:underline">{t.sourceMeetingTitle}</Link></>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Select value={t.priority} onValueChange={(v) => setPriority(t, v as Task["priority"])}>
                          <SelectTrigger className="h-8 w-auto border-0 bg-transparent px-1 shadow-none" aria-label="Change priority"><PriorityBadge p={t.priority} /></SelectTrigger>
                          <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                        </Select>
                        <Button size="sm" variant={t.status === "done" ? "outline" : "secondary"} onClick={() => toggleDone(t)}>{t.status === "done" ? "Reopen" : "Done"}</Button>
                        <Button size="icon" variant="ghost" aria-label="Edit task" onClick={() => { setEditing(t); setFormOpen(true); }}><Pencil /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => { if (confirm(`Delete "${t.title}"?`)) setData((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) })); }}><Trash2 /></Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Generate schedule">
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="pd">Start date</Label><Input id="pd" type="date" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} /></div>
              <Select value={plan.mode} onValueChange={(v) => setPlan({ ...plan, mode: v as "day" | "week" })}><SelectTrigger aria-label="Plan length"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Daily plan</SelectItem><SelectItem value="week">Weekly plan (7 days)</SelectItem></SelectContent></Select>
              <p className="text-xs text-muted-foreground">Uses your hours ({settings.startTime}–{settings.endTime}), {settings.breakMinutes}-min breaks, {settings.maxSession}-min max sessions and commitments from <Link to="/settings" className="text-primary hover:underline">Settings</Link>.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => makeSchedule()}><CalendarRange /> Generate</Button>
                <Button variant="outline" onClick={() => makeSchedule(today, schedule?.mode ?? "day")} title="Re-plan unfinished tasks from today"><RotateCcw /> Reschedule unfinished</Button>
              </div>
            </div>
          </Panel>

          {schedule && (
            <Panel title={`Plan from ${schedule.startDate}`} action={<Link to="/calendar" className="text-xs font-medium text-primary hover:underline">Calendar view</Link>}>
              {schedule.unscheduled.length > 0 && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-semibold text-destructive">Couldn't fit {schedule.unscheduled.length} task(s)</p>
                  <ul className="mt-1.5 space-y-1 text-xs">{schedule.unscheduled.map((u) => <li key={u.taskId}><span className="font-medium">{u.title}</span> — {u.reason}</li>)}</ul>
                </div>
              )}
              <div className="max-h-96 space-y-3 overflow-auto">
                {schedule.days.map((d) => {
                  const bl = schedule.blocks.filter((b) => b.date === d);
                  if (!bl.length) return null;
                  return (
                    <div key={d}>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{new Date(d + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                      <ul className="space-y-1">{bl.map((b, i) => (
                        <li key={i} className={`flex gap-2 rounded px-2 py-1 text-sm ${b.kind === "task" ? "bg-accent" : b.kind === "commitment" ? "bg-secondary" : "text-muted-foreground"}`}>
                          <span className="w-24 shrink-0 tabular-nums text-xs leading-5">{fmtMin(b.start)}–{fmtMin(b.end)}</span><span className="truncate">{b.title}</span>
                        </li>))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </div>
      <TaskForm open={formOpen} onOpenChange={setFormOpen} task={editing} />
    </>
  );
}
