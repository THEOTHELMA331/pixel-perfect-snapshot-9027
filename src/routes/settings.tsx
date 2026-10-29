import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoDate } from "@/lib/scheduler";
import { defaultSettings, setData, uid, useData } from "@/lib/store";
import type { Settings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Productivity Assistant" },
      { name: "description", content: "Set your working hours, breaks, work days and existing commitments." },
      { property: "og:title", content: "Settings — AI Productivity Assistant" },
      { property: "og:description", content: "Set your working hours, breaks, work days and existing commitments." },
    ],
  }),
  component: SettingsPage,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function SettingsPage() {
  const { settings } = useData();
  const update = (patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const [c, setC] = useState({ title: "", date: isoDate(new Date()), start: "10:00", end: "11:00" });

  function addCommitment() {
    if (!c.title.trim()) return toast.error("Give the commitment a name.");
    if (c.end <= c.start) return toast.error("End time must be after start time.");
    update({ commitments: [...settings.commitments, { id: uid(), ...c }].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)) });
    setC({ ...c, title: "" });
  }

  return (
    <>
      <PageHeader title="Settings" description="These preferences shape how the planner builds your schedule." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profile & working hours">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="nm">Your name</Label><Input id="nm" value={settings.name} onChange={(e) => update({ name: e.target.value })} placeholder="Used in your welcome message" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="st">Start time</Label><Input id="st" type="time" value={settings.startTime} onChange={(e) => update({ startTime: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="et">Finish time</Label><Input id="et" type="time" value={settings.endTime} onChange={(e) => update({ endTime: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="br">Break between tasks (min)</Label><Input id="br" type="number" min={0} step={5} value={settings.breakMinutes} onChange={(e) => update({ breakMinutes: Math.max(0, Number(e.target.value)) })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ms">Max work session (min)</Label><Input id="ms" type="number" min={15} step={15} value={settings.maxSession} onChange={(e) => update({ maxSession: Math.max(15, Number(e.target.value)) })} /></div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Working days</legend>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={settings.workDays.includes(i)} onCheckedChange={(on) => update({ workDays: on ? [...settings.workDays, i].sort() : settings.workDays.filter((x) => x !== i) })} />{d}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Panel>

        <Panel title="Existing commitments">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="ct">Name</Label><Input id="ct" value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder="Team stand-up" /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="cd">Date</Label><Input id="cd" type="date" value={c.date} onChange={(e) => setC({ ...c, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="cs">From</Label><Input id="cs" type="time" value={c.start} onChange={(e) => setC({ ...c, start: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ce">To</Label><Input id="ce" type="time" value={c.end} onChange={(e) => setC({ ...c, end: e.target.value })} /></div>
          </div>
          <Button className="mt-3" variant="secondary" onClick={addCommitment}><Plus /> Add commitment</Button>
          <div className="mt-4">
            {settings.commitments.length === 0 ? <Empty>No commitments added.</Empty> : (
              <ul className="divide-y">
                {settings.commitments.map((x) => (
                  <li key={x.id} className="flex items-center justify-between py-2 text-sm">
                    <span><span className="font-medium">{x.title}</span> <span className="text-muted-foreground">· {x.date} {x.start}–{x.end}</span></span>
                    <Button size="icon" variant="ghost" aria-label={`Remove ${x.title}`} onClick={() => update({ commitments: settings.commitments.filter((y) => y.id !== x.id) })}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Data" className="lg:col-span-2">
          <p className="mb-3 text-sm text-muted-foreground">Your tasks, meetings and emails are stored in this browser only.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { update(defaultSettings); toast.success("Settings reset."); }}>Reset settings</Button>
            <Button variant="destructive" onClick={() => { if (confirm("Delete ALL tasks, meetings, emails and schedules? This cannot be undone.")) { setData((d) => ({ ...d, tasks: [], meetings: [], emails: [], schedule: null })); toast.success("All data cleared."); } }}>Clear all data</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
