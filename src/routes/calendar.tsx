import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Empty, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { addDays, dayOfWeek, fmtMin, isoDate, toMin } from "@/lib/scheduler";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar & Schedule — AI Productivity Assistant" },
      { name: "description", content: "See your planned time blocks, commitments and deadlines on a weekly timeline." },
      { property: "og:title", content: "Calendar & Schedule" },
      { property: "og:description", content: "See your planned time blocks, commitments and deadlines on a weekly timeline." },
    ],
  }),
  component: CalendarPage,
});

const HOUR_PX = 48;

function CalendarPage() {
  const { schedule, tasks, settings } = useData();
  const today = isoDate(new Date());
  const monday = addDays(today, -((dayOfWeek(today) + 6) % 7));
  const [weekStart, setWeekStart] = useState(monday);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const blocks = [
    ...(schedule?.blocks.filter((b) => b.kind !== "commitment") ?? []),
    ...settings.commitments.map((c) => ({ title: c.title, date: c.date, start: toMin(c.start), end: toMin(c.end), kind: "commitment" as const })),
  ].filter((b) => days.includes(b.date));

  const startH = Math.min(Math.floor(toMin(settings.startTime) / 60), ...blocks.map((b) => Math.floor(b.start / 60)));
  const endH = Math.max(Math.ceil(toMin(settings.endTime) / 60), ...blocks.map((b) => Math.ceil(b.end / 60)));
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);

  return (
    <>
      <PageHeader
        title="Calendar & Schedule"
        description="Your planned time blocks, commitments and task deadlines for the week."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft /></Button>
            <Button variant="outline" onClick={() => setWeekStart(monday)}>This week</Button>
            <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight /></Button>
          </div>
        }
      />
      {!schedule && <div className="mb-4"><Empty>No schedule yet — <Link to="/tasks" className="font-medium text-primary hover:underline">generate one in the Task Planner</Link>.</Empty></div>}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="border-b" />
          {days.map((d) => {
            const due = tasks.filter((t) => t.dueDate === d && t.status !== "done");
            return (
              <div key={d} className={cn("border-b border-l p-2", d === today && "bg-accent")}>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{new Date(d + "T00:00").toLocaleDateString(undefined, { weekday: "short" })}</p>
                <p className="font-display text-lg font-semibold">{new Date(d + "T00:00").getDate()}</p>
                {due.map((t) => <p key={t.id} className="mt-1 truncate rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive" title={`Due: ${t.title}`}>Due: {t.title}</p>)}
              </div>
            );
          })}
          <div className="relative">
            {hours.map((h) => <div key={h} className="pr-2 text-right text-[11px] text-muted-foreground" style={{ height: HOUR_PX }}>{String(h).padStart(2, "0")}:00</div>)}
          </div>
          {days.map((d) => (
            <div key={d} className="relative border-l" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h) => <div key={h} className="border-b border-dashed" style={{ height: HOUR_PX }} />)}
              {blocks.filter((b) => b.date === d).map((b, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight",
                    b.kind === "task" && "bg-primary text-primary-foreground",
                    b.kind === "commitment" && "border border-primary/30 bg-secondary text-secondary-foreground",
                    b.kind === "break" && "bg-success-soft text-success",
                  )}
                  style={{ top: ((b.start - startH * 60) / 60) * HOUR_PX, height: Math.max(14, ((b.end - b.start) / 60) * HOUR_PX - 2) }}
                  title={`${b.title} ${fmtMin(b.start)}–${fmtMin(b.end)}`}
                >
                  <span className="font-semibold">{b.title}</span> <span className="opacity-80">{fmtMin(b.start)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" /> Task</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded border bg-secondary" /> Commitment</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-success-soft" /> Break</span>
      </div>
    </>
  );
}
