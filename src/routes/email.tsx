import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Eraser, Loader2, Maximize2, Minimize2, RefreshCw, Shuffle, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Empty, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { generateEmail, reviseEmail } from "@/lib/ai.functions";
import { copyText, errMsg } from "@/lib/clipboard";
import { setData, uid, useData } from "@/lib/store";

const CATEGORIES = ["Job application", "Business inquiry", "Meeting request", "Follow-up", "Complaint", "Thank-you", "Request for information", "Apology", "General professional"];
const TONES = ["Formal", "Friendly", "Persuasive", "Professional", "Apologetic", "Appreciative"];
const LENGTHS = ["Short", "Medium", "Long"];

export const Route = createFileRoute("/email")({
  validateSearch: z.object({ meeting: z.string().optional(), tasks: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Smart Email Generator — AI Productivity Assistant" },
      { name: "description", content: "Generate professional emails in any tone, using your meeting decisions and task details." },
      { property: "og:title", content: "Smart Email Generator" },
      { property: "og:description", content: "Generate professional emails in any tone, using your meeting decisions and task details." },
    ],
  }),
  component: EmailPage,
});

const blank = { recipient: "", subject: "", category: "General professional", points: "", tone: "Professional", length: "Medium" };

function EmailPage() {
  const search = Route.useSearch();
  const { meetings, tasks } = useData();
  const gen = useServerFn(generateEmail);
  const revise = useServerFn(reviseEmail);
  const [form, setForm] = useState(() => ({
    ...blank,
    category: search.meeting ? "Follow-up" : blank.category,
  }));
  const [meetingId, setMeetingId] = useState<string>(search.meeting ?? "none");
  const [taskIds, setTaskIds] = useState<string[]>(search.tasks ? search.tasks.split(",") : []);
  const [out, setOut] = useState<{ subject: string; body: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const set = (k: keyof typeof blank) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const meeting = meetings.find((m) => m.id === meetingId);
  const selTasks = tasks.filter((t) => taskIds.includes(t.id));

  function buildContext() {
    const parts: string[] = [];
    if (meeting) {
      parts.push(
        `Meeting "${meeting.title}" on ${meeting.date}.`,
        meeting.summary.decisions.length ? `Confirmed decisions:\n- ${meeting.summary.decisions.join("\n- ")}` : "",
        meeting.summary.actionItems.length
          ? `Action items:\n- ${meeting.summary.actionItems.map((a) => `${a.description}${a.owner ? ` (owner: ${a.owner})` : ""}${a.deadline ? ` (due ${a.deadline})` : ""}`).join("\n- ")}`
          : "",
      );
    }
    if (selTasks.length) {
      parts.push(
        `Tasks:\n- ${selTasks.map((t) => `${t.title} — status: ${t.status.replace("_", " ")}${t.dueDate ? `, due ${t.dueDate}` : ""}${t.owner ? `, assigned to ${t.owner}` : ""}${t.description ? `. ${t.description}` : ""}`).join("\n- ")}`,
      );
    }
    return parts.filter(Boolean).join("\n\n");
  }

  async function onGenerate() {
    if (!form.subject.trim() || (!form.points.trim() && !meeting && !selTasks.length)) {
      toast.error("Add a subject and some key points (or pick a meeting/task to use).");
      return;
    }
    setBusy("generate");
    try {
      const r = await gen({ data: { ...form, context: buildContext() } });
      setOut(r);
      setData((d) => ({ ...d, emails: [{ id: uid(), ...r, tone: form.tone, category: form.category, createdAt: new Date().toISOString() }, ...d.emails].slice(0, 50) }));
      toast.success("Email ready — review and edit before sending.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function onRevise(mode: "rewrite" | "shorten" | "expand" | "alternative") {
    if (!out) return;
    setBusy(mode);
    try {
      setOut(await revise({ data: { mode, ...out, tone: form.tone } }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Smart Email Generator" description="Describe what you need, pick a tone, and get a polished email. Nothing is sent — you review and copy it." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Details">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="rec">Recipient (optional)</Label><Input id="rec" value={form.recipient} onChange={(e) => set("recipient")(e.target.value)} placeholder="e.g. Ms. Naidoo" /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={set("category")}><SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="subj">Subject or purpose</Label><Input id="subj" value={form.subject} onChange={(e) => set("subject")(e.target.value)} placeholder="e.g. Follow up on Q3 planning meeting" /></div>
            <div className="space-y-1.5"><Label htmlFor="pts">Main message / key points</Label><Textarea id="pts" rows={5} value={form.points} onChange={(e) => set("points")(e.target.value)} placeholder="List the facts and requests you want included" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Tone</Label><Select value={form.tone} onValueChange={set("tone")}><SelectTrigger aria-label="Tone"><SelectValue /></SelectTrigger><SelectContent>{TONES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Length</Label><Select value={form.length} onValueChange={set("length")}><SelectTrigger aria-label="Length"><SelectValue /></SelectTrigger><SelectContent>{LENGTHS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-sm font-semibold">Use information from your workspace</p>
              <Label className="text-xs text-muted-foreground">Meeting summary</Label>
              <Select value={meetingId} onValueChange={setMeetingId}>
                <SelectTrigger className="mt-1 bg-card" aria-label="Meeting summary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {meetings.map((m) => <SelectItem key={m.id} value={m.id}>{m.title} ({m.date})</SelectItem>)}
                </SelectContent>
              </Select>
              {tasks.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Tasks</p>
                  <div className="mt-1 max-h-36 space-y-1.5 overflow-auto">
                    {tasks.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={taskIds.includes(t.id)} onCheckedChange={(c) => setTaskIds((ids) => (c ? [...ids, t.id] : ids.filter((i) => i !== t.id)))} />
                        <span className="truncate">{t.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onGenerate} disabled={!!busy}>{busy === "generate" ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate email</Button>
              <Button variant="outline" onClick={() => { setForm(blank); setMeetingId("none"); setTaskIds([]); setOut(null); }}><Eraser /> Clear</Button>
            </div>
          </div>
        </Panel>

        <Panel title="Preview" action={out && <Button size="sm" variant="outline" onClick={() => copyText(`Subject: ${out.subject}\n\n${out.body}`, "Email copied")}><Copy /> Copy</Button>}>
          {!out ? (
            busy === "generate" ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Writing your email…</div> : <Empty>Your generated email will appear here. You can edit it freely.</Empty>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="osubj">Subject</Label><Input id="osubj" value={out.subject} onChange={(e) => setOut({ ...out, subject: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="obody">Body</Label><Textarea id="obody" rows={16} value={out.body} onChange={(e) => setOut({ ...out, body: e.target.value })} className="font-sans leading-relaxed" /></div>
              <div className="flex flex-wrap gap-2">
                {([["rewrite", "Rewrite", RefreshCw], ["shorten", "Shorten", Minimize2], ["expand", "Expand", Maximize2], ["alternative", "Alternative version", Shuffle]] as const).map(([m, l, I]) => (
                  <Button key={m} size="sm" variant="secondary" disabled={!!busy} onClick={() => onRevise(m)}>{busy === m ? <Loader2 className="animate-spin" /> : <I />} {l}</Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Check names, dates and facts before sending. Placeholders in [brackets] need your input.</p>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
