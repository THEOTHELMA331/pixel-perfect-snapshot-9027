import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ListChecks, Mail, NotebookPen, Sparkles } from "lucide-react";
import { Empty, Panel } from "@/components/app-shell";
import { PriorityBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/lib/store";
import { addDays, fmtMin, isoDate, isOverdue, recommendNext } from "@/lib/scheduler";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Productivity Assistant" },
      { name: "description", content: "Your tasks, deadlines, meeting summaries and emails at a glance." },
      { property: "og:title", content: "Dashboard — AI Productivity Assistant" },
      { property: "og:description", content: "Your tasks, deadlines, meeting summaries and emails at a glance." },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof ListChecks; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={tone === "success" ? "size-4 text-success" : tone === "danger" ? "size-4 text-destructive" : "size-4 text-primary"} />
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Dashboard() {
  const { tasks, meetings, emails, schedule, settings } = useData();
  const today = isoDate(new Date());
  const done = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.length - done;
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const upcoming = tasks
    .filter((t) => t.status !== "done" && t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 7))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const todayBlocks = schedule?.blocks.filter((b) => b.date === today) ?? [];
  const doneToday = tasks.filter((t) => t.completedAt?.startsWith(today)).length;
  const next = recommendNext(tasks, today);

  return (
    <div className="space-y-6">
      <section className="bg-hero overflow-hidden rounded-2xl p-6 text-navy-foreground sm:p-8">
        <p className="text-sm text-navy-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          AI Productivity Assistant
        </h1>
        <p className="mt-2 max-w-xl text-sm text-navy-muted">
          Welcome back{settings.name ? `, ${settings.name}` : ""}. Write emails, turn meetings into tasks and plan your week — all in one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link to="/email"><Mail /> Write an email</Link></Button>
          <Button asChild variant="secondary"><Link to="/meetings"><NotebookPen /> Summarize a meeting</Link></Button>
          <Button asChild variant="secondary"><Link to="/tasks"><ListChecks /> Plan tasks</Link></Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total tasks" value={tasks.length} icon={ListChecks} />
        <Stat label="Completed" value={done} icon={CheckCircle2} tone="success" />
        <Stat label="Pending" value={pending} icon={CalendarClock} />
        <Stat label="Overdue" value={overdue.length} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Productivity overview" className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-sm"><span>Overall completion</span><span className="font-semibold">{pct}%</span></div>
              <Progress value={pct} className="[&>div]:bg-success" aria-label="Overall completion" />
            </div>
            <p className="text-sm text-muted-foreground">{doneToday} task{doneToday === 1 ? "" : "s"} completed today.</p>
            {next && (
              <div className="rounded-lg bg-accent p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-accent-foreground"><Sparkles className="size-3.5" /> Do next</p>
                <p className="mt-1 text-sm font-medium">{next.title}</p>
              </div>
            )}
            {overdue.length > 0 && (
              <p className="text-sm text-destructive">{overdue.length} overdue — consider rescheduling in the planner.</p>
            )}
          </div>
        </Panel>

        <Panel title="Today's schedule" action={<Link to="/calendar" className="text-xs font-medium text-primary hover:underline">Open calendar</Link>}>
          {todayBlocks.length === 0 ? (
            <Empty>No schedule for today yet. Generate one in the Task Planner.</Empty>
          ) : (
            <ul className="space-y-2">
              {todayBlocks.map((b, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{fmtMin(b.start)}–{fmtMin(b.end)}</span>
                  <span className={b.kind === "break" ? "text-muted-foreground" : "font-medium"}>{b.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming deadlines">
          {upcoming.length === 0 && overdue.length === 0 ? (
            <Empty>No deadlines in the next 7 days.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {[...overdue, ...upcoming].slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{t.title}</span>
                  <span className={isOverdue(t, today) ? "shrink-0 text-xs font-semibold text-destructive" : "shrink-0 text-xs text-muted-foreground"}>
                    {isOverdue(t, today) ? "Overdue" : t.dueDate}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent meeting summaries" action={<Link to="/meetings" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
          {meetings.length === 0 ? <Empty>No meetings summarized yet.</Empty> : (
            <ul className="divide-y">
              {meetings.slice(0, 4).map((m) => (
                <li key={m.id} className="py-2.5">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.date} · {m.summary.actionItems.length} action items · {m.summary.decisions.length} decisions</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recently generated emails" action={<Link to="/email" className="text-xs font-medium text-primary hover:underline">New email</Link>}>
          {emails.length === 0 ? <Empty>No emails generated yet.</Empty> : (
            <ul className="divide-y">
              {emails.slice(0, 4).map((e) => (
                <li key={e.id} className="py-2.5">
                  <p className="truncate text-sm font-medium">{e.subject}</p>
                  <p className="text-xs capitalize text-muted-foreground">{e.category} · {e.tone}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {pending > 0 && (
        <Panel title="High-priority open tasks">
          <ul className="divide-y">
            {tasks.filter((t) => t.status !== "done" && t.priority === "high").slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span>{t.title}</span> <PriorityBadge p={t.priority} />
              </li>
            ))}
          </ul>
          <Link to="/tasks" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Go to planner <ArrowRight className="size-3.5" /></Link>
        </Panel>
      )}
    </div>
  );
}
