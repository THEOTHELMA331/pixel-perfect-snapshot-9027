import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, ListPlus, Loader2, Mail, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { summarizeMeeting } from "@/lib/ai.functions";
import { copyText, downloadText, errMsg } from "@/lib/clipboard";
import { isoDate } from "@/lib/scheduler";
import { isDuplicateTask, setData, uid, useData } from "@/lib/store";
import type { Meeting, MeetingSummary } from "@/lib/types";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — AI Productivity Assistant" },
      { name: "description", content: "Turn long meeting notes into summaries, decisions, action items and deadlines." },
      { property: "og:title", content: "Meeting Notes Summarizer" },
      { property: "og:description", content: "Turn long meeting notes into summaries, decisions, action items and deadlines." },
    ],
  }),
  component: MeetingsPage,
});

function toReport(m: Meeting) {
  const s = m.summary;
  const list = (h: string, xs: string[]) => (xs.length ? `## ${h}\n${xs.map((x) => `- ${x}`).join("\n")}\n\n` : "");
  return `# ${m.title}\nDate: ${m.date}${m.attendees ? `\nAttendees: ${m.attendees}` : ""}\n\n## Summary\n${s.overview}\n\n${list("Topics", s.topics)}${list("Confirmed decisions", s.decisions)}${list("Proposals (not confirmed)", s.proposals)}${
    s.actionItems.length
      ? `## Action items\n| Task | Owner | Deadline | Status |\n|---|---|---|---|\n${s.actionItems.map((a) => `| ${a.description} | ${a.owner ?? "Not specified"} | ${a.deadline ?? "Not specified"} | ${a.status} |`).join("\n")}\n\n`
      : ""
  }${list("Deadlines", s.deadlines.map((d) => `${d.item}: ${d.date}`))}${list("Open questions", s.openQuestions)}`;
}

const blank = { title: "", date: isoDate(new Date()), attendees: "", notes: "", length: "Standard" };

function MeetingsPage() {
  const { meetings, tasks } = useData();
  const run = useServerFn(summarizeMeeting);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(meetings[0]?.id ?? null);
  const [importOpen, setImportOpen] = useState(false);
  const active = meetings.find((m) => m.id === activeId) ?? null;

  async function summarize(existing?: Meeting) {
    const src = existing ? { title: existing.title, date: existing.date, attendees: existing.attendees, notes: existing.notes, length: existing.length } : form;
    if (!src.title.trim() || src.notes.trim().length < 10) {
      toast.error("Add a meeting title and the meeting notes.");
      return;
    }
    setBusy(true);
    try {
      const summary = await run({ data: src });
      if (existing) {
        setData((d) => ({ ...d, meetings: d.meetings.map((m) => (m.id === existing.id ? { ...m, summary } : m)) }));
      } else {
        const m: Meeting = { id: uid(), ...src, summary, createdAt: new Date().toISOString() };
        setData((d) => ({ ...d, meetings: [m, ...d.meetings] }));
        setActiveId(m.id);
        setForm(blank);
      }
      toast.success("Meeting summarized.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const updateSummary = (patch: Partial<MeetingSummary>) =>
    active && setData((d) => ({ ...d, meetings: d.meetings.map((m) => (m.id === active.id ? { ...m, summary: { ...m.summary, ...patch } } : m)) }));

  return (
    <>
      <PageHeader title="Meeting Notes Summarizer" description="Paste your notes. Get a clear summary, confirmed decisions, and action items you can send to the planner." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="New meeting">
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="mt">Meeting title</Label><Input id="mt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Weekly project sync" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="md">Date</Label><Input id="md" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Summary length</Label>
                  <Select value={form.length} onValueChange={(v) => setForm({ ...form, length: v })}><SelectTrigger aria-label="Summary length"><SelectValue /></SelectTrigger><SelectContent>{["Brief", "Standard", "Detailed"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="ma">Attendees (optional)</Label><Input id="ma" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} placeholder="Thandi, Sipho, Lerato" /></div>
              <div className="space-y-1.5"><Label htmlFor="mn">Meeting notes</Label><Textarea id="mn" rows={10} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Paste raw notes or a transcript…" /></div>
              <Button onClick={() => summarize()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Summarize</Button>
            </div>
          </Panel>
          <Panel title="Saved meetings">
            {meetings.length === 0 ? <Empty>No meetings yet.</Empty> : (
              <ul className="space-y-1">
                {meetings.map((m) => (
                  <li key={m.id}>
                    <button onClick={() => setActiveId(m.id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${m.id === activeId ? "bg-accent font-semibold" : "hover:bg-muted"}`}>
                      {m.title}<span className="block text-xs font-normal text-muted-foreground">{m.date}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-3">
          {!active ? (
            <Panel>{busy ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading your notes…</div> : <Empty>Your meeting report will appear here.</Empty>}</Panel>
          ) : (
            <Panel title={active.title}>
              <p className="-mt-3 mb-4 text-xs text-muted-foreground">{active.date}{active.attendees && ` · ${active.attendees}`}</p>
              <div className="mb-5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setImportOpen(true)} disabled={!active.summary.actionItems.length}><ListPlus /> Add action items to Task Planner</Button>
                <Button size="sm" variant="outline" asChild><Link to="/email" search={{ meeting: active.id }}><Mail /> Draft follow-up email</Link></Button>
                <Button size="sm" variant="outline" onClick={() => copyText(toReport(active), "Summary copied")}><Copy /> Copy</Button>
                <Button size="sm" variant="outline" onClick={() => downloadText(`${active.title.replace(/\W+/g, "-")}.md`, toReport(active))}><Download /> Download</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => summarize(active)}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Regenerate</Button>
                <Button size="sm" variant="ghost" aria-label="Delete meeting" onClick={() => { if (confirm("Delete this meeting summary?")) { setData((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== active.id) })); setActiveId(null); } }}><Trash2 /></Button>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5"><Label htmlFor="ov">Summary</Label><Textarea id="ov" rows={5} value={active.summary.overview} onChange={(e) => updateSummary({ overview: e.target.value })} /></div>
                <ListBlock title="Main topics" items={active.summary.topics} />
                <ListBlock title="Confirmed decisions" items={active.summary.decisions} tone="success" />
                <ListBlock title="Proposals & suggestions (not confirmed)" items={active.summary.proposals} />
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Action items</h3>
                  {active.summary.actionItems.length === 0 ? <Empty>No action items found.</Empty> : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Owner</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {active.summary.actionItems.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="min-w-48"><p className="font-medium">{a.description}</p>{a.context && <p className="mt-0.5 text-xs text-muted-foreground">“{a.context}”</p>}</TableCell>
                              <TableCell>{a.owner ?? <span className="text-muted-foreground">Not specified</span>}</TableCell>
                              <TableCell className="whitespace-nowrap">{a.deadline ?? <span className="text-muted-foreground">Not specified</span>}</TableCell>
                              <TableCell>{a.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                <ListBlock title="Deadlines & dates" items={active.summary.deadlines.map((d) => `${d.item} — ${d.date}`)} />
                <ListBlock title="Unresolved questions" items={active.summary.openQuestions} tone="warning" />
              </div>
            </Panel>
          )}
        </div>
      </div>
      {active && <ImportDialog open={importOpen} onOpenChange={setImportOpen} meeting={active} existing={tasks} />}
    </>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "success" | "warning" }) {
  if (!items.length) return null;
  const dot = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((x, i) => <li key={i} className="flex gap-2 text-sm"><span className={`mt-2 size-1.5 shrink-0 rounded-full ${dot}`} />{x}</li>)}
      </ul>
    </div>
  );
}

function ImportDialog({ open, onOpenChange, meeting, existing }: { open: boolean; onOpenChange: (o: boolean) => void; meeting: Meeting; existing: ReturnType<typeof useData>["tasks"] }) {
  const items = meeting.summary.actionItems;
  const [sel, setSel] = useState<string[]>(() => items.filter((a) => !isDuplicateTask(existing, a.description, meeting.id)).map((a) => a.id));
  const isoOrUndef = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);

  function doImport() {
    const chosen = items.filter((a) => sel.includes(a.id) && !isDuplicateTask(existing, a.description, meeting.id));
    setData((d) => ({
      ...d,
      tasks: [
        ...chosen.map((a) => ({
          id: uid(),
          title: a.description,
          description: [a.context ? `From notes: “${a.context}”` : "", a.deadline && !isoOrUndef(a.deadline) ? `Deadline as stated: ${a.deadline}` : ""].filter(Boolean).join("\n"),
          dueDate: isoOrUndef(a.deadline),
          duration: 60,
          priority: "medium" as const,
          category: "Meeting",
          status: "todo" as const,
          preferredTime: "any" as const,
          owner: a.owner ?? undefined,
          sourceMeetingId: meeting.id,
          sourceMeetingTitle: meeting.title,
          createdAt: new Date().toISOString(),
        })),
        ...d.tasks,
      ],
    }));
    toast.success(`${chosen.length} task${chosen.length === 1 ? "" : "s"} added to the planner.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add action items to Task Planner</DialogTitle>
          <DialogDescription>Choose which items become tasks. They keep their owner, deadline and a link to “{meeting.title}”.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 space-y-2 overflow-auto">
          {items.map((a) => {
            const dup = isDuplicateTask(existing, a.description, meeting.id);
            return (
              <li key={a.id}>
                <label className={`flex gap-3 rounded-lg border p-3 text-sm ${dup ? "opacity-60" : ""}`}>
                  <Checkbox disabled={dup} checked={sel.includes(a.id) && !dup} onCheckedChange={(c) => setSel((s) => (c ? [...s, a.id] : s.filter((x) => x !== a.id)))} />
                  <span>
                    <span className="font-medium">{a.description}</span>
                    <span className="block text-xs text-muted-foreground">Owner: {a.owner ?? "Not specified"} · Deadline: {a.deadline ?? "Not specified"}</span>
                    {dup && <span className="block text-xs font-semibold text-warning">Already in your planner</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={doImport} disabled={!sel.some((id) => items.find((a) => a.id === id && !isDuplicateTask(existing, a.description, meeting.id)))}>Import selected</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
