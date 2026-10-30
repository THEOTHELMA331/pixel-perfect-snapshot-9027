import { describe, expect, it } from "vitest";
import { generateSchedule, recommendNext } from "@/lib/scheduler";
import { defaultSettings } from "@/lib/store";
import type { Task } from "@/lib/types";

const mk = (p: Partial<Task>): Task => ({
  id: p.id ?? Math.random().toString(),
  title: p.title ?? "t",
  description: "",
  duration: 60,
  priority: "medium",
  category: "Work",
  status: "todo",
  preferredTime: "any",
  createdAt: "",
  ...p,
});

// 2026-11-02 is a Monday
const MON = "2026-11-02";

describe("scheduler", () => {
  it("never overlaps blocks", () => {
    const tasks = [mk({ id: "a", duration: 120 }), mk({ id: "b", duration: 90 }), mk({ id: "c", duration: 45 })];
    const s = generateSchedule(tasks, defaultSettings, MON, "day");
    const b = s.blocks.filter((x) => x.kind !== "break").sort((x, y) => x.start - y.start);
    for (let i = 1; i < b.length; i++) expect(b[i]!.start).toBeGreaterThanOrEqual(b[i - 1]!.end);
  });

  it("reports tasks that cannot fit instead of dropping them", () => {
    const tasks = [mk({ id: "big", duration: 600 })];
    const s = generateSchedule(tasks, defaultSettings, MON, "day");
    expect(s.unscheduled.map((u) => u.taskId)).toEqual(["big"]);
  });

  it("splits sessions at the maximum session length", () => {
    const s = generateSchedule([mk({ id: "a", duration: 150 })], defaultSettings, MON, "day");
    const parts = s.blocks.filter((b) => b.taskId === "a");
    expect(parts.every((p) => p.end - p.start <= 90)).toBe(true);
  });

  it("avoids existing commitments", () => {
    const settings = { ...defaultSettings, commitments: [{ id: "c", title: "Standup", date: MON, start: "09:00", end: "10:00" }] };
    const s = generateSchedule([mk({ id: "a", duration: 30 })], settings, MON, "day");
    expect(s.blocks.find((b) => b.taskId === "a")!.start).toBeGreaterThanOrEqual(600);
  });

  it("skips non-working days", () => {
    const s = generateSchedule([mk({ id: "a" })], defaultSettings, "2026-11-01", "day"); // Sunday
    expect(s.unscheduled).toHaveLength(1);
  });

  it("recommends high priority before low", () => {
    const next = recommendNext([mk({ id: "l", priority: "low" }), mk({ id: "h", priority: "high" })], MON);
    expect(next?.id).toBe("h");
  });
});
