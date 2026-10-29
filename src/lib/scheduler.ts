import type { Commitment, Schedule, ScheduleBlock, Settings, Task, Unscheduled } from "./types";

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const fmtMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
export const dayOfWeek = (iso: string) => new Date(iso + "T00:00:00").getDay();

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

export function isOverdue(t: Task, today: string) {
  return t.status !== "done" && !!t.dueDate && t.dueDate < today;
}

/** Higher score = should be done sooner. Considers urgency, importance, duration and dependencies. */
export function taskScore(t: Task, today: string, all: Task[] = []) {
  let score = PRIORITY_WEIGHT[t.priority] * 10;
  if (t.dueDate) {
    const days = Math.round(
      (new Date(t.dueDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000,
    );
    if (days < 0) score += 40;
    else score += Math.max(0, 30 - days * 4);
  }
  if (t.status === "in_progress") score += 5;
  // tasks others depend on go first
  score += all.filter((o) => o.status !== "done" && o.dependsOn?.includes(t.id)).length * 8;
  // short quick wins get a small bump
  if (t.duration <= 30) score += 2;
  return score;
}

function blockedByOpenDependency(t: Task, all: Task[]) {
  return (t.dependsOn ?? []).some((id) => all.find((o) => o.id === id && o.status !== "done"));
}

export function recommendNext(tasks: Task[], today: string): Task | undefined {
  return tasks
    .filter((t) => t.status !== "done" && !blockedByOpenDependency(t, tasks))
    .sort((a, b) => taskScore(b, today, tasks) - taskScore(a, today, tasks))[0];
}

type Interval = { start: number; end: number };

function freeIntervals(date: string, settings: Settings, commitments: Commitment[]): Interval[] {
  let free: Interval[] = [{ start: toMin(settings.startTime), end: toMin(settings.endTime) }];
  for (const c of commitments.filter((c) => c.date === date)) {
    const cs = toMin(c.start);
    const ce = toMin(c.end);
    free = free.flatMap((iv) => {
      if (ce <= iv.start || cs >= iv.end) return [iv];
      const out: Interval[] = [];
      if (cs > iv.start) out.push({ start: iv.start, end: cs });
      if (ce < iv.end) out.push({ start: ce, end: iv.end });
      return out;
    });
  }
  return free.filter((iv) => iv.end - iv.start >= 15);
}

const preferredWindow = (p: Task["preferredTime"]): Interval | null =>
  p === "morning" ? { start: 0, end: 12 * 60 } : p === "afternoon" ? { start: 12 * 60, end: 17 * 60 } : p === "evening" ? { start: 17 * 60, end: 24 * 60 } : null;

/**
 * Builds non-overlapping time blocks across the given days. Tasks never get
 * silently dropped: anything that cannot fit is returned in `unscheduled`
 * with a reason.
 */
export function generateSchedule(
  tasks: Task[],
  settings: Settings,
  startDate: string,
  mode: "day" | "week",
  today: string = startDate,
): Schedule {
  const span = mode === "day" ? 1 : 7;
  const allDays = Array.from({ length: span }, (_, i) => addDays(startDate, i));
  const days = allDays.filter((d) => settings.workDays.includes(dayOfWeek(d)));
  const blocks: ScheduleBlock[] = [];
  const unscheduled: Unscheduled[] = [];

  for (const c of settings.commitments.filter((c) => days.includes(c.date))) {
    blocks.push({ title: c.title, date: c.date, start: toMin(c.start), end: toMin(c.end), kind: "commitment" });
  }

  const free: Record<string, Interval[]> = {};
  for (const d of days) free[d] = freeIntervals(d, settings, settings.commitments);

  const open = tasks.filter((t) => t.status !== "done");
  const ordered = [...open].sort((a, b) => taskScore(b, today, tasks) - taskScore(a, today, tasks));

  if (days.length === 0) {
    for (const t of ordered) unscheduled.push({ taskId: t.id, title: t.title, reason: "No working days in the selected period." });
    return { generatedAt: new Date().toISOString(), mode, startDate, days: allDays, blocks, unscheduled };
  }

  for (const t of ordered) {
    if (blockedByOpenDependency(t, tasks) && !ordered.some((o) => t.dependsOn?.includes(o.id))) {
      unscheduled.push({ taskId: t.id, title: t.title, reason: "Waiting on a task that is not yet complete." });
      continue;
    }
    let remaining = t.duration;
    const eligibleDays = days.filter((d) => !t.dueDate || t.dueDate < today || d <= t.dueDate);
    const placed: ScheduleBlock[] = [];
    const window = preferredWindow(t.preferredTime);
    const passes = window ? [window, null] : [null];

    for (const pass of passes) {
      // keep looping a pass until no progress
      let progress = true;
      while (remaining > 0 && progress) {
        progress = false;
        for (const d of eligibleDays) {
          const iv = free[d].find((x) => {
            const s = pass ? Math.max(x.start, pass.start) : x.start;
            const e = pass ? Math.min(x.end, pass.end) : x.end;
            return e - s >= Math.min(15, remaining);
          });
          if (!iv) continue;
          const s = pass ? Math.max(iv.start, pass.start) : iv.start;
          const e = pass ? Math.min(iv.end, pass.end) : iv.end;
          const len = Math.min(remaining, settings.maxSession, e - s);
          placed.push({ taskId: t.id, title: t.title, date: d, start: s, end: s + len, kind: "task" });
          const used = { start: s, end: s + len + settings.breakMinutes };
          free[d] = free[d]
            .flatMap((x) => {
              if (used.end <= x.start || used.start >= x.end) return [x];
              const out: Interval[] = [];
              if (used.start > x.start) out.push({ start: x.start, end: used.start });
              if (used.end < x.end) out.push({ start: used.end, end: x.end });
              return out;
            })
            .filter((x) => x.end - x.start >= 15);
          remaining -= len;
          progress = true;
          break;
        }
      }
      if (remaining <= 0) break;
    }

    if (remaining > 0) {
      // roll back partial placement so we never pretend a task is covered
      for (const b of placed) {
        free[b.date].push({ start: b.start, end: b.end + settings.breakMinutes });
        free[b.date].sort((a, c) => a.start - c.start);
      }
      const reason =
        eligibleDays.length === 0
          ? `Deadline (${t.dueDate}) falls before any available working day in this period.`
          : t.dueDate && t.dueDate >= today && t.dueDate < allDays[allDays.length - 1]
            ? `Not enough free time before the ${t.dueDate} deadline (needs ${t.duration} min).`
            : `Not enough free time in this period (needs ${t.duration} min).`;
      unscheduled.push({ taskId: t.id, title: t.title, reason });
    } else {
      blocks.push(...placed);
    }
  }

  // add visible break blocks between consecutive task blocks
  const taskBlocks = blocks.filter((b) => b.kind === "task");
  for (const d of days) {
    const dayBlocks = taskBlocks.filter((b) => b.date === d).sort((a, b) => a.start - b.start);
    for (let i = 0; i < dayBlocks.length - 1; i++) {
      const gapStart = dayBlocks[i].end;
      const gapEnd = Math.min(dayBlocks[i + 1].start, gapStart + settings.breakMinutes);
      if (settings.breakMinutes > 0 && gapEnd > gapStart) {
        blocks.push({ title: "Break", date: d, start: gapStart, end: gapEnd, kind: "break" });
      }
    }
  }

  blocks.sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));
  return { generatedAt: new Date().toISOString(), mode, startDate, days: allDays, blocks, unscheduled };
}
